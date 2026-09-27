//! "Modo dock": makes the native Windows taskbar as compact as Windows allows, using only
//! documented per-user settings (HKCU) plus the taskbar auto-hide flag.
//!
//! Windows 10/11 offer no supported way to hide only the running-apps area while keeping Start and
//! the notification area; tools that do it patch explorer.exe and break on updates. So this mode never
//! touches Start or the tray: it hides Search/Task View/Widgets/Chat/Copilot, left-aligns icons on
//! Windows 11 and can auto-hide the bar. Every original value is saved to `taskbar-backup.json`
//! *before* any change and restored when the mode is turned off, when the app exits, on the next start
//! after a crash, and by the uninstaller (`--restore-taskbar`).

//!
//! Optional "replace" step (macOS style): while the dock window exists, the native taskbar windows
//! are hidden with `ShowWindow` so they no longer slide over the dock. Nothing inside the taskbar is
//! modified: the dock's tray button shows the real bar on demand ("peek"), a watchdog process puts it
//! back if the app dies, and every restore path above shows it again.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Manager};

use windows_sys::Win32::Foundation::{CloseHandle, BOOL, ERROR_SUCCESS, HWND, LPARAM, POINT, RECT};
use windows_sys::Win32::System::Threading::{OpenProcess, WaitForSingleObject, INFINITE};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowW, GetClassNameW, GetCursorPos, GetForegroundWindow, GetWindowRect, IsWindowVisible, ShowWindow, SW_HIDE, SW_SHOWNA,
};
use windows_sys::Win32::System::Registry::{
    RegCloseKey, RegCreateKeyExW, RegDeleteValueW, RegOpenKeyExW, RegQueryValueExW, RegSetValueExW, HKEY, HKEY_CURRENT_USER,
    HKEY_LOCAL_MACHINE, KEY_READ, KEY_SET_VALUE, REG_DWORD, REG_OPTION_NON_VOLATILE, REG_SZ,
};
use windows_sys::Win32::UI::Shell::{SHAppBarMessage, ABM_GETSTATE, ABM_SETSTATE, ABS_AUTOHIDE, APPBARDATA};
use windows_sys::Win32::UI::WindowsAndMessaging::{SendMessageTimeoutW, HWND_BROADCAST, SMTO_ABORTIFHUNG, WM_SETTINGCHANGE};

const ADVANCED: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced";
const SEARCH: &str = r"Software\Microsoft\Windows\CurrentVersion\Search";
const BACKUP_FILE: &str = "taskbar-backup.json";
const APP_IDENTIFIER: &str = "com.pediparameumarido.central";

#[derive(Clone, Copy, PartialEq)]
enum Os {
    Any,
    Win10,
    Win11,
}

struct Tweak {
    key: &'static str,
    name: &'static str,
    value: u32,
    label: &'static str,
    os: Os,
}

const TWEAKS: &[Tweak] = &[
    Tweak { key: ADVANCED, name: "TaskbarAl", value: 0, label: "Alinhar os ícones à esquerda", os: Os::Win11 },
    Tweak { key: SEARCH, name: "SearchboxTaskbarMode", value: 0, label: "Ocultar a pesquisa", os: Os::Any },
    Tweak { key: ADVANCED, name: "ShowTaskViewButton", value: 0, label: "Ocultar a Visão de tarefas", os: Os::Any },
    Tweak { key: ADVANCED, name: "TaskbarDa", value: 0, label: "Ocultar Widgets", os: Os::Win11 },
    Tweak { key: ADVANCED, name: "TaskbarMn", value: 0, label: "Ocultar Chat/Teams", os: Os::Win11 },
    Tweak { key: ADVANCED, name: "ShowCopilotButton", value: 0, label: "Ocultar Copilot", os: Os::Win11 },
    Tweak { key: ADVANCED, name: "ShowCortanaButton", value: 0, label: "Ocultar Cortana", os: Os::Win10 },
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SavedValue {
    pub key: String,
    pub name: String,
    pub existed: bool,
    pub value: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskbarBackup {
    pub version: u32,
    pub created_ms: u64,
    pub values: Vec<SavedValue>,
    pub autohide_was: bool,
    pub autohide_applied: bool,
    #[serde(default)]
    pub hidden: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskbarChange {
    pub id: String,
    pub label: String,
    pub current: Option<u32>,
    pub target: u32,
    pub applied: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskbarStatus {
    pub active: bool,
    pub windows_build: u32,
    pub is_windows11: bool,
    pub autohide: bool,
    pub hidden: bool,
    pub changes: Vec<TaskbarChange>,
    pub backup_path: String,
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

// ---------------------------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------------------------

fn read_dword(root: HKEY, key: &str, name: &str) -> Option<u32> {
    unsafe {
        let mut hkey: HKEY = 0;
        if RegOpenKeyExW(root, wide(key).as_ptr(), 0, KEY_READ, &mut hkey) != ERROR_SUCCESS {
            return None;
        }
        let mut data: u32 = 0;
        let mut size = 4u32;
        let mut kind = 0u32;
        let status = RegQueryValueExW(hkey, wide(name).as_ptr(), std::ptr::null(), &mut kind, &mut data as *mut u32 as *mut u8, &mut size);
        RegCloseKey(hkey);
        (status == ERROR_SUCCESS && kind == REG_DWORD).then_some(data)
    }
}

fn read_string(root: HKEY, key: &str, name: &str) -> Option<String> {
    unsafe {
        let mut hkey: HKEY = 0;
        if RegOpenKeyExW(root, wide(key).as_ptr(), 0, KEY_READ, &mut hkey) != ERROR_SUCCESS {
            return None;
        }
        let mut buf = [0u16; 128];
        let mut size = (buf.len() * 2) as u32;
        let mut kind = 0u32;
        let status = RegQueryValueExW(hkey, wide(name).as_ptr(), std::ptr::null(), &mut kind, buf.as_mut_ptr() as *mut u8, &mut size);
        RegCloseKey(hkey);
        if status != ERROR_SUCCESS || kind != REG_SZ {
            return None;
        }
        let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
        Some(String::from_utf16_lossy(&buf[..len]))
    }
}

fn write_dword(key: &str, name: &str, value: u32) -> Result<(), u32> {
    unsafe {
        let mut hkey: HKEY = 0;
        let status = RegCreateKeyExW(
            HKEY_CURRENT_USER,
            wide(key).as_ptr(),
            0,
            std::ptr::null(),
            REG_OPTION_NON_VOLATILE,
            KEY_SET_VALUE,
            std::ptr::null(),
            &mut hkey,
            std::ptr::null_mut(),
        );
        if status != ERROR_SUCCESS {
            return Err(status);
        }
        let status = RegSetValueExW(hkey, wide(name).as_ptr(), 0, REG_DWORD, &value as *const u32 as *const u8, 4);
        RegCloseKey(hkey);
        if status == ERROR_SUCCESS {
            Ok(())
        } else {
            Err(status)
        }
    }
}

fn delete_value(key: &str, name: &str) -> Result<(), u32> {
    unsafe {
        let mut hkey: HKEY = 0;
        let status = RegOpenKeyExW(HKEY_CURRENT_USER, wide(key).as_ptr(), 0, KEY_SET_VALUE, &mut hkey);
        if status != ERROR_SUCCESS {
            return Ok(());
        }
        let status = RegDeleteValueW(hkey, wide(name).as_ptr());
        RegCloseKey(hkey);
        // 2 = ERROR_FILE_NOT_FOUND: already absent.
        if status == ERROR_SUCCESS || status == 2 {
            Ok(())
        } else {
            Err(status)
        }
    }
}

fn windows_build() -> u32 {
    read_string(HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion", "CurrentBuildNumber")
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0)
}

fn applies(tweak: &Tweak, win11: bool) -> bool {
    match tweak.os {
        Os::Any => true,
        Os::Win11 => win11,
        Os::Win10 => !win11,
    }
}

// ---------------------------------------------------------------------------------------------
// Auto-hide and broadcast
// ---------------------------------------------------------------------------------------------

fn taskbar_autohide() -> bool {
    unsafe {
        let mut abd: APPBARDATA = std::mem::zeroed();
        abd.cbSize = std::mem::size_of::<APPBARDATA>() as u32;
        (SHAppBarMessage(ABM_GETSTATE, &mut abd) as u32) & ABS_AUTOHIDE != 0
    }
}

fn set_taskbar_autohide(enabled: bool) {
    unsafe {
        let mut abd: APPBARDATA = std::mem::zeroed();
        abd.cbSize = std::mem::size_of::<APPBARDATA>() as u32;
        let current = SHAppBarMessage(ABM_GETSTATE, &mut abd) as u32;
        let next = if enabled { current | ABS_AUTOHIDE } else { current & !ABS_AUTOHIDE };
        abd.lParam = next as isize;
        SHAppBarMessage(ABM_SETSTATE, &mut abd);
    }
}

fn broadcast_taskbar_change() {
    let area = wide("TraySettings");
    let mut result: usize = 0;
    unsafe {
        SendMessageTimeoutW(
            HWND_BROADCAST as HWND,
            WM_SETTINGCHANGE,
            0,
            area.as_ptr() as isize,
            SMTO_ABORTIFHUNG,
            1500,
            &mut result,
        );
    }
}

// ---------------------------------------------------------------------------------------------
// Hiding the taskbar windows (replace mode)
// ---------------------------------------------------------------------------------------------

const TASKBAR_CLASSES: [&str; 2] = ["Shell_TrayWnd", "Shell_SecondaryTrayWnd"];
/// Foreground windows that belong to the taskbar/tray UI: keep the bar up while one is active.
const SHELL_POPUP_CLASSES: [&str; 7] = [
    "Shell_TrayWnd",
    "Shell_SecondaryTrayWnd",
    "NotifyIconOverflowWindow",
    "TopLevelWindowForOverflowXamlIsland",
    "Windows.UI.Core.CoreWindow",
    "XamlExplorerHostIslandWindow",
    "ControlCenterWindow",
];
const PEEK_MIN_MS: u64 = 2500;
const PEEK_IDLE_MS: u64 = 1200;

static HIDE_WANTED: AtomicBool = AtomicBool::new(false);
/// Millis when the current peek started; 0 = not peeking.
static PEEK_SINCE: AtomicU64 = AtomicU64::new(0);
static KEEPER_STARTED: AtomicBool = AtomicBool::new(false);
static WATCHDOG_STARTED: AtomicBool = AtomicBool::new(false);

fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn class_of(hwnd: HWND) -> String {
    let mut buf = [0u16; 128];
    let len = unsafe { GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32) };
    String::from_utf16_lossy(&buf[..len.max(0) as usize])
}

fn taskbar_windows() -> Vec<HWND> {
    unsafe extern "system" fn collect(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let list = &mut *(lparam as *mut Vec<HWND>);
        if TASKBAR_CLASSES.contains(&class_of(hwnd).as_str()) {
            list.push(hwnd);
        }
        1
    }
    let mut list: Vec<HWND> = Vec::new();
    unsafe { EnumWindows(Some(collect), &mut list as *mut Vec<HWND> as LPARAM) };
    list
}

fn set_taskbars_visible(visible: bool) {
    for hwnd in taskbar_windows() {
        let is_visible = unsafe { IsWindowVisible(hwnd) } != 0;
        if is_visible != visible {
            unsafe { ShowWindow(hwnd, if visible { SW_SHOWNA } else { SW_HIDE }) };
        }
    }
}

/// The user is still using the peeked taskbar: pointer over it, a tray/taskbar flyout in front,
/// or a context menu open.
fn taskbar_in_use() -> bool {
    unsafe {
        let mut pt = POINT { x: 0, y: 0 };
        if GetCursorPos(&mut pt) != 0 {
            for hwnd in taskbar_windows() {
                let mut r: RECT = std::mem::zeroed();
                if IsWindowVisible(hwnd) != 0 && GetWindowRect(hwnd, &mut r) != 0 && pt.x >= r.left && pt.x < r.right && pt.y >= r.top && pt.y < r.bottom {
                    return true;
                }
            }
        }
        let fg = GetForegroundWindow();
        if fg != 0 && SHELL_POPUP_CLASSES.contains(&class_of(fg).as_str()) {
            return true;
        }
        let menu = FindWindowW(wide("#32768").as_ptr(), std::ptr::null());
        menu != 0 && IsWindowVisible(menu) != 0
    }
}

/// Keeps the taskbar hidden while replace mode is on and the dock window exists (Explorer restarts
/// and some notifications show it again), handles peeks, and shows it back as soon as the dock goes away.
fn start_keeper(app: &AppHandle) {
    if KEEPER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }
    let app = app.clone();
    std::thread::spawn(move || {
        let mut hidden_by_us = false;
        let mut last_use = 0u64;
        loop {
            // Explorer re-shows the auto-hidden bar when the pointer touches the screen edge; hide it
            // again quickly so it never covers the dock.
            std::thread::sleep(Duration::from_millis(if hidden_by_us { 60 } else { 250 }));
            let want = HIDE_WANTED.load(Ordering::SeqCst) && app.get_webview_window("dock").is_some();
            if !want {
                PEEK_SINCE.store(0, Ordering::SeqCst);
                if hidden_by_us {
                    set_taskbars_visible(true);
                    hidden_by_us = false;
                }
                continue;
            }
            let peek = PEEK_SINCE.load(Ordering::SeqCst);
            let now = now_ms();
            if peek != 0 {
                if taskbar_in_use() {
                    last_use = now;
                }
                if now.saturating_sub(peek) < PEEK_MIN_MS || now.saturating_sub(last_use) < PEEK_IDLE_MS {
                    continue;
                }
                PEEK_SINCE.store(0, Ordering::SeqCst);
            }
            set_taskbars_visible(false);
            hidden_by_us = true;
        }
    });
}

/// Separate copy of the app that waits for this process to end. If it ended without restoring
/// (crash, killed from Task Manager) while the taskbar was hidden, it restores everything right away.
fn start_watchdog() {
    if WATCHDOG_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }
    if let Ok(exe) = std::env::current_exe() {
        let _ = std::process::Command::new(exe).arg("--taskbar-watchdog").arg(std::process::id().to_string()).spawn();
    }
}

/// Entry point for `--taskbar-watchdog <pid>`.
pub fn run_watchdog(pid: u32) {
    const SYNCHRONIZE: u32 = 0x0010_0000;
    unsafe {
        let handle = OpenProcess(SYNCHRONIZE, 0, pid);
        if handle == 0 {
            return;
        }
        WaitForSingleObject(handle, INFINITE);
        CloseHandle(handle);
    }
    std::thread::sleep(Duration::from_millis(400));
    let path = default_backup_path();
    if read_backup(&path).map(|b| b.hidden).unwrap_or(false) {
        restore_from_backup(&path);
    }
}

// ---------------------------------------------------------------------------------------------
// Backup file
// ---------------------------------------------------------------------------------------------

/// Same folder Tauri uses for `app_data_dir()` on Windows; works without an AppHandle (uninstaller).
pub fn default_backup_path() -> PathBuf {
    let base = std::env::var_os("APPDATA").map(PathBuf::from).unwrap_or_else(std::env::temp_dir);
    base.join(APP_IDENTIFIER).join(BACKUP_FILE)
}

fn backup_path(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().map(|d| d.join(BACKUP_FILE)).unwrap_or_else(|_| default_backup_path())
}

pub fn read_backup(path: &Path) -> Option<TaskbarBackup> {
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

fn write_backup(path: &Path, backup: &TaskbarBackup) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    let text = serde_json::to_string_pretty(backup).map_err(|e| e.to_string())?;
    {
        use std::io::Write;
        let mut f = std::fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    std::fs::rename(&tmp, path).map_err(|e| e.to_string())
}

fn capture_backup(win11: bool, autohide_applied: bool) -> TaskbarBackup {
    let values = TWEAKS
        .iter()
        .filter(|t| applies(t, win11))
        .map(|t| {
            let current = read_dword(HKEY_CURRENT_USER, t.key, t.name);
            SavedValue { key: t.key.to_string(), name: t.name.to_string(), existed: current.is_some(), value: current.unwrap_or(0) }
        })
        .collect();
    TaskbarBackup {
        version: 1,
        created_ms: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0),
        values,
        autohide_was: taskbar_autohide(),
        autohide_applied,
        hidden: false,
    }
}

/// Puts every saved value back exactly as it was (deleting values that did not exist) and removes
/// the backup file. Returns the names that could not be restored.
pub fn restore_from_backup(path: &Path) -> Vec<String> {
    let Some(backup) = read_backup(path) else {
        return vec![];
    };
    let mut failed = Vec::new();
    for v in &backup.values {
        let res = if v.existed { write_dword(&v.key, &v.name, v.value) } else { delete_value(&v.key, &v.name) };
        if res.is_err() {
            failed.push(v.name.clone());
        }
    }
    HIDE_WANTED.store(false, Ordering::SeqCst);
    if backup.hidden {
        set_taskbars_visible(true);
    }
    if backup.autohide_applied {
        set_taskbar_autohide(backup.autohide_was);
    }
    broadcast_taskbar_change();
    if failed.is_empty() {
        let _ = std::fs::remove_file(path);
    }
    failed
}

fn status(app: &AppHandle, results: Option<&[(String, Result<(), String>)]>) -> TaskbarStatus {
    let build = windows_build();
    let win11 = build >= 22000;
    let path = backup_path(app);
    let changes = TWEAKS
        .iter()
        .filter(|t| applies(t, win11))
        .map(|t| {
            let current = read_dword(HKEY_CURRENT_USER, t.key, t.name);
            let result = results.and_then(|r| r.iter().find(|(n, _)| n == t.name)).map(|(_, r)| r.clone());
            TaskbarChange {
                id: t.name.to_string(),
                label: t.label.to_string(),
                current,
                target: t.value,
                applied: current == Some(t.value),
                error: match result {
                    Some(Err(e)) => Some(e),
                    _ => None,
                },
            }
        })
        .collect();
    TaskbarStatus {
        active: path.exists(),
        windows_build: build,
        is_windows11: win11,
        autohide: taskbar_autohide(),
        hidden: HIDE_WANTED.load(Ordering::SeqCst),
        changes,
        backup_path: path.to_string_lossy().to_string(),
    }
}

// ---------------------------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------------------------

/// Current state plus what "Modo dock" would change (used for the preview).
#[tauri::command]
pub fn taskbar_mode_status(app: AppHandle) -> TaskbarStatus {
    status(&app, None)
}

#[tauri::command]
pub fn taskbar_mode_apply(app: AppHandle, autohide: bool, hide: Option<bool>) -> Result<TaskbarStatus, String> {
    let hide = hide.unwrap_or(false);
    // A hidden bar that does not auto-hide would still reserve its strip of the screen.
    let autohide = autohide || hide;
    let win11 = windows_build() >= 22000;
    let path = backup_path(&app);
    // Keep the very first backup: re-applying must never overwrite the user's original values.
    let mut backup = match read_backup(&path) {
        Some(b) => b,
        None => capture_backup(win11, false),
    };
    if autohide && !backup.autohide_applied {
        backup.autohide_was = taskbar_autohide();
        backup.autohide_applied = true;
    }
    backup.hidden = hide;
    write_backup(&path, &backup).map_err(|e| format!("Não foi possível salvar o backup da barra: {}", e))?;

    let mut results = Vec::new();
    for t in TWEAKS.iter().filter(|t| applies(t, win11)) {
        let res = write_dword(t.key, t.name, t.value).map_err(|code| {
            if code == 5 {
                "O Windows bloqueou essa alteração nesta versão.".to_string()
            } else {
                format!("Não foi possível alterar (erro {}).", code)
            }
        });
        let res = res.and_then(|_| {
            if read_dword(HKEY_CURRENT_USER, t.key, t.name) == Some(t.value) {
                Ok(())
            } else {
                Err("O Windows não aceitou essa alteração nesta versão.".to_string())
            }
        });
        results.push((t.name.to_string(), res));
    }
    if autohide {
        set_taskbar_autohide(true);
    } else if backup.autohide_applied {
        set_taskbar_autohide(backup.autohide_was);
        backup.autohide_applied = false;
        let _ = write_backup(&path, &backup);
    }
    broadcast_taskbar_change();
    PEEK_SINCE.store(0, Ordering::SeqCst);
    HIDE_WANTED.store(hide, Ordering::SeqCst);
    if hide {
        start_watchdog();
        start_keeper(&app);
    } else {
        set_taskbars_visible(true);
    }
    Ok(status(&app, Some(&results)))
}

/// Shows the real taskbar for a moment (tray, clock, notifications) and moves keyboard focus to the
/// notification area. In replace mode it hides again once the user stops using it.
#[tauri::command]
pub fn taskbar_peek() -> Result<(), String> {
    if HIDE_WANTED.load(Ordering::SeqCst) {
        PEEK_SINCE.store(now_ms(), Ordering::SeqCst);
        set_taskbars_visible(true);
        std::thread::sleep(Duration::from_millis(80));
    }
    crate::dock_system::dock_shell_action("tray".into())
}

#[tauri::command]
pub fn taskbar_mode_restore(app: AppHandle) -> Result<TaskbarStatus, String> {
    let failed = restore_from_backup(&backup_path(&app));
    if !failed.is_empty() {
        return Err(format!("Não foi possível restaurar: {}. O backup foi mantido para tentar de novo.", failed.join(", ")));
    }
    Ok(status(&app, None))
}

/// Restores the taskbar if a backup is still present (normal exit, or startup after a crash).
pub fn restore_if_active(app: &AppHandle) {
    let path = backup_path(app);
    if path.exists() {
        restore_from_backup(&path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backup_round_trips_as_json() {
        let b = TaskbarBackup {
            version: 1,
            created_ms: 42,
            values: vec![
                SavedValue { key: ADVANCED.into(), name: "TaskbarAl".into(), existed: true, value: 1 },
                SavedValue { key: SEARCH.into(), name: "SearchboxTaskbarMode".into(), existed: false, value: 0 },
            ],
            autohide_was: false,
            autohide_applied: true,
            hidden: true,
        };
        let dir = std::env::temp_dir().join(format!("pmm-taskbar-test-{}", std::process::id()));
        let path = dir.join(BACKUP_FILE);
        write_backup(&path, &b).unwrap();
        assert_eq!(read_backup(&path), Some(b));
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn old_backups_without_hidden_flag_still_load() {
        let json = r#"{"version":1,"createdMs":1,"values":[],"autohideWas":false,"autohideApplied":false}"#;
        let b: TaskbarBackup = serde_json::from_str(json).unwrap();
        assert!(!b.hidden);
    }

    #[test]
    fn tweaks_never_touch_start_or_tray() {
        for t in TWEAKS {
            let n = t.name.to_lowercase();
            assert!(!n.contains("start") && !n.contains("tray") && !n.contains("notif"), "{}", t.name);
        }
    }

    #[test]
    fn os_specific_tweaks() {
        let win11: Vec<_> = TWEAKS.iter().filter(|t| applies(t, true)).map(|t| t.name).collect();
        let win10: Vec<_> = TWEAKS.iter().filter(|t| applies(t, false)).map(|t| t.name).collect();
        assert!(win11.contains(&"TaskbarAl") && !win10.contains(&"TaskbarAl"));
        assert!(win10.contains(&"ShowCortanaButton") && !win11.contains(&"ShowCortanaButton"));
    }
}

//! Native side of the desktop dock (Windows only).
//!
//! - Tracks top-level application windows with `SetWinEventHook` (no busy polling of the window list).
//! - Launches/reveals pinned items, resolves `.lnk` shortcuts and extracts high-resolution icons.
//! - Keeps the transparent dock window click-through everywhere except the rectangle the UI reports
//!   as interactive, so empty areas never block the desktop.
//! - Optional AppBar registration to reserve screen space, and fullscreen detection.
//!
//! The window filter follows the same rules used by Seelen UI and Cairo Desktop (visible, unowned or
//! WS_EX_APPWINDOW, not a tool window, not DWM-cloaked); the implementation here is original.

use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::c_void;
use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use windows_sys::core::{GUID, HRESULT, PCWSTR, PWSTR};
use windows_sys::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM, POINT, RECT};
use windows_sys::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DwmSetWindowAttribute};
use windows_sys::Win32::Graphics::Gdi::{
    DeleteObject, EnumDisplayMonitors, GetDC, GetDIBits, GetMonitorInfoW, GetObjectW, MonitorFromWindow, ReleaseDC, BITMAP,
    BITMAPINFO, BITMAPINFOHEADER, DIB_RGB_COLORS, HDC, HMONITOR, MONITORINFO, MONITORINFOEXW, MONITOR_DEFAULTTONEAREST,
};
use windows_sys::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED};
use windows_sys::Win32::System::Threading::{
    AttachThreadInput, GetCurrentProcessId, GetCurrentThreadId, OpenProcess, QueryFullProcessImageNameW,
    PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows_sys::Win32::UI::Accessibility::{SetWinEventHook, HWINEVENTHOOK};
use windows_sys::Win32::UI::Controls::Dialogs::{
    GetOpenFileNameW, OFN_ALLOWMULTISELECT, OFN_EXPLORER, OFN_FILEMUSTEXIST, OFN_NODEREFERENCELINKS, OFN_PATHMUSTEXIST,
    OPENFILENAMEW,
};
use windows_sys::Win32::UI::HiDpi::{GetDpiForMonitor, GetDpiForWindow, MDT_EFFECTIVE_DPI};
use windows_sys::Win32::UI::Shell::{
    SHAppBarMessage, SHGetFileInfoW, SHGetImageList, ShellExecuteW, ABE_BOTTOM, ABE_LEFT, ABE_RIGHT, ABE_TOP, ABM_NEW,
    ABM_QUERYPOS, ABM_REMOVE, ABM_SETPOS, APPBARDATA, BIF_NEWDIALOGSTYLE, BIF_RETURNONLYFSDIRS, SHFILEINFOW,
    SHGFI_SYSICONINDEX, SHIL_EXTRALARGE, SHIL_JUMBO,
};

/// `windows-sys` 0.52 does not expose the folder browser, so it is declared here.
#[repr(C)]
#[allow(non_snake_case)]
struct BROWSEINFOW {
    hwndOwner: HWND,
    pidlRoot: *mut c_void,
    pszDisplayName: PWSTR,
    lpszTitle: PCWSTR,
    ulFlags: u32,
    lpfn: *mut c_void,
    lParam: LPARAM,
    iImage: i32,
}

#[link(name = "shell32")]
extern "system" {
    fn SHBrowseForFolderW(lpbi: *const BROWSEINFOW) -> *mut c_void;
    fn SHGetPathFromIDListW(pidl: *const c_void, pszpath: PWSTR) -> BOOL;
}
use windows_sys::Win32::UI::WindowsAndMessaging::{
    BringWindowToTop, DestroyIcon, DispatchMessageW, EnumWindows, GetClassNameW, GetCursorPos, GetForegroundWindow,
    GetIconInfo, GetMessageW, GetWindow, GetWindowLongPtrW, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId, IsIconic,
    IsWindow, IsWindowVisible, PostMessageW, SetForegroundWindow, SetWindowLongPtrW, SetWindowPos, ShowWindow,
    TranslateMessage, GWL_EXSTYLE, GW_OWNER, HICON, HWND_TOPMOST, ICONINFO, MSG, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
    SW_MINIMIZE, SW_RESTORE, SW_SHOWNA, SW_SHOWNORMAL, WM_CLOSE, WM_USER, WS_EX_APPWINDOW, WS_EX_LAYERED, WS_EX_NOACTIVATE,
    WS_EX_TOOLWINDOW, WS_EX_TRANSPARENT,
};

pub const DOCK_LABEL: &str = "dock";
/// Floating tray/clock pill shown next to the dock when it replaces the taskbar.
pub const TRAY_LABEL: &str = "docktray";

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DockWindowInfo {
    pub hwnd: i64,
    pub title: String,
    pub exe: String,
    pub pid: u32,
    pub minimized: bool,
    pub focused: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DockMonitor {
    pub index: usize,
    pub name: String,
    pub primary: bool,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub work_x: i32,
    pub work_y: i32,
    pub work_width: i32,
    pub work_height: i32,
    pub scale: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedDockItem {
    /// "app" | "file" | "folder" | "url" | "missing"
    pub kind: String,
    pub path: String,
    pub target: Option<String>,
    pub args: Option<String>,
    pub name: String,
}

/// Interactive area in logical pixels, relative to the dock window's top-left corner.
#[derive(Debug, Clone, Copy, Deserialize)]
pub struct HitRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Copy, Serialize)]
pub struct AppBarRect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Default)]
struct Shared {
    hit: Option<HitRect>,
    /// The visible bar (logical, window-relative), used to detect windows touching the dock.
    bar: Option<HitRect>,
    ignoring: Option<bool>,
    windows: Vec<DockWindowInfo>,
    fullscreen: bool,
    overlap: bool,
    monitors: Vec<DockMonitor>,
    exe_cache: HashMap<u32, String>,
    icon_cache: HashMap<String, String>,
    appbar_hwnd: isize,
}

static SHARED: OnceLock<Mutex<Shared>> = OnceLock::new();
static WINDOWS_DIRTY: AtomicBool = AtomicBool::new(true);
static LAST_FOREGROUND: AtomicIsize = AtomicIsize::new(0);
static LOOPS_STARTED: AtomicBool = AtomicBool::new(false);

fn shared() -> std::sync::MutexGuard<'static, Shared> {
    SHARED
        .get_or_init(|| Mutex::new(Shared::default()))
        .lock()
        .unwrap_or_else(|e| e.into_inner())
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn from_wide(buf: &[u16]) -> String {
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    String::from_utf16_lossy(&buf[..len])
}

fn window_hwnd(win: &WebviewWindow) -> Option<HWND> {
    win.hwnd().ok().map(|h| h.0 as isize)
}

/// Set once the dock window has been placed and shown; cleared when it closes.
static DOCK_SHOULD_SHOW: AtomicBool = AtomicBool::new(false);

/// Click-through on/off for the dock, done directly on the window styles.
///
/// Tauri's `set_ignore_cursor_events` must not be used here: tao rebuilds every window style from
/// its own flags, and because the dock is shown with `SetWindowPos` (never via tao, to avoid stealing
/// focus) tao believes it is hidden and calls `ShowWindow(SW_HIDE)`, dropping the no-activate and
/// tool-window styles too.
fn set_click_through(hwnd: HWND, ignore: bool) {
    unsafe {
        let mut ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32 | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW;
        ex &= !WS_EX_APPWINDOW;
        if ignore {
            ex |= WS_EX_TRANSPARENT | WS_EX_LAYERED;
        } else {
            ex &= !(WS_EX_TRANSPARENT | WS_EX_LAYERED);
        }
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex as isize);
    }
}

// ---------------------------------------------------------------------------------------------
// Window filtering (pure, unit-tested)
// ---------------------------------------------------------------------------------------------

const SHELL_CLASSES: &[&str] = &[
    "Progman",
    "WorkerW",
    "Shell_TrayWnd",
    "Shell_SecondaryTrayWnd",
    "Windows.UI.Core.CoreWindow",
    "ForegroundStaging",
    "MultitaskingViewFrame",
    "XamlExplorerHostIslandWindow",
];

/// Decides whether a top-level window belongs in a taskbar/dock, using the classic shell rules.
pub fn is_taskbar_candidate(visible: bool, has_owner: bool, ex_style: u32, cloaked: bool, title: &str, class: &str, own_process: bool) -> bool {
    if !visible || cloaked || own_process || title.trim().is_empty() {
        return false;
    }
    if SHELL_CLASSES.iter().any(|c| c.eq_ignore_ascii_case(class)) {
        return false;
    }
    let app_window = ex_style & WS_EX_APPWINDOW != 0;
    if ex_style & WS_EX_TOOLWINDOW != 0 && !app_window {
        return false;
    }
    if ex_style & WS_EX_NOACTIVATE != 0 && !app_window {
        return false;
    }
    !has_owner || app_window
}

// ---------------------------------------------------------------------------------------------
// Win32 helpers
// ---------------------------------------------------------------------------------------------

fn window_pid(hwnd: HWND) -> u32 {
    let mut pid = 0u32;
    unsafe { GetWindowThreadProcessId(hwnd, &mut pid) };
    pid
}

fn is_own_window(hwnd: HWND) -> bool {
    window_pid(hwnd) == unsafe { GetCurrentProcessId() }
}

fn window_class(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let len = unsafe { GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32) };
    String::from_utf16_lossy(&buf[..len.max(0) as usize])
}

fn window_title(hwnd: HWND) -> String {
    let mut buf = [0u16; 512];
    let len = unsafe { GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32) };
    String::from_utf16_lossy(&buf[..len.max(0) as usize])
}

fn is_cloaked(hwnd: HWND) -> bool {
    const DWMWA_CLOAKED: u32 = 14;
    let mut cloaked: u32 = 0;
    let hr = unsafe { DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &mut cloaked as *mut u32 as *mut c_void, 4) };
    hr >= 0 && cloaked != 0
}

fn process_path(pid: u32) -> String {
    if let Some(p) = shared().exe_cache.get(&pid) {
        return p.clone();
    }
    let path = unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle == 0 {
            String::new()
        } else {
            let mut buf = [0u16; 1024];
            let mut size = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(handle, 0, buf.as_mut_ptr(), &mut size);
            CloseHandle(handle);
            if ok != 0 {
                String::from_utf16_lossy(&buf[..size as usize])
            } else {
                String::new()
            }
        }
    };
    if !path.is_empty() {
        let mut s = shared();
        if s.exe_cache.len() > 512 {
            s.exe_cache.clear();
        }
        s.exe_cache.insert(pid, path.clone());
    }
    path
}

/// Processes that host Start, Search and the tray flyouts: while one of them is in front the dock
/// is revealed, like the taskbar is when the Windows key is pressed.
const SHELL_SURFACE_EXES: &[&str] =
    &["startmenuexperiencehost.exe", "searchhost.exe", "searchapp.exe", "shellexperiencehost.exe", "shellhost.exe"];

pub fn is_shell_surface_exe(path: &str) -> bool {
    let name = path.rsplit(['\\', '/']).next().unwrap_or(path).to_ascii_lowercase();
    SHELL_SURFACE_EXES.contains(&name.as_str())
}

fn shell_surface_open() -> bool {
    let fg = unsafe { GetForegroundWindow() };
    fg != 0 && !is_own_window(fg) && is_shell_surface_exe(&process_path(window_pid(fg)))
}

fn enumerate_windows() -> Vec<DockWindowInfo> {
    unsafe extern "system" fn collect(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let list = &mut *(lparam as *mut Vec<HWND>);
        list.push(hwnd);
        1
    }
    let mut handles: Vec<HWND> = Vec::new();
    unsafe { EnumWindows(Some(collect), &mut handles as *mut Vec<HWND> as LPARAM) };

    let own_pid = unsafe { GetCurrentProcessId() };
    let foreground = LAST_FOREGROUND.load(Ordering::SeqCst);
    let mut out = Vec::new();
    for hwnd in handles {
        let visible = unsafe { IsWindowVisible(hwnd) } != 0;
        if !visible {
            continue;
        }
        let pid = window_pid(hwnd);
        let has_owner = unsafe { GetWindow(hwnd, GW_OWNER) } != 0;
        let ex_style = unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) } as u32;
        let title = window_title(hwnd);
        let class = window_class(hwnd);
        if !is_taskbar_candidate(visible, has_owner, ex_style, is_cloaked(hwnd), &title, &class, pid == own_pid) {
            continue;
        }
        out.push(DockWindowInfo {
            hwnd: hwnd as i64,
            title,
            exe: process_path(pid),
            pid,
            minimized: unsafe { IsIconic(hwnd) } != 0,
            focused: hwnd == foreground,
        });
    }
    out
}

/// Refreshes the window list and notifies the dock when it changed.
fn refresh_windows(app: &AppHandle, force: bool) -> Vec<DockWindowInfo> {
    let list = enumerate_windows();
    let changed = {
        let mut s = shared();
        let changed = s.windows != list;
        if changed {
            s.windows = list.clone();
        }
        changed
    };
    if changed || force {
        let _ = app.emit_to(DOCK_LABEL, "dock://windows", &list);
    }
    list
}

unsafe extern "system" fn win_event_proc(
    _hook: HWINEVENTHOOK,
    event: u32,
    hwnd: HWND,
    id_object: i32,
    id_child: i32,
    _thread: u32,
    _time: u32,
) {
    // Only whole-window events (OBJID_WINDOW / CHILDID_SELF).
    if id_object != 0 || id_child != 0 {
        return;
    }
    const EVENT_SYSTEM_FOREGROUND: u32 = 0x0003;
    if event == EVENT_SYSTEM_FOREGROUND && hwnd != 0 {
        LAST_FOREGROUND.store(hwnd, Ordering::SeqCst);
    }
    WINDOWS_DIRTY.store(true, Ordering::SeqCst);
}

fn run_event_hook_thread() {
    std::thread::spawn(|| unsafe {
        LAST_FOREGROUND.store(GetForegroundWindow(), Ordering::SeqCst);
        // foreground, minimize start/end, create/destroy/show/hide, name change, cloaked/uncloaked
        let ranges: [(u32, u32); 5] = [(0x0003, 0x0003), (0x0016, 0x0017), (0x8000, 0x8003), (0x800C, 0x800C), (0x8017, 0x8018)];
        for (min, max) in ranges {
            SetWinEventHook(min, max, 0, Some(win_event_proc), 0, 0, 0 /* WINEVENT_OUTOFCONTEXT */);
        }
        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, 0, 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    });
}

fn update_hit_test(app: &AppHandle, win: &WebviewWindow, hwnd: HWND) {
    let (hit, prev) = {
        let s = shared();
        (s.hit, s.ignoring)
    };
    let inside = match hit {
        None => false,
        Some(r) => unsafe {
            let mut pt = POINT { x: 0, y: 0 };
            let mut rect: RECT = std::mem::zeroed();
            if GetCursorPos(&mut pt) == 0 || GetWindowRect(hwnd, &mut rect) == 0 {
                false
            } else {
                let scale = (GetDpiForWindow(hwnd).max(96)) as f64 / 96.0;
                let lx = (pt.x - rect.left) as f64 / scale;
                let ly = (pt.y - rect.top) as f64 / scale;
                lx >= r.x && lx <= r.x + r.width && ly >= r.y && ly <= r.y + r.height
            }
        },
    };
    let _ = win;
    let ignore = !inside;
    if prev != Some(ignore) {
        set_click_through(hwnd, ignore);
        shared().ignoring = Some(ignore);
        // While click-through the page never sees the pointer leave, so tell it explicitly.
        let _ = app.emit_to(DOCK_LABEL, "dock://pointer", inside);
    }
}

/// True when the foreground app window intersects the visible bar (for "hide when a window touches").
fn detect_overlap(dock: HWND, bar: Option<HitRect>) -> bool {
    let Some(bar) = bar else { return false };
    unsafe {
        let fg = GetForegroundWindow();
        if fg == 0 || is_own_window(fg) || IsIconic(fg) != 0 {
            return false;
        }
        let class = window_class(fg);
        if SHELL_CLASSES.iter().any(|c| c.eq_ignore_ascii_case(&class)) {
            return false;
        }
        let mut dock_rect: RECT = std::mem::zeroed();
        let mut fg_rect: RECT = std::mem::zeroed();
        if GetWindowRect(dock, &mut dock_rect) == 0 || GetWindowRect(fg, &mut fg_rect) == 0 {
            return false;
        }
        let scale = (GetDpiForWindow(dock).max(96)) as f64 / 96.0;
        let left = dock_rect.left as f64 + bar.x * scale;
        let top = dock_rect.top as f64 + bar.y * scale;
        let right = left + bar.width * scale;
        let bottom = top + bar.height * scale;
        (fg_rect.left as f64) < right && (fg_rect.right as f64) > left && (fg_rect.top as f64) < bottom && (fg_rect.bottom as f64) > top
    }
}

fn detect_fullscreen(dock: HWND) -> bool {
    unsafe {
        let fg = GetForegroundWindow();
        if fg == 0 || is_own_window(fg) {
            return false;
        }
        let class = window_class(fg);
        if SHELL_CLASSES.iter().any(|c| c.eq_ignore_ascii_case(&class)) {
            return false;
        }
        let mon = MonitorFromWindow(fg, MONITOR_DEFAULTTONEAREST);
        if mon != MonitorFromWindow(dock, MONITOR_DEFAULTTONEAREST) {
            return false;
        }
        let mut mi: MONITORINFO = std::mem::zeroed();
        mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
        let mut rect: RECT = std::mem::zeroed();
        if GetMonitorInfoW(mon, &mut mi) == 0 || GetWindowRect(fg, &mut rect) == 0 {
            return false;
        }
        let m = mi.rcMonitor;
        rect.left <= m.left && rect.top <= m.top && rect.right >= m.right && rect.bottom >= m.bottom
    }
}

fn list_monitors_native() -> Vec<DockMonitor> {
    unsafe extern "system" fn proc_(hmon: HMONITOR, _hdc: HDC, _rc: *mut RECT, data: LPARAM) -> BOOL {
        let list = &mut *(data as *mut Vec<DockMonitor>);
        let mut mi: MONITORINFOEXW = std::mem::zeroed();
        mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
        if GetMonitorInfoW(hmon, &mut mi as *mut MONITORINFOEXW as *mut MONITORINFO) != 0 {
            let r = mi.monitorInfo.rcMonitor;
            let w = mi.monitorInfo.rcWork;
            let (mut dx, mut dy) = (96u32, 96u32);
            let scale = if GetDpiForMonitor(hmon, MDT_EFFECTIVE_DPI, &mut dx, &mut dy) >= 0 { dx as f64 / 96.0 } else { 1.0 };
            list.push(DockMonitor {
                index: 0,
                name: from_wide(&mi.szDevice),
                primary: mi.monitorInfo.dwFlags & 1 != 0,
                x: r.left,
                y: r.top,
                width: r.right - r.left,
                height: r.bottom - r.top,
                work_x: w.left,
                work_y: w.top,
                work_width: w.right - w.left,
                work_height: w.bottom - w.top,
                scale,
            });
        }
        1
    }
    let mut list: Vec<DockMonitor> = Vec::new();
    unsafe { EnumDisplayMonitors(0, std::ptr::null(), Some(proc_), &mut list as *mut Vec<DockMonitor> as LPARAM) };
    list.sort_by_key(|m| (!m.primary, m.x, m.y));
    for (i, m) in list.iter_mut().enumerate() {
        m.index = i;
    }
    list
}

fn start_loops(app: AppHandle) {
    if LOOPS_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }
    run_event_hook_thread();
    std::thread::spawn(move || {
        let mut tick: u64 = 0;
        let mut shell_open = false;
        loop {
            std::thread::sleep(Duration::from_millis(40));
            tick = tick.wrapping_add(1);
            let Some(win) = app.get_webview_window(DOCK_LABEL) else {
                std::thread::sleep(Duration::from_millis(250));
                continue;
            };
            let Some(hwnd) = window_hwnd(&win) else { continue };

            update_hit_test(&app, &win, hwnd);

            // With the pointer on the dock it also touches the screen edge, where an auto-hidden
            // Windows taskbar pops up (topmost) and would cover the dock: stay above it.
            if tick % 3 == 0 {
                let s = shared();
                let pointer_on_dock = s.ignoring == Some(false);
                let fullscreen = s.fullscreen;
                drop(s);
                if pointer_on_dock && !fullscreen {
                    unsafe { SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) };
                }
            }

            if tick % 4 == 0 {
                let open = shell_surface_open();
                if open != shell_open {
                    shell_open = open;
                    let _ = app.emit_to(DOCK_LABEL, "dock://shell-open", open);
                    if open {
                        unsafe { SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) };
                    }
                }
            }

            // Anything that hid the dock behind our back (Explorer restarts, style resets) is undone.
            if tick % 12 == 0 && DOCK_SHOULD_SHOW.load(Ordering::SeqCst) {
                unsafe {
                    if IsWindowVisible(hwnd) == 0 {
                        ShowWindow(hwnd, SW_SHOWNA);
                    }
                    let ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
                    if ex & (WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW) != (WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW) || ex & WS_EX_APPWINDOW != 0 {
                        set_click_through(hwnd, shared().ignoring != Some(false));
                    }
                }
            }

            if tick % 6 == 0 && WINDOWS_DIRTY.swap(false, Ordering::SeqCst) {
                refresh_windows(&app, false);
            }
            if tick % 8 == 0 {
                let fs = detect_fullscreen(hwnd);
                let bar = shared().bar;
                let overlap = detect_overlap(hwnd, bar);
                let (fs_changed, overlap_changed) = {
                    let mut s = shared();
                    let r = (s.fullscreen != fs, s.overlap != overlap);
                    s.fullscreen = fs;
                    s.overlap = overlap;
                    r
                };
                if fs_changed {
                    let _ = app.emit_to(DOCK_LABEL, "dock://fullscreen", fs);
                    let _ = app.emit_to(TRAY_LABEL, "dock://fullscreen", fs);
                }
                if overlap_changed {
                    let _ = app.emit_to(DOCK_LABEL, "dock://overlap", overlap);
                }
            }
            if tick % 50 == 0 {
                let monitors = list_monitors_native();
                let changed = {
                    let mut s = shared();
                    let changed = s.monitors != monitors;
                    s.monitors = monitors.clone();
                    changed
                };
                if changed {
                    let _ = app.emit("dock://displays-changed", &monitors);
                }
                // Other topmost windows may have been raised above the dock.
                if !shared().fullscreen {
                    unsafe { SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) };
                    if let Some(tray) = app.get_webview_window(TRAY_LABEL).as_ref().and_then(window_hwnd) {
                        unsafe { SetWindowPos(tray, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE) };
                    }
                }
            }
        }
    });
}

// ---------------------------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------------------------

const IID_IIMAGELIST: GUID = GUID::from_u128(0x46eb5926_582e_4017_9fdf_e8998daa0950);

unsafe fn com_release(obj: *mut c_void) {
    if obj.is_null() {
        return;
    }
    let vtbl = *(obj as *const *const usize);
    let release: unsafe extern "system" fn(*mut c_void) -> u32 = std::mem::transmute(*vtbl.add(2));
    release(obj);
}

unsafe fn dib_bits(hbm: isize, width: i32, height: i32) -> Option<Vec<u8>> {
    let hdc = GetDC(0);
    let mut bi: BITMAPINFO = std::mem::zeroed();
    bi.bmiHeader = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: width,
        biHeight: -height,
        biPlanes: 1,
        biBitCount: 32,
        biCompression: 0,
        biSizeImage: 0,
        biXPelsPerMeter: 0,
        biYPelsPerMeter: 0,
        biClrUsed: 0,
        biClrImportant: 0,
    };
    let mut buf = vec![0u8; (width * height * 4) as usize];
    let lines = GetDIBits(hdc, hbm, 0, height as u32, buf.as_mut_ptr() as *mut c_void, &mut bi, DIB_RGB_COLORS);
    ReleaseDC(0, hdc);
    if lines == 0 {
        None
    } else {
        Some(buf)
    }
}

unsafe fn hicon_to_rgba(hicon: HICON) -> Option<(u32, u32, Vec<u8>)> {
    let mut info: ICONINFO = std::mem::zeroed();
    if GetIconInfo(hicon, &mut info) == 0 {
        return None;
    }
    let result = (|| {
        if info.hbmColor == 0 {
            return None;
        }
        let mut bm: BITMAP = std::mem::zeroed();
        GetObjectW(info.hbmColor, std::mem::size_of::<BITMAP>() as i32, &mut bm as *mut BITMAP as *mut c_void);
        let (w, h) = (bm.bmWidth, bm.bmHeight);
        if w <= 0 || h <= 0 {
            return None;
        }
        let mut px = dib_bits(info.hbmColor, w, h)?;
        let has_alpha = px.chunks_exact(4).any(|p| p[3] != 0);
        let mask = if has_alpha { None } else { dib_bits(info.hbmMask, w, h) };
        for (i, p) in px.chunks_exact_mut(4).enumerate() {
            p.swap(0, 2); // BGRA -> RGBA
            if !has_alpha {
                let transparent = mask.as_ref().map(|m| m[i * 4] != 0).unwrap_or(false);
                p[3] = if transparent { 0 } else { 255 };
            }
        }
        Some((w as u32, h as u32, px))
    })();
    if info.hbmColor != 0 {
        DeleteObject(info.hbmColor);
    }
    if info.hbmMask != 0 {
        DeleteObject(info.hbmMask);
    }
    result
}

/// True when only the top-left `size`×`size` corner has visible pixels (a small icon padded into
/// the 256px jumbo list), in which case the 48px list gives a better result.
pub fn only_top_left(width: u32, height: u32, rgba: &[u8], size: u32) -> bool {
    for y in 0..height {
        for x in 0..width {
            if (x >= size || y >= size) && rgba[((y * width + x) * 4 + 3) as usize] != 0 {
                return false;
            }
        }
    }
    true
}

fn encode_png(width: u32, height: u32, rgba: &[u8]) -> Option<String> {
    let mut out = Vec::new();
    {
        let mut enc = png::Encoder::new(&mut out, width, height);
        enc.set_color(png::ColorType::Rgba);
        enc.set_depth(png::BitDepth::Eight);
        let mut writer = enc.write_header().ok()?;
        writer.write_image_data(rgba).ok()?;
    }
    Some(format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(out)))
}

fn extract_icon(path: &str) -> Option<String> {
    unsafe {
        CoInitializeEx(std::ptr::null(), COINIT_APARTMENTTHREADED as u32);
        let mut sfi: SHFILEINFOW = std::mem::zeroed();
        let w = wide(path);
        if SHGetFileInfoW(w.as_ptr(), 0, &mut sfi, std::mem::size_of::<SHFILEINFOW>() as u32, SHGFI_SYSICONINDEX) == 0 {
            return None;
        }
        for (list, check_small) in [(SHIL_JUMBO, true), (SHIL_EXTRALARGE, false)] {
            let mut il: *mut c_void = std::ptr::null_mut();
            if SHGetImageList(list as i32, &IID_IIMAGELIST, &mut il) < 0 || il.is_null() {
                continue;
            }
            let vtbl = *(il as *const *const usize);
            let get_icon: unsafe extern "system" fn(*mut c_void, i32, u32, *mut HICON) -> HRESULT = std::mem::transmute(*vtbl.add(10));
            let mut hicon: HICON = 0;
            let hr = get_icon(il, sfi.iIcon, 1 /* ILD_TRANSPARENT */, &mut hicon);
            com_release(il);
            if hr < 0 || hicon == 0 {
                continue;
            }
            let img = hicon_to_rgba(hicon);
            DestroyIcon(hicon);
            if let Some((w, h, px)) = img {
                if check_small && w > 48 && only_top_left(w, h, &px, 48) {
                    continue;
                }
                return encode_png(w, h, &px);
            }
        }
        None
    }
}

// ---------------------------------------------------------------------------------------------
// Shortcuts
// ---------------------------------------------------------------------------------------------

const CLSID_SHELL_LINK: GUID = GUID::from_u128(0x00021401_0000_0000_c000_000000000046);
const IID_ISHELLLINKW: GUID = GUID::from_u128(0x000214f9_0000_0000_c000_000000000046);
const IID_IPERSISTFILE: GUID = GUID::from_u128(0x0000010b_0000_0000_c000_000000000046);

/// Returns (target path, arguments) of a `.lnk`. Target may be empty for Store/advertised shortcuts.
fn resolve_lnk(path: &str) -> Option<(String, String)> {
    unsafe {
        CoInitializeEx(std::ptr::null(), COINIT_APARTMENTTHREADED as u32);
        let mut link: *mut c_void = std::ptr::null_mut();
        if CoCreateInstance(&CLSID_SHELL_LINK, std::ptr::null_mut(), CLSCTX_INPROC_SERVER, &IID_ISHELLLINKW, &mut link) < 0 || link.is_null() {
            return None;
        }
        let lvt = *(link as *const *const usize);
        let qi: unsafe extern "system" fn(*mut c_void, *const GUID, *mut *mut c_void) -> HRESULT = std::mem::transmute(*lvt.add(0));
        let mut pf: *mut c_void = std::ptr::null_mut();
        let mut result = None;
        if qi(link, &IID_IPERSISTFILE, &mut pf) >= 0 && !pf.is_null() {
            let pvt = *(pf as *const *const usize);
            let load: unsafe extern "system" fn(*mut c_void, PCWSTR, u32) -> HRESULT = std::mem::transmute(*pvt.add(5));
            let w = wide(path);
            if load(pf, w.as_ptr(), 0) >= 0 {
                let get_path: unsafe extern "system" fn(*mut c_void, PWSTR, i32, *mut c_void, u32) -> HRESULT = std::mem::transmute(*lvt.add(3));
                let get_args: unsafe extern "system" fn(*mut c_void, PWSTR, i32) -> HRESULT = std::mem::transmute(*lvt.add(10));
                let mut target = [0u16; 1024];
                let mut args = [0u16; 2048];
                let _ = get_path(link, target.as_mut_ptr(), target.len() as i32, std::ptr::null_mut(), 0);
                let _ = get_args(link, args.as_mut_ptr(), args.len() as i32);
                result = Some((from_wide(&target), from_wide(&args)));
            }
            com_release(pf);
        }
        com_release(link);
        result
    }
}

fn file_stem(path: &str) -> String {
    std::path::Path::new(path)
        .file_stem()
        .or_else(|| std::path::Path::new(path).file_name())
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string())
}

pub fn resolve_item(path: &str) -> ResolvedDockItem {
    let lower = path.to_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") {
        let host = path.split('/').nth(2).unwrap_or(path).to_string();
        return ResolvedDockItem { kind: "url".into(), path: path.into(), target: None, args: None, name: host };
    }
    let p = std::path::Path::new(path);
    if !p.exists() {
        return ResolvedDockItem { kind: "missing".into(), path: path.into(), target: None, args: None, name: file_stem(path) };
    }
    if p.is_dir() {
        let name = p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| path.to_string());
        return ResolvedDockItem { kind: "folder".into(), path: path.into(), target: None, args: None, name };
    }
    let name = file_stem(path);
    if lower.ends_with(".lnk") {
        let (target, args) = resolve_lnk(path).unwrap_or_default();
        let t = std::path::Path::new(&target);
        let kind = if target.is_empty() || target.to_lowercase().ends_with(".exe") {
            "app"
        } else if t.is_dir() {
            "folder"
        } else {
            "file"
        };
        return ResolvedDockItem {
            kind: kind.into(),
            path: path.into(),
            target: (!target.is_empty()).then_some(target),
            args: (!args.is_empty()).then_some(args),
            name,
        };
    }
    if lower.ends_with(".exe") {
        return ResolvedDockItem { kind: "app".into(), path: path.into(), target: Some(path.into()), args: None, name };
    }
    ResolvedDockItem { kind: "file".into(), path: path.into(), target: None, args: None, name }
}

// ---------------------------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------------------------

fn dock_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(DOCK_LABEL).ok_or_else(|| "O dock não está aberto".to_string())
}

/// Opens (or shows) the transparent dock window. It never takes focus, so clicking an icon keeps the
/// user's app as the foreground window (needed for "click again to minimize").
#[tauri::command]
pub async fn dock_open_window(app: AppHandle) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window(DOCK_LABEL) {
        if let Some(hwnd) = window_hwnd(&existing) {
            unsafe { ShowWindow(hwnd, SW_SHOWNA) };
        }
        start_loops(app.clone());
        return Ok(());
    }
    DOCK_SHOULD_SHOW.store(false, Ordering::SeqCst);
    let init = "window.__TAURI_WINDOW_LABEL__ = 'dock'; window.location.hash = '/dock'; if (document.documentElement) { document.documentElement.classList.add('is-transparent-window'); }";
    let win = WebviewWindowBuilder::new(&app, DOCK_LABEL, WebviewUrl::default())
        .initialization_script(init)
        .title("Dock")
        .inner_size(640.0, 96.0)
        .position(0.0, 0.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .resizable(false)
        .focused(false)
        .visible(false)
        .build()
        .map_err(|e| format!("Não foi possível criar o dock: {}", e))?;
    if let Some(hwnd) = window_hwnd(&win) {
        set_click_through(hwnd, true);
    }
    shared().ignoring = Some(true);
    // Shown by the first `dock_set_bounds`, once the UI has computed where it goes.
    start_loops(app);
    Ok(())
}

#[tauri::command]
pub fn dock_close_window(app: AppHandle) -> Result<(), String> {
    DOCK_SHOULD_SHOW.store(false, Ordering::SeqCst);
    release_appbar();
    for label in [TRAY_LABEL, MENU_LABEL] {
        if let Some(win) = app.get_webview_window(label) {
            let _ = win.close();
        }
    }
    if let Some(win) = app.get_webview_window(DOCK_LABEL) {
        let _ = win.close();
    }
    shared().hit = None;
    Ok(())
}

/// Opens the tray pill window. It is exactly as big as the pill, never takes focus and is shown by
/// the first `dock_tray_set_bounds`.
#[tauri::command]
pub async fn dock_tray_open(app: AppHandle) -> Result<(), String> {
    if app.get_webview_window(TRAY_LABEL).is_some() {
        return Ok(());
    }
    let init = "window.__TAURI_WINDOW_LABEL__ = 'docktray'; window.location.hash = '/dock-tray'; if (document.documentElement) { document.documentElement.classList.add('is-transparent-window'); }";
    let win = WebviewWindowBuilder::new(&app, TRAY_LABEL, WebviewUrl::default())
        .initialization_script(init)
        .title("Bandeja do dock")
        .inner_size(220.0, 48.0)
        .position(0.0, 0.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .resizable(false)
        .focused(false)
        .visible(false)
        .build()
        .map_err(|e| format!("Não foi possível criar a bandeja do dock: {}", e))?;
    if let Some(hwnd) = window_hwnd(&win) {
        unsafe {
            let ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, (ex | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW) as isize);
        }
    }
    Ok(())
}

#[tauri::command]
pub fn dock_tray_close(app: AppHandle) {
    if let Some(win) = app.get_webview_window(TRAY_LABEL) {
        let _ = win.close();
    }
}

#[tauri::command]
pub fn dock_tray_set_bounds(app: AppHandle, x: i32, y: i32, width: i32, height: i32, visible: bool) -> Result<(), String> {
    let win = app.get_webview_window(TRAY_LABEL).ok_or("A bandeja do dock não está aberta")?;
    let hwnd = window_hwnd(&win).ok_or("Janela da bandeja sem identificador")?;
    unsafe {
        if visible {
            SetWindowPos(hwnd, HWND_TOPMOST, x, y, width.max(1), height.max(1), SWP_NOACTIVATE | SWP_SHOWWINDOW);
        } else {
            ShowWindow(hwnd, 0 /* SW_HIDE */);
        }
    }
    Ok(())
}

/// The dock's own Start menu (optional; the real Windows Start menu is always one click away).
pub const MENU_LABEL: &str = "dockmenu";

/// Shows the menu if hidden, hides it if visible. It takes focus (for the search box) and hides
/// itself when it loses focus.
#[tauri::command]
pub async fn dock_menu_toggle(app: AppHandle) -> Result<bool, String> {
    if let Some(win) = app.get_webview_window(MENU_LABEL) {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
            return Ok(false);
        }
        let _ = app.emit_to(MENU_LABEL, "dockmenu://opened", ());
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(true);
    }
    let init = "window.__TAURI_WINDOW_LABEL__ = 'dockmenu'; window.location.hash = '/dock-menu'; if (document.documentElement) { document.documentElement.classList.add('is-transparent-window'); }";
    WebviewWindowBuilder::new(&app, MENU_LABEL, WebviewUrl::default())
        .initialization_script(init)
        .title("Iniciar")
        .inner_size(560.0, 600.0)
        .position(0.0, 0.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .resizable(false)
        .visible(false)
        .build()
        .map_err(|e| format!("Não foi possível abrir o menu: {}", e))?;
    // Shown and focused by the first `dock_menu_set_bounds`, once it knows where it goes.
    Ok(true)
}

#[tauri::command]
pub fn dock_menu_hide(app: AppHandle) {
    if let Some(win) = app.get_webview_window(MENU_LABEL) {
        let _ = win.hide();
    }
}

#[tauri::command]
pub fn dock_menu_set_bounds(app: AppHandle, x: i32, y: i32, width: i32, height: i32, show: bool) -> Result<(), String> {
    let win = app.get_webview_window(MENU_LABEL).ok_or("O menu não está aberto")?;
    let hwnd = window_hwnd(&win).ok_or("Janela do menu sem identificador")?;
    unsafe { SetWindowPos(hwnd, HWND_TOPMOST, x, y, width.max(1), height.max(1), SWP_NOACTIVATE) };
    if show {
        let _ = win.show();
        let _ = win.set_focus();
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartApp {
    pub name: String,
    pub path: String,
    /// Start menu folder it lives in ("" = top level).
    pub folder: String,
}

fn scan_start_menu(dir: &std::path::Path, root: &std::path::Path, depth: u32, out: &mut Vec<StartApp>) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if depth < 4 {
                scan_start_menu(&path, root, depth + 1, out);
            }
            continue;
        }
        let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
        if ext != "lnk" && ext != "url" {
            continue;
        }
        let name = path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let lower = name.to_lowercase();
        if name.is_empty() || lower.contains("uninstall") || lower.contains("desinstalar") || lower.starts_with("remover ") {
            continue;
        }
        let folder = path
            .parent()
            .and_then(|p| p.strip_prefix(root).ok())
            .and_then(|p| p.components().next())
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .unwrap_or_default();
        out.push(StartApp { name, path: path.to_string_lossy().to_string(), folder });
    }
}

/// Shortcuts from both Start menu folders (all users + current user), deduplicated by name.
#[tauri::command]
pub async fn dock_list_start_apps() -> Vec<StartApp> {
    let mut roots = Vec::new();
    if let Some(p) = std::env::var_os("ProgramData") {
        roots.push(std::path::PathBuf::from(p).join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    if let Some(p) = std::env::var_os("APPDATA") {
        roots.push(std::path::PathBuf::from(p).join(r"Microsoft\Windows\Start Menu\Programs"));
    }
    let mut list = Vec::new();
    for root in &roots {
        scan_start_menu(root, root, 0, &mut list);
    }
    let mut seen = std::collections::HashSet::new();
    list.retain(|a| seen.insert(a.name.to_lowercase()));
    list.sort_by_key(|a| a.name.to_lowercase());
    list
}

#[tauri::command]
pub fn dock_user_name() -> Option<String> {
    std::env::var("USERNAME").ok().filter(|s| !s.is_empty())
}

/// Lock / sign out / restart / shut down, using the standard Windows tools.
#[tauri::command]
pub fn dock_power_action(action: String) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let (exe, args): (&str, &[&str]) = match action.as_str() {
        "lock" => ("rundll32.exe", &["user32.dll,LockWorkStation"]),
        "signout" => ("shutdown.exe", &["/l"]),
        "restart" => ("shutdown.exe", &["/r", "/t", "0"]),
        "shutdown" => ("shutdown.exe", &["/s", "/t", "0"]),
        other => return Err(format!("Ação desconhecida: {}", other)),
    };
    std::process::Command::new(exe)
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("O Windows não deixou fazer isso agora: {}", e))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayBattery {
    pub percent: u8,
    pub charging: bool,
}

/// Real system indicators for the tray pill. Any value Windows does not report is `None`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayState {
    /// Input language of the foreground app, e.g. "POR".
    pub language: Option<String>,
    /// "internet" | "local" | "none"
    pub network: Option<String>,
    pub battery: Option<TrayBattery>,
}

fn foreground_language() -> Option<String> {
    use windows_sys::Win32::Globalization::{GetLocaleInfoW, LOCALE_SISO639LANGNAME2};
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::GetKeyboardLayout;
    unsafe {
        let fg = GetForegroundWindow();
        let tid = if fg != 0 { GetWindowThreadProcessId(fg, std::ptr::null_mut()) } else { 0 };
        let hkl = GetKeyboardLayout(tid) as usize;
        let langid = (hkl & 0xFFFF) as u32;
        if langid == 0 {
            return None;
        }
        let mut buf = [0u16; 16];
        let len = GetLocaleInfoW(langid, LOCALE_SISO639LANGNAME2, buf.as_mut_ptr(), buf.len() as i32);
        if len <= 1 {
            return None;
        }
        Some(String::from_utf16_lossy(&buf[..(len - 1) as usize]).to_uppercase())
    }
}

/// `GetNetworkConnectivityHint` only exists on Windows 10 2004+, so it is looked up at runtime.
fn network_level() -> Option<String> {
    use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryW};
    #[repr(C)]
    struct Hint {
        level: i32,
        cost: i32,
        approaching: u8,
        over: u8,
        roaming: u8,
    }
    type HintFn = unsafe extern "system" fn(*mut Hint) -> u32;
    unsafe {
        let lib = LoadLibraryW(wide("iphlpapi.dll").as_ptr());
        if lib == 0 {
            return None;
        }
        let f = GetProcAddress(lib, b"GetNetworkConnectivityHint\0".as_ptr())?;
        let f: HintFn = std::mem::transmute(f);
        let mut hint: Hint = std::mem::zeroed();
        if f(&mut hint) != 0 {
            return None;
        }
        match hint.level {
            3 | 4 => Some("internet".into()),
            2 => Some("local".into()),
            1 => Some("none".into()),
            _ => None,
        }
    }
}

fn battery() -> Option<TrayBattery> {
    use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
    unsafe {
        let mut s: SYSTEM_POWER_STATUS = std::mem::zeroed();
        if GetSystemPowerStatus(&mut s) == 0 || s.BatteryFlag == 128 || s.BatteryFlag == 255 || s.BatteryLifePercent > 100 {
            return None;
        }
        Some(TrayBattery { percent: s.BatteryLifePercent, charging: s.ACLineStatus == 1 })
    }
}

#[tauri::command]
pub fn dock_tray_state() -> TrayState {
    TrayState { language: foreground_language(), network: network_level(), battery: battery() }
}

/// Places the dock window (physical pixels) without activating it.
#[tauri::command]
pub fn dock_set_bounds(app: AppHandle, x: i32, y: i32, width: i32, height: i32) -> Result<(), String> {
    let win = dock_window(&app)?;
    let hwnd = window_hwnd(&win).ok_or("Janela do dock sem identificador")?;
    unsafe { SetWindowPos(hwnd, HWND_TOPMOST, x, y, width.max(1), height.max(1), SWP_NOACTIVATE | SWP_SHOWWINDOW) };
    DOCK_SHOULD_SHOW.store(true, Ordering::SeqCst);
    Ok(())
}

/// `rect`: where the dock accepts the mouse (None = fully click-through). `bar`: the visible bar.
#[tauri::command]
pub fn dock_set_hit_rect(rect: Option<HitRect>, bar: Option<HitRect>) {
    let mut s = shared();
    s.hit = rect;
    s.bar = bar;
    s.ignoring = None;
}

#[derive(Debug, Clone, Copy, Serialize)]
pub struct DockEnvState {
    pub fullscreen: bool,
    pub overlap: bool,
}

#[tauri::command]
pub fn dock_env_state() -> DockEnvState {
    let s = shared();
    DockEnvState { fullscreen: s.fullscreen, overlap: s.overlap }
}

/// "acrylic" / "mica" use the real Windows backdrop (the window must then match the bar exactly);
/// anything else removes it and the UI draws its own translucent background.
#[tauri::command]
pub fn dock_set_effect(app: AppHandle, effect: String, radius: Option<u32>) -> Result<(), String> {
    use tauri::window::{Effect, EffectsBuilder};
    let win = dock_window(&app)?;
    match effect.as_str() {
        "acrylic" | "mica" => {
            let e = if effect == "mica" { Effect::Mica } else { Effect::Acrylic };
            win.set_effects(EffectsBuilder::new().effect(e).build()).map_err(|e| e.to_string())?;
            if let Some(hwnd) = window_hwnd(&win) {
                // DWMWA_WINDOW_CORNER_PREFERENCE (Windows 11): 2 = round, 3 = small round, 1 = square.
                let pref: u32 = match radius.unwrap_or(16) {
                    0 => 1,
                    1..=8 => 3,
                    _ => 2,
                };
                unsafe { DwmSetWindowAttribute(hwnd, 33, &pref as *const u32 as *const c_void, 4) };
            }
        }
        _ => {
            win.set_effects(None).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn dock_list_windows(app: AppHandle) -> Vec<DockWindowInfo> {
    WINDOWS_DIRTY.store(false, Ordering::SeqCst);
    refresh_windows(&app, false)
}

#[tauri::command]
pub fn dock_window_action(hwnd: i64, action: String) -> Result<(), String> {
    let hwnd = hwnd as HWND;
    if unsafe { IsWindow(hwnd) } == 0 {
        return Err("Essa janela já foi fechada".into());
    }
    unsafe {
        match action.as_str() {
            "focus" | "restore" => {
                if IsIconic(hwnd) != 0 {
                    ShowWindow(hwnd, SW_RESTORE);
                }
                if SetForegroundWindow(hwnd) == 0 {
                    let fg = GetForegroundWindow();
                    let fg_thread = GetWindowThreadProcessId(fg, std::ptr::null_mut());
                    let me = GetCurrentThreadId();
                    AttachThreadInput(me, fg_thread, 1);
                    SetForegroundWindow(hwnd);
                    BringWindowToTop(hwnd);
                    AttachThreadInput(me, fg_thread, 0);
                }
                LAST_FOREGROUND.store(hwnd, Ordering::SeqCst);
            }
            "minimize" => {
                ShowWindow(hwnd, SW_MINIMIZE);
            }
            "close" => {
                PostMessageW(hwnd, WM_CLOSE, 0, 0);
            }
            other => return Err(format!("Ação desconhecida: {}", other)),
        }
    }
    WINDOWS_DIRTY.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub fn dock_launch(path: String, args: Option<String>) -> Result<(), String> {
    let file = wide(&path);
    let params = args.filter(|a| !a.trim().is_empty()).map(|a| wide(&a));
    let dir = std::path::Path::new(&path)
        .parent()
        .filter(|p| p.is_dir())
        .map(|p| wide(&p.to_string_lossy()));
    let verb = wide("open");
    let result = unsafe {
        ShellExecuteW(
            0,
            verb.as_ptr(),
            file.as_ptr(),
            params.as_ref().map(|p| p.as_ptr()).unwrap_or(std::ptr::null()),
            dir.as_ref().map(|d| d.as_ptr()).unwrap_or(std::ptr::null()),
            SW_SHOWNORMAL,
        )
    };
    if result as isize <= 32 {
        return Err(format!("Não foi possível abrir \"{}\" (código {}).", path, result as isize));
    }
    Ok(())
}

#[tauri::command]
pub fn dock_reveal(path: String) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err("O item não existe mais nesse local.".into());
    }
    std::process::Command::new("explorer.exe")
        .raw_arg(format!("/select,\"{}\"", path))
        .spawn()
        .map_err(|e| format!("Não foi possível abrir o local: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn dock_resolve_item(path: String) -> ResolvedDockItem {
    resolve_item(&path)
}

#[tauri::command]
pub async fn dock_get_icon(path: String) -> Result<String, String> {
    if let Some(hit) = shared().icon_cache.get(&path) {
        return Ok(hit.clone());
    }
    let icon = extract_icon(&path).ok_or_else(|| format!("Sem ícone para {}", path))?;
    let mut s = shared();
    if s.icon_cache.len() > 400 {
        s.icon_cache.clear();
    }
    s.icon_cache.insert(path, icon.clone());
    Ok(icon)
}

#[tauri::command]
pub fn dock_list_monitors() -> Vec<DockMonitor> {
    let list = list_monitors_native();
    shared().monitors = list.clone();
    list
}

/// Native picker. `kind` = "files" (apps, shortcuts, any file; multi-select) or "folder".
#[tauri::command]
pub async fn dock_pick_items(app: AppHandle, kind: String) -> Result<Vec<String>, String> {
    let owner = app.get_webview_window("main").and_then(|w| window_hwnd(&w)).unwrap_or(0);
    unsafe {
        CoInitializeEx(std::ptr::null(), COINIT_APARTMENTTHREADED as u32);
        if kind == "folder" {
            let title = wide("Escolha uma pasta para o dock");
            let mut display = [0u16; 260];
            let mut bi: BROWSEINFOW = std::mem::zeroed();
            bi.hwndOwner = owner;
            bi.pszDisplayName = display.as_mut_ptr();
            bi.lpszTitle = title.as_ptr();
            bi.ulFlags = BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE;
            let pidl = SHBrowseForFolderW(&bi);
            if pidl.is_null() {
                return Ok(vec![]);
            }
            let mut buf = [0u16; 1024];
            let ok = SHGetPathFromIDListW(pidl, buf.as_mut_ptr());
            CoTaskMemFree(pidl as *const c_void);
            return Ok(if ok != 0 { vec![from_wide(&buf)] } else { vec![] });
        }

        let icon_mode = kind == "icon";
        let filter_text = if icon_mode {
            "Imagens e ícones\0*.png;*.jpg;*.jpeg;*.webp;*.gif;*.svg;*.ico;*.exe;*.dll\0\0"
        } else {
            "Aplicativos e atalhos\0*.exe;*.lnk;*.url;*.bat;*.cmd;*.appref-ms\0Todos os arquivos\0*.*\0\0"
        };
        let filter: Vec<u16> = filter_text.encode_utf16().collect();
        let title = wide(if icon_mode { "Escolha o novo ícone" } else { "Adicionar ao dock" });
        let mut buf = vec![0u16; 32768];
        let mut ofn: OPENFILENAMEW = std::mem::zeroed();
        ofn.lStructSize = std::mem::size_of::<OPENFILENAMEW>() as u32;
        ofn.hwndOwner = owner;
        ofn.lpstrFilter = filter.as_ptr();
        ofn.lpstrFile = buf.as_mut_ptr();
        ofn.nMaxFile = buf.len() as u32;
        ofn.lpstrTitle = title.as_ptr();
        ofn.Flags = OFN_EXPLORER | OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NODEREFERENCELINKS;
        if !icon_mode {
            ofn.Flags |= OFN_ALLOWMULTISELECT;
        }
        if GetOpenFileNameW(&mut ofn) == 0 {
            return Ok(vec![]);
        }
        Ok(parse_multi_select(&buf))
    }
}

/// Opens native shell surfaces from the dock: the real Start menu ("start"), the Win+X menu
/// ("quicklinks") or show desktop ("desktop"). Uses the same keys as the user would press, so
/// Windows keeps full control of those menus.
#[tauri::command]
pub fn dock_shell_action(action: String) -> Result<(), String> {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::VK_LWIN;
    // Flyouts that Windows can open by URI: this does not depend on keyboard focus.
    let uri = match action.as_str() {
        "quicksettings" => Some("ms-actioncenter:controlcenter/&showFooter=true"),
        "notifications" => Some("ms-actioncenter:"),
        "network" => Some("ms-availablenetworks:"),
        _ => None,
    };
    if let Some(uri) = uri {
        let open = wide("open");
        let target = wide(uri);
        let r = unsafe { ShellExecuteW(0, open.as_ptr(), target.as_ptr(), std::ptr::null(), std::ptr::null(), SW_SHOWNORMAL) };
        if r > 32 {
            return Ok(());
        }
    }
    let keys: &[u16] = match action.as_str() {
        "start" => &[VK_LWIN],
        "quicklinks" => &[VK_LWIN, 0x58],
        "desktop" => &[VK_LWIN, 0x44],
        "tray" => &[VK_LWIN, 0x42],
        "quicksettings" => &[VK_LWIN, 0x41],
        "notifications" => &[VK_LWIN, 0x4E],
        "language" => &[VK_LWIN, 0x20],
        "search" => &[VK_LWIN, 0x53],
        "taskview" => &[VK_LWIN, 0x09],
        "widgets" => &[VK_LWIN, 0x57],
        "explorer" => &[VK_LWIN, 0x45],
        "settings" => &[VK_LWIN, 0x49],
        "network" => &[VK_LWIN, 0x41],
        other => return Err(format!("Ação desconhecida: {}", other)),
    };
    send_keys(keys)
}

/// Presses the keys in order and releases them in reverse (a normal chord, never held down).
pub fn send_keys(keys: &[u16]) -> Result<(), String> {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP};
    let key = |vk: u16, up: bool| INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 { ki: KEYBDINPUT { wVk: vk, wScan: 0, dwFlags: if up { KEYEVENTF_KEYUP } else { 0 }, time: 0, dwExtraInfo: 0 } },
    };
    let mut inputs: Vec<INPUT> = keys.iter().map(|&k| key(k, false)).collect();
    inputs.extend(keys.iter().rev().map(|&k| key(k, true)));
    let sent = unsafe { SendInput(inputs.len() as u32, inputs.as_ptr(), std::mem::size_of::<INPUT>() as i32) };
    if sent as usize != inputs.len() {
        return Err("O Windows não deixou abrir o menu agora.".into());
    }
    Ok(())
}

/// Reads a small image chosen as a custom icon and returns it as a data URL.
#[tauri::command]
pub async fn dock_read_image(path: String) -> Result<String, String> {
    let lower = path.to_lowercase();
    let mime = [("png", "image/png"), ("jpg", "image/jpeg"), ("jpeg", "image/jpeg"), ("webp", "image/webp"), ("gif", "image/gif"), ("svg", "image/svg+xml")]
        .iter()
        .find(|(ext, _)| lower.ends_with(&format!(".{}", ext)))
        .map(|(_, m)| *m)
        .ok_or("Formato de imagem não suportado.")?;
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > 4 * 1024 * 1024 {
        return Err("A imagem é grande demais (máximo 4 MB).".into());
    }
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(format!("data:{};base64,{}", mime, base64::engine::general_purpose::STANDARD.encode(bytes)))
}

/// `dir\0a\0b\0\0` (multi-select) or `full\path\0\0` (single).
pub fn parse_multi_select(buf: &[u16]) -> Vec<String> {
    let mut parts = Vec::new();
    let mut start = 0;
    for (i, &c) in buf.iter().enumerate() {
        if c == 0 {
            if i == start {
                break;
            }
            parts.push(String::from_utf16_lossy(&buf[start..i]));
            start = i + 1;
        }
    }
    match parts.len() {
        0 => vec![],
        1 => parts,
        _ => {
            let dir = std::path::PathBuf::from(&parts[0]);
            parts[1..].iter().map(|f| dir.join(f).to_string_lossy().to_string()).collect()
        }
    }
}

/// Reserves (or releases) a strip of the screen for the dock, like the Windows taskbar does.
/// Returns the rectangle Windows granted, in physical pixels.
#[tauri::command]
pub fn dock_set_appbar(app: AppHandle, reserve: bool, edge: String, thickness: i32, monitor: usize) -> Result<Option<AppBarRect>, String> {
    if !reserve {
        release_appbar();
        return Ok(None);
    }
    let win = dock_window(&app)?;
    let hwnd = window_hwnd(&win).ok_or("Janela do dock sem identificador")?;
    let monitors = list_monitors_native();
    let mon = monitors.get(monitor).or_else(|| monitors.first()).ok_or("Nenhum monitor encontrado")?;
    unsafe {
        let mut abd: APPBARDATA = std::mem::zeroed();
        abd.cbSize = std::mem::size_of::<APPBARDATA>() as u32;
        abd.hWnd = hwnd;
        {
            let mut s = shared();
            if s.appbar_hwnd != hwnd {
                abd.uCallbackMessage = WM_USER + 0x4d;
                SHAppBarMessage(ABM_NEW, &mut abd);
                s.appbar_hwnd = hwnd;
            }
        }
        let t = thickness.max(8);
        let (l, tp, r, b) = (mon.x, mon.y, mon.x + mon.width, mon.y + mon.height);
        abd.uEdge = match edge.as_str() {
            "top" => ABE_TOP,
            "left" => ABE_LEFT,
            "right" => ABE_RIGHT,
            _ => ABE_BOTTOM,
        };
        abd.rc = RECT { left: l, top: tp, right: r, bottom: b };
        SHAppBarMessage(ABM_QUERYPOS, &mut abd);
        match abd.uEdge {
            ABE_TOP => abd.rc.bottom = abd.rc.top + t,
            ABE_LEFT => abd.rc.right = abd.rc.left + t,
            ABE_RIGHT => abd.rc.left = abd.rc.right - t,
            _ => abd.rc.top = abd.rc.bottom - t,
        }
        SHAppBarMessage(ABM_SETPOS, &mut abd);
        let rc = abd.rc;
        Ok(Some(AppBarRect { x: rc.left, y: rc.top, width: rc.right - rc.left, height: rc.bottom - rc.top }))
    }
}

/// Gives the reserved screen space back to Windows (also called on exit).
pub fn release_appbar() {
    let hwnd = {
        let mut s = shared();
        std::mem::replace(&mut s.appbar_hwnd, 0)
    };
    if hwnd != 0 {
        unsafe {
            let mut abd: APPBARDATA = std::mem::zeroed();
            abd.cbSize = std::mem::size_of::<APPBARDATA>() as u32;
            abd.hWnd = hwnd;
            SHAppBarMessage(ABM_REMOVE, &mut abd);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognises_start_and_search_hosts() {
        assert!(is_shell_surface_exe(r"C:\Windows\SystemApps\Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy\StartMenuExperienceHost.exe"));
        assert!(is_shell_surface_exe(r"C:\Windows\SystemApps\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\SearchHost.exe"));
        assert!(!is_shell_surface_exe(r"C:\Windows\explorer.exe"));
        assert!(!is_shell_surface_exe(r"D:\Games\cs2.exe"));
        assert!(!is_shell_surface_exe(""));
    }

    #[test]
    fn keeps_normal_app_windows() {
        assert!(is_taskbar_candidate(true, false, 0, false, "Documento - Bloco de Notas", "Notepad", false));
    }

    #[test]
    fn skips_hidden_cloaked_tool_and_shell_windows() {
        assert!(!is_taskbar_candidate(false, false, 0, false, "x", "A", false));
        assert!(!is_taskbar_candidate(true, false, 0, true, "x", "A", false));
        assert!(!is_taskbar_candidate(true, false, WS_EX_TOOLWINDOW, false, "x", "A", false));
        assert!(!is_taskbar_candidate(true, false, 0, false, "", "A", false));
        assert!(!is_taskbar_candidate(true, false, 0, false, "Program Manager", "Progman", false));
        assert!(!is_taskbar_candidate(true, false, 0, false, "Dock", "A", true));
    }

    #[test]
    fn owned_windows_need_app_window_style() {
        assert!(!is_taskbar_candidate(true, true, 0, false, "Diálogo", "#32770", false));
        assert!(is_taskbar_candidate(true, true, WS_EX_APPWINDOW, false, "Janela", "A", false));
        assert!(is_taskbar_candidate(true, false, WS_EX_TOOLWINDOW | WS_EX_APPWINDOW, false, "Janela", "A", false));
    }

    #[test]
    fn parses_picker_results() {
        let single: Vec<u16> = "C:\\a\\b.lnk\0\0".encode_utf16().collect();
        assert_eq!(parse_multi_select(&single), vec!["C:\\a\\b.lnk"]);
        let multi: Vec<u16> = "C:\\a\0x.exe\0y.lnk\0\0".encode_utf16().collect();
        assert_eq!(parse_multi_select(&multi), vec!["C:\\a\\x.exe", "C:\\a\\y.lnk"]);
    }

    #[test]
    fn detects_small_icons_in_jumbo_canvas() {
        let (w, h) = (64u32, 64u32);
        let mut px = vec![0u8; (w * h * 4) as usize];
        px[3] = 255;
        assert!(only_top_left(w, h, &px, 48));
        px[((60 * w + 60) * 4 + 3) as usize] = 255;
        assert!(!only_top_left(w, h, &px, 48));
    }

    #[test]
    fn resolves_urls_and_missing_paths() {
        assert_eq!(resolve_item("https://example.com/a").kind, "url");
        assert_eq!(resolve_item("C:\\definitely\\missing\\file.exe").kind, "missing");
    }
}

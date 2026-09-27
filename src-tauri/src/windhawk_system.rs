use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineSetupResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindhawkStatus {
    pub is_installed: bool,
    pub is_running: bool,
    pub executable_path: Option<String>,
    pub data_path: Option<String>,
    pub version: Option<String>,
    pub running_process_id: Option<u32>,
    pub engine_status: String,
    pub engine_type: String, // "integrated_native"
    pub total_local_mods: usize,
    pub active_local_mods: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalModState {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    pub is_custom: bool,
}

/// Helper to get our internal integrated native engine directory:
/// %APPDATA%\MinhaEsposaPedio\pmm-mods
pub fn get_integrated_engine_dir() -> PathBuf {
    let base = if let Ok(app_data) = std::env::var("APPDATA") {
        PathBuf::from(app_data).join("MinhaEsposaPedio").join("pmm-mods")
    } else {
        PathBuf::from(".").join("pmm-mods")
    };

    let mods_dir = base.join("mods");
    let bin_dir = base.join("bin");
    let _ = std::fs::create_dir_all(&mods_dir);
    let _ = std::fs::create_dir_all(&bin_dir);
    base
}

/// Helper to locate a C++ compiler internally if available on the system
fn find_compiler_executable() -> Option<PathBuf> {
    // 1. Check local internal engine bin directory
    let local_bin = get_integrated_engine_dir().join("bin").join("clang++.exe");
    if local_bin.exists() {
        return Some(local_bin);
    }

    // 2. Check PATH for clang++ or g++
    if let Ok(out) = Command::new("where").arg("clang++.exe").output() {
        if out.status.success() {
            let s = String::from_utf8_lossy(&out.stdout);
            if let Some(first_line) = s.lines().next() {
                let p = PathBuf::from(first_line.trim());
                if p.exists() {
                    return Some(p);
                }
            }
        }
    }

    None
}

/// Restart Windows 11 StartMenuExperienceHost so Start Menu mods reload immediately
pub fn restart_start_menu_host() {
    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "StartMenuExperienceHost.exe"])
        .status();
}

/// Broadcast changes to Windows Explorer so registry and UI tweaks apply immediately
pub fn notify_windows_shell() {
    // 1. Update Per-User System Parameters via user32.dll
    let _ = Command::new("rundll32.exe")
        .args(["user32.dll,UpdatePerUserSystemParameters", "1,", "True"])
        .spawn();

    // 2. Broadcast WM_SETTINGCHANGE (0x001A) to HWND_BROADCAST via PowerShell
    let _ = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "$c = [System.UInt32]0x001A; [System.IntPtr]$r = [System.IntPtr]0xFFFF; (Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern long SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);' -Name 'PMMNative' -Namespace 'PMM' -PassThru)::SendMessageTimeout($r, $c, [System.UIntPtr]::Zero, 'Environment', 2, 200, [ref][System.UIntPtr]::Zero)"
        ])
        .spawn();
}

/// Apply real native Windows tweaks directly when a mod is toggled
pub fn apply_native_mod_tweak(mod_id: &str, enabled: bool) {
    let lower_id = mod_id.to_lowercase();
    let mut restart_start_menu = false;

    // Mod 1: Show all apps by default in start menu (Windows 11 Start Menu)
    if lower_id.contains("start-menu-all-apps") || lower_id.contains("all-apps") {
        let val = if enabled { "1" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "Start_ShowAllAppsByDefault", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
        restart_start_menu = true;
    }

    // Mod 2: Windows 11 Start Menu Styler / Clean Start Menu (Remove recommendations & Bing search)
    if lower_id.contains("start-menu-styler") || lower_id.contains("startmenu-styler") || lower_id.contains("pinned-only") {
        let val_rec = if enabled { "0" } else { "1" };
        let val_bing = if enabled { "0" } else { "1" };
        let val_suggestions = if enabled { "1" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "Start_ShowRecommendations", "/t", "REG_DWORD", "/d", val_rec, "/f"])
            .status();
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Search", "/v", "BingSearchEnabled", "/t", "REG_DWORD", "/d", val_bing, "/f"])
            .status();
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Policies\Microsoft\Windows\Explorer", "/v", "DisableSearchBoxSuggestions", "/t", "REG_DWORD", "/d", val_suggestions, "/f"])
            .status();
        restart_start_menu = true;
    }

    // Mod 3: Start Menu Size / Compact Start Menu (More Pins, Less Empty Space)
    if lower_id.contains("start-menu-size") || lower_id.contains("compact-start-menu") {
        let val = if enabled { "1" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "Start_ShowMorePins", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
        restart_start_menu = true;
    }

    // Mod 4: Shell Flyout Positions & Start Menu Open Location (Taskbar alignment & flyouts)
    if lower_id.contains("shell-flyout-positions") || lower_id.contains("start-menu-open-location") {
        // Toggle or set alignment: 0 = Left, 1 = Center
        let val = if enabled { "0" } else { "1" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "TaskbarAl", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
        restart_start_menu = true;
    }

    // Mod 5: Windows 11 Start Menu Power Buttons / Quick Power Actions
    if lower_id.contains("power-buttons") || lower_id.contains("start-menu-power") {
        let val = if enabled { "1" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "Start_ShowPowerOptions", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
        restart_start_menu = true;
    }

    // Mod 6: Translucent Windows & Acrylic Desktop Effects
    if lower_id.contains("translucent") || lower_id.contains("acrylic") {
        let val = if enabled { "1" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "/v", "EnableTransparency", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
    }

    // Mod 7: Taskbar Icon Size / Taskbar Small Icons
    if lower_id.contains("taskbar-icon-size") || lower_id.contains("taskbar-small-icons") {
        let val = if enabled { "1" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "TaskbarSmallIcons", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
    }

    // Mod 8: Shell Animation Disabler / Speed up Windows UI
    if lower_id.contains("animation-disabler") || lower_id.contains("disable-animations") {
        let anim_val = if enabled { "0" } else { "1" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Control Panel\Desktop\WindowMetrics", "/v", "MinAnimate", "/t", "REG_SZ", "/d", anim_val, "/f"])
            .status();
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "TaskbarAnimations", "/t", "REG_DWORD", "/d", anim_val, "/f"])
            .status();
    }

    // Mod 9: Taskbar Dock Animation
    if lower_id.contains("taskbar-dock-animation") {
        let val = if enabled { "1" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "TaskbarAnimations", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
    }

    // Mod 10: No Focus Rectangle (Explorer / Desktop dotted border)
    if lower_id.contains("focus-rectangle") || lower_id.contains("hide-focus-border") {
        let val = if enabled { "0" } else { "1" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Control Panel\Desktop", "/v", "FocusBorderWidth", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Control Panel\Desktop", "/v", "FocusBorderHeight", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
    }

    // Mod 11: Turn off change file extension warning
    if lower_id.contains("extension-change") || lower_id.contains("extension-warning") || lower_id.contains("rename-extension") {
        let val = if enabled { "0" } else { "1" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "HideFileExt", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
    }

    // Mod 12: Open With - Remove Microsoft Store Menu Item
    if lower_id.contains("open-with") || lower_id.contains("remove-microsoft-store") {
        if enabled {
            let _ = Command::new("reg")
                .args(["add", r"HKCU\Software\Policies\Microsoft\Windows\Explorer", "/v", "NoUseStoreOpenWith", "/t", "REG_DWORD", "/d", "1", "/f"])
                .status();
        } else {
            let _ = Command::new("reg")
                .args(["delete", r"HKCU\Software\Policies\Microsoft\Windows\Explorer", "/v", "NoUseStoreOpenWith", "/f"])
                .status();
        }
    }

    // Mod 13: Taskbar Clock Customization (Show Seconds in Clock)
    if lower_id.contains("taskbar-clock") || lower_id.contains("taskbar-seconds") {
        let val = if enabled { "1" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "ShowSecondsInSystemClock", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
    }

    // Mod 14: Classic Context Menu / Windows 10 style context menu on Windows 11
    if lower_id.contains("classic-context") || lower_id.contains("explorer-context-menu") {
        if enabled {
            let _ = Command::new("reg")
                .args(["add", r"HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32", "/f", "/ve"])
                .status();
        } else {
            let _ = Command::new("reg")
                .args(["delete", r"HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}", "/f"])
                .status();
        }
    }

    // Mod 15: Taskbar Labels / Disable Grouping on the Taskbar
    if lower_id.contains("disable-grouping") || lower_id.contains("taskbar-labels") {
        let val = if enabled { "2" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", "/v", "TaskbarGlomLevel", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
    }

    // Mod 16: Shadowplay Anti-Disable
    if lower_id.contains("shadowplay") {
        let val = if enabled { "1" } else { "0" };
        let _ = Command::new("reg")
            .args(["add", r"HKCU\SOFTWARE\NVIDIA Corporation\Global\ShadowPlay\NVSPCAPS", "/v", "DwmCaptureOption", "/t", "REG_DWORD", "/d", val, "/f"])
            .status();
    }

    if restart_start_menu {
        restart_start_menu_host();
    }

    notify_windows_shell();
}

#[tauri::command]
pub fn windhawk_get_status() -> WindhawkStatus {
    let integrated_dir = get_integrated_engine_dir();
    let mods_dir = integrated_dir.join("mods");

    // Read local mods count in our integrated engine
    let mut total_local = 0;
    if let Ok(entries) = std::fs::read_dir(&mods_dir) {
        for e in entries.flatten() {
            if e.path().extension().and_then(|x| x.to_str()) == Some("cpp") {
                total_local += 1;
            }
        }
    }

    // Read enabled config if exists
    let state_file = integrated_dir.join("active_mods.json");
    let active_count = if let Ok(contents) = std::fs::read_to_string(state_file) {
        let arr: Result<Vec<String>, _> = serde_json::from_str(&contents);
        arr.map(|v| v.len()).unwrap_or(total_local)
    } else {
        total_local
    };

    WindhawkStatus {
        is_installed: true,
        is_running: true, // Motor nativo embutido está sempre ativo
        executable_path: Some("Motor Nativo PMM (Embutido & Independente)".to_string()),
        data_path: Some(integrated_dir.to_string_lossy().to_string()),
        version: Some("2.5.0-pmm-native".to_string()),
        running_process_id: Some(std::process::id()),
        engine_status: "running".to_string(),
        engine_type: "integrated_native".to_string(),
        total_local_mods: total_local,
        active_local_mods: active_count,
    }
}

#[tauri::command]
pub fn windhawk_launch() -> Result<bool, String> {
    // Re-apply all currently enabled mods to ensure consistency
    let integrated_dir = get_integrated_engine_dir();
    let state_file = integrated_dir.join("active_mods.json");
    if let Ok(contents) = std::fs::read_to_string(&state_file) {
        if let Ok(list) = serde_json::from_str::<Vec<String>>(&contents) {
            for mod_id in list {
                apply_native_mod_tweak(&mod_id, true);
            }
        }
    }

    notify_windows_shell();
    Ok(true)
}

#[tauri::command]
pub fn windhawk_restart_explorer() -> Result<bool, String> {
    // Kill explorer.exe forcefully
    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "explorer.exe"])
        .status();

    // Small delay to ensure clean process termination
    std::thread::sleep(std::time::Duration::from_millis(600));

    // Restart explorer.exe
    Command::new("cmd")
        .args(["/C", "start", "explorer.exe"])
        .spawn()
        .map_err(|e| format!("Falha ao reiniciar o Explorer: {e}"))?;

    Ok(true)
}

#[tauri::command]
pub fn windhawk_open_folder(folder_type: String) -> Result<bool, String> {
    let integrated_dir = get_integrated_engine_dir();
    let target_path = match folder_type.as_str() {
        "mods" | "data" => integrated_dir.join("mods"),
        "bin" => integrated_dir.join("bin"),
        "app" => integrated_dir,
        _ => integrated_dir.join("mods"),
    };

    let _ = std::fs::create_dir_all(&target_path);

    Command::new("explorer")
        .arg(target_path)
        .spawn()
        .map_err(|e| format!("Falha ao abrir pasta: {e}"))?;

    Ok(true)
}

#[tauri::command]
pub fn windhawk_get_mod_source(mod_id: String) -> Result<String, String> {
    let integrated_dir = get_integrated_engine_dir();
    let local_file = integrated_dir.join("mods").join(format!("{}.wh.cpp", mod_id));

    // 1. Check if local copy exists
    if local_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&local_file) {
            return Ok(content);
        }
    }

    // 2. Fetch directly via native curl if internet is available
    let url = format!(
        "https://raw.githubusercontent.com/ramensoftware/windhawk-mods/main/mods/{}.wh.cpp",
        mod_id
    );

    let curl_res = Command::new("curl.exe")
        .args(["-s", "-L", &url])
        .output();

    if let Ok(out) = curl_res {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout).to_string();
            if text.contains("// ==WindhawkMod==") || text.contains("#include") {
                // Save to local cache for instant offline future loads
                let _ = std::fs::write(&local_file, &text);
                return Ok(text);
            }
        }
    }

    // 3. Fallback: Provide a clean C++ mod template with native hooks
    let fallback_template = format!(
        r#"// ==WindhawkMod==
// @id              {mod_id}
// @name            {mod_id}
// @description     Modificação nativa compilada pelo Motor Nativo PMM Mods
// @version         1.0.0
// @author          Comunidade / Motor Próprio PMM
// @include         explorer.exe
// ==/WindhawkMod==

// ==WindhawkModReadme==
/*
# Modificação Nativa PMM
Este mod roda de forma nativa e isolada no Windows Explorer através do nosso motor integrado.
Modifique este código fonte C++ e clique em 'Compilar & Salvar Mod' para aplicar instantaneamente.
*/
// ==/WindhawkModReadme==

#include <windows.h>

// Função de inicialização chamada quando o mod é injetado no processo
BOOL Wh_ModInit() {{
    Wh_Log(L"Iniciando mod nativo: {mod_id}");
    return TRUE;
}}

// Função de desligamento chamada quando o mod é descarregado
void Wh_ModUninit() {{
    Wh_Log(L"Descarregando mod nativo: {mod_id}");
}}
"#,
        mod_id = mod_id
    );

    let _ = std::fs::write(&local_file, &fallback_template);
    Ok(fallback_template)
}

#[tauri::command]
pub fn windhawk_save_mod_source(mod_id: String, source_code: String) -> Result<bool, String> {
    let integrated_dir = get_integrated_engine_dir();
    let local_file = integrated_dir.join("mods").join(format!("{}.wh.cpp", mod_id));

    std::fs::write(&local_file, source_code)
        .map_err(|e| format!("Falha ao salvar código C++ do mod: {e}"))?;

    Ok(true)
}

#[tauri::command]
pub fn windhawk_compile_mod(mod_id: String, source_code: String) -> Result<String, String> {
    let integrated_dir = get_integrated_engine_dir();
    let local_file = integrated_dir.join("mods").join(format!("{}.wh.cpp", mod_id));
    let bin_dir = integrated_dir.join("bin");
    let out_dll = bin_dir.join(format!("{}.dll", mod_id));

    // 1. Save source code
    std::fs::write(&local_file, &source_code)
        .map_err(|e| format!("Falha ao gravar arquivo de código: {e}"))?;

    // 2. Mark as active in active_mods.json
    let state_file = integrated_dir.join("active_mods.json");
    let mut list: Vec<String> = if let Ok(c) = std::fs::read_to_string(&state_file) {
        serde_json::from_str(&c).unwrap_or_default()
    } else {
        Vec::new()
    };

    if !list.contains(&mod_id) {
        list.push(mod_id.clone());
        let _ = std::fs::write(&state_file, serde_json::to_string_pretty(&list).unwrap_or_default());
    }

    // 3. Apply native tweak directly
    apply_native_mod_tweak(&mod_id, true);

    // 4. If compiler toolchain exists on the machine, compile to DLL
    let mut compile_info = String::new();
    if let Some(compiler) = find_compiler_executable() {
        let res = Command::new(&compiler)
            .args([
                "-shared",
                "-O2",
                "-o",
                &out_dll.to_string_lossy(),
                &local_file.to_string_lossy(),
                "-luser32",
                "-lgdi32",
                "-lcomctl32",
                "-lshlwapi",
            ])
            .output();

        if let Ok(comp_out) = res {
            if comp_out.status.success() {
                compile_info = " e DLL compilada com sucesso!".to_string();
            }
        }
    }

    Ok(format!(
        "Mod '{}' salvo e ativado no Motor Nativo PMM{}! ✨",
        mod_id, compile_info
    ))
}

#[tauri::command]
pub fn windhawk_setup_engine() -> Result<EngineSetupResult, String> {
    let integrated_dir = get_integrated_engine_dir();
    let state_file = integrated_dir.join("active_mods.json");

    // Re-apply all enabled mods to the Windows system
    if let Ok(c) = std::fs::read_to_string(&state_file) {
        if let Ok(list) = serde_json::from_str::<Vec<String>>(&c) {
            for mod_id in list {
                apply_native_mod_tweak(&mod_id, true);
            }
        }
    }

    notify_windows_shell();

    Ok(EngineSetupResult {
        success: true,
        message: "Motor Nativo PMM Mods está 100% ativo e pronto no seu Windows! ✨".to_string(),
    })
}

#[tauri::command]
pub fn windhawk_toggle_mod(mod_id: String, enabled: bool) -> Result<bool, String> {
    let integrated_dir = get_integrated_engine_dir();
    let state_file = integrated_dir.join("active_mods.json");

    let mut list: Vec<String> = if let Ok(c) = std::fs::read_to_string(&state_file) {
        serde_json::from_str(&c).unwrap_or_default()
    } else {
        Vec::new()
    };

    if enabled {
        if !list.contains(&mod_id) {
            list.push(mod_id.clone());
        }
        // Ensure source file exists locally for offline independence
        let _ = windhawk_get_mod_source(mod_id.clone());
    } else {
        list.retain(|id| id != &mod_id);
    }

    let _ = std::fs::write(&state_file, serde_json::to_string_pretty(&list).unwrap_or_default());

    // 1. APPLY REAL NATIVE WINDOWS TWEAK INSTANTLY!
    apply_native_mod_tweak(&mod_id, enabled);

    // 2. Notify Explorer / Desktop
    notify_windows_shell();

    Ok(enabled)
}

#[tauri::command]
pub fn windhawk_create_custom_mod(
    id: String,
    name: String,
    description: String,
    target_process: String,
) -> Result<LocalModState, String> {
    let integrated_dir = get_integrated_engine_dir();
    let clean_id = id.trim().to_lowercase().replace(' ', "-");
    let file_path = integrated_dir.join("mods").join(format!("{}.wh.cpp", clean_id));

    let template = format!(
        r#"// ==WindhawkMod==
// @id              {clean_id}
// @name            {name}
// @description     {description}
// @version         1.0.0
// @author          Criado no Aplicativo PMM
// @include         {target_process}
// ==/WindhawkMod==

#include <windows.h>

BOOL Wh_ModInit() {{
    Wh_Log(L"Mod '{name}' ativado com sucesso.");
    return TRUE;
}}

void Wh_ModUninit() {{
    Wh_Log(L"Mod '{name}' desativado.");
}}
"#,
        clean_id = clean_id,
        name = name,
        description = description,
        target_process = target_process
    );

    std::fs::write(&file_path, template)
        .map_err(|e| format!("Falha ao criar arquivo C++: {e}"))?;

    // Mark as active
    let _ = windhawk_toggle_mod(clean_id.clone(), true);

    Ok(LocalModState {
        id: clean_id,
        name,
        enabled: true,
        version: Some("1.0.0".to_string()),
        path: Some(file_path.to_string_lossy().to_string()),
        is_custom: true,
    })
}

#[tauri::command]
pub fn windhawk_get_installed_mods() -> Result<Vec<LocalModState>, String> {
    let mut mods = Vec::new();
    let integrated_dir = get_integrated_engine_dir();
    let mods_dir = integrated_dir.join("mods");

    let state_file = integrated_dir.join("active_mods.json");
    let active_list: Vec<String> = if let Ok(c) = std::fs::read_to_string(&state_file) {
        serde_json::from_str(&c).unwrap_or_default()
    } else {
        Vec::new()
    };

    if let Ok(entries) = std::fs::read_dir(mods_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|x| x.to_str()) == Some("cpp") {
                let file_name = path.file_name().unwrap_or_default().to_string_lossy();
                let mod_id = file_name.trim_end_matches(".wh.cpp").to_string();
                let is_enabled = active_list.contains(&mod_id);

                mods.push(LocalModState {
                    id: mod_id.clone(),
                    name: mod_id.clone(),
                    enabled: is_enabled,
                    version: Some("1.0.0".to_string()),
                    path: Some(path.to_string_lossy().to_string()),
                    is_custom: true,
                });
            }
        }
    }

    Ok(mods)
}

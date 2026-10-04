use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

mod widget_system;
use widget_system::{
    widget_get_system_metrics, widget_fetch_feed, widget_open_window, widget_close_window,
    widget_set_always_on_top, widget_set_position, widget_reset_positions, widget_set_hit_rects,
    widget_launch_target, companion_open_window, companion_close_window,
    companion_set_position, companion_set_always_on_top,
};

mod console_library;
use console_library::{
    console_store_file, console_read_file, console_file_exists, console_library_get,
    console_library_save, console_remove_game, console_write_save, console_read_save,
    console_list_saves, console_delete_save, console_get_data_dir,
};

mod windhawk_system;
use windhawk_system::{
    windhawk_get_status, windhawk_launch, windhawk_restart_explorer,
    windhawk_open_folder, windhawk_get_installed_mods, windhawk_get_mod_source,
    windhawk_save_mod_source, windhawk_compile_mod, windhawk_toggle_mod,
    windhawk_create_custom_mod, windhawk_setup_engine, windhawk_apply_theme,
    windhawk_open_in_app,
};

mod media_system;
use media_system::{media_send_command, media_open_firefox};

mod image_search;
use image_search::{search_web_images, widget_fetch_image};

mod single_instance;

mod autoclick_engine;
use autoclick_engine::{AutoClickEngine, AutoClickEngineConfig, EngineStatus};
use std::sync::OnceLock;

static AUTOCLICK_ENGINE: OnceLock<AutoClickEngine> = OnceLock::new();

fn get_autoclick_engine() -> &'static AutoClickEngine {
    AUTOCLICK_ENGINE.get_or_init(AutoClickEngine::new)
}


static OVERLAY_ACTIVE: AtomicBool = AtomicBool::new(false);
static MINIMIZE_TO_TRAY: AtomicBool = AtomicBool::new(true);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonitorInfo {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub is_primary: bool,
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OverlayConfig {
    pub visible: bool,
    pub monitor_index: usize,
    pub offset_x: i32,
    pub offset_y: i32,
    pub size: u32,
}

#[tauri::command]
fn get_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    let monitors = main_window
        .available_monitors()
        .map_err(|e| e.to_string())?;

    let primary_monitor = main_window.primary_monitor().map_err(|e| e.to_string())?;

    let primary_pos = primary_monitor.as_ref().map(|m| m.position());

    let mut result = Vec::new();

    for (idx, mon) in monitors.into_iter().enumerate() {
        let size = mon.size();
        let pos = mon.position();
        let scale = mon.scale_factor();
        let is_primary = if let Some(ref p) = primary_pos {
            pos.x == p.x && pos.y == p.y
        } else {
            idx == 0
        };

        result.push(MonitorInfo {
            name: mon
                .name()
                .cloned()
                .unwrap_or_else(|| format!("Monitor {}", idx + 1)),
            width: size.width,
            height: size.height,
            scale_factor: scale,
            is_primary,
            x: pos.x,
            y: pos.y,
        });
    }

    if result.is_empty() {
        // Fallback default
        result.push(MonitorInfo {
            name: "Monitor Principal (1920x1080)".to_string(),
            width: 1920,
            height: 1080,
            scale_factor: 1.0,
            is_primary: true,
            x: 0,
            y: 0,
        });
    }

    Ok(result)
}

#[tauri::command]
fn set_overlay_state(app: AppHandle, config: OverlayConfig) -> Result<(), String> {
    OVERLAY_ACTIVE.store(config.visible, Ordering::SeqCst);

    if let Some(overlay) = app.get_webview_window("overlay") {
        if config.visible {
            // Apply click-through to allow seamless gaming
            let _ = overlay.set_ignore_cursor_events(true);
            let _ = overlay.set_always_on_top(true);

            // Position overlay on specified monitor
            let monitors = overlay.available_monitors().unwrap_or_default();
            let selected_monitor = monitors.get(config.monitor_index).or_else(|| monitors.first());

            let (mon_x, mon_y, mon_w, mon_h) = if let Some(m) = selected_monitor {
                let p = m.position();
                let s = m.size();
                (p.x, p.y, s.width, s.height)
            } else {
                (0, 0, 1920, 1080)
            };

            let win_size = config.size.max(200);
            let _ = overlay.set_size(PhysicalSize::new(win_size, win_size));

            let center_x = mon_x + (mon_w as i32 / 2) - (win_size as i32 / 2) + config.offset_x;
            let center_y = mon_y + (mon_h as i32 / 2) - (win_size as i32 / 2) + config.offset_y;

            let _ = overlay.set_position(PhysicalPosition::new(center_x, center_y));
            let _ = overlay.show();
        } else {
            let _ = overlay.hide();
        }
    }

    // Emit event to update frontend states
    let _ = app.emit("overlay-state-changed", config.visible);

    Ok(())
}

#[tauri::command]
fn toggle_overlay(app: AppHandle) -> Result<bool, String> {
    let current = OVERLAY_ACTIVE.load(Ordering::SeqCst);
    let next = !current;
    OVERLAY_ACTIVE.store(next, Ordering::SeqCst);

    if let Some(overlay) = app.get_webview_window("overlay") {
        if next {
            let _ = overlay.set_ignore_cursor_events(true);
            let _ = overlay.set_always_on_top(true);
            let _ = overlay.show();
        } else {
            let _ = overlay.hide();
        }
    }

    let _ = app.emit("overlay-state-changed", next);
    Ok(next)
}


#[tauri::command]
fn set_minimize_to_tray(enabled: bool) {
    MINIMIZE_TO_TRAY.store(enabled, Ordering::SeqCst);
}

#[tauri::command]
fn show_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn hide_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
    Ok(())
}

#[derive(Default)]
struct ShortcutDispatcher {
    action_to_shortcut: std::collections::HashMap<String, Shortcut>,
    shortcut_to_action: std::collections::HashMap<Shortcut, String>,
}

static SHORTCUT_DISPATCHER: OnceLock<std::sync::Mutex<ShortcutDispatcher>> = OnceLock::new();

fn get_dispatcher() -> &'static std::sync::Mutex<ShortcutDispatcher> {
    SHORTCUT_DISPATCHER.get_or_init(|| std::sync::Mutex::new(ShortcutDispatcher::default()))
}

fn dispatch_action(app: &AppHandle, action: &str) {
    match action {
        "autoclick_start_stop" => {
            // Insert is also delivered to the focused window, and a held key repeats.
            // One physical press used to start and then immediately stop.
            static LAST_TOGGLE_MS: AtomicU64 = AtomicU64::new(0);
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            let prev = LAST_TOGGLE_MS.load(Ordering::SeqCst);
            if now.saturating_sub(prev) < 400 {
                return;
            }
            LAST_TOGGLE_MS.store(now, Ordering::SeqCst);

            let engine = get_autoclick_engine();
            if engine.get_status().running {
                engine.stop(Some("Atalho Global (Parar)".to_string()));
                autoclick_engine::AutoClickEngine::release_all_inputs_native();
                let _ = app.emit("autoclick-status-changed", false);
            } else {
                let _ = app.emit("autoclick-start-requested", ());
            }
        }
        "autoclick_pick_position" => {
            let _ = app.emit("autoclick-pick-position", ());
        }
        "emergency_stop_all" => {
            // Parada de Emergência Universal: para AutoClick e solta todos os botões/teclas
            let engine = get_autoclick_engine();
            if engine.get_status().running {
                engine.emergency_stop();
                let _ = app.emit("autoclick-status-changed", false);
            }
            autoclick_engine::AutoClickEngine::release_all_inputs_native();
        }
        "widgets_toggle_all" => {
            let _ = app.emit("widgets-toggle-all-requested", ());
        }
        "crosshair_toggle" => {
            let _ = toggle_overlay(app.clone());
        }
        "window_toggle" => {
            if let Some(win) = app.get_webview_window("main") {
                if win.is_visible().unwrap_or(false) {
                    let _ = win.hide();
                } else {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
        }
        _ => {}
    }
}

#[tauri::command]
fn register_action_shortcut(app: AppHandle, action: String, key: String) -> Result<(), String> {
    let key_upper = key.trim().to_uppercase();
    if key_upper == "ESC" || key_upper == "ESCAPE" {
        return Err("A tecla ESC isolada não pode ser registrada globalmente".to_string());
    }

    let new_sc = key.parse::<Shortcut>().map_err(|e| format!("Tecla inválida '{}': {}", key, e))?;

    let mut disp = get_dispatcher().lock().map_err(|e| e.to_string())?;

    // 1. Se esta ação já possuía um atalho, desregistra o anterior do SO
    if let Some(old_sc) = disp.action_to_shortcut.remove(&action) {
        disp.shortcut_to_action.remove(&old_sc);
        let _ = app.global_shortcut().unregister(old_sc);
    }

    // 2. Se a tecla já estava mapeada para outra ação, remove a associação antiga
    if let Some(prev_action) = disp.shortcut_to_action.remove(&new_sc) {
        disp.action_to_shortcut.remove(&prev_action);
    }

    // 3. Registra a nova tecla no SO se ainda não estiver registrada
    if !app.global_shortcut().is_registered(new_sc.clone()) {
        app.global_shortcut()
            .register(new_sc.clone())
            .map_err(|e| format!("Falha ao registrar atalho no SO: {}", e))?;
    }

    // 4. Mapeia a ação e a tecla
    disp.action_to_shortcut.insert(action.clone(), new_sc.clone());
    disp.shortcut_to_action.insert(new_sc, action);

    Ok(())
}

#[tauri::command]
fn register_custom_hotkey(app: AppHandle, key: String) -> Result<(), String> {
    register_action_shortcut(app, "crosshair_toggle".to_string(), key)
}

#[tauri::command]
fn autoclick_register_hotkey(app: AppHandle, key: String) -> Result<(), String> {
    register_action_shortcut(app, "autoclick_start_stop".to_string(), key)
}

#[tauri::command]
fn autoclick_register_emergency_hotkey(app: AppHandle, key: String) -> Result<(), String> {
    register_action_shortcut(app, "emergency_stop_all".to_string(), key)
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowInfo {
    pub hwnd: usize,
    pub title: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub is_minimized: bool,
}

#[tauri::command]
fn autoclick_start(config: AutoClickEngineConfig) -> Result<(), String> {
    get_autoclick_engine().start(config)
}

#[tauri::command]
fn autoclick_stop() -> Result<(), String> {
    get_autoclick_engine().stop(Some("Usuário parou".to_string()));
    Ok(())
}

#[tauri::command]
fn autoclick_pause() -> Result<(), String> {
    get_autoclick_engine().pause();
    Ok(())
}

#[tauri::command]
fn autoclick_resume() -> Result<(), String> {
    get_autoclick_engine().resume();
    Ok(())
}

#[tauri::command]
fn autoclick_get_status() -> Result<EngineStatus, String> {
    Ok(get_autoclick_engine().get_status())
}

#[tauri::command]
fn autoclick_emergency_stop() -> Result<(), String> {
    get_autoclick_engine().emergency_stop();
    Ok(())
}

#[tauri::command]
fn autoclick_get_cursor_pos() -> Result<(i32, i32), String> {
    Ok(autoclick_engine::AutoClickEngine::get_cursor_pos_native())
}

/// Waits for the next left click anywhere on the screen and returns that point.
/// The click that opened the picker is ignored. Escape cancels.
#[tauri::command(async)]
fn autoclick_capture_click() -> Result<(i32, i32), String> {
    #[cfg(windows)]
    {
        use std::thread;
        use std::time::{Duration, Instant};
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;

        const VK_LBUTTON: i32 = 0x01;
        const VK_ESCAPE: i32 = 0x1B;
        let held = |vk: i32| unsafe { (GetAsyncKeyState(vk) as u16 & 0x8000) != 0 };

        let arm = Instant::now();
        while held(VK_LBUTTON) {
            if arm.elapsed() > Duration::from_secs(2) {
                break;
            }
            thread::sleep(Duration::from_millis(10));
        }

        let wait = Instant::now();
        while wait.elapsed() < Duration::from_secs(20) {
            if held(VK_ESCAPE) {
                return Err("cancelado".to_string());
            }
            if held(VK_LBUTTON) {
                let pos = autoclick_engine::AutoClickEngine::get_cursor_pos_native();
                while held(VK_LBUTTON) && wait.elapsed() < Duration::from_secs(20) {
                    thread::sleep(Duration::from_millis(10));
                }
                return Ok(pos);
            }
            thread::sleep(Duration::from_millis(10));
        }
        return Err("tempo esgotado".to_string());
    }
    #[cfg(not(windows))]
    {
        Err("Captura de posição só funciona no Windows.".to_string())
    }
}

#[tauri::command]
fn autoclick_get_windows() -> Result<Vec<WindowInfo>, String> {
    let mut windows = Vec::new();
    #[cfg(windows)]
    {
        use windows_sys::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            EnumWindows, GetWindowRect, GetWindowTextW, IsIconic, IsWindowVisible,
        };

        unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let list = &mut *(lparam as *mut Vec<WindowInfo>);
            if IsWindowVisible(hwnd) != 0 {
                let mut buf = [0u16; 512];
                let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), 512);
                if len > 0 {
                    let title = String::from_utf16_lossy(&buf[..len as usize]);
                    if !title.trim().is_empty() && !title.contains("Default IME") && !title.contains("MSCTFIME UI") {
                        let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
                        GetWindowRect(hwnd, &mut rect);
                        let is_minimized = IsIconic(hwnd) != 0;
                        list.push(WindowInfo {
                            hwnd: hwnd as usize,
                            title,
                            x: rect.left,
                            y: rect.top,
                            width: (rect.right - rect.left).max(0),
                            height: (rect.bottom - rect.top).max(0),
                            is_minimized,
                        });
                    }
                }
            }
            1
        }

        unsafe {
            EnumWindows(Some(enum_proc), &mut windows as *mut Vec<WindowInfo> as LPARAM);
        }
    }
    Ok(windows)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateProgressPayload {
    pub status: String,
    pub percent: f32,
    pub message: String,
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let lower = url.trim().to_ascii_lowercase();
    if !(lower.starts_with("https://") || lower.starts_with("http://")) || url.contains('"') {
        return Err("Só consigo abrir links da internet (http/https).".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        // explorer.exe receives the URL as one argument; going through `cmd /c start`
        // would let `&` in the URL run extra commands.
        std::process::Command::new("explorer.exe")
            .arg(url.trim())
            .spawn()
            .map_err(|e| format!("Erro ao abrir link: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = url;
    }
    Ok(())
}

#[tauri::command]
async fn download_and_run_installer(app: AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("https://github.com/") || !url.to_ascii_lowercase().ends_with(".exe") {
        return Err("Endereço de atualização inválido.".to_string());
    }
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let temp_dir = std::env::temp_dir();
        let target_path = temp_dir.join("PediParaMeuMarido_Setup_Update.exe");

        let _ = app_handle.emit("update-download-progress", UpdateProgressPayload {
            status: "downloading".to_string(),
            percent: 15.0,
            message: "Iniciando download com carinho... 💕".to_string(),
        });

        // Usar curl nativo do Windows para baixar com suporte a redirects (GitHub Releases / AWS S3)
        let status = std::process::Command::new("curl.exe")
            .args(["-L", "-f", "--connect-timeout", "20", "--max-time", "900", "-o", target_path.to_str().unwrap_or_default(), &url])
            .status();

        match status {
            Ok(s) if s.success() && target_path.exists() => {
                let _ = app_handle.emit("update-download-progress", UpdateProgressPayload {
                    status: "ready".to_string(),
                    percent: 100.0,
                    message: "Download concluído! Abrindo instalador... ✨".to_string(),
                });

                std::thread::sleep(std::time::Duration::from_millis(800));

                if let Ok(_) = std::process::Command::new(&target_path).spawn() {
                    std::thread::sleep(std::time::Duration::from_millis(1000));
                    app_handle.exit(0);
                } else {
                    let _ = app_handle.emit("update-download-progress", UpdateProgressPayload {
                        status: "error".to_string(),
                        percent: 0.0,
                        message: "Não foi possível iniciar o instalador automaticamente.".to_string(),
                    });
                }
            }
            _ => {
                let _ = app_handle.emit("update-download-progress", UpdateProgressPayload {
                    status: "error".to_string(),
                    percent: 0.0,
                    message: "Falha ao baixar atualização. Você também pode baixar pelo navegador! 💕".to_string(),
                });
            }
        }
    });

    Ok(())
}

pub fn run() {
    if !single_instance::acquire() {
        return;
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let action_opt = {
                            if let Ok(disp) = get_dispatcher().lock() {
                                disp.shortcut_to_action.get(shortcut).cloned()
                            } else {
                                None
                            }
                        };
                        if let Some(action) = action_opt {
                            dispatch_action(app, &action);
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_monitors,
            set_overlay_state,
            toggle_overlay,
            set_minimize_to_tray,
            show_main_window,
            hide_main_window,
            register_action_shortcut,
            register_custom_hotkey,
            widget_get_system_metrics,
            widget_fetch_feed,
            widget_open_window,
            widget_close_window,
            widget_set_always_on_top,
            widget_set_position,
            widget_set_hit_rects,
            widget_reset_positions,
            widget_launch_target,
            companion_open_window,
            companion_close_window,
            companion_set_position,
            companion_set_always_on_top,
            console_store_file,
            console_read_file,
            console_file_exists,
            console_library_get,
            console_library_save,
            console_remove_game,
            console_write_save,
            console_read_save,
            console_list_saves,
            console_delete_save,
            console_get_data_dir,
            autoclick_start,
            autoclick_stop,
            autoclick_pause,
            autoclick_resume,
            autoclick_get_status,
            autoclick_emergency_stop,
            autoclick_get_cursor_pos,
            autoclick_capture_click,
            autoclick_get_windows,
            autoclick_register_hotkey,
            autoclick_register_emergency_hotkey,
            get_app_version,
            open_external_url,
            download_and_run_installer,
            windhawk_get_status,
            windhawk_launch,
            windhawk_restart_explorer,
            windhawk_open_folder,
            windhawk_get_installed_mods,
            windhawk_get_mod_source,
            windhawk_save_mod_source,
            windhawk_compile_mod,
            windhawk_toggle_mod,
            windhawk_create_custom_mod,
            windhawk_setup_engine,
            windhawk_apply_theme,
            windhawk_open_in_app,
            media_send_command,
            media_open_firefox,
            search_web_images,
            widget_fetch_image,
        ])

        .setup(|app| {
            // Build system tray menu
            let toggle_app_i =
                MenuItem::with_id(app, "toggle_app", "Abrir / Ocultar Central", true, None::<&str>)?;
            let toggle_crosshair_i = MenuItem::with_id(
                app,
                "toggle_crosshair",
                "🎯 Alternar Crosshair (Overlay)",
                true,
                None::<&str>,
            )?;
            let toggle_widgets_i = MenuItem::with_id(
                app,
                "toggle_widgets",
                "🪟 Alternar Widgets da Área de Trabalho (F8)",
                true,
                None::<&str>,
            )?;
            let quit_i = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[&toggle_app_i, &toggle_widgets_i, &toggle_crosshair_i, &quit_i],
            )?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("💕 Pedi para meu marido")
                .show_menu_on_left_click(false);

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle_app" => {
                        if let Some(win) = app.get_webview_window("main") {
                            if win.is_visible().unwrap_or(false) {
                                let _ = win.hide();
                            } else {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                    }
                    "toggle_widgets" => {
                        let _ = app.emit("widgets-toggle-all-requested", ());
                    }
                    "toggle_crosshair" => {
                        let _ = toggle_overlay(app.clone());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            if win.is_visible().unwrap_or(false) {
                                let _ = win.hide();
                            } else {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Setup overlay window initial click-through
            if let Some(overlay) = app.get_webview_window("overlay") {
                let _ = overlay.set_ignore_cursor_events(true);
            }

            // Registra atalhos padrão no Despachante Central Unificado
            let default_shortcuts = [
                ("autoclick_start_stop", "Insert"),
                ("autoclick_pick_position", "F7"),
                ("emergency_stop_all", "Shift+Escape"),
                ("widgets_toggle_all", "F8"),
                ("crosshair_toggle", "F10"),
                ("window_toggle", "Control+H"),
            ];
            for (action, key) in default_shortcuts {
                let _ = register_action_shortcut(app.handle().clone(), action.to_string(), key.to_string());
            }

            Ok(())
        })


        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    if MINIMIZE_TO_TRAY.load(Ordering::SeqCst) {
                        // Prevent closing and minimize to tray
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {});
}

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiskInfo {
    pub drive: String,
    pub total_gb: f64,
    pub free_gb: f64,
    pub used_gb: f64,
    pub used_percent: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BatteryInfo {
    pub has_battery: bool,
    pub is_on_battery: bool,
    pub is_charging: bool,
    pub percentage: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RamInfo {
    pub total_mb: u64,
    pub used_mb: u64,
    pub free_mb: u64,
    pub used_percent: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemMetrics {
    pub cpu_percent: f64,
    pub cpu_name: String,
    pub ram: RamInfo,
    pub disks: Vec<DiskInfo>,
    pub battery: BatteryInfo,
}

#[repr(C)]
#[derive(Copy, Clone, Default)]
struct FILETIME {
    dw_low_date_time: u32,
    dw_high_date_time: u32,
}

impl FILETIME {
    fn to_u64(&self) -> u64 {
        ((self.dw_high_date_time as u64) << 32) | (self.dw_low_date_time as u64)
    }
}

#[repr(C)]
struct MEMORYSTATUSEX {
    dw_length: u32,
    dw_memory_load: u32,
    ull_total_phys: u64,
    ull_avail_phys: u64,
    ull_total_page_file: u64,
    ull_avail_page_file: u64,
    ull_total_virtual: u64,
    ull_avail_virtual: u64,
    ull_avail_extended_virtual: u64,
}

#[repr(C)]
struct SYSTEM_POWER_STATUS {
    ac_line_status: u8,
    battery_flag: u8,
    battery_life_percent: u8,
    system_status_flag: u8,
    battery_life_time: u32,
    battery_full_life_time: u32,
}

#[cfg(target_os = "windows")]
extern "system" {
    fn GetSystemTimes(
        lp_idle_time: *mut FILETIME,
        lp_kernel_time: *mut FILETIME,
        lp_user_time: *mut FILETIME,
    ) -> i32;

    fn GlobalMemoryStatusEx(lp_buffer: *mut MEMORYSTATUSEX) -> i32;

    fn GetSystemPowerStatus(lp_system_power_status: *mut SYSTEM_POWER_STATUS) -> i32;

    fn GetLogicalDrives() -> u32;

    fn GetDiskFreeSpaceExW(
        lp_directory_name: *const u16,
        lp_free_bytes_available_to_caller: *mut u64,
        lp_total_number_of_bytes: *mut u64,
        lp_total_number_of_free_bytes: *mut u64,
    ) -> i32;
}

static CPU_TRACKER: Mutex<Option<(u64, u64, Instant)>> = Mutex::new(None);

#[tauri::command]
pub fn widget_get_system_metrics() -> Result<SystemMetrics, String> {
    #[cfg(target_os = "windows")]
    {
        // 1. RAM Calculation
        let mut mem = MEMORYSTATUSEX {
            dw_length: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
            dw_memory_load: 0,
            ull_total_phys: 0,
            ull_avail_phys: 0,
            ull_total_page_file: 0,
            ull_avail_page_file: 0,
            ull_total_virtual: 0,
            ull_avail_virtual: 0,
            ull_avail_extended_virtual: 0,
        };

        unsafe {
            GlobalMemoryStatusEx(&mut mem);
        }

        let total_mb = mem.ull_total_phys / (1024 * 1024);
        let avail_mb = mem.ull_avail_phys / (1024 * 1024);
        let used_mb = total_mb.saturating_sub(avail_mb);
        let used_ram_percent = if total_mb > 0 {
            ((used_mb as f64) / (total_mb as f64)) * 100.0
        } else {
            mem.dw_memory_load as f64
        };

        let ram_info = RamInfo {
            total_mb,
            used_mb,
            free_mb: avail_mb,
            used_percent: (used_ram_percent * 10.0).round() / 10.0,
        };

        // 2. CPU Calculation
        let mut idle_ft = FILETIME::default();
        let mut kernel_ft = FILETIME::default();
        let mut user_ft = FILETIME::default();

        let mut cpu_percent = 5.0;

        unsafe {
            if GetSystemTimes(&mut idle_ft, &mut kernel_ft, &mut user_ft) != 0 {
                let idle = idle_ft.to_u64();
                let total = kernel_ft.to_u64() + user_ft.to_u64();
                let now = Instant::now();

                let mut lock = CPU_TRACKER.lock().unwrap();
                if let Some((prev_idle, prev_total, _)) = *lock {
                    let delta_idle = idle.saturating_sub(prev_idle);
                    let delta_total = total.saturating_sub(prev_total);

                    if delta_total > 0 {
                        let usage = 100.0 * (1.0 - (delta_idle as f64 / delta_total as f64));
                        cpu_percent = usage.clamp(0.0, 100.0);
                    }
                }
                *lock = Some((idle, total, now));
            }
        }

        // 3. Battery Calculation
        let mut power_status = SYSTEM_POWER_STATUS {
            ac_line_status: 1,
            battery_flag: 128,
            battery_life_percent: 100,
            system_status_flag: 0,
            battery_life_time: 0,
            battery_full_life_time: 0,
        };

        unsafe {
            GetSystemPowerStatus(&mut power_status);
        }

        let has_battery = power_status.battery_flag != 128 && power_status.battery_flag != 255;
        let is_on_battery = power_status.ac_line_status == 0;
        let is_charging = (power_status.battery_flag & 8) != 0;
        let battery_pct = if power_status.battery_life_percent <= 100 {
            power_status.battery_life_percent
        } else {
            100
        };

        let battery_info = BatteryInfo {
            has_battery,
            is_on_battery,
            is_charging,
            percentage: battery_pct,
        };

        // 4. Disks Calculation
        let mut disks = Vec::new();
        let drives_mask = unsafe { GetLogicalDrives() };

        for i in 0..26 {
            if (drives_mask & (1 << i)) != 0 {
                let letter = (b'A' + i) as char;
                let path_str = format!("{}:\\", letter);
                let wide_path: Vec<u16> = path_str.encode_utf16().chain(std::iter::once(0)).collect();

                let mut free_bytes_avail: u64 = 0;
                let mut total_bytes: u64 = 0;
                let mut total_free_bytes: u64 = 0;

                let success = unsafe {
                    GetDiskFreeSpaceExW(
                        wide_path.as_ptr(),
                        &mut free_bytes_avail,
                        &mut total_bytes,
                        &mut total_free_bytes,
                    )
                };

                if success != 0 && total_bytes > 0 {
                    let total_gb = (total_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
                    let free_gb = (total_free_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
                    let used_gb = total_gb - free_gb;
                    let used_pct = (used_gb / total_gb) * 100.0;

                    disks.push(DiskInfo {
                        drive: format!("{}:", letter),
                        total_gb: (total_gb * 10.0).round() / 10.0,
                        free_gb: (free_gb * 10.0).round() / 10.0,
                        used_gb: (used_gb * 10.0).round() / 10.0,
                        used_percent: (used_pct * 10.0).round() / 10.0,
                    });
                }
            }
        }

        Ok(SystemMetrics {
            cpu_percent: (cpu_percent * 10.0).round() / 10.0,
            cpu_name: "Processador Intel / AMD".to_string(),
            ram: ram_info,
            disks,
            battery: battery_info,
        })
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("As métricas do sistema só estão disponíveis no Windows.".to_string())
    }
}

// ---------------------------------------------------------------------------------------------
// Click-through outside the visible content of widget and companion windows
// ---------------------------------------------------------------------------------------------

/// Visible area in logical pixels, relative to the window's top-left corner.
#[derive(Debug, Clone, Copy, Deserialize)]
pub struct WidgetHitRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    /// Corner radius (logical px): the transparent corners of a rounded card let clicks through too.
    #[serde(default)]
    pub radius: f64,
}

pub fn point_in_rounded_rect(px: f64, py: f64, r: &WidgetHitRect) -> bool {
    if px < r.x || py < r.y || px > r.x + r.width || py > r.y + r.height {
        return false;
    }
    let rad = r.radius.max(0.0).min(r.width / 2.0).min(r.height / 2.0);
    if rad <= 0.0 {
        return true;
    }
    let cx = px.clamp(r.x + rad, r.x + r.width - rad);
    let cy = py.clamp(r.y + rad, r.y + r.height - rad);
    let (dx, dy) = (px - cx, py - cy);
    dx * dx + dy * dy <= rad * rad
}

struct HitEntry {
    hwnd: isize,
    rects: Vec<WidgetHitRect>,
    ignoring: Option<bool>,
}

static HIT_AREAS: Mutex<Option<std::collections::HashMap<String, HitEntry>>> = Mutex::new(None);
static HIT_LOOP_STARTED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[cfg(target_os = "windows")]
fn set_window_click_through(hwnd: isize, ignore: bool) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT};
    unsafe {
        let mut ex = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;
        if ignore {
            ex |= WS_EX_TRANSPARENT | WS_EX_LAYERED;
        } else {
            ex &= !(WS_EX_TRANSPARENT | WS_EX_LAYERED);
        }
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex as isize);
    }
}

/// Every 30 ms: a registered window only accepts the mouse while the pointer is over one of its
/// visible rects, so its transparent parts never block the desktop.
///
/// Only raw Win32 calls happen here: asking Tauri for a window handle goes through the main thread,
/// and doing that while holding `HIT_AREAS` deadlocks against `widget_set_hit_rects`.
#[cfg(target_os = "windows")]
fn start_hit_loop() {
    use windows_sys::Win32::Foundation::{POINT, RECT};
    use windows_sys::Win32::UI::HiDpi::GetDpiForWindow;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetWindowRect, IsWindow};
    if HIT_LOOP_STARTED.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    std::thread::spawn(move || loop {
        std::thread::sleep(std::time::Duration::from_millis(30));
        let mut pt = POINT { x: 0, y: 0 };
        if unsafe { GetCursorPos(&mut pt) } == 0 {
            continue;
        }
        // While a button is held (dragging or resizing a widget) nothing changes under the pointer.
        let pressed = unsafe { GetAsyncKeyState(VK_LBUTTON as i32) } as u16 & 0x8000 != 0;
        let mut changes: Vec<(isize, bool)> = Vec::new();
        let mut guard = HIT_AREAS.lock().unwrap_or_else(|e| e.into_inner());
        let Some(map) = guard.as_mut() else { continue };
        map.retain(|_, entry| unsafe { IsWindow(entry.hwnd) } != 0);
        for entry in map.values_mut() {
            let hwnd = entry.hwnd;
            let mut rect: RECT = unsafe { std::mem::zeroed() };
            if unsafe { GetWindowRect(hwnd, &mut rect) } == 0 {
                continue;
            }
            let scale = (unsafe { GetDpiForWindow(hwnd) }.max(96)) as f64 / 96.0;
            let lx = (pt.x - rect.left) as f64 / scale;
            let ly = (pt.y - rect.top) as f64 / scale;
            let inside = entry.rects.iter().any(|r| point_in_rounded_rect(lx, ly, r));
            let ignore = !inside;
            if pressed && entry.ignoring == Some(false) {
                continue;
            }
            if entry.ignoring != Some(ignore) {
                changes.push((hwnd, ignore));
                entry.ignoring = Some(ignore);
            }
        }
        // Changing styles sends messages to the window's thread: never do it while holding the lock.
        drop(guard);
        for (hwnd, ignore) in changes {
            set_window_click_through(hwnd, ignore);
        }
    });
}

/// `rects`: visible parts of the window (None = the whole window takes the mouse again).
#[tauri::command]
pub async fn widget_set_hit_rects(app: AppHandle, label: String, rects: Option<Vec<WidgetHitRect>>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Resolve the handle before taking the lock (see start_hit_loop).
        let hwnd = app
            .get_webview_window(&label)
            .ok_or("Janela não encontrada")?
            .hwnd()
            .map_err(|e| e.to_string())?
            .0 as isize;
        let removed = {
            let mut guard = HIT_AREAS.lock().unwrap_or_else(|e| e.into_inner());
            let map = guard.get_or_insert_with(Default::default);
            match rects {
                Some(rects) => {
                    let entry = map.entry(label).or_insert(HitEntry { hwnd, rects: vec![], ignoring: None });
                    entry.hwnd = hwnd;
                    // Unchanged area: keep the current state, no style flicker while resizing.
                    let same = entry.rects.len() == rects.len()
                        && entry.rects.iter().zip(&rects).all(|(a, b)| {
                            a.x == b.x && a.y == b.y && a.width == b.width && a.height == b.height && a.radius == b.radius
                        });
                    if !same {
                        entry.rects = rects;
                        entry.ignoring = None;
                    }
                    false
                }
                None => map.remove(&label).is_some(),
            }
        };
        if removed {
            set_window_click_through(hwnd, false);
        }
        start_hit_loop();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, label, rects);
    }
    Ok(())
}

/// Spawns or focuses an independent native transparent desktop widget window
#[tauri::command]
pub async fn widget_open_window(
    app: AppHandle,
    widget_id: String,
    title: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    always_on_top: Option<bool>,
) -> Result<(), String> {
    let is_ontop = always_on_top.unwrap_or(false);
    let safe_id: String = widget_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    let label = if safe_id.starts_with("widget-") {
        safe_id
    } else {
        format!("widget-{}", safe_id)
    };

    let log_msg = format!("[{}] widget_open_window called: label='{}', size={}x{}, pos=({}, {}), ontop={}\n", 
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs(),
        label, width, height, x, y, is_ontop);
    let _ = std::fs::OpenOptions::new().create(true).append(true).open("tauri_widget.log")
        .and_then(|mut f| std::io::Write::write_all(&mut f, log_msg.as_bytes()));

    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.set_always_on_top(is_ontop);
        let _ = existing.show();
        let _ = existing.unminimize();
        let _ = existing.eval(&format!("window.__TAURI_WINDOW_LABEL__ = '{}'; window.location.hash = '/widget/{}';", label, label));
        let _ = std::fs::OpenOptions::new().create(true).append(true).open("tauri_widget.log")
            .and_then(|mut f| std::io::Write::write_all(&mut f, b"  -> Existing window shown\n"));
        return Ok(());
    }

    let init_script = format!(
        "window.__TAURI_WINDOW_LABEL__ = '{}'; window.location.hash = '/widget/{}'; if (document.documentElement) {{ document.documentElement.classList.add('is-transparent-window', 'is-widget'); }}",
        label, label
    );

    let _ = std::fs::OpenOptions::new().create(true).append(true).open("tauri_widget.log")
        .and_then(|mut f| std::io::Write::write_all(&mut f, b"  -> Invoking WebviewWindowBuilder::build()...\n"));

    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::default(),
    )
    .initialization_script(&init_script)
    .title(&title)
    .inner_size(width as f64, height as f64)
    .position(x as f64, y as f64)
    .resizable(true)
    .decorations(false)
    .transparent(true)
    .always_on_top(is_ontop)
    .skip_taskbar(true)
    .shadow(false);

    // Mini console games need room for the picture plus the control bar.
    if label.contains("console-snes") || label.contains("console-game-") {
        builder = builder.min_inner_size(320.0, 300.0);
    }

    let win = builder
    .build()
    .map_err(|e| {
        let err_msg = format!("  -> ERRO ao criar janela do widget {}: {}\n", label, e);
        let _ = std::fs::OpenOptions::new().create(true).append(true).open("tauri_widget.log")
            .and_then(|mut f| std::io::Write::write_all(&mut f, err_msg.as_bytes()));
        eprintln!("[Rust] Erro ao criar janela do widget {}: {}", label, e);
        format!("Erro ao criar janela do widget: {}", e)
    })?;

    let _ = win.eval(&format!("window.__TAURI_WINDOW_LABEL__ = '{}'; window.location.hash = '/widget/{}';", label, label));
    let _ = win.show();
    let _ = win.unminimize();
    let _ = std::fs::OpenOptions::new().create(true).append(true).open("tauri_widget.log")
        .and_then(|mut f| std::io::Write::write_all(&mut f, b"  -> SUCESSO: janela criada e exibida com sucesso!\n"));

    Ok(())
}

/// Closes a desktop widget window
#[tauri::command]
pub fn widget_close_window(app: AppHandle, widget_id: String) -> Result<(), String> {
    let safe_id: String = widget_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    let label = if safe_id.starts_with("widget-") {
        safe_id.clone()
    } else {
        format!("widget-{}", safe_id)
    };
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.close();
    }
    if let Some(win) = app.get_webview_window(&safe_id) {
        let _ = win.close();
    }
    let stripped = safe_id.trim_start_matches("widget-");
    if let Some(win) = app.get_webview_window(stripped) {
        let _ = win.close();
    }
    Ok(())
}

/// Spawns or focuses an independent native transparent desktop companion window
#[tauri::command]
pub async fn companion_open_window(
    app: AppHandle,
    companion_id: String,
    title: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    always_on_top: Option<bool>,
) -> Result<(), String> {
    let is_ontop = always_on_top.unwrap_or(false);
    let safe_id: String = companion_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect();
    let label = if safe_id.starts_with("companion-") {
        safe_id
    } else {
        format!("companion-{}", safe_id)
    };

    println!("[Rust] companion_open_window: label='{}', size={}x{}, pos=({}, {})", label, width, height, x, y);

    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.set_always_on_top(is_ontop);
        let _ = existing.show();
        let _ = existing.unminimize();
        let _ = existing.eval(&format!("window.__TAURI_WINDOW_LABEL__ = '{}'; window.location.hash = '/companion/{}';", label, label));
        return Ok(());
    }

    let init_script = format!(
        "window.__TAURI_WINDOW_LABEL__ = '{}'; window.location.hash = '/companion/{}'; if (document.documentElement) {{ document.documentElement.classList.add('is-transparent-window', 'is-companion'); }}",
        label, label
    );

    let win = tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::default(),
    )
    .initialization_script(&init_script)
    .title(&title)
    .inner_size(width as f64, height as f64)
    .position(x as f64, y as f64)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .always_on_top(is_ontop)
    .skip_taskbar(true)
    .shadow(false)
    .build()
    .map_err(|e| {
        eprintln!("[Rust] Erro ao criar janela do companheiro {}: {}", label, e);
        format!("Erro ao criar janela do companheiro: {}", e)
    })?;

    let _ = win.eval(&format!("window.__TAURI_WINDOW_LABEL__ = '{}'; window.location.hash = '/companion/{}';", label, label));
    let _ = win.show();
    let _ = win.unminimize();

    Ok(())
}

/// Closes a desktop companion window
#[tauri::command]
pub fn companion_close_window(app: AppHandle, companion_id: String) -> Result<(), String> {
    let label = if companion_id.starts_with("companion-") {
        companion_id
    } else {
        format!("companion-{}", companion_id)
    };
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.close();
    }
    Ok(())
}

/// Sets position for a desktop companion window
#[tauri::command]
pub fn companion_set_position(
    app: AppHandle,
    companion_id: String,
    x: i32,
    y: i32,
) -> Result<(), String> {
    let label = if companion_id.starts_with("companion-") {
        companion_id
    } else {
        format!("companion-{}", companion_id)
    };
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
    }
    Ok(())
}

/// Sets always-on-top for a desktop companion window
#[tauri::command]
pub fn companion_set_always_on_top(
    app: AppHandle,
    companion_id: String,
    always_on_top: bool,
) -> Result<(), String> {
    let label = if companion_id.starts_with("companion-") {
        companion_id
    } else {
        format!("companion-{}", companion_id)
    };
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.set_always_on_top(always_on_top);
    }
    Ok(())
}

/// Toggles always-on-top for a desktop widget window
#[tauri::command]
pub fn widget_set_always_on_top(
    app: AppHandle,
    widget_id: String,
    always_on_top: bool,
) -> Result<(), String> {
    let label = if widget_id.starts_with("widget-") {
        widget_id
    } else {
        format!("widget-{}", widget_id)
    };
    if let Some(win) = app.get_webview_window(&label) {
        let _ = win.set_always_on_top(always_on_top);
    }
    Ok(())
}

/// Sets position for a desktop widget window
#[tauri::command]
pub fn widget_set_position(
    app: AppHandle,
    widget_id: String,
    x: i32,
    y: i32,
) -> Result<(), String> {
    let label = if widget_id.starts_with("widget-") {
        widget_id
    } else {
        format!("widget-{}", widget_id)
    };
    if let Some(win) = app.get_webview_window(&label) {
        // Logical, to match the logical position used by WebviewWindowBuilder in widget_open_window.
        let _ = win.set_position(tauri::LogicalPosition::new(x as f64, y as f64));
    }
    Ok(())
}

/// Resets all widget windows back onto the visible primary monitor
#[tauri::command]
pub fn widget_reset_positions(app: AppHandle) -> Result<u32, String> {
    let mut count = 0;
    if let Some(main) = app.get_webview_window("main") {
        if let Ok(Some(mon)) = main.primary_monitor() {
            let mon_pos = mon.position();
            let mut offset_x = 100;
            let mut offset_y = 100;

            for (label, win) in app.webview_windows() {
                if label.starts_with("widget-") {
                    let _ = win.set_position(tauri::PhysicalPosition::new(
                        mon_pos.x + offset_x,
                        mon_pos.y + offset_y,
                    ));
                    let _ = win.show();
                    let _ = win.unminimize();
                    offset_x += 60;
                    offset_y += 60;
                    count += 1;
                }
            }
        }
    }
    Ok(count)
}

/// Launches a target (application, path, or URL) from the shortcuts widget
#[tauri::command]
pub fn widget_launch_target(target: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        Command::new("explorer")
            .arg(&target)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Falha ao iniciar {}: {}", target, e))?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = target;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(radius: f64) -> WidgetHitRect {
        WidgetHitRect { x: 10.0, y: 10.0, width: 100.0, height: 60.0, radius }
    }

    #[test]
    fn hit_area_skips_transparent_corners() {
        let r = rect(20.0);
        assert!(point_in_rounded_rect(60.0, 40.0, &r));
        assert!(point_in_rounded_rect(15.0, 40.0, &r));
        assert!(!point_in_rounded_rect(11.0, 11.0, &r));
        assert!(!point_in_rounded_rect(5.0, 40.0, &r));
        assert!(!point_in_rounded_rect(60.0, 75.0, &r));
    }

    #[test]
    fn square_hit_area_covers_its_corners() {
        assert!(point_in_rounded_rect(11.0, 11.0, &rect(0.0)));
    }
}

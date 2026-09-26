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
        Ok(SystemMetrics {
            cpu_percent: 12.5,
            cpu_name: "Simulated Processor".to_string(),
            ram: RamInfo {
                total_mb: 16384,
                used_mb: 8192,
                free_mb: 8192,
                used_percent: 50.0,
            },
            disks: vec![DiskInfo {
                drive: "C:".to_string(),
                total_gb: 512.0,
                free_gb: 256.0,
                used_gb: 256.0,
                used_percent: 50.0,
            }],
            battery: BatteryInfo {
                has_battery: true,
                is_on_battery: false,
                is_charging: true,
                percentage: 95,
            },
        })
    }
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
        safe_id
    } else {
        format!("widget-{}", safe_id)
    };
    if let Some(win) = app.get_webview_window(&label) {
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
        Command::new("explorer")
            .arg(&target)
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

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ClickType {
    Single,
    Double,
    Triple,
    Hold,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ClickMode {
    Fixed,
    RandomInterval,
    BaseJitter,
    RandomCps,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PositionMode {
    CurrentCursor,
    Fixed,
    WindowRelative,
    RandomArea,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RepeatMode {
    Infinite,
    Count,
    Duration,
    UntilTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClickArea {
    pub x1: i32,
    pub y1: i32,
    pub x2: i32,
    pub y2: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MultiPointConfig {
    pub id: String,
    pub x: i32,
    pub y: i32,
    pub monitor_index: usize,
    pub button: MouseButton,
    pub click_type: ClickType,
    pub delay_before_ms: u64,
    pub delay_after_ms: u64,
    pub repeat_times: u32,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AutomationAction {
    MouseClick {
        button: MouseButton,
        click_type: ClickType,
        x: Option<i32>,
        y: Option<i32>,
        delay_ms: u64,
    },
    MouseMove {
        x: i32,
        y: i32,
        duration_ms: u64,
    },
    MouseScroll {
        delta: i32,
        delay_ms: u64,
    },
    KeyPress {
        key: String,
        delay_ms: u64,
    },
    KeyDown {
        key: String,
    },
    KeyUp {
        key: String,
    },
    Wait {
        duration_ms: u64,
    },
    RandomWait {
        min_ms: u64,
        max_ms: u64,
    },
    LoopStart {
        iterations: u32,
    },
    LoopEnd,
    Comment {
        text: String,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutoClickEngineConfig {
    pub click_mode: ClickMode,
    pub interval_ms: f64,
    pub min_interval_ms: f64,
    pub max_interval_ms: f64,
    pub jitter_ms: f64,
    pub target_cps: f64,
    pub min_cps: f64,
    pub max_cps: f64,
    pub mouse_button: MouseButton,
    pub click_type: ClickType,
    pub position_mode: PositionMode,
    pub fixed_x: i32,
    pub fixed_y: i32,
    pub click_area: Option<ClickArea>,
    pub repeat_mode: RepeatMode,
    pub repeat_count: u64,
    pub repeat_duration_seconds: u64,
    pub start_delay_seconds: u32,
    pub multi_points: Vec<MultiPointConfig>,
    pub timeline_actions: Vec<AutomationAction>,
    pub simulation_mode: bool,
    pub corner_failsafe: bool,
    pub max_runtime_minutes: u32,
}

impl Default for AutoClickEngineConfig {
    fn default() -> Self {
        Self {
            click_mode: ClickMode::Fixed,
            interval_ms: 100.0,
            min_interval_ms: 80.0,
            max_interval_ms: 120.0,
            jitter_ms: 15.0,
            target_cps: 10.0,
            min_cps: 8.0,
            max_cps: 12.0,
            mouse_button: MouseButton::Left,
            click_type: ClickType::Single,
            position_mode: PositionMode::CurrentCursor,
            fixed_x: 0,
            fixed_y: 0,
            click_area: None,
            repeat_mode: RepeatMode::Infinite,
            repeat_count: 500,
            repeat_duration_seconds: 60,
            start_delay_seconds: 0,
            multi_points: Vec::new(),
            timeline_actions: Vec::new(),
            simulation_mode: false,
            corner_failsafe: true,
            max_runtime_minutes: 60,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EngineStatus {
    pub running: bool,
    pub paused: bool,
    pub click_count: u64,
    pub real_cps: f64,
    pub elapsed_seconds: f64,
    pub current_action: String,
    pub timer_drift_ms: f64,
    pub last_stop_reason: Option<String>,
}

pub struct AutoClickEngine {
    is_running: Arc<AtomicBool>,
    is_paused: Arc<AtomicBool>,
    click_count: Arc<AtomicU64>,
    config: Arc<Mutex<AutoClickEngineConfig>>,
    status: Arc<Mutex<EngineStatus>>,
}

impl AutoClickEngine {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            is_paused: Arc::new(AtomicBool::new(false)),
            click_count: Arc::new(AtomicU64::new(0)),
            config: Arc::new(Mutex::new(AutoClickEngineConfig::default())),
            status: Arc::new(Mutex::new(EngineStatus {
                running: false,
                paused: false,
                click_count: 0,
                real_cps: 0.0,
                elapsed_seconds: 0.0,
                current_action: "Parado".to_string(),
                timer_drift_ms: 0.0,
                last_stop_reason: None,
            })),
        }
    }

    pub fn start(&self, new_config: AutoClickEngineConfig) -> Result<(), String> {
        if self.is_running.load(Ordering::SeqCst) {
            return Err("Auto clicker já está em execução".to_string());
        }

        {
            let mut cfg = self.config.lock().unwrap();
            *cfg = new_config.clone();
        }

        self.click_count.store(0, Ordering::SeqCst);
        self.is_running.store(true, Ordering::SeqCst);
        self.is_paused.store(false, Ordering::SeqCst);

        let is_running = self.is_running.clone();
        let is_paused = self.is_paused.clone();
        let click_count = self.click_count.clone();
        let status = self.status.clone();
        let config = new_config;

        thread::spawn(move || {
            Self::run_worker_thread(config, is_running, is_paused, click_count, status);
        });

        Ok(())
    }

    pub fn pause(&self) {
        if self.is_running.load(Ordering::SeqCst) {
            self.is_paused.store(true, Ordering::SeqCst);
            if let Ok(mut st) = self.status.lock() {
                st.paused = true;
                st.current_action = "Pausado".to_string();
            }
        }
    }

    pub fn resume(&self) {
        if self.is_running.load(Ordering::SeqCst) {
            self.is_paused.store(false, Ordering::SeqCst);
            if let Ok(mut st) = self.status.lock() {
                st.paused = false;
                st.current_action = "Executando".to_string();
            }
        }
    }

    pub fn stop(&self, reason: Option<String>) {
        if self.is_running.load(Ordering::SeqCst) {
            self.is_running.store(false, Ordering::SeqCst);
            self.is_paused.store(false, Ordering::SeqCst);

            // Immediate native failsafe: release all pressed buttons and keys
            Self::release_all_inputs_native();

            if let Ok(mut st) = self.status.lock() {
                st.running = false;
                st.paused = false;
                st.current_action = "Parado".to_string();
                st.last_stop_reason = reason;
            }
        }
    }

    pub fn emergency_stop(&self) {
        self.stop(Some("Panic Key / Parada de Emergência".to_string()));
    }

    pub fn get_status(&self) -> EngineStatus {
        if let Ok(mut st) = self.status.lock() {
            st.running = self.is_running.load(Ordering::SeqCst);
            st.paused = self.is_paused.load(Ordering::SeqCst);
            st.click_count = self.click_count.load(Ordering::SeqCst);
            st.clone()
        } else {
            EngineStatus {
                running: false,
                paused: false,
                click_count: 0,
                real_cps: 0.0,
                elapsed_seconds: 0.0,
                current_action: "Erro".to_string(),
                timer_drift_ms: 0.0,
                last_stop_reason: None,
            }
        }
    }

    fn run_worker_thread(
        config: AutoClickEngineConfig,
        is_running: Arc<AtomicBool>,
        is_paused: Arc<AtomicBool>,
        click_count: Arc<AtomicU64>,
        status: Arc<Mutex<EngineStatus>>,
    ) {
        // Handle start delay countdown if requested
        if config.start_delay_seconds > 0 {
            for rem in (1..=config.start_delay_seconds).rev() {
                if !is_running.load(Ordering::SeqCst) {
                    return;
                }
                if let Ok(mut st) = status.lock() {
                    st.current_action = format!("Iniciando em {}s... 💕", rem);
                }
                thread::sleep(Duration::from_secs(1));
            }
        }

        let start_time = Instant::now();
        let mut last_cps_calc = Instant::now();
        let mut clicks_since_last_calc = 0u64;

        if let Ok(mut st) = status.lock() {
            st.running = true;
            st.paused = false;
            st.current_action = "Comecei a clicar ✨".to_string();
        }

        // Branch 1: Timeline Action Engine if actions provided
        if !config.timeline_actions.is_empty() {
            Self::execute_timeline_loop(
                &config,
                &is_running,
                &is_paused,
                &click_count,
                &status,
                start_time,
            );
            Self::release_all_inputs_native();
            return;
        }

        // Branch 2: Multi-Point sequence if points provided
        if !config.multi_points.is_empty() {
            Self::execute_multi_point_loop(
                &config,
                &is_running,
                &is_paused,
                &click_count,
                &status,
                start_time,
            );
            Self::release_all_inputs_native();
            return;
        }

        // Branch 3: Standard / Quick Click Loop
        let mut target_next_time = Instant::now();

        while is_running.load(Ordering::SeqCst) {
            // Check pause
            while is_paused.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_millis(50));
                if !is_running.load(Ordering::SeqCst) {
                    Self::release_all_inputs_native();
                    return;
                }
            }

            // Check corner failsafe
            if config.corner_failsafe && Self::is_cursor_in_corner() {
                if let Ok(mut st) = status.lock() {
                    st.last_stop_reason = Some("Failsafe de canto de tela ativado".to_string());
                }
                break;
            }

            // Check repeat limits
            let elapsed_sec = start_time.elapsed().as_secs_f64();
            let current_clicks = click_count.load(Ordering::SeqCst);

            match config.repeat_mode {
                RepeatMode::Count => {
                    if current_clicks >= config.repeat_count {
                        if let Ok(mut st) = status.lock() {
                            st.last_stop_reason = Some("Contagem de cliques atingida".to_string());
                        }
                        break;
                    }
                }
                RepeatMode::Duration => {
                    if elapsed_sec >= config.repeat_duration_seconds as f64 {
                        if let Ok(mut st) = status.lock() {
                            st.last_stop_reason = Some("Tempo limite atingido".to_string());
                        }
                        break;
                    }
                }
                RepeatMode::UntilTime | RepeatMode::Infinite => {}
            }

            // Max global runtime failsafe (default 60 mins)
            if elapsed_sec >= (config.max_runtime_minutes as f64 * 60.0) {
                if let Ok(mut st) = status.lock() {
                    st.last_stop_reason = Some("Tempo máximo de segurança atingido".to_string());
                }
                break;
            }

            // Perform Click
            let (target_x, target_y) = match config.position_mode {
                PositionMode::CurrentCursor => (None, None),
                PositionMode::Fixed => (Some(config.fixed_x), Some(config.fixed_y)),
                PositionMode::WindowRelative => (Some(config.fixed_x), Some(config.fixed_y)),
                PositionMode::RandomArea => {
                    if let Some(ref area) = config.click_area {
                        let rx = area.x1 + (rand_simple() * (area.x2 - area.x1) as f64) as i32;
                        let ry = area.y1 + (rand_simple() * (area.y2 - area.y1) as f64) as i32;
                        (Some(rx), Some(ry))
                    } else {
                        (None, None)
                    }
                }
            };

            if !config.simulation_mode {
                Self::send_mouse_click_native(
                    &config.mouse_button,
                    &config.click_type,
                    target_x,
                    target_y,
                );
            }

            let new_clicks = click_count.fetch_add(1, Ordering::SeqCst) + 1;
            clicks_since_last_calc += 1;

            // Compute delay for next iteration with anti-drift
            let interval_ms = match config.click_mode {
                ClickMode::Fixed => {
                    if config.interval_ms > 0.0 {
                        config.interval_ms
                    } else if config.target_cps > 0.0 {
                        1000.0 / config.target_cps
                    } else {
                        100.0
                    }
                }
                ClickMode::RandomInterval => {
                    let min = config.min_interval_ms.min(config.max_interval_ms);
                    let max = config.min_interval_ms.max(config.max_interval_ms);
                    min + rand_simple() * (max - min)
                }
                ClickMode::BaseJitter => {
                    let base = config.interval_ms;
                    let jitter = (rand_simple() * 2.0 - 1.0) * config.jitter_ms;
                    (base + jitter).max(1.0)
                }
                ClickMode::RandomCps => {
                    let min_cps = config.min_cps.min(config.max_cps).max(0.1);
                    let max_cps = config.min_cps.max(config.max_cps);
                    let chosen_cps = min_cps + rand_simple() * (max_cps - min_cps);
                    1000.0 / chosen_cps
                }
            };

            target_next_time += Duration::from_micros((interval_ms * 1000.0) as u64);
            let now = Instant::now();

            let drift = if now > target_next_time {
                (now - target_next_time).as_secs_f64() * 1000.0
            } else {
                0.0
            };

            // High precision sleep
            if target_next_time > now {
                let diff = target_next_time - now;
                if diff > Duration::from_millis(2) {
                    thread::sleep(diff - Duration::from_millis(1));
                }
                while Instant::now() < target_next_time {
                    std::hint::spin_loop();
                }
            } else {
                // If fell behind, reset anchor to avoid runaway bursts
                target_next_time = Instant::now();
            }

            // Update stats every 500ms
            if last_cps_calc.elapsed() >= Duration::from_millis(500) {
                let dt = last_cps_calc.elapsed().as_secs_f64();
                let real_cps = (clicks_since_last_calc as f64) / dt;
                last_cps_calc = Instant::now();
                clicks_since_last_calc = 0;

                if let Ok(mut st) = status.lock() {
                    st.real_cps = (real_cps * 10.0).round() / 10.0;
                    st.elapsed_seconds = (start_time.elapsed().as_secs_f64() * 10.0).round() / 10.0;
                    st.timer_drift_ms = (drift * 10.0).round() / 10.0;
                    st.click_count = new_clicks;
                }
            }
        }

        Self::release_all_inputs_native();
        is_running.store(false, Ordering::SeqCst);
        is_paused.store(false, Ordering::SeqCst);

        if let Ok(mut st) = status.lock() {
            st.running = false;
            st.paused = false;
            st.current_action = "Prontinho 💕".to_string();
        }
    }

    fn execute_multi_point_loop(
        config: &AutoClickEngineConfig,
        is_running: &Arc<AtomicBool>,
        is_paused: &Arc<AtomicBool>,
        click_count: &Arc<AtomicU64>,
        status: &Arc<Mutex<EngineStatus>>,
        start_time: Instant,
    ) {
        let active_points: Vec<_> = config.multi_points.iter().filter(|p| p.enabled).cloned().collect();
        if active_points.is_empty() {
            return;
        }

        let mut current_point_idx = 0;
        while is_running.load(Ordering::SeqCst) {
            while is_paused.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_millis(50));
                if !is_running.load(Ordering::SeqCst) {
                    return;
                }
            }

            if config.corner_failsafe && Self::is_cursor_in_corner() {
                break;
            }

            let pt = &active_points[current_point_idx];
            if pt.delay_before_ms > 0 {
                thread::sleep(Duration::from_millis(pt.delay_before_ms));
            }

            for _ in 0..pt.repeat_times.max(1) {
                if !is_running.load(Ordering::SeqCst) {
                    return;
                }

                if !config.simulation_mode {
                    Self::send_mouse_click_native(
                        &pt.button,
                        &pt.click_type,
                        Some(pt.x),
                        Some(pt.y),
                    );
                }
                click_count.fetch_add(1, Ordering::SeqCst);
            }

            if pt.delay_after_ms > 0 {
                thread::sleep(Duration::from_millis(pt.delay_after_ms));
            }

            current_point_idx = (current_point_idx + 1) % active_points.len();

            if let Ok(mut st) = status.lock() {
                st.elapsed_seconds = start_time.elapsed().as_secs_f64();
                st.current_action = format!("Ponto ({}, {})", pt.x, pt.y);
            }
        }
    }

    fn execute_timeline_loop(
        config: &AutoClickEngineConfig,
        is_running: &Arc<AtomicBool>,
        is_paused: &Arc<AtomicBool>,
        click_count: &Arc<AtomicU64>,
        status: &Arc<Mutex<EngineStatus>>,
        start_time: Instant,
    ) {
        let actions = &config.timeline_actions;
        let mut loop_stack: Vec<(usize, u32, u32)> = Vec::new(); // (start_idx, max_iter, current_iter)
        let mut pc = 0;

        while is_running.load(Ordering::SeqCst) && pc < actions.len() {
            while is_paused.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_millis(50));
                if !is_running.load(Ordering::SeqCst) {
                    return;
                }
            }

            if config.corner_failsafe && Self::is_cursor_in_corner() {
                break;
            }

            match &actions[pc] {
                AutomationAction::MouseClick { button, click_type, x, y, delay_ms } => {
                    if *delay_ms > 0 {
                        thread::sleep(Duration::from_millis(*delay_ms));
                    }
                    if !config.simulation_mode {
                        Self::send_mouse_click_native(button, click_type, *x, *y);
                    }
                    click_count.fetch_add(1, Ordering::SeqCst);
                }
                AutomationAction::MouseMove { x, y, duration_ms } => {
                    if !config.simulation_mode {
                        Self::set_cursor_pos_native(*x, *y);
                    }
                    if *duration_ms > 0 {
                        thread::sleep(Duration::from_millis(*duration_ms));
                    }
                }
                AutomationAction::MouseScroll { delta, delay_ms } => {
                    if *delay_ms > 0 {
                        thread::sleep(Duration::from_millis(*delay_ms));
                    }
                    if !config.simulation_mode {
                        Self::send_mouse_scroll_native(*delta);
                    }
                }
                AutomationAction::KeyPress { key, delay_ms } => {
                    if *delay_ms > 0 {
                        thread::sleep(Duration::from_millis(*delay_ms));
                    }
                    if !config.simulation_mode {
                        Self::send_key_native(key, true);
                        thread::sleep(Duration::from_millis(20));
                        Self::send_key_native(key, false);
                    }
                }
                AutomationAction::KeyDown { key } => {
                    if !config.simulation_mode {
                        Self::send_key_native(key, true);
                    }
                }
                AutomationAction::KeyUp { key } => {
                    if !config.simulation_mode {
                        Self::send_key_native(key, false);
                    }
                }
                AutomationAction::Wait { duration_ms } => {
                    thread::sleep(Duration::from_millis(*duration_ms));
                }
                AutomationAction::RandomWait { min_ms, max_ms } => {
                    let min = *min_ms.min(max_ms);
                    let max = *min_ms.max(max_ms);
                    let dur = min + (rand_simple() * (max - min) as f64) as u64;
                    thread::sleep(Duration::from_millis(dur));
                }
                AutomationAction::LoopStart { iterations } => {
                    loop_stack.push((pc, *iterations, 0));
                }
                AutomationAction::LoopEnd => {
                    if let Some((start_idx, max_iter, current_iter)) = loop_stack.pop() {
                        let next_iter = current_iter + 1;
                        if next_iter < max_iter {
                            loop_stack.push((start_idx, max_iter, next_iter));
                            pc = start_idx + 1;
                            continue;
                        }
                    }
                }
                AutomationAction::Comment { .. } => {}
            }

            pc += 1;

            if let Ok(mut st) = status.lock() {
                st.elapsed_seconds = start_time.elapsed().as_secs_f64();
            }
        }
    }

    // Windows Native Input Simulation via Win32 API
    #[cfg(windows)]
    fn send_mouse_click_native(
        button: &MouseButton,
        click_type: &ClickType,
        x: Option<i32>,
        y: Option<i32>,
    ) {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput, INPUT, INPUT_MOUSE, MOUSEEVENTF_LEFTDOWN,
            MOUSEEVENTF_LEFTUP, MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP,
            MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, MOUSEINPUT,
        };

        // A fixed point has to travel with the click itself. SetCursorPos alone loses
        // to the next physical mouse move, so the click landed wherever the cursor was.
        let placed = match (x, y) {
            (Some(px), Some(py)) => {
                Self::set_cursor_pos_native(px, py);
                Some(Self::to_absolute_desktop(px, py))
            }
            _ => None,
        };

        let (down_flag, up_flag) = match button {
            MouseButton::Left => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
            MouseButton::Right => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
            MouseButton::Middle => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
        };

        let loops = match click_type {
            ClickType::Single => 1,
            ClickType::Double => 2,
            ClickType::Triple => 3,
            ClickType::Hold => 1,
        };

        let (dx, dy, move_flags) = match placed {
            Some((ax, ay)) => (
                ax,
                ay,
                windows_sys::Win32::UI::Input::KeyboardAndMouse::MOUSEEVENTF_MOVE
                    | windows_sys::Win32::UI::Input::KeyboardAndMouse::MOUSEEVENTF_ABSOLUTE
                    | windows_sys::Win32::UI::Input::KeyboardAndMouse::MOUSEEVENTF_VIRTUALDESK,
            ),
            None => (0, 0, 0),
        };

        for i in 0..loops {
            unsafe {
                let mut input_down = INPUT {
                    r#type: INPUT_MOUSE,
                    Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                        mi: MOUSEINPUT {
                            dx,
                            dy,
                            mouseData: 0,
                            dwFlags: down_flag | move_flags,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                SendInput(1, &mut input_down, std::mem::size_of::<INPUT>() as i32);

                if *click_type != ClickType::Hold {
                    thread::sleep(Duration::from_millis(15));
                    let mut input_up = INPUT {
                        r#type: INPUT_MOUSE,
                        Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                            mi: MOUSEINPUT {
                                dx,
                                dy,
                                mouseData: 0,
                                dwFlags: up_flag | move_flags,
                                time: 0,
                                dwExtraInfo: 0,
                            },
                        },
                    };
                    SendInput(1, &mut input_up, std::mem::size_of::<INPUT>() as i32);
                }
            }

            if i + 1 < loops {
                thread::sleep(Duration::from_millis(40));
            }
        }
    }

    #[cfg(not(windows))]
    fn send_mouse_click_native(
        _button: &MouseButton,
        _click_type: &ClickType,
        _x: Option<i32>,
        _y: Option<i32>,
    ) {
    }

    /// Maps a screen point onto the 0–65535 virtual desktop that SendInput absolute moves use.
    #[cfg(windows)]
    fn to_absolute_desktop(x: i32, y: i32) -> (i32, i32) {
        use windows_sys::Win32::UI::WindowsAndMessaging::GetSystemMetrics;
        const SM_XVIRTUALSCREEN: i32 = 76;
        const SM_YVIRTUALSCREEN: i32 = 77;
        const SM_CXVIRTUALSCREEN: i32 = 78;
        const SM_CYVIRTUALSCREEN: i32 = 79;
        unsafe {
            let origin_x = GetSystemMetrics(SM_XVIRTUALSCREEN);
            let origin_y = GetSystemMetrics(SM_YVIRTUALSCREEN);
            let width = GetSystemMetrics(SM_CXVIRTUALSCREEN).max(2);
            let height = GetSystemMetrics(SM_CYVIRTUALSCREEN).max(2);
            let ax = (((x - origin_x) as i64 * 65535) / (width as i64 - 1)).clamp(0, 65535) as i32;
            let ay = (((y - origin_y) as i64 * 65535) / (height as i64 - 1)).clamp(0, 65535) as i32;
            (ax, ay)
        }
    }

    #[cfg(windows)]
    fn set_cursor_pos_native(x: i32, y: i32) {
        use windows_sys::Win32::UI::WindowsAndMessaging::SetCursorPos;
        unsafe {
            SetCursorPos(x, y);
        }
    }

    #[cfg(not(windows))]
    fn set_cursor_pos_native(_x: i32, _y: i32) {}

    #[cfg(windows)]
    fn send_mouse_scroll_native(delta: i32) {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput, INPUT, INPUT_MOUSE, MOUSEEVENTF_WHEEL, MOUSEINPUT,
        };
        unsafe {
            let mut input = INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    mi: MOUSEINPUT {
                        dx: 0,
                        dy: 0,
                        mouseData: delta as u32,
                        dwFlags: MOUSEEVENTF_WHEEL,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
        }
    }

    #[cfg(not(windows))]
    fn send_mouse_scroll_native(_delta: i32) {}

    #[cfg(windows)]
    fn send_key_native(key_str: &str, down: bool) {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP,
        };

        let vk = match key_str.to_uppercase().as_str() {
            "SPACE" => 0x20,
            "ENTER" => 0x0D,
            "ESCAPE" => 0x1B,
            "TAB" => 0x09,
            "SHIFT" => 0x10,
            "CONTROL" | "CTRL" => 0x11,
            "ALT" => 0x12,
            "F1" => 0x70,
            "F2" => 0x71,
            "F3" => 0x72,
            "F4" => 0x73,
            "F5" => 0x74,
            "F6" => 0x75,
            "F7" => 0x76,
            "F8" => 0x77,
            "F9" => 0x78,
            "F10" => 0x79,
            "F11" => 0x7A,
            "F12" => 0x7B,
            s if s.len() == 1 => s.chars().next().unwrap() as u16,
            _ => 0x45, // default 'E'
        };

        let dw_flags = if down { 0 } else { KEYEVENTF_KEYUP };

        unsafe {
            let mut input = INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk,
                        wScan: 0,
                        dwFlags: dw_flags,
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
        }
    }

    #[cfg(not(windows))]
    fn send_key_native(_key_str: &str, _down: bool) {}

    #[cfg(windows)]
    pub fn release_all_inputs_native() {
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput, INPUT, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYEVENTF_KEYUP,
            MOUSEEVENTF_LEFTUP, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_RIGHTUP, MOUSEINPUT,
        };

        unsafe {
            // Release mouse buttons
            for flag in [MOUSEEVENTF_LEFTUP, MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_MIDDLEUP] {
                let mut input = INPUT {
                    r#type: INPUT_MOUSE,
                    Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                        mi: MOUSEINPUT {
                            dx: 0,
                            dy: 0,
                            mouseData: 0,
                            dwFlags: flag,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
            }

            // Release common keys
            for vk in [0x10, 0x11, 0x12, 0x20, 0x57, 0x41, 0x53, 0x44, 0x45] {
                let mut input = INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                };
                SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
            }
        }
    }

    #[cfg(not(windows))]
    pub fn release_all_inputs_native() {}

    #[cfg(windows)]
    pub fn is_cursor_in_corner() -> bool {
        use windows_sys::Win32::Foundation::POINT;
        use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
        unsafe {
            let mut pt = POINT { x: 0, y: 0 };
            if GetCursorPos(&mut pt) != 0 {
                // Top-left corner (0..5 px)
                return pt.x <= 5 && pt.y <= 5;
            }
        }
        false
    }

    #[cfg(not(windows))]
    pub fn is_cursor_in_corner() -> bool {
        false
    }

    #[cfg(windows)]
    pub fn get_cursor_pos_native() -> (i32, i32) {
        use windows_sys::Win32::Foundation::POINT;
        use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
        unsafe {
            let mut pt = POINT { x: 0, y: 0 };
            if GetCursorPos(&mut pt) != 0 {
                return (pt.x, pt.y);
            }
        }
        (0, 0)
    }

    #[cfg(not(windows))]
    pub fn get_cursor_pos_native() -> (i32, i32) {
        (0, 0)
    }
}

// Simple deterministic PRNG for jitter and randomization without large dependencies
static mut RAND_STATE: u64 = 88172645463325252;
fn rand_simple() -> f64 {
    unsafe {
        let mut x = RAND_STATE;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        RAND_STATE = x;
        ((x % 1000000) as f64) / 1000000.0
    }
}

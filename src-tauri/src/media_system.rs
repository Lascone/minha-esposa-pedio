use std::process::Command;

/// Send multimedia key directly via Win32 API in 0ms latency
#[cfg(windows)]
fn send_vk_key(vk: u8) {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        keybd_event, KEYEVENTF_KEYUP,
    };
    unsafe {
        keybd_event(vk, 0, 0, 0);
        keybd_event(vk, 0, KEYEVENTF_KEYUP, 0);
    }
}

#[cfg(not(windows))]
fn send_vk_key(_vk: u8) {}

#[tauri::command(async)]
pub fn media_send_command(action: String) -> Result<bool, String> {
    match action.to_lowercase().as_str() {
        "play_pause" | "toggle" => {
            // VK_MEDIA_PLAY_PAUSE = 0xB3
            send_vk_key(0xB3);
            Ok(true)
        }
        "next" => {
            // VK_MEDIA_NEXT_TRACK = 0xB0
            send_vk_key(0xB0);
            Ok(true)
        }
        "previous" | "prev" => {
            // VK_MEDIA_PREV_TRACK = 0xB1
            send_vk_key(0xB1);
            Ok(true)
        }
        "volume_up" => {
            // VK_VOLUME_UP = 0xAF
            send_vk_key(0xAF);
            Ok(true)
        }
        "volume_down" => {
            // VK_VOLUME_DOWN = 0xAE
            send_vk_key(0xAE);
            Ok(true)
        }
        "volume_mute" | "mute" => {
            // VK_VOLUME_MUTE = 0xAD
            send_vk_key(0xAD);
            Ok(true)
        }
        _ => Err(format!("Ação de mídia desconhecida: {}", action)),
    }
}

#[tauri::command(async)]
pub fn media_open_firefox(url: Option<String>) -> Result<bool, String> {
    let target_url = url.unwrap_or_else(|| "https://music.youtube.com".to_string());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // 1. Try launching Mozilla Firefox directly
        let firefox_path = std::path::PathBuf::from(r"C:\Program Files\Mozilla Firefox\firefox.exe");
        if firefox_path.exists() {
            let _ = Command::new(&firefox_path)
                .arg(&target_url)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
            return Ok(true);
        }

        // 2. Try 32-bit Program Files
        let firefox_path_x86 = std::path::PathBuf::from(r"C:\Program Files (x86)\Mozilla Firefox\firefox.exe");
        if firefox_path_x86.exists() {
            let _ = Command::new(&firefox_path_x86)
                .arg(&target_url)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
            return Ok(true);
        }

        // 3. Fallback to explorer/start URL silently with default browser
        let _ = Command::new("explorer")
            .arg(&target_url)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
    }

    #[cfg(not(windows))]
    {
        let _ = target_url;
    }

    Ok(true)
}


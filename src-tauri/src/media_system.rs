use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaSessionStatus {
    pub has_media: bool,
    pub source_app: String,
    pub title: String,
    pub artist: String,
    pub album_title: String,
    pub is_playing: bool,
    pub playback_status: String,
}

impl Default for MediaSessionStatus {
    fn default() -> Self {
        Self {
            has_media: false,
            source_app: String::new(),
            title: String::new(),
            artist: String::new(),
            album_title: String::new(),
            is_playing: false,
            playback_status: "Stopped".to_string(),
        }
    }
}

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

#[tauri::command]
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

#[tauri::command]
pub fn media_open_firefox(url: Option<String>) -> Result<bool, String> {
    let target_url = url.unwrap_or_else(|| "https://music.youtube.com".to_string());

    // 1. Try launching Mozilla Firefox directly
    let firefox_path = std::path::PathBuf::from(r"C:\Program Files\Mozilla Firefox\firefox.exe");
    if firefox_path.exists() {
        let _ = Command::new(&firefox_path)
            .arg(&target_url)
            .spawn();
        return Ok(true);
    }

    // 2. Try 32-bit Program Files
    let firefox_path_x86 = std::path::PathBuf::from(r"C:\Program Files (x86)\Mozilla Firefox\firefox.exe");
    if firefox_path_x86.exists() {
        let _ = Command::new(&firefox_path_x86)
            .arg(&target_url)
            .spawn();
        return Ok(true);
    }

    // 3. Fallback to explorer/start URL with default browser
    let _ = Command::new("cmd")
        .args(["/C", "start", &target_url])
        .spawn();

    Ok(true)
}

#[tauri::command]
pub fn media_get_status() -> MediaSessionStatus {
    // Query Windows SMTC (System Media Transport Controls) via fast PowerShell bridge
    let ps_code = r#"
Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $t) { $task = $asTaskGeneric.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(120) | Out-Null; $task.Result }
try {
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
    $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $mgr = Await $asyncOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    $session = $mgr.GetCurrentSession()
    if (-not $session) {
        $sessions = $mgr.GetSessions()
        if ($sessions.Count -gt 0) { $session = $sessions[0] }
    }
    if ($session) {
        $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        $info = $session.GetPlaybackInfo()
        @{
            has_media = $true
            source_app = $session.SourceAppUserModelId
            title = $props.Title
            artist = $props.Artist
            album_title = $props.AlbumTitle
            playback_status = $info.PlaybackStatus.ToString()
        } | ConvertTo-Json -Compress
    } else {
        '{"has_media":false,"source_app":"","title":"","artist":"","album_title":"","playback_status":"Stopped"}'
    }
} catch {
    '{"has_media":false,"source_app":"","title":"","artist":"","album_title":"","playback_status":"Stopped"}'
}
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_code])
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            let json_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                let has_media = val.get("has_media").and_then(|v| v.as_bool()).unwrap_or(false);
                let title = val.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let artist = val.get("artist").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let album_title = val.get("album_title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let source_app = val.get("source_app").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let playback_status = val.get("playback_status").and_then(|v| v.as_str()).unwrap_or("Stopped").to_string();
                let is_playing = playback_status == "Playing";

                return MediaSessionStatus {
                    has_media,
                    source_app,
                    title,
                    artist,
                    album_title,
                    is_playing,
                    playback_status,
                };
            }
        }
    }

    MediaSessionStatus::default()
}

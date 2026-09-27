//! Only one copy of the app may run: a second copy would restore the taskbar on start-up, open a
//! second dock and share the WebView2 profile with the first one. Opening the app again just brings
//! the running window to the front.

use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, BOOL, ERROR_ALREADY_EXISTS, HWND, LPARAM};
use windows_sys::Win32::System::Threading::{CreateMutexW, GetCurrentProcessId};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowTextW, GetWindowThreadProcessId, IsIconic, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW,
};

const MUTEX_NAME: &str = "Local\\PediParaMeuMarido.Central.SingleInstance";
const MAIN_TITLE: &str = "Pedi para meu marido";

pub fn is_main_title(title: &str) -> bool {
    title.trim_end().ends_with(MAIN_TITLE)
}

/// Returns false when another copy is already running (after bringing it to the front). The mutex
/// handle is intentionally kept open for the life of the process.
pub fn acquire() -> bool {
    let name: Vec<u16> = MUTEX_NAME.encode_utf16().chain(std::iter::once(0)).collect();
    // Right after an update the old copy may still be closing: give it a moment.
    for _ in 0..15 {
        let handle = unsafe { CreateMutexW(std::ptr::null(), 0, name.as_ptr()) };
        if handle == 0 || unsafe { GetLastError() } != ERROR_ALREADY_EXISTS {
            return true;
        }
        unsafe { CloseHandle(handle) };
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
    focus_running_copy();
    false
}

fn focus_running_copy() {
    unsafe extern "system" fn visit(hwnd: HWND, _l: LPARAM) -> BOOL {
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == GetCurrentProcessId() {
            return 1;
        }
        let mut buf = [0u16; 256];
        let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
        if len > 0 && is_main_title(&String::from_utf16_lossy(&buf[..len as usize])) {
            ShowWindow(hwnd, if IsIconic(hwnd) != 0 { SW_RESTORE } else { SW_SHOW });
            SetForegroundWindow(hwnd);
            return 0;
        }
        1
    }
    unsafe { EnumWindows(Some(visit), 0) };
}

#[cfg(test)]
mod tests {
    use super::is_main_title;

    #[test]
    fn matches_the_main_window_title() {
        assert!(is_main_title("💕 Pedi para meu marido"));
        assert!(is_main_title("Pedi para meu marido"));
        assert!(!is_main_title("Dock"));
        assert!(!is_main_title("Bandeja do dock"));
    }
}

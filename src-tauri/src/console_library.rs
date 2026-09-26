//! Private storage for the mini console (games, patches, covers, saves).
//!
//! Layout under `app_data_dir/console/`:
//! - `files/<sha1>.<ext>`: deduplicated imported files (never modified after write)
//! - `library.json`: game library owned by the frontend schema
//! - `saves/<game_id>/<name>`: SRAM, save states and thumbnails per game

use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Emitter, Manager};

const LIBRARY_EVENT: &str = "console-library-changed";
const MAX_FILE_BYTES: usize = 64 * 1024 * 1024;

fn console_root(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Pasta de dados do app indisponível: {}", e))?;
    let root = base.join("console");
    fs::create_dir_all(root.join("files")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("saves")).map_err(|e| e.to_string())?;
    Ok(root)
}

fn is_valid_sha1(s: &str) -> bool {
    s.len() == 40 && s.chars().all(|c| c.is_ascii_hexdigit())
}

fn is_valid_ext(s: &str) -> bool {
    !s.is_empty() && s.len() <= 6 && s.chars().all(|c| c.is_ascii_alphanumeric())
}

fn is_valid_game_id(s: &str) -> bool {
    !s.is_empty() && s.len() <= 80 && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn is_valid_save_name(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 64
        && !s.starts_with('.')
        && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
        && !s.contains("..")
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("tmp-write");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(bytes).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

fn header(request: &Request<'_>, name: &str) -> Result<String, String> {
    request
        .headers()
        .get(name)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Cabeçalho '{}' ausente", name))
}

fn raw_body(request: &Request<'_>) -> Result<Vec<u8>, String> {
    match request.body() {
        InvokeBody::Raw(bytes) => Ok(bytes.clone()),
        _ => Err("Corpo binário esperado".to_string()),
    }
}

fn find_file_by_sha1(root: &Path, sha1: &str) -> Option<PathBuf> {
    let dir = root.join("files");
    let prefix = format!("{}.", sha1.to_ascii_lowercase());
    fs::read_dir(dir).ok()?.flatten().map(|e| e.path()).find(|p| {
        p.file_name()
            .and_then(|n| n.to_str())
            .map(|n| n.starts_with(&prefix))
            .unwrap_or(false)
    })
}

#[derive(Serialize)]
pub struct ConsoleStoredFile {
    pub sha1: String,
    pub size: u64,
    pub already_existed: bool,
}

/// Stores an imported file by content hash. Headers: `x-sha1`, `x-ext`. Body: raw bytes.
#[tauri::command]
pub fn console_store_file(app: AppHandle, request: Request<'_>) -> Result<ConsoleStoredFile, String> {
    let sha1 = header(&request, "x-sha1")?.to_ascii_lowercase();
    let ext = header(&request, "x-ext")?.to_ascii_lowercase();
    if !is_valid_sha1(&sha1) || !is_valid_ext(&ext) {
        return Err("Identificador de arquivo inválido".to_string());
    }
    let bytes = raw_body(&request)?;
    if bytes.is_empty() {
        return Err("O arquivo está vazio".to_string());
    }
    if bytes.len() > MAX_FILE_BYTES {
        return Err("Arquivo grande demais".to_string());
    }

    let root = console_root(&app)?;
    if let Some(existing) = find_file_by_sha1(&root, &sha1) {
        let size = fs::metadata(&existing).map(|m| m.len()).unwrap_or(0);
        return Ok(ConsoleStoredFile { sha1, size, already_existed: true });
    }

    let path = root.join("files").join(format!("{}.{}", sha1, ext));
    write_atomic(&path, &bytes)?;
    Ok(ConsoleStoredFile { sha1, size: bytes.len() as u64, already_existed: false })
}

#[tauri::command]
pub fn console_read_file(app: AppHandle, sha1: String) -> Result<Response, String> {
    if !is_valid_sha1(&sha1) {
        return Err("Identificador de arquivo inválido".to_string());
    }
    let root = console_root(&app)?;
    let path = find_file_by_sha1(&root, &sha1).ok_or_else(|| "NOT_FOUND".to_string())?;
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(Response::new(bytes))
}

#[tauri::command]
pub fn console_file_exists(app: AppHandle, sha1: String) -> Result<bool, String> {
    if !is_valid_sha1(&sha1) {
        return Ok(false);
    }
    let root = console_root(&app)?;
    Ok(find_file_by_sha1(&root, &sha1).is_some())
}

#[tauri::command]
pub fn console_library_get(app: AppHandle) -> Result<serde_json::Value, String> {
    let root = console_root(&app)?;
    let path = root.join("library.json");
    if !path.exists() {
        return Ok(serde_json::json!({ "version": 1, "games": [] }));
    }
    let text = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| format!("library.json corrompido: {}", e))
}

#[tauri::command]
pub fn console_library_save(app: AppHandle, library: serde_json::Value) -> Result<(), String> {
    if !library.get("games").map(|g| g.is_array()).unwrap_or(false) {
        return Err("Biblioteca inválida".to_string());
    }
    let root = console_root(&app)?;
    let text = serde_json::to_string_pretty(&library).map_err(|e| e.to_string())?;
    write_atomic(&root.join("library.json"), text.as_bytes())?;
    let _ = app.emit(LIBRARY_EVENT, ());
    Ok(())
}

/// Removes a game's saves and the given files (the frontend passes only files no other game uses).
#[tauri::command]
pub fn console_remove_game(app: AppHandle, game_id: String, orphan_files: Vec<String>) -> Result<(), String> {
    if !is_valid_game_id(&game_id) {
        return Err("Jogo inválido".to_string());
    }
    let root = console_root(&app)?;
    let saves = root.join("saves").join(&game_id);
    if saves.exists() {
        fs::remove_dir_all(&saves).map_err(|e| e.to_string())?;
    }
    for sha1 in orphan_files.iter().filter(|s| is_valid_sha1(s)) {
        if let Some(path) = find_file_by_sha1(&root, sha1) {
            let _ = fs::remove_file(path);
        }
    }
    Ok(())
}

/// Writes a save file. Headers: `x-game-id`, `x-name`. Body: raw bytes.
#[tauri::command]
pub fn console_write_save(app: AppHandle, request: Request<'_>) -> Result<(), String> {
    let game_id = header(&request, "x-game-id")?;
    let name = header(&request, "x-name")?;
    if !is_valid_game_id(&game_id) || !is_valid_save_name(&name) {
        return Err("Nome de salvamento inválido".to_string());
    }
    let bytes = raw_body(&request)?;
    if bytes.len() > MAX_FILE_BYTES {
        return Err("Salvamento grande demais".to_string());
    }
    let dir = console_root(&app)?.join("saves").join(&game_id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    write_atomic(&dir.join(&name), &bytes)
}

#[tauri::command]
pub fn console_read_save(app: AppHandle, game_id: String, name: String) -> Result<Response, String> {
    if !is_valid_game_id(&game_id) || !is_valid_save_name(&name) {
        return Err("Nome de salvamento inválido".to_string());
    }
    let path = console_root(&app)?.join("saves").join(&game_id).join(&name);
    if !path.exists() {
        return Err("NOT_FOUND".to_string());
    }
    Ok(Response::new(fs::read(path).map_err(|e| e.to_string())?))
}

#[derive(Serialize)]
pub struct ConsoleSaveEntry {
    pub name: String,
    pub size: u64,
    pub modified_ms: u64,
}

#[tauri::command]
pub fn console_list_saves(app: AppHandle, game_id: String) -> Result<Vec<ConsoleSaveEntry>, String> {
    if !is_valid_game_id(&game_id) {
        return Err("Jogo inválido".to_string());
    }
    let dir = console_root(&app)?.join("saves").join(&game_id);
    let Ok(entries) = fs::read_dir(&dir) else {
        return Ok(vec![]);
    };
    let mut out = Vec::new();
    for entry in entries.flatten() {
        let Ok(meta) = entry.metadata() else { continue };
        if !meta.is_file() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(".tmp-write") {
            continue;
        }
        let modified_ms = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        out.push(ConsoleSaveEntry { name, size: meta.len(), modified_ms });
    }
    Ok(out)
}

#[tauri::command]
pub fn console_delete_save(app: AppHandle, game_id: String, name: String) -> Result<(), String> {
    if !is_valid_game_id(&game_id) || !is_valid_save_name(&name) {
        return Err("Nome de salvamento inválido".to_string());
    }
    let path = console_root(&app)?.join("saves").join(&game_id).join(&name);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn console_get_data_dir(app: AppHandle) -> Result<String, String> {
    Ok(console_root(&app)?.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_identifiers() {
        assert!(is_valid_sha1("0123456789abcdef0123456789abcdef01234567"));
        assert!(!is_valid_sha1("../etc/passwd"));
        assert!(is_valid_ext("sfc"));
        assert!(!is_valid_ext("s/c"));
        assert!(is_valid_game_id("smw"));
        assert!(!is_valid_game_id("../x"));
        assert!(is_valid_save_name("state-1.state"));
        assert!(!is_valid_save_name("../sram.srm"));
        assert!(!is_valid_save_name(".hidden"));
    }
}

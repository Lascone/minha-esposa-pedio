use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebImageResult {
    pub id: String,
    pub title: String,
    pub url: String,
    pub thumbnail: String,
    pub domain: String,
    pub is_transparent: bool,
    pub is_gif: bool,
    pub aspect: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct BingMObject {
    murl: Option<String>,
    turl: Option<String>,
    t: Option<String>,
    purl: Option<String>,
    fmt: Option<String>,
    mw: Option<u32>,
    mh: Option<u32>,
}

const BROWSER_UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

fn sniff_image_mime(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("image/jpeg")
    } else if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        Some("image/png")
    } else if bytes.starts_with(b"GIF8") {
        Some("image/gif")
    } else if bytes.len() > 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    }
}

/// Downloads an image the user pasted as a link and returns it as a data URL. Many wallpaper sites
/// refuse images embedded from other pages, so widgets can't simply point at the original address.
#[tauri::command(async)]
pub fn widget_fetch_image(url: String) -> Result<String, String> {
    use base64::Engine;

    let url = url.trim();
    if !(url.starts_with("https://") || url.starts_with("http://")) || url.contains('"') || url.contains(char::is_whitespace) {
        return Err("Link de imagem inválido.".into());
    }
    let referer = url.splitn(4, '/').take(3).collect::<Vec<_>>().join("/") + "/";
    let args = [
        "-s", "-L", "--fail", "--max-time", "20", "--max-filesize", "15000000",
        "-A", BROWSER_UA, "-e", referer.as_str(), url,
    ];

    #[cfg(target_os = "windows")]
    let output = {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("curl.exe")
            .args(args)
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("Falha ao invocar curl: {}", e))?
    };
    #[cfg(not(target_os = "windows"))]
    let output = std::process::Command::new("curl")
        .args(args)
        .output()
        .map_err(|e| format!("Falha ao invocar curl: {}", e))?;

    if !output.status.success() || output.stdout.is_empty() {
        return Err("Não consegui baixar a imagem desse link.".into());
    }
    let mime = sniff_image_mime(&output.stdout).ok_or("O link não aponta para uma imagem.")?;
    Ok(format!(
        "data:{};base64,{}",
        mime,
        base64::engine::general_purpose::STANDARD.encode(&output.stdout)
    ))
}

#[tauri::command(async)]
pub fn search_web_images(
    query: String,
    filter_type: Option<String>,
    filter_aspect: Option<String>,
    first: Option<u32>,
    count: Option<u32>,
) -> Result<Vec<WebImageResult>, String> {
    let clean_query = query.trim();
    if clean_query.is_empty() {
        return Ok(Vec::new());
    }

    let first_idx = first.unwrap_or(0);
    let fetch_count = count.unwrap_or(35).clamp(10, 50);

    // Montar filtros do Bing Images
    let mut filter_params = Vec::new();

    if let Some(ref ft) = filter_type {
        match ft.as_str() {
            "png" | "transparent" => filter_params.push("filterui:photo-transparent"),
            "gif" | "animated" => filter_params.push("filterui:photo-animatedgif"),
            "photo" | "wallpaper" => filter_params.push("filterui:photo-photo+filterui:imagesize-large"),
            "clipart" => filter_params.push("filterui:photo-clipart"),
            "lineart" => filter_params.push("filterui:photo-linedrawing"),
            _ => {}
        }
    }

    if let Some(ref fa) = filter_aspect {
        match fa.as_str() {
            "square" => filter_params.push("filterui:aspect-square"),
            "landscape" => filter_params.push("filterui:aspect-wide"),
            "portrait" => filter_params.push("filterui:aspect-tall"),
            _ => {}
        }
    }

    let filter_str = if filter_params.is_empty() {
        String::new()
    } else {
        format!("+{}", filter_params.join("+"))
    };

    fn url_encode(input: &str) -> String {
        let mut encoded = String::new();
        for b in input.bytes() {
            match b {
                b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    encoded.push(b as char);
                }
                b' ' => encoded.push('+'),
                _ => {
                    encoded.push_str(&format!("%{:02X}", b));
                }
            }
        }
        encoded
    }

    let encoded_query = url_encode(clean_query);
    let bing_url = format!(
        "https://www.bing.com/images/async?q={}{}&first={}&count={}",
        encoded_query, filter_str, first_idx, fetch_count
    );

    let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    #[cfg(target_os = "windows")]
    let output = {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("curl.exe")
            .args(["-s", "-L", "--max-time", "8", "-A", ua, &bing_url])
            .creation_flags(0x08000000) // Sem janela preta de console
            .output()
            .map_err(|e| format!("Falha ao invocar curl: {}", e))?
    };

    #[cfg(not(target_os = "windows"))]
    let output = std::process::Command::new("curl")
        .args(["-s", "-L", "--max-time", "8", "-A", ua, &bing_url])
        .output()
        .map_err(|e| format!("Falha ao invocar curl: {}", e))?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let html = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();

    // Bing armazena os metadados das imagens no atributo m="{&quot;murl&quot;:...}"
    let pattern = "m=\"{";
    let mut search_from = 0;

    while let Some(start_offset) = html[search_from..].find(pattern) {
        let abs_start = search_from + start_offset + 3; // pula para o '{'
        if let Some(end_offset) = html[abs_start..].find("\"") {
            let abs_end = abs_start + end_offset;
            let raw_json_attr = &html[abs_start..abs_end];
            let clean_json = raw_json_attr.replace("&quot;", "\"").replace("&amp;", "&");

            if let Ok(m_obj) = serde_json::from_str::<BingMObject>(&clean_json) {
                if let Some(murl) = m_obj.murl {
                    if murl.starts_with("http") {
                        let is_gif = murl.ends_with(".gif")
                            || m_obj.fmt.as_deref() == Some("gif")
                            || filter_type.as_deref() == Some("gif");
                        let is_png = murl.ends_with(".png")
                            || m_obj.fmt.as_deref() == Some("png")
                            || filter_type.as_deref() == Some("png");

                        let domain = m_obj
                            .purl
                            .as_deref()
                            .and_then(|p| {
                                p.split("://")
                                    .nth(1)
                                    .and_then(|after| after.split('/').next())
                            })
                            .map(|d| d.trim_start_matches("www.").to_string())
                            .unwrap_or_else(|| "web".to_string());

                        let w = m_obj.mw.unwrap_or(0);
                        let h = m_obj.mh.unwrap_or(0);
                        let aspect = if w > 0 && h > 0 {
                            if (w as f32 / h as f32) > 1.25 {
                                "landscape".to_string()
                            } else if (h as f32 / w as f32) > 1.25 {
                                "portrait".to_string()
                            } else {
                                "square".to_string()
                            }
                        } else {
                            "landscape".to_string()
                        };

                        let title = m_obj.t.unwrap_or_else(|| clean_query.to_string());
                        let thumbnail = m_obj.turl.unwrap_or_else(|| murl.clone());

                        results.push(WebImageResult {
                            id: format!("img-{}", results.len()),
                            title,
                            url: murl,
                            thumbnail,
                            domain,
                            is_transparent: is_png,
                            is_gif,
                            aspect,
                            width: m_obj.mw,
                            height: m_obj.mh,
                        });
                    }
                }
            }
            search_from = abs_end;
        } else {
            break;
        }
    }

    Ok(results)
}

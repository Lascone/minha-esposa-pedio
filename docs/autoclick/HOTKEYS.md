# Atalhos Globais (HOTKEYS.md)

O **HotkeyManager** gerencia os atalhos de teclado em nível de sistema operacional (funcionando mesmo quando outro jogo ou janela estiver em tela cheia).

## 1. Atalhos Padrão
- **`Insert`**: Iniciar / Parar automação imediatamente (parada forçada com liberação nativa de todas as teclas e cliques via `release_all_inputs_native`).
- **`ESC`**: Parada de emergência (Panic Key) instantânea quando em execução.
- **`F7`**: Capturar coordenada atual sob o cursor do mouse.
- **`F8`**: Pausar / Retomar automação em andamento.

## 2. Registro Nativo & Resolução de Conflitos
Os atalhos são gerenciados pelo Tauri através do plugin nativo `tauri-plugin-global-shortcut`.
- O atalho `Insert` é escutado só pelo atalho global do Windows (Rust). O evento chega em toda janela (principal, overlay e gadgets). Só a janela `main` pode iniciar. Um segundo `start` com o motor já ligado não pode chamar `stop`. Não registre o mesmo Insert de novo no `keydown` da janela.
- `F7` (`autoclick_pick_position`) lê `GetCursorPos` e grava a posição fixa do clique rápido. "Mirar na Tela" esconde a janela e espera o próximo clique em qualquer lugar (`autoclick_capture_click`).
- O Crosshair Overlay fica restrito exclusivamente ao seu próprio atalho (`F10` ou `Control+Alt+X`), sem interferir na operação do Auto Click.

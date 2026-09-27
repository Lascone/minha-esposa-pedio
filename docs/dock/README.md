# 🚀 Dock da Área de Trabalho

Barra de apps na borda da tela (estilo macOS/Seelen UI), configurada pela aba **Dock** do app.
Começa **desligada**. O "Modo dock" da barra do Windows também começa desligado.

## Arquitetura

| Camada | Arquivo | Papel |
| --- | --- | --- |
| Rust (nativo) | `src-tauri/src/dock_system.rs` | Janela do dock, lista de janelas (`SetWinEventHook`), ícones, `.lnk`, AppBar, tela cheia, seletores de arquivo |
| Rust (nativo) | `src-tauri/src/taskbar_mode.rs` | "Modo dock": backup, aplicação e restauração da barra do Windows |
| Lógica pura | `src/projects/dock/logic.ts` | Layout (px físicos/lógicos), reordenação, grupos, casamento janela ↔ item, auto-ocultar |
| Estado | `src/projects/dock/store/dockStore.ts` | Zustand persistido em `localStorage["pmm_dock"]`, sincronizado entre janelas pelo evento `storage` |
| Serviço | `src/projects/dock/dockService.ts` | Única ponte com os comandos Tauri |
| Janela | `src/projects/dock/views/DockWindow.tsx` | Rota `#/dock` (rótulo de janela `dock`) |
| Aba | `src/projects/dock/views/DockView.tsx` | Rota `/dock-settings`, com prévia ao vivo e todos os controles |

A interface nunca chama a API do Windows diretamente: tudo passa pelos comandos `dock_*` e `taskbar_mode_*`.

### Janela do dock
- Transparente, sem bordas, `WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW`: **não rouba o foco**, por isso "clicar de novo minimiza" funciona.
- Fica "atravessável" fora da área útil: a UI informa o retângulo interativo (`dock_set_hit_rect`) e um laço em Rust
  (40 ms) liga/desliga `set_ignore_cursor_events` conforme o cursor. Áreas vazias nunca bloqueiam a área de trabalho.
- Aparece só depois do primeiro `dock_set_bounds` (`SWP_SHOWWINDOW | SWP_NOACTIVATE`), já no lugar certo.
- Eventos emitidos pelo Rust: `dock://windows`, `dock://pointer`, `dock://fullscreen`, `dock://overlap`, `dock://displays-changed`.
- Menu de contexto nativo (`@tauri-apps/api/menu`): abrir, janelas abertas, local do arquivo, mudar ícone, separador, desafixar, fechar janelas.
- Arrastar do Explorer/área de trabalho: `onDragDropEvent` → `dock_resolve_item` (resolve `.lnk` via `IShellLinkW`).
- "Vidro do Windows" usa Acrylic real (`set_effects`). Nesse modo a janela tem o tamanho exato da barra, sem ampliação nem nomes flutuantes.
- Monitor escolhido some → volta ao principal. Resolução/escala muda → reposiciona (eventos a cada ~2 s).

### Estilo macOS (Iniciar dentro do dock)
- `behavior.startButton`: o primeiro ícone do dock abre o **menu Iniciar real** do Windows (`dock_shell_action("start")`,
  que envia a tecla Windows via `SendInput`). O menu continua sendo o nativo, e nada é simulado.
- Clique direito no Iniciar: Win + X (`quicklinks`), mostrar área de trabalho (`desktop`), restaurar a barra do Windows.
- Botão "Ativar estilo macOS" na aba: liga o Iniciar no dock, dock embaixo e centralizado com ampliação, apps abertos visíveis,
  e abre a **prévia** do Modo dock já com "ocultar automaticamente". A barra do Windows só muda quando a pessoa clica em Aplicar.
- A bandeja e o relógio continuam na barra nativa, que aparece ao encostar o mouse na borda. A bandeja não é simulada,
  para não quebrar ícones e menus dos apps.

### Modo dock (barra do Windows)
- Só usa configurações oficiais por usuário (HKCU): pesquisa, Visão de tarefas, Widgets, Chat, Copilot, Cortana
  e alinhamento à esquerda (Win11), mais a ocultação automática (`ABM_SETSTATE`).
- **Nunca** mexe no Iniciar, na bandeja, no relógio nem em ícones de notificação.
- Antes de qualquer mudança grava `%APPDATA%\com.pediparameumarido.central\taskbar-backup.json`. O primeiro backup nunca é sobrescrito.
- Restaura: ao desligar o modo, ao fechar o app (`RunEvent::Exit`), ao abrir depois de um travamento (backup ainda existe),
  pelo item **Restaurar barra do Windows** da bandeja e na desinstalação (`src-tauri/windows/hooks.nsh` → `--restore-taskbar`).
- Ao abrir o app com o modo ligado, ele é reaplicado.

## Limitações do Windows
- Não existe forma suportada de esconder **só** os apps abertos da barra do Windows mantendo Iniciar e bandeja. Ferramentas que
  fazem isso modificam o `explorer.exe` e quebram em atualizações. A alternativa estável é a barra compacta + ocultação automática.
- Alguns valores (ex.: `TaskbarDa`/Widgets em builds recentes do Win11) são protegidos pelo Windows. A UI mostra o aviso por item.
- Apps UWP aparecem como `ApplicationFrameHost.exe` e podem não casar com o atalho fixado.
- Janelas de apps rodando como administrador não podem ser controladas por um app sem elevação.
- `backdrop-filter` só desfoca o conteúdo da própria página. Para desfocar o que está atrás, use "Vidro do Windows".

## Testes
- `tests/dock.test.ts`: reordenação, grupos, casamento de janelas, ciclo de foco, layout (DPI, multi-monitor, Acrylic, AppBar), auto-ocultar, temas e store.
- `cargo test --lib`: filtro de janelas, seletor de arquivos, ícones, resolução de itens e backup/tweaks da barra.

## Créditos e licenças
- **Seelen UI**: AGPL-3.0. Usado apenas como inspiração de ideias (dock, regras de filtragem de janelas). **Nenhum código copiado.**
  Copiar código AGPL obrigaria o app inteiro a ser AGPL.
- **Cairo Desktop**: Apache-2.0 (C#/WPF). Referência conceitual de AppBar e de convivência com a barra do Windows. Nenhum código copiado.
- Ambos são creditados em **Sobre → Licenças & Atribuições**.

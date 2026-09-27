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
  (40 ms) liga/desliga `WS_EX_TRANSPARENT | WS_EX_LAYERED` direto no Win32 (`set_click_through`). Áreas vazias nunca bloqueiam a área de trabalho.
- **Não use `set_ignore_cursor_events` do Tauri no dock**: o tao recalcula todos os estilos a partir das flags dele e, como o dock
  é mostrado por `SetWindowPos` (sem roubar o foco), acha que a janela está oculta e chama `ShowWindow(SW_HIDE)`. Era isso que fazia
  o dock sumir ao passar o mouse. Um laço também remostra o dock (`SW_SHOWNA`) se algo o esconder enquanto deveria estar visível.
- Aparece só depois do primeiro `dock_set_bounds` (`SWP_SHOWWINDOW | SWP_NOACTIVATE`), já no lugar certo.
- Eventos emitidos pelo Rust: `dock://windows`, `dock://pointer`, `dock://fullscreen`, `dock://overlap`, `dock://displays-changed`,
  `dock://shell-open` (Iniciar/Pesquisa/painéis do Windows em primeiro plano: o dock aparece mesmo com ocultação automática).
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
- Estilos prontos na aba: **macOS** (tema `macos`, Launchpad, relógio dentro do dock) e **Windows 11 flutuante**
  (tema `windows11-float`, `WIN11_LAYOUT` à esquerda sem ampliação, `trayStyle: "pill"`). Ambos reservam espaço na tela.
- A bandeja **não é simulada**: o botão "^" chama `taskbar_peek`, que abre a **lista real de ícones ocultos** (Win + B e Enter).
  Com a barra substituída, ela aparece só o tempo necessário para o Windows abrir a lista e some de novo. Se o Windows fechar a
  lista junto com a barra, os próximos cliques mantêm a barra durante o uso, escondendo a pílula para não cobrir a bandeja real.
  Ícones e menus dos apps continuam sendo os nativos.
- Configurações rápidas, rede e notificações abrem pelos URIs do Windows (`ms-actioncenter:controlcenter/&showFooter=true`,
  `ms-availablenetworks:`, `ms-actioncenter:`), com Win + A / Win + N como alternativa.

### Substituir a barra (`taskbarMode.hide`)
- `taskbar_mode_apply(autohide, hide)`: com `hide`, liga a ocultação automática e esconde `Shell_TrayWnd`/`Shell_SecondaryTrayWnd`
  com `ShowWindow(SW_HIDE)`, **só enquanto a janela do dock existir** (thread em `taskbar_mode.rs` reesconde depois de reiniciar o
  Explorer e mostra de volta quando o dock fecha). Nada dentro da barra é alterado.
- `backup.hidden` fica no backup. Um processo vigia (`--taskbar-watchdog <pid>`) espera o app terminar; se ele travar ou for
  encerrado à força com a barra escondida, restaura tudo na hora.
- Pílula da bandeja: janela `docktray` (`#/dock-tray`, `DockTrayWindow`), do tamanho exato da pílula, na ponta livre da borda
  (`trayWindowRect`). Dados reais via `dock_tray_state`: idioma do teclado do app em primeiro plano, `GetNetworkConnectivityHint`
  (carregado em tempo de execução) e `GetSystemPowerStatus`. O que o Windows não informa não aparece.
  Botões: "^" bandeja real, idioma (Win + Espaço), Configurações rápidas (Win + A), relógio → notificações/calendário (Win + N).

### Botões do Windows, menu Iniciar próprio e pílula personalizável
- Por que não fazemos como o Windhawk: ele injeta DLLs no `explorer.exe`/`StartMenuExperienceHost.exe` e altera a árvore XAML
  da barra e do Iniciar (mods Taskbar Styler / Start Menu Styler, GPL-3.0). Isso quebra a cada atualização do Windows, pode
  derrubar o Explorer e é proibido pelas regras deste projeto. Aqui tudo são janelas nossas + atalhos oficiais do Windows.
- `behavior.shellButtons` (ordem = ordem no dock), logo depois do Iniciar: `search` (Win + S), `taskview` (Win + Tab),
  `widgets` (Win + W), `explorer` (Win + E), `desktop` (Win + D), `settings` (Win + I). Slot `kind: "shell"`, ícones de linha
  na cor de texto do tema (`contrastText`), com fundo de bloco no estilo macOS.
- `behavior.startMenu: "dock"`: o botão Iniciar abre a janela `dockmenu` (`#/dock-menu`, `DockStartMenuWindow`), com o mesmo tema
  do dock. Pesquisa (sem acentos, Enter abre, ↑/↓ escolhe, "Pesquisar no Windows" = Win + S), fixados (itens do dock), todos os
  apps (atalhos `.lnk`/`.url` das duas pastas `Start Menu\Programs`, via `dock_list_start_apps`, com alfinete "Fixar no dock"),
  atalhos do sistema, nome do usuário e Bloquear / Sair / Reiniciar / Desligar (`dock_power_action`, com confirmação).
  O Iniciar do Windows continua na tecla Windows, no menu e no clique direito do botão.
  A janela ganha foco e some ao perder o foco (evento `dockmenu://hidden` evita reabrir no mesmo clique).
  Partes do menu: `behavior.startMenuSections`. Posição: `startMenuRect` (encostado no dock, sempre dentro da tela).
- `behavior.trayItems`: o que a pílula mostra ("^", idioma, rede/bateria, segundos, data embaixo da hora).
- "Some quando passo o mouse": com o ponteiro no dock (que encosta na borda), o laço do dock o recoloca acima a cada ~120 ms,
  e no modo Substituir a barra escondida é reescondida a cada 60 ms.
- Limitação: apps da Microsoft Store (UWP) que não criam atalho na pasta do menu Iniciar não aparecem em "Todos os apps"
  (use "Iniciar do Windows" ou a pesquisa do Windows).

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
- `tests/dock.test.ts`: reordenação, grupos, casamento de janelas, ciclo de foco, layout (DPI, multi-monitor, Acrylic, AppBar), auto-ocultar, temas e store, botões do Windows, pesquisa e posição do menu Iniciar.
- `cargo test --lib`: filtro de janelas, seletor de arquivos, ícones, resolução de itens e backup/tweaks da barra.

## Créditos e licenças
- **Seelen UI**: AGPL-3.0. Usado apenas como inspiração de ideias (dock, regras de filtragem de janelas). **Nenhum código copiado.**
  Copiar código AGPL obrigaria o app inteiro a ser AGPL.
- **Cairo Desktop**: Apache-2.0 (C#/WPF). Referência conceitual de AppBar e de convivência com a barra do Windows. Nenhum código copiado.
- Ambos são creditados em **Sobre → Licenças & Atribuições**.

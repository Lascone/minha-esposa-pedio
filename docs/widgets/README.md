# 🪟 Windows Desktop Widgets & Companheiros da Área de Trabalho

O módulo de **Widgets & Companheiros** oferece uma experiência visual elegante, fofa e prática, inspirada diretamente nos **Gadgets do Windows 7**, na flexibilidade do **Widgetsack** e nos mascotes de desktop estilo **Desktop Virtual Buddy** / **OpenPet**.

---

## ✨ 1. Galeria de Widgets Prontos (16 Gadgets Nativos)

1. 🕐 **Relógio Analógico**: Mostrador circular com ponteiros animados, estilo clássico Aero Glass.
2. ⏰ **Relógio Digital & Data**: Horário 12h/24h, segundos correndo e data em português.
3. 📅 **Calendário Folhinha**: Navegação mensal e dia atual destacado.
4. 🌤️ **Clima & Previsão**: Temperatura atual, sensação, umidade, vento e ícone dinâmico via Open-Meteo.
5. 📝 **Notas Rápidas (Post-it)**: Recadinhos e to-do list com salvamento instantâneo e várias cores fofas.
6. 🚀 **Atalhos & Lançador**: Acesso rápido ao Roblox, Navegador, Discord, Explorador e apps customizados.
7. ⚡ **Medidor de CPU**: Tacômetro velocímetro com uso de processamento em tempo real.
8. 🧠 **Medidor de Memória RAM**: GB em uso vs GB totais e porcentagem instantânea.
9. 💾 **Armazenamento & Discos**: Barras de capacidade das unidades (C:, D:) com aviso de espaço.
10. 🔋 **Monitor de Bateria**: Percentual e status de carregamento / alimentação AC desktop.
11. 🍅 **Pomodoro Foco & Pausa**: Ciclos de 25 min de foco, pausas curtas e longas com sino sonoro suave.
12. 🎉 **Contagem Regressiva**: Contador dinâmico de dias, horas e segundos para aniversários, viagens e datas especiais.
13. 💌 **Frases de Amor & Carinho**: Mensagens doces, afirmações positivas diárias e inclusão de frases personalizadas.
14. 🖼️ **Porta-Retrato Polaroid**: Exibição de foto (upload local ou URL) com legenda e fita washi tape.
15. 🌐 **Relógio Mundial**: Fusos horários simultâneos (Brasília, Tóquio, Nova York, Londres) com indicador dia/noite.
16. 🎚️ **Medidor & Controle de Áudio**: VU meter dinâmico animado, slider de volume, mute rápido e gerador de acordes de teste.

---

## 🧩 2. Seção "Adicionar Personalizado" (Engine de Widgets com Código)

Na aba de Widgets há um banner de destaque **"Adicionar Personalizado"** com:
- **Criar com Modelo**: Abre o editor integrado de código em abas (`manifest.json`, `index.html`, `style.css`, `widget.js`) com **Prévia em Tempo Real** no sandbox.
- **Importar Pacote**: Carrega pacotes exportados em arquivo `.json`.
- **Como Criar**: Modal de documentação com guia passo a passo, tabela de permissões e exemplo de código copíavel.
- **Gestão de Widgets**: Editar código, duplicar, exportar `.json` e excluir com segurança.

### Isolamento e Segurança
- O código do usuário executa dentro de um `<iframe>` restrito com `sandbox="allow-scripts"` (sem `allow-same-origin`, sem acesso a cookies, DOM do host, Node.js ou comandos do Windows).
- A comunicação ocorre estritamente pela API segura em JavaScript `window.WidgetAPI`:
  - `WidgetAPI.getConfig(key, defaultValue)`
  - `WidgetAPI.setConfig(key, value)`
  - `WidgetAPI.requestResize(width, height)`
  - `WidgetAPI.getTheme()`
  - `WidgetAPI.onThemeChange(callback)`
  - `WidgetAPI.emitReady()`
- Segurar e arrastar dentro do iframe move o widget: o bootstrap do sandbox envia `widget:drag` ao host depois de 4 px de movimento (fora de botões, campos, links e `[data-no-drag]`); o host só aceita a mensagem vinda de um iframe dele e chama `startDragging()`.

---

## 🖱️ 2.2 Mover widgets e cliques na área de trabalho
- **Cliques atravessam as partes transparentes:** cada janela de widget/companheiro informa sua área visível (`useWindowHitArea` → comando `widget_set_hit_rects`). Um laço em Rust (`widget_system.rs`, 30 ms) alterna `WS_EX_TRANSPARENT | WS_EX_LAYERED` direto no Win32 conforme o cursor está ou não sobre o card (cantos arredondados incluídos). Não use `set_ignore_cursor_events` do tao: ele pode esconder a janela.
- Com as configurações abertas ou o menu do companheiro aberto, a janela inteira recebe o mouse (`full`).
- **Segurar e arrastar:** em qualquer ponto que não seja um controle, depois de 4 px de movimento (`dragLogic.ts`). Um clique simples continua sendo clique. O puxador ✥ da barra do widget começa o arraste na hora. Widgets travados (cadeado) não se movem e mostram um aviso.
- **Tamanho:** arrastar a borda da janela ou Ctrl + roda do mouse (50%–200%, também no simulador); um selo "85%" mostra o tamanho atual.
- O laço de click-through em Rust nunca pede nada ao Tauri nem muda estilos segurando a trava `HIT_AREAS` (isso travava o app ao redimensionar); o `hwnd` é guardado quando a área é registrada e o comando é `async`.
- Companheiros salvam a nova posição quando o arraste termina (`onMoved`); sem isso, andar os devolvia ao lugar antigo.
- **Simulador do painel:** usa o monitor principal real (`primaryMonitor()`, em px lógicos) na mesma proporção, com a barra de tarefas pela área de trabalho. O arraste converte pela escala e mantém o widget inteiro dentro da tela. "Alinhar Todos" organiza em linhas dentro da área útil do monitor.

---

## 🎮 2.1 Mini Console (EmulatorJS)

Um único widget **Mini Console SNES** (tipo `console-snes`) com biblioteca interna: o usuário adiciona quantos jogos `.sfc/.smc` quiser, escolhe qual jogar dentro da própria janela e usa **Trocar jogo** para voltar à biblioteca. **Nenhum jogo vem com o app** (nem Super Mario World); o jogo selecionado fica em `settings.gameId`.

- **Migração:** widgets antigos `console-game-<id>` viram um único `console-snes` com `settings.gameId = <id>` (`migrateWidgetsState`, versão 3 da store). Um placeholder "smw" sem arquivo é descartado; um já configurado vira jogo normal.
- **Adicionar jogo:** `AddGameWizard` (arquivo → patch opcional/"já traduzido" → nome e capa). Detectar Super Mario World só sugere o nome; nunca bloqueia.

- **Código:** `src/projects/widgets/console/` (domínio, patcher IPS/BPS/UPS, telas) e `public/console/player.html` + `player.js` (iframe isolado que roda o EmulatorJS).
- **Armazenamento privado (Rust):** `src-tauri/src/console_library.rs` guarda em `app_data_dir/console/`:
  - `files/<sha1>.<ext>`: jogos, patches, cópias traduzidas e capas (deduplicados por SHA-1; o original nunca é alterado).
  - `library.json`: biblioteca; mudanças emitem o evento `console-library-changed` para todas as janelas.
  - `saves/<id-do-jogo>/`: `sram.srm` (salvamento do próprio jogo, gravado a cada 10 s e ao fechar) e `state-N.state/.png` (estados 1–4).
- **Emulador:** EmulatorJS (GPL-3.0) carregado do CDN oficial numa versão fixa (`EMULATORJS_VERSION` em `systems.ts`). Sem internet, o widget mostra "Sem internet" com botão para tentar de novo, sem simular nada.
- **Consoles:** somente os listados em `SUPPORTED_SYSTEMS` (hoje SNES com núcleo `snes9x`, licença de uso não comercial). Para adicionar outro console, inclua uma entrada com núcleo, extensões e mapa de botões.
- **Gerenciar jogos:** Configurações → Mini Console (rota `#/settings/console`): adicionar, editar, abrir, trocar capa, remover.
- **Nunca** coloque jogos, capas oficiais, músicas ou traduções no repositório ou no instalador: o usuário seleciona os próprios arquivos.

---

## 🐾 3. Catálogo de Companheiros da Área de Trabalho

Personagens fofos que andam, dormem e reagem a cliques na tela do Windows:
- **11 Personagens com Artes & Licenças Verificadas**:
  - Sakura Chibi 🌸 (Waifu Original Chibi, CC-BY-4.0)
  - Aoi Maid Chibi 💙 (Waifu Original Maid, CC-BY-4.0)
  - Mimi Gatinha Flor 🐱🌸 (Acervo Fofo, CC-BY-SA)
  - Kuro Gatinho Noturno 🐾✨ (Acervo Fofo, CC-BY-SA)
  - Calico Neko Pixel 🐾 (OpenGameArt, CC0 Domínio Público)
  - Hachi Shiba Inu 🐕✨ (Vetor Original, CC0)
  - Pug Fofinho 🐶🦴 (Kenney.nl, CC0 Domínio Público)
  - Bun-Bun Coelhinho 🐰🥕 (Kenney.nl, CC0 Domínio Público)
  - Pipoca Pintinho 🐥💛 (Kenney.nl, CC0 Domínio Público)
  - Bubi Slime Gelatinoso 🟢🫧 (Vetor Original, CC0)
  - Kero Sapinho 🐸🌧️ (OpenGameArt, CC0 Domínio Público)
- **Página de Detalhes**: Modal completo com visualizador de animações (testar idle, walk, sleep, click, drag), ficha técnica com autor, link para a fonte oficial e licença.
- **Importador de Companheiros**: Suporte a manifesto JSON ou formulário com upload de imagem local, calibração de escala e slider de FPS com prévia antes de instalar.


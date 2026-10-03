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
- O `srcdoc` do iframe é montado só a partir do pacote. Tema, configurações, mídia e skin chegam depois por `postMessage`, então `setConfig` e troca de tema **não recarregam** o widget.
- `WidgetAPI.particles({ preset, count, colors, speed, size, opacity, layer, target })` é um motor de partículas próprio (`particlesRuntime.ts`, sem biblioteca externa): um canvas por chamada, `pointer-events: none`, até 150 partículas, pausa com o widget oculto, respeita `prefers-reduced-motion` e aceita cores `var(--x)` do tema. Presets: stars, sparkles, snow, hearts, sakura, embers, dark, ash, bubbles, fireflies, confetti, rain. Devolve `burst(evento)`, `setPreset`, `setColors`, `setCount`, `stop`, `start`, `destroy`.
- `WidgetAPI.images.search(termo)` é uma busca real: o iframe pede ao host (`images:search`), que chama o comando Rust `search_web_images` e devolve as URLs.

### Gerador de gadgets com IA (`aiPrompt.ts`, `widgetBrain.ts`, `aiService.ts`)
- O chat e o botão "Como fazer" usam as mesmas regras (`WIDGET_TECH_RULES`), o mesmo guia visual (`WIDGET_DESIGN_GUIDE`) e o mesmo widget de referência (`REFERENCE_WIDGET`).
- O gadget atual vai para a IA como 4 arquivos rotulados, e a resposta vem em blocos de código cercados (```` ```json ````, ```` ```html ````, ```` ```css ````, ```` ```js ````). O formato JSON antigo continua aceito.
- Orçamento de saída alto (Gemini 65536 tokens, Groq 32768) e detecção de resposta cortada (`finishReason`/`finish_reason` e cercas ímpares).
- Groq gratuita tem limite de tokens por minuto: em HTTP 429 o app espera o `retry-after` e tenta **o mesmo modelo** de novo. Nunca cair para um modelo mais fraco nem para a saída padrão curta (≈3 mil tokens): era isso que gerava gadgets cortados e feios.
- Imagens anexadas no chat não são salvas no histórico (data URLs estouravam a cota do localStorage).
- Links de imagem na mensagem são baixados pelo Rust (`widget_fetch_image`), reduzidos e salvos em `pkg.assets`. O código do gadget usa `pmm-asset://imagem-1`, que o sandbox troca pela imagem salva (`widgetAssets.ts`).
- Fontes: o manifest lista `fonts` no formato da API css2 do Google Fonts (`"Fredoka:wght@400..700"`). O sandbox normaliza (eixos em ordem alfabética, tuplas ordenadas) e carrega com `<link>` + `display=swap` (`googleFonts.ts`). Um `@import` no CSS do gadget também é movido para `<link>`, porque no meio do `<style>` do sandbox ele seria ignorado.

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


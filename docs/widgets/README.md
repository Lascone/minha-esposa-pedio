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


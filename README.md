# 💕 Pedi para meu marido

Uma central desktop moderna, delicada e modular de pequenos programas, utilitários e mimos desenvolvidos sob medida para a esposa.

---

## 🎯 Primeiro Módulo Concluído: Crosshair Studio

O **Crosshair Studio** é uma suíte completa de criação, edição e exibição de miras para jogos:

- **Editor Manual Estilo CS2**: ajuste de comprimento, espessura, gap, ponto central, contorno (outline), transparência e alternância individual das 4 linhas (cima, baixo, esquerda, direita).
- **Editor Avançado de Camadas (Layers)**: organize elementos geométricos, emojis e ícones em camadas reordenáveis com transformações de posição (X/Y), rotação, escala e opacidade.
- **Formas Geométricas**: corações 💕, cruzes, círculos vazados, losangos, estrelas, cantoneiras táticas (brackets), triângulos e polígonos.
- **Emoji Crosshair**: seletor integrado com 8 categorias temáticas (Corações, Rostos, Animais, Comidas, Natureza, Símbolos, Jogos, Efeitos) com brilho (glow) e sombra.
- **Icon Picker**: pesquisa de ícones com metadados de licença e atribuição.
- **Upload & Editor de Imagens**: envio de arquivos PNG, WEBP e SVG com **sanitização estrita via DOMPurify**, filtros de brilho, contraste, grayscale, threshold e remoção de fundo transparente.
- **Biblioteca com +25 Presets Procedurais**: Classic Green, Classic Cyan, Tiny Dot, Precision Dot, Cute Heart 💕, Pink Dot, Sakura, Diamond, T-Crosshair, etc.
- **Geradores Mágicos**:
  - `🎲 Me surpreenda`: escolhe uma mira aleatória da biblioteca.
  - `✨ Criar combinação aleatória`: sintetiza uma nova mira balanceada proceduralmente.
- **Preview Arena**: simulador em tempo real com zoom (1x a 5x), fundos sólidos e 5 cenários dinâmicos de jogo (Noite Tática, Céu Ensolarado, Selva/Grama, Concreto Urbano, Deserto/Poeira).
- **Verificador de Contraste & Acessibilidade**: cálculo de proporção de contraste em tempo real e simulação de percepção de cor (daltonismo).
- **Importação e Exportação**:
  - Importação de comandos de console CS2 (`cl_crosshair*`).
  - Exportação em formato próprio `.crosshair` (JSON estruturado versionado).
  - Exportação em PNG transparente de alta definição (512x512).
  - Cópia direta de comandos de console para CS2.

---

## 🪟 Módulo: Widgets da Área de Trabalho (Windows 7 Gadgets)

Substitui o antigo sistema de bots por uma coleção de widgets inspirada nos gadgets do Windows 7 e na arquitetura do Widgetsack:

- **10 Gadgets Úteis & Interativos:**
  - 🕐 **Relógio Analógico**: Mostrador circular clássico, marcadores elegantes e ponteiros suaves.
  - ⏰ **Relógio Digital & Data**: Números grandes, segundos correndo e data em português.
  - 📅 **Calendário Folhinha**: Navegação mensal e dia atual destacado.
  - 🌤️ **Clima & Previsão**: Temperatura atual, sensação, umidade, vento e ícone dinâmico via Open-Meteo.
  - 📝 **Notas Rápidas (Post-it)**: Recadinhos e to-do list com salvamento instantâneo e várias cores fofas.
  - 🚀 **Atalhos & Lançador**: Acesso rápido ao Roblox, Navegador, Discord, Explorador e apps customizados.
  - ⚡ **Medidor de CPU**: Tacômetro velocímetro com uso de processamento em tempo real.
  - 🧠 **Medidor de Memória RAM**: GB em uso vs GB totais e porcentagem instantânea.
  - 💾 **Armazenamento & Discos**: Barras de capacidade das unidades (C:, D:) com aviso de espaço.
  - 🔋 **Monitor de Bateria**: Percentual e status de carregamento / alimentação AC desktop.
- **Personalização Visual Completa**: Temas Aero Glass, Rosa Pastel, Escuro Moderno, Cyber Neon e Clean; opacidade (20% a 100%) e escala (80% a 150%).
- **Recuperar Gadgets**: Botão inteligente para trazer de volta qualquer gadget que tenha saído da tela ou de monitores secundários.


## 🖥️ Integração Windows & Performance

- **Overlay Transparente Nativo**: janela sem bordas, sempre no topo (`always-on-top`) com **click-through total** (`set_ignore_cursor_events(true)`), permitindo que você jogue sem qualquer interferência de cliques.
- **Consumo de CPU Virtualmente 0%**: a mira só renderiza quando há alterações, sem ticks desnecessários ou loops infinitos de animação.
- **System Tray (Bandeja do Sistema)**: ao fechar a janela principal (botão "X"), ela é minimizada para a área de notificação ao lado do relógio do Windows. O overlay permanece ativo.
- **Menu da Bandeja**:
  - 💕 Pedi para meu marido
  - Abrir / Ocultar Central
  - 🎯 Alternar Crosshair (Overlay)
  - Sair definitivamente
- **Iniciar com o Windows**: opção configurável nas Configurações para iniciar automaticamente em segundo plano minimizado.
- **Atalhos Globais (Hotkeys)**:
  - `Ctrl + Alt + X`: Ligar / Desligar overlay da mira.
  - `Ctrl + Alt + C`: Abrir / Ocultar a central.
  - `Ctrl + Z` / `Ctrl + Y`: Desfazer e refazer edições.
  - `Ctrl + S`: Salvar alterações com carinho.

---

## 🎨 Sistema de 8 Temas Delicados

Acesse instantaneamente pelo seletor rápido no cabeçalho ou nas Configurações:
1. 🌸 **Sakura** (Padrão: rosa pastel, branco, toques de cerejeira)
2. 💜 **Lilás** (Lavanda aconchegante e violeta pastel)
3. 🍓 **Morango** (Vermelho morango pastel com creme)
4. 🌙 **Noite** (Modo escuro sofisticado com brilho violeta)
5. 🤍 **Clean** (Minimalista, branco porcelana e cinza suave)
6. 🖤 **Dark** (Preto fosco elegante com acentos neon)
7. 🩵 **Céu** (Azul pastel, nuvem e toques menta)
8. 🌷 **Jardim** (Verde sálvia botânico e toques florais)

> **Easter Egg 💕**: Clicar 5 vezes seguidas no coração do logo no canto superior esquerdo ou na Home faz chover coraçõezinhos na tela por 1 segundo!

---

## 🚀 Como Rodar e Testar

Utilize o script facilitador PowerShell:

```powershell
# Executa o aplicativo desktop nativo completo (Tauri v2 + Rust)
.\start-dev.ps1

# Ou execute apenas no navegador para desenvolvimento ágil de frontend:
.\start-dev.ps1 -BrowserOnly
```

### Comandos Manuais (npm / cargo)

```powershell
# Rodar frontend no navegador
npm run dev

# Rodar desktop Tauri v2
npm run tauri dev

# Executar suíte de testes unitários (Vitest)
npm test

# Gerar build de produção do frontend
npm run build
```

# 🌐 Guia de Integrações & APIs de Mídia, Desktop Shelf e Customizador SNES

Este documento detalha a arquitetura de integrações de contas externas (**Spotify**, **YouTube Music**, **YouTube**, **Gmail** via Mozilla Firefox), o novo **Widget Prateleira da Área de Trabalho (Desktop Shelf)** e a API do **Personalizador do Mini Console SNES**.

---

## 🦊 1. Autenticação Segura via Mozilla Firefox (Navegador Padrão)

Para evitar bloqueios de segurança do Google contra webviews embutidas e garantir a máxima privacidade, todas as autorizações OAuth são delegadas diretamente para o navegador padrão do usuário: **Mozilla Firefox**.

### Como funciona o fluxo:
1. O usuário clica em **Entrar com Mozilla Firefox** nas Configurações do aplicativo.
2. O aplicativo abre a URL de consentimento oficial no Firefox via comando nativo do Windows:
   - **Spotify**: `https://accounts.spotify.com/authorize` com escopos de playback e controle.
   - **Google (YouTube & Gmail)**: `https://accounts.google.com/o/oauth2/v2/auth` com escopos `youtube.readonly` e `gmail.readonly`.
3. O redirecionamento de retorno aponta para um loopback local seguro na máquina:
   - Spotify: `http://127.0.0.1:48123/callback`
   - YouTube: `http://127.0.0.1:48124/callback`
   - Gmail: `http://127.0.0.1:48125/callback`
4. Como o usuário já costuma estar logado em suas contas no Firefox, o consentimento ocorre em 1 clique com total segurança!

---

## 🎵 2. API Unificada para Widgets e Custom Sandbox (`WidgetAPI`)

Tanto os gadgets integrados quanto qualquer widget personalizado criado na sandbox segura podem acessar as APIs de mídia e produtividade:

### Mídia (`WidgetAPI.media`)
```javascript
// Obtém a música que está tocando agora (Spotify, YouTube Music ou YouTube)
const track = WidgetAPI.media.getCurrentTrack();
console.log(track.title, track.artist, track.albumArt, track.isPlaying);

// Ouve atualizações em tempo real
WidgetAPI.media.onTrackChange((track) => {
  document.getElementById("title").textContent = track.title;
  document.getElementById("cover").src = track.albumArt;
});

// Controles de reprodução
WidgetAPI.media.togglePlay();
WidgetAPI.media.nextTrack();
WidgetAPI.media.prevTrack();
```

### Gmail (`WidgetAPI.gmail`)
```javascript
// Obtém o total de mensagens não lidas e os e-mails mais recentes
const summary = WidgetAPI.gmail.getSummary();
console.log(`Não lidos: ${summary.unreadCount}`);

WidgetAPI.gmail.onSummaryChange((summary) => {
  document.getElementById("badge").textContent = summary.unreadCount;
});
```

---

## 🪵 3. Widget: Prateleira da Área de Trabalho (Desktop Shelf)

O widget **Desktop Shelf** (`desktop-shelf`) traz uma prateleira suspensa 3D para a sua Área de Trabalho:
- **Arraste e Solte (Drag & Drop)**: Arraste arquivos, atalhos do Windows (`.lnk`), links (`.url`), executáveis e pastas diretamente do seu Desktop para a madeira da prateleira.
- **Clique Duplo**: Abre o aplicativo ou arquivo instantaneamente.
- **Estéticas Personalizáveis**:
  - `wood-dark` (Madeira Rústica)
  - `wood-light` (Carvalho Claro Nórdico)
  - `aero-glass` (Aero Glass Translúcido com suportes cromados)
  - `cyber-neon` (Prateleira Flutuante Cyber com borda neon e LED inferior)
- **Decorações Interativas**: Adicione um gatinho dormindo, vasinho de planta suculenta ou xícara de café quente na borda da prateleira!
- **Redimensionável**: Redimensione a largura e altura pelo canto inferior ou configure o tamanho nas propriedades.

---

## 🎮 4. API & Personalizador do Mini Console SNES (`snesCustomizer`)

O Mini Console SNES agora conta com um motor completo de personalização visual e de hardware retrô:

### Skins Disponíveis:
1. **Classic Grey & Purple (US)**: O visual clássico norte-americano com carcaça cinza e botões lilás/roxo.
2. **Super Famicom / PAL 4-Colors**: Design lendário com o logo em 4 cores (Verde, Amarelo, Vermelho e Azul).
3. **Cute Pastel Sakura 🌸**: Carcaça rosa quartzo delicada com detalhes dourados e estética kawaii.
4. **Atomic Purple 90s**: Visual nostálgico translúcido dos anos 90 com circuitos visíveis.
5. **Dark Cyber Neon ⚡**: Carcaça preta fosca de alta precisão com frisos luminosos em ciano neon.

### Recursos Customizáveis:
- **LED Power Indicator**: Vermelho Clássico, Verde Esmeralda, Ciano Neon, Rosa Sakura, Âmbar Retrô ou Roxo.
- **Rótulo & Cor do Cartucho**: Escolha a cor do plástico do cartucho inserido e digite o nome do jogo estampado no adesivo.
- **Filtro CRT Scanlines**: Ajuste a intensidade das linhas de varredura de TV antiga de 0% a 60%.
- **Paleta de Botões**: Lilás/Roxo, SFC 4 Cores, Pastel Candy ou Cyberpunk.

### Consumo na API (`WidgetAPI.snes` ou `useSnesCustomizerStore`):
```typescript
import { useSnesCustomizerStore, SnesCustomizerAPI } from "@/projects/widgets/console/snesCustomizer";

// Programático:
SnesCustomizerAPI.setConfig({
  skinId: "pastel-blossom",
  ledColor: "pink",
  cartridgeLabel: "CHRONO TRIGGER",
  scanlineIntensity: 20,
});
```

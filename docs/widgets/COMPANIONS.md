# 🐾 Companheiros da Área de Trabalho (Desktop Mascots & Buddies)

Bem-vindo ao módulo **Companheiros da Área de Trabalho** do aplicativo **Pedi para meu marido** 💕!

Inspirado em projetos clássicos e de código aberto como:
- [Desktop-Virtual-buddy](https://github.com/spyderweb47/Desktop-Virtual-buddy)
- [OpenPet](https://github.com/dengyie/OpenPet)
- [deskcat](https://github.com/coglabss/deskcat)
- [shimeji-ee](https://github.com/gil/shimeji-ee)

---

## ✨ Características Principais

1. **100% Local & Sem Custos:**
   - Funciona inteiramente no computador local, sem nenhuma dependência de APIs pagas, inteligência artificial em nuvem, contas de terceiros ou bots.
2. **Personagens Originais com Licenças Verificadas:**
   - **🌸 Sakura Chibi (Waifus):** Personagem anime original desenhada em vetor SVG, com vestido rodado, flor de cerejeira e bochechas coradas. (Licença: CC-BY-4.0 / Uso Livre Pessoal).
   - **🐱 Mimi (Gatinhos):** Gatinha branca fofinha dos sonhos, com florzinha no rabinho e patinhas rosinhas. (Licença: CC-BY-SA).
   - **🐾 Kuro (Gatinhos):** Gatinho noturno com orelhas arroxeadas e olhos brilhantes. (Licença: CC-BY-SA).
   - **🐕 Hachi (Cachorrinhos):** Shiba Inu animado com coleira vermelha e guizo, sempre alegre pedindo carinho. (Licença: CC0 Domínio Público).
   - **🟢 Bubi (Criaturas & Fantasia):** Slime gelatinoso esmeralda que quica, se estica e se derrete numa poça aconchegante. (Licença: CC0 Domínio Público).
3. **Animações Completas e Vivas:**
   - Ficar parado respirando e piscando (`idle`).
   - Andar autonomamente pela tela com troca de direção (`walk`).
   - Sentar relaxado (`sit`).
   - Dormir com balões flutuantes de zZz (`sleep`).
   - Reagir a cliques do mouse com corações e sonzinhos fofos sintetizados (`click`).
   - Ser levantado e arrastado pelo mouse (`drag`).
4. **Respeito aos Monitores e Recursos do Windows:**
   - Limite configurável de taxa de quadros (30 FPS padrão ou 60 FPS) para consumo mínimo de memória e CPU (praticamente 0% de uso contínuo).
   - Limite de quantidade simultânea de companheiros.
   - Detecção de bordas da tela e múltiplos monitores.
   - Opção para silenciar sons e pausar animações.

---

## 🪟 Menu de Contexto (Botão Direito no Mascote)

Ao clicar com o botão direito em qualquer companheiro na área de trabalho:
- **💖 Fazer Carinho:** Desperta a reação alegre com corações flutuantes.
- **💤 Dormir / Acordar:** Faz o mascote tirar um cochilo relaxante.
- **⏸️ Pausar / Continuar:** Congela o mascote no lugar.
- **🔍 Tamanho (P, M, G):** Ajusta a escala entre Pequeno (0.8x), Médio (1.0x) e Grande (1.4x).
- **📌 Ficar no Topo:** Alterna a visibilidade sobre outras janelas.
- **❌ Guardar:** Remove o mascote da tela com segurança.

---

## 📦 Como Adicionar um Novo Pacote de Personagem

O aplicativo conta com uma estrutura aberta e segura baseada em manifestos JSON:

### Exemplo de `manifest.json`:
```json
{
  "id": "minha-waifu-custom",
  "name": "Neko Maid Chibi",
  "category": "waifus",
  "author": "Meu Nome / Artista",
  "license": "CC-BY / Uso Pessoal",
  "description": "Personagem fofinha que alegra meu desktop!",
  "preview": "/caminho/ou/data_uri_preview.png",
  "dimensions": { "width": 100, "height": 100 },
  "defaultScale": 1.0,
  "speed": 35,
  "animations": {
    "idle": {
      "frames": ["/frames/idle1.png", "/frames/idle2.png"],
      "frameDuration": 400
    },
    "walk": {
      "frames": ["/frames/walk1.png", "/frames/walk2.png"],
      "frameDuration": 220
    },
    "sit": {
      "frames": ["/frames/sit1.png"],
      "frameDuration": 500
    },
    "sleep": {
      "frames": ["/frames/sleep1.png"],
      "frameDuration": 600
    },
    "drag": {
      "frames": ["/frames/drag1.png"],
      "frameDuration": 200
    },
    "click": {
      "frames": ["/frames/click1.png"],
      "frameDuration": 500
    }
  }
}
```

### Importando no Aplicativo:
1. Abra a aba **Widgets** e clique em **Companheiros da Área de Trabalho**.
2. Clique no botão **Importar Pacote**.
3. Você pode tanto colar o JSON / carregar o arquivo `.json` quanto usar o **Criador Rápido de Pacote** preenchendo o formulário com o nome, categoria e links/caminhos das imagens.
4. **Segurança:** O aplicativo lê estritamente arquivos visuais e sequências de frames. Nenhuma linha de código fornecida pelo pacote é executada.

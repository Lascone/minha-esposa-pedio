# 🐾 Bichinho Virtual de Desktop (VPet Integrado)

O módulo **Bichinho Virtual** foi criado com carinho dentro de **"Pedi para meu marido"** para trazer a experiência de um bichinho virtual interativo e fofinho para a área de trabalho do Windows, inspirado no ecossistema do VPet e no VPet ModMaker, totalmente integrado em TypeScript, React, Tailwind e Tauri (Rust).

---

## ✨ Funcionalidades Principais

1. **Janela Flutuante Transparente no Desktop:**
   - Renderização limpa sem bordas e com transparência real no WebView2.
   - Suporte nativo a arrastar com o mouse (`data-tauri-drag-region`).
   - Opção "Sempre no Topo" (Always on Top) para acompanhar a usuária enquanto trabalha ou joga.
   - Modo de repouso e retorno suave com respeito a telas secundárias e DPI.

2. **Interações Fofas e Cuidados Diários:**
   - **Fome (🍖):** Alimente o pet com morango, bolinhos, sachê de salmão e croissants.
   - **Sede (💧):** Ofereça tigelinha de leite fresco ou aguinha limpa.
   - **Energia (⚡):** Coloque-o para dormir; o pet recupera energia enquanto descansa.
   - **Higiene (🧼):** Dê um banho espumante e quentinho.
   - **Felicidade (✨):** Brinque com bolinhas e novelos de lã.
   - **Cafuné e Dengo (💖):** Clique na cabeça ou corpo para fazer carinho com partículas de corações flutuantes.
   - **Vínculo e Experiência (XP):** Ganhe pontos de vínculo e suba de nível com cada cuidado.
   - **Baú de Mimos 2D com Animação Pixel Art:** Baú de itens flutuante arrastável na tela com animações reais de abrir/fechar (temas Ouro e Madeira), permitindo arrastar os itens diretamente até a mascotinha ou alimentá-la com um clique!

3. **Passagem de Tempo Amigável e Segura (Zero Punição):**
   - **O bichinho NUNCA MORRE!** Se a usuária ficar dias sem abrir o computador, o pet apenas sentirá saudades e pedirá atenção. Os indicadores possuem pisos de segurança (mínimo 15%~25%) e o cálculo offline é limitado a no máximo 12 horas.

4. **Física e Arraste do VPet Original:**
   - **Arrastar e Levantar:** Pressionar e mover a mascotinha ativa a animação oficial de suspensão pelas axilas (`drag`) e move a janela suavemente pelo desktop via Tauri WebviewWindow.
   - **Soltar e Jogar nos Cantos:** Ao soltar o mouse, o pet entra no estado de queda (`fall`) e aterrissa em `idle`. Ao soltar próximo aos cantos da tela (`x <= 50` ou `x >= screenWidth - windowWidth - 50`), a personagem detecta a borda, vira o olhar para o lado da tela e solta frases fofas em pt-BR!
   - **Balão de Fala Protegido:** Posicionado com margem de segurança garantida dentro da janela para nunca ser cortado pelo topo do desktop.

5. **Oficina Steam (Steam Workshop) Integrada:**
   - Navegue por centenas de mods e personagens criados pela comunidade oficial do VPet Simulator (AppID `1920960`) diretamente dentro do aplicativo usando a Steam Web API.
   - Filtros por Mais Votados, Em Alta, Mais Inscritos e Recentes, com busca por texto e tags.
   - Importação rápida de mods como personagens jogáveis no Pet Studio e links diretos para abrir na Oficina Steam!

6. **Editor de Personagens Completo (VPet Mod Maker Integrado):**
   - Acesso direto pelo botão **"Criador de Mods"**.
   - Definição de nome, espécie, autor e descrição.
   - Customização de falas em pt-BR para cada situação.
   - Importação de quadros de animação via upload (PNGs transparentes, GIFs, WebP ou SVGs).
   - Ajuste em tempo real de FPS / duração por quadro, espelhamento horizontal (flip) e repetição (loop).
   - Ajuste de hitbox e escala de renderização.
   - **Exportação e Importação de Pacote (.pet.json):** Formato versionado JSON que armazena os quadros e falas de forma autocontida para backup ou compartilhamento.

---

## 📁 Estrutura de Código

- [types.ts](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/types.ts): Definições de estados de animação, indicadores de status, falas, manifestos e pacotes.
- [items.ts](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/items.ts): Catálogo de comidas, bebidas, brinquedos e produtos de higiene.
- [presets.ts](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/presets.ts): Mascote original "VUP" com sprites HD oficiais e "Mimi Sakura".
- [petStore.ts](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/store/petStore.ts): Gerenciador Zustand persistido (`pmm_vpet_character_store`) com cálculo offline, ganho de XP e controle de desktop.
- [steamWorkshopService.ts](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/services/steamWorkshopService.ts): Serviço da Steam Web API (AppID 1920960).
- [PetSteamWorkshop.tsx](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/components/PetSteamWorkshop.tsx): Interface da Oficina Steam com catálogo de mods, filtros e importação.
- [PetDesktopView.tsx](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/components/PetDesktopView.tsx): Visualização flutuante de desktop com arrastar nativo, física de cantos, baú 2D animado e balão protegido.
- [PetMakerStudio.tsx](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/maker/PetMakerStudio.tsx): Estúdio VPet ModMaker completo para criar pets, comidas e falas.
- [PetMainView.tsx](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/views/PetMainView.tsx): Tela principal com seletor de modos (Jogo, Criador de Mods e Oficina Steam).

---

## 💾 Localização dos Dados Salvos

- As configurações, estatísticas, itens e personagens criados no Mod Maker são salvos localmente na chave persistida do Zustand `pmm_vpet_character_store` (em LocalStorage / IndexedDB / WebView2 do aplicativo).
- Pacotes exportados são gerados no formato `<nome>.pet.json` e podem ser guardados na pasta de preferência do usuário.

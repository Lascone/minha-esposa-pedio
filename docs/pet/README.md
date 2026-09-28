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

3. **Passagem de Tempo Amigável e Segura (Zero Punição):**
   - **O bichinho NUNCA MORRE!** Se a usuária ficar dias sem abrir o computador, o pet apenas sentirá saudades e pedirá atenção. Os indicadores possuem pisos de segurança (mínimo 15%~25%) e o cálculo offline é limitado a no máximo 12 horas.

4. **Falas e Reações 100% em Português do Brasil (pt-BR):**
   - Balão de fala flutuante estilizado acima do mascote.
   - Frases contextuais para quando acordar, sentir fome, sede, sono, felicidade ou receber cafuné.
   - Clique com o botão direito abre um menu contextual com opções rápidas de cuidado e recolhimento.

5. **Editor de Personagens Completo (VPet Mod Maker Integrado):**
   - Acesso direto pelo botão **"Criar Novo Pet (Mod Maker)"** ou **"Editar no Mod Maker"**.
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
- [presets.ts](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/presets.ts): Mascote original "Mimi Sakura" com animações completas SVG vetoriais para 13 estados.
- [petStore.ts](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/store/petStore.ts): Gerenciador Zustand persistido (`pmm_vpet_character_store`) com cálculo offline, ganho de XP e controle de desktop.
- [PetCarePanel.tsx](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/components/PetCarePanel.tsx): Painel de necessidades e gaveta de inventário de itens.
- [PetDesktopView.tsx](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/components/PetDesktopView.tsx): Visualização flutuante de desktop com arrastar nativo, partículas e menu de clique direito.
- [PetEditorModal.tsx](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/editor/PetEditorModal.tsx): Editor visual de personagens e pacotes `.pet.json`.
- [PetMainView.tsx](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/pet/views/PetMainView.tsx): Tela principal com visão geral, seletor de personagens e controles de tela.

---

## 💾 Localização dos Dados Salvos

- As configurações, estatísticas, itens e personagens criados no Mod Maker são salvos localmente na chave persistida do Zustand `pmm_vpet_character_store` (em LocalStorage / IndexedDB / WebView2 do aplicativo).
- Pacotes exportados são gerados no formato `<nome>.pet.json` e podem ser guardados na pasta de preferência do usuário.

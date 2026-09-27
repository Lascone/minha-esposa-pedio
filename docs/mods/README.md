# 🧩 Gerenciador de Mods do Windows (Ecossistema Windhawk)

Módulo dedicado a customizações profundas e elegantes do Windows (Barra de Tarefas, Menu Iniciar, Explorador de Arquivos, Gerenciamento de Janelas e Efeitos Visuais), baseado no ecossistema e catálogo oficial do **Windhawk**, com **interface visual 100% própria** integrada ao aplicativo.

---

## 🏗️ Arquitetura

| Camada | Arquivo | Papel |
| --- | --- | --- |
| **Rust (Nativo)** | `src-tauri/src/windhawk_system.rs` | Detecção da instalação do Windhawk, checagem de processo ativo (`windhawk.exe`), reinício seguro do Explorer (`windhawk_restart_explorer`), inspeção da pasta de mods e abertura de diretórios |
| **Serviço Web** | `src/projects/mods/services/windhawkService.ts` | Consumo do catálogo oficial (`https://mods.windhawk.net/catalog.json`), download de código C++ (`.wh.cpp`), categorização automática e invocação de comandos Tauri |
| **Estado (Zustand)** | `src/projects/mods/store/modsStore.ts` | Gerenciamento de mods ativos, favoritos, busca com filtro dinâmico, ordenação e status do motor nativo |
| **Componentes UI** | `src/projects/mods/components/` | `EngineStatusBanner`, `CategoryFilterBar`, `ModCard`, `ModDetailsModal` |
| **Visualização Principal**| `src/projects/mods/views/ModsView.tsx` | Tela acessível pela rota `#/mods` e barra lateral ("Windows Mods") |

---

## 🌟 Funcionalidades

1. **Catálogo Completo do Windhawk**:
   - Consulta em tempo real aos mais de 100 mods oficiais mantidos pela comunidade.
   - Cache em `localStorage` para navegação offline instantânea.
   - Categorias automáticas: Barra de Tarefas, Menu Iniciar, Explorador, Janelas, Visual & Temas, Sistema & Áudio.
2. **Design Fofo & Exclusivo**:
   - Não utiliza a interface do Windhawk: utiliza o sistema de temas do aplicativo (Cute Pastel, Aero Glass, Cyber Neon e Dark Modern).
   - Cartões com visualização de avaliação, contagem de usuários, processos-alvo (`explorer.exe`, `StartMenu...`) e botão de favoritos.
3. **Modal de Detalhes & Código C++**:
   - Inspecione a qualquer momento o código `.wh.cpp` do mod antes de ativá-lo.
   - Botão para copiar o código fonte ou abrir o repositório no GitHub.
4. **Controle do Motor e Explorer**:
   - Indicador visual em tempo real do status do Windhawk (Ativo, Instalado ou Não Instalado).
   - Botão para reiniciar o `explorer.exe` com segurança após aplicar estilos.
   - Link direto para download do instalador oficial do Windhawk caso ainda não esteja instalado no sistema.

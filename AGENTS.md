# Instruções Críticas para Agentes de IA & Coding Agents (AGENTS.md)

> [!IMPORTANT]
> **LEIA ISTO ANTES DE CRIAR OU MODIFICAR WIDGETS OU O DESKTOP NO PROJETO:**
> 1. Consulte sempre [/docs/widgets/README.md](file:///c:/Projetos/Minha%20Esposa%20Pedio/docs/widgets/README.md).
> 2. **NUNCA invente métricas falsas** quando os dados do sistema estiverem indisponíveis. Trate erros ou indisponibilidade graciosamente na interface.
> 3. **SEMPRE mantenha a experiência fofa, elegante e responsiva** (com temas Aero Glass, Cute Pastel, Dark Modern e Cyber Neon).
> 4. **SEMPRE isole chamadas de baixo nível do Windows no Rust (`src-tauri/src/widget_system.rs`)** e consuma na interface via Tauri Commands e Zustand.
> 5. **SEMPRE garanta transparência real nos widgets** e respeite o desktop do usuário, não bloqueando cliques em áreas vazias.

---

## 🪟 Mapa Rápido da Documentação Interna (Widgets)
- Documentação dos Widgets: [/docs/widgets/README.md](file:///c:/Projetos/Minha%20Esposa%20Pedio/docs/widgets/README.md)
- Motor Nativo em Rust: [/src-tauri/src/widget_system.rs](file:///c:/Projetos/Minha%20Esposa%20Pedio/src-tauri/src/widget_system.rs)
- Store dos Widgets: [/src/projects/widgets/store/widgetsStore.ts](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/widgets/store/widgetsStore.ts)
- Catálogo de Definições: [/src/projects/widgets/registry.ts](file:///c:/Projetos/Minha%20Esposa%20Pedio/src/projects/widgets/registry.ts)

---

## 🚀 Dock e Modo Dock
> [!IMPORTANT]
> Consulte [/docs/dock/README.md](file:///c:/Projetos/Minha%20Esposa%20Pedio/docs/dock/README.md) antes de alterar o dock.
> 1. Chamadas ao Windows ficam em `src-tauri/src/dock_system.rs` e `src-tauri/src/taskbar_mode.rs`.
> 2. **NUNCA** mexa no Iniciar ou na bandeja do Windows, e sempre salve um backup antes de alterar a barra.
> 3. **NUNCA** copie código do Seelen UI (AGPL-3.0).

---

## 🖱️ Instruções para o Módulo Auto Click
> [!IMPORTANT]
> **LEIA ISTO ANTES DE ALTERAR O AUTO CLICK:**
> 1. Consulte [/docs/autoclick/README.md](file:///c:/Projetos/Minha%20Esposa%20Pedio/docs/autoclick/README.md) e [/docs/autoclick/AI_INSTRUCTIONS.md](file:///c:/Projetos/Minha%20Esposa%20Pedio/docs/autoclick/AI_INSTRUCTIONS.md).
> 2. **O Auto Click NÃO deve depender de Python**. Use sempre a infraestrutura nativa Tauri/Rust (`src-tauri/src/autoclick_engine.rs`) e o `InputService`.
> 3. **NUNCA crie loops infinitos no JavaScript** (`while(true)`). Delegue todo o timing para o motor de alta precisão em Rust.
> 4. **SEMPRE libere teclas e cliques** (`release_all_inputs_native`) ao finalizar ou abortar automações.
> 5. **NUNCA oculte o indicador 🔴 REC** durante gravações. Preserva-se sempre a privacidade do usuário.

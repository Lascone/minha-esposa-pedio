import { CustomWidgetPackage } from "./types";

export const TEMPLATE_NEON_CLOCK: CustomWidgetPackage = {
  manifest: {
    id: "custom-neon-clock",
    name: "Relógio Cyber Neon",
    version: "1.0.0",
    author: "Comunidade / Exemplo Oficial",
    description: "Relógio digital futurista com efeito neon brilhante, segundos animados e suporte a formato 12h/24h.",
    category: "time",
    icon: "⚡",
    entry: "index.html",
    defaultWidth: 260,
    defaultHeight: 160,
    minWidth: 200,
    minHeight: 120,
    resizable: true,
    permissions: ["storage", "resize", "theme"],
    configFields: [
      {
        key: "showSeconds",
        label: "Exibir Segundos",
        type: "boolean",
        defaultValue: true,
        description: "Ativa ou desativa a exibição dos segundos",
      },
      {
        key: "neonColor",
        label: "Cor do Neon",
        type: "select",
        defaultValue: "#38bdf8",
        options: [
          { label: "Ciano Cyber", value: "#38bdf8" },
          { label: "Rosa Choque", value: "#f43f5e" },
          { label: "Verde Matrix", value: "#10b981" },
          { label: "Roxo Synthwave", value: "#a855f7" },
        ],
      },
    ],
    tags: ["relógio", "neon", "digital", "tempo", "personalizado"],
  },
  html: `<div class="clock-card" id="clockCard">
  <div class="time-display">
    <span class="digits" id="timeDigits">00:00</span>
    <span class="seconds" id="secDigits">:00</span>
  </div>
  <div class="date-display" id="dateDisplay">Carregando data...</div>
  <button class="toggle-btn" id="formatBtn">24H</button>
</div>`,
  css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
}

body {
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  overflow: hidden;
  user-select: none;
}

.clock-card {
  width: 94%;
  height: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  position: relative;
  padding: 16px;
  transition: all 0.3s ease;
}

.time-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-weight: 900;
  color: var(--neon-color, #38bdf8);
  text-shadow: 0 0 10px var(--neon-color, #38bdf8), 0 0 20px rgba(56, 189, 248, 0.4);
}

.digits {
  font-size: 38px;
  letter-spacing: 2px;
}

.seconds {
  font-size: 20px;
  margin-left: 4px;
  opacity: 0.85;
}

.date-display {
  margin-top: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.toggle-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 9px;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}`,
  js: `// Exemplo Completo de Widget com WidgetAPI
const timeDigits = document.getElementById("timeDigits");
const secDigits = document.getElementById("secDigits");
const dateDisplay = document.getElementById("dateDisplay");
const formatBtn = document.getElementById("formatBtn");
const clockCard = document.getElementById("clockCard");

let is24h = WidgetAPI.getConfig("is24h", true);
let neonColor = WidgetAPI.getConfig("neonColor", "#38bdf8");
let showSeconds = WidgetAPI.getConfig("showSeconds", true);

function applySettings() {
  document.documentElement.style.setProperty("--neon-color", neonColor);
  secDigits.style.display = showSeconds ? "inline" : "none";
  formatBtn.textContent = is24h ? "24H" : "12H";
}

function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  if (!is24h) {
    hours = hours % 12 || 12;
  }
  const formattedHours = String(hours).padStart(2, "0");

  timeDigits.textContent = formattedHours + ":" + minutes;
  secDigits.textContent = ":" + seconds;

  // Data em português
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  dateDisplay.textContent = now.toLocaleDateString('pt-BR', options);
}

formatBtn.addEventListener("click", () => {
  is24h = !is24h;
  WidgetAPI.setConfig("is24h", is24h);
  applySettings();
  updateClock();
});

WidgetAPI.onThemeChange((theme) => {
  console.log("Tema alterado para:", theme);
});

// Inicialização
applySettings();
updateClock();
setInterval(updateClock, 1000);
WidgetAPI.emitReady();`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const TEMPLATE_TODO_MINI: CustomWidgetPackage = {
  manifest: {
    id: "custom-todo-mini",
    name: "Mini To-Do List",
    version: "1.0.0",
    author: "Comunidade / Exemplo Oficial",
    description: "Lista de tarefas compacta com marcação rápida e persistência automática de itens.",
    category: "productivity",
    icon: "📋",
    entry: "index.html",
    defaultWidth: 260,
    defaultHeight: 240,
    minWidth: 210,
    minHeight: 180,
    resizable: true,
    permissions: ["storage"],
    tags: ["tarefas", "to-do", "produtividade", "lista"],
  },
  html: `<div class="todo-app">
  <div class="header">
    <span>Minhas Tarefas 🌸</span>
  </div>
  <div class="input-row">
    <input type="text" id="taskInput" placeholder="Nova tarefa..." maxlength="40" />
    <button id="addBtn">+</button>
  </div>
  <ul id="taskList" class="task-list"></ul>
</div>`,
  css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
}

body {
  background: transparent;
  display: flex;
  justify-content: center;
  height: 100vh;
  overflow: hidden;
  user-select: none;
}

.todo-app {
  width: 95%;
  height: 94%;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.header {
  font-size: 13px;
  font-weight: 800;
  color: #db2777;
  margin-bottom: 8px;
}

.input-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

input {
  flex: 1;
  border: 1px solid #fbcfe8;
  background: #fff;
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 11px;
  outline: none;
  color: #334155;
}

input:focus {
  border-color: #ec4899;
}

button#addBtn {
  background: #ec4899;
  border: none;
  color: white;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 11px;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid #f1f5f9;
}

.task-item.done {
  text-decoration: line-through;
  opacity: 0.5;
  background: #f8fafc;
}

.task-text {
  flex: 1;
  word-break: break-all;
}

.del-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
}

.del-btn:hover {
  color: #ef4444;
}`,
  js: `const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");

let tasks = WidgetAPI.getConfig("tasks", [
  { text: "Dar um beijo na esposa 💕", done: true },
  { text: "Beber um copo de água 🌸", done: false },
]);

function saveAndRender() {
  WidgetAPI.setConfig("tasks", tasks);
  taskList.innerHTML = "";

  tasks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "task-item" + (t.done ? " done" : "");

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = t.text;
    span.onclick = () => {
      tasks[i].done = !tasks[i].done;
      saveAndRender();
    };

    const del = document.createElement("button");
    del.className = "del-btn";
    del.textContent = "✕";
    del.onclick = (e) => {
      e.stopPropagation();
      tasks.splice(i, 1);
      saveAndRender();
    };

    li.appendChild(span);
    li.appendChild(del);
    taskList.appendChild(li);
  });
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  tasks.push({ text, done: false });
  taskInput.value = "";
  saveAndRender();
}

addBtn.onclick = addTask;
taskInput.onkeydown = (e) => {
  if (e.key === "Enter") addTask();
};

saveAndRender();
WidgetAPI.emitReady();`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

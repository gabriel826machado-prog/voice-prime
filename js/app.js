import { isConfigured } from "./config.js";
import { $, el, toast, formatTime, errorMessage } from "./utils.js";
import { joinChat, sendChatMessage, leaveChat } from "./chat.js";
import { CallManager } from "./call.js";

const state = { roomId: null, name: null, channel: null, seen: new Set() };

const call = new CallManager({
  stage: $("#stage"),
  stats: $("#stats"),
  onError: (msg) => toast(msg, 5000),
  onChange: updateCallUI,
});

function showScreen(which) {
  $("#screen-join").classList.toggle("hidden", which !== "join");
  $("#screen-room").classList.toggle("hidden", which !== "room");
}

function updateCallUI() {
  const s = call.state;
  $("#btn-join-call").classList.toggle("hidden", s.connected);
  ["#btn-mic", "#btn-cam", "#btn-screen", "#btn-leave-call"].forEach((id) =>
    $(id).classList.toggle("hidden", !s.connected)
  );
  $("#btn-mic").textContent = s.mic ? "Mutar" : "Desmutar";
  $("#btn-cam").textContent = s.cam ? "Desligar câmera" : "Ligar câmera";
  $("#btn-screen").textContent = s.screen ? "Parar tela" : "Compartilhar tela 1080p60";
}

function renderMessage(m) {
  if (state.seen.has(m.id)) return; // evita duplicar histórico + realtime
  state.seen.add(m.id);

  const box = $("#messages");
  const wrap = el("div", "msg" + (m.author === state.name ? " mine" : ""));
  const head = el("header");
  head.append(el("strong", null, m.author), el("span", null, formatTime(m.created_at)));
  wrap.append(head, el("p", null, m.content));
  box.append(wrap);
  box.scrollTop = box.scrollHeight;
}

async function enterRoom(roomId, name) {
  state.roomId = roomId;
  state.name = name;
  state.seen.clear();
  $("#messages").innerHTML = "";
  $("#room-label").textContent = `#${roomId}`;
  showScreen("room");
  updateCallUI();

  try {
    state.channel = await joinChat(roomId, renderMessage);
  } catch (e) {
    toast("Erro no chat: " + errorMessage(e), 5000);
  }
}

async function leaveRoom() {
  await call.leave();
  leaveChat(state.channel);
  state.channel = null;
  const url = new URL(location.href);
  url.searchParams.delete("sala");
  history.replaceState(null, "", url);
  showScreen("join");
}

// Entrada na sala
$("#join-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const roomId = $("#room-id").value.trim();
  const name = $("#user-name").value.trim();
  const errorEl = $("#join-error");

  if (!/^\d{1,12}$/.test(roomId)) {
    errorEl.textContent = "Informe um ID numérico válido.";
    return;
  }
  if (!name) {
    errorEl.textContent = "Informe seu nome.";
    return;
  }
  if (!isConfigured()) {
    errorEl.textContent = "Configuração pendente: edite js/config.js.";
    return;
  }

  errorEl.textContent = "";
  localStorage.setItem("displayName", name);
  const url = new URL(location.href);
  url.searchParams.set("sala", roomId);
  history.replaceState(null, "", url);
  await enterRoom(roomId, name);
});

// Chat
$("#chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#message-input");
  const content = input.value.trim();
  if (!content) return;
  input.value = "";
  try {
    await sendChatMessage(state.roomId, state.name, content);
  } catch (err) {
    input.value = content;
    toast("Não foi possível enviar: " + errorMessage(err), 5000);
  }
});

$("#message-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("#chat-form").requestSubmit();
  }
});

$("#copy-link").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast("Link copiado.");
  } catch {
    toast("Não foi possível copiar o link.");
  }
});

$("#leave-room").addEventListener("click", leaveRoom);

// Chamada
$("#btn-join-call").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    await call.join(state.roomId, state.name);
  } catch (err) {
    toast(errorMessage(err), 5000);
  } finally {
    btn.disabled = false;
    updateCallUI();
  }
});

$("#btn-mic").addEventListener("click", () => call.toggleMic());
$("#btn-cam").addEventListener("click", () => call.toggleCam());
$("#btn-screen").addEventListener("click", () => call.toggleScreen());
$("#btn-leave-call").addEventListener("click", async () => {
  await call.leave();
  updateCallUI();
});

// Inicialização
function init() {
  if (!isConfigured()) {
    const banner = $("#config-warning");
    banner.textContent = "Configuração pendente: edite js/config.js com suas chaves.";
    banner.classList.remove("hidden");
  }

  $("#user-name").value = localStorage.getItem("displayName") || "";

  const sala = new URLSearchParams(location.search).get("sala");
  if (sala && /^\d{1,12}$/.test(sala)) {
    $("#room-id").value = sala;
    const name = $("#user-name").value.trim();
    if (name) enterRoom(sala, name);
  }
}

init();
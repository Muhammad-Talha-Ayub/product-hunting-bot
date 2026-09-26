const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const statusPill = document.getElementById("status-pill");
const messageTemplate = document.getElementById("message-template");

/** @type {{ role: 'user' | 'assistant', content: string }[]} */
let conversation = [];
let isSending = false;

const STARTERS = [
  "Hi, I'm interested in beauty products.",
  "I sell on Amazon and need a winning product.",
  "I don't have a store yet — dropshipping.",
  "مجھے electronics niche میں products چاہئیں",
];

function autoResizeTextarea() {
  inputEl.style.height = "auto";
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 140)}px`;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderWelcome() {
  messagesEl.innerHTML = "";
  const welcome = document.createElement("div");
  welcome.className = "welcome";
  welcome.innerHTML = `
    <h2>Find your next winning products</h2>
    <p>Tell us your niche and how you sell. We'll guide you to the right $25 research package.</p>
    <div class="chips" role="group" aria-label="Suggested messages"></div>
  `;
  const chips = welcome.querySelector(".chips");
  STARTERS.forEach((text) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = text;
    chip.addEventListener("click", () => {
      inputEl.value = text;
      autoResizeTextarea();
      formEl.requestSubmit();
    });
    chips.appendChild(chip);
  });
  messagesEl.appendChild(welcome);
}

function appendMessage(role, content, options = {}) {
  const welcome = messagesEl.querySelector(".welcome");
  if (welcome) welcome.remove();

  const node = messageTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(role);
  if (options.error) node.classList.add("error");

  const label = role === "user" ? "You" : "Assistant";
  node.querySelector(".meta").textContent = label;
  node.querySelector(".content").textContent = content;

  if (role === "assistant") {
    node.querySelector(".avatar").textContent = "";
  } else {
    node.querySelector(".avatar").textContent = "";
  }

  messagesEl.appendChild(node);
  scrollToBottom();
  return node;
}

function appendTypingIndicator() {
  const node = messageTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add("assistant", "typing");
  node.dataset.typing = "true";
  node.querySelector(".meta").textContent = "Assistant";
  node.querySelector(".content").innerHTML = "<span></span><span></span><span></span>";
  messagesEl.appendChild(node);
  scrollToBottom();
  return node;
}

function setBusy(busy) {
  isSending = busy;
  sendBtn.disabled = busy;
  inputEl.disabled = busy;
}

function setStatus(ok, label) {
  statusPill.classList.toggle("error", !ok);
  statusPill.lastChild.textContent = label;
}

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) throw new Error("offline");
    setStatus(true, " Online");
  } catch {
    setStatus(false, " Offline");
  }
}

async function sendMessage(text) {
  const trimmed = text.trim();
  if (!trimmed || isSending) return;

  appendMessage("user", trimmed);
  conversation.push({ role: "user", content: trimmed });

  inputEl.value = "";
  autoResizeTextarea();
  setBusy(true);

  const typingNode = appendTypingIndicator();
  const history = conversation.slice(0, -1);

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed, history }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail =
        typeof data.detail === "string"
          ? data.detail
          : "Something went wrong. Please try again.";
      throw new Error(detail);
    }

    const reply = data.reply?.trim() || "I couldn't generate a reply. Please try again.";
    typingNode.remove();
    appendMessage("assistant", reply);
    conversation.push({ role: "assistant", content: reply });
    setStatus(true, " Online");
  } catch (err) {
    typingNode.remove();
    appendMessage(
      "assistant",
      err.message || "Could not reach the server. Is uvicorn running?",
      { error: true },
    );
    setStatus(false, " Error");
  } finally {
    setBusy(false);
    inputEl.focus();
  }
}

function resetChat() {
  conversation = [];
  renderWelcome();
  inputEl.focus();
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(inputEl.value);
});

inputEl.addEventListener("input", autoResizeTextarea);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    formEl.requestSubmit();
  }
});

newChatBtn.addEventListener("click", resetChat);

renderWelcome();
autoResizeTextarea();
checkHealth();
inputEl.focus();

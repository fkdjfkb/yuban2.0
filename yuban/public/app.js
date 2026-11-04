const storageKey = "zisu-yuban-chat-v3";
const settingsKey = "zisu-yuban-settings-v2";
const statsKey = "zisu-yuban-stats-v1";
const isFileMode = window.location.protocol === "file:";

const elements = {
  form: document.querySelector("#chatForm"),
  input: document.querySelector("#messageInput"),
  messages: document.querySelector("#messages"),
  clear: document.querySelector("#clearChat"),
  quickPrompts: document.querySelector("#quickPrompts"),
  language: document.querySelector("#languageSelect"),
  level: document.querySelector("#levelSelect"),
  connection: document.querySelector("#connectionLabel"),
  count: document.querySelector("#messageCount"),
  progress: document.querySelector("#trackProgress"),
  modeNote: document.querySelector("#modeNote"),
  usePhrase: document.querySelector("#usePhrase"),
  phrase: document.querySelector("#dailyPhrase"),
};

const languageContent = {
  英语: {
    prompts: ["How was your class today?", "Let’s practice a self-introduction.", "What food would you recommend?"],
    placeholder: "试着用英语说点什么…",
    phrase: "I’m still learning, but I’d like to try.",
  },
  日语: {
    prompts: ["今日の授業はどうでしたか？", "自己紹介を練習したいです。", "おすすめの料理は何ですか？"],
    placeholder: "日本語で話してみましょう…",
    phrase: "まだ勉強中ですが、話してみたいです。",
  },
  西班牙语: {
    prompts: ["¿Cómo fue tu clase hoy?", "Quiero practicar mi presentación.", "¿Qué comida recomiendas?"],
    placeholder: "试着用西班牙语说点什么…",
    phrase: "Todavía estoy aprendiendo, pero quiero intentarlo.",
  },
  法语: {
    prompts: ["Comment était ton cours aujourd’hui ?", "Je veux pratiquer ma présentation.", "Quel plat recommandes-tu ?"],
    placeholder: "试着用法语说点什么…",
    phrase: "J’apprends encore, mais j’aimerais essayer.",
  },
  德语: {
    prompts: ["Wie war dein Unterricht heute?", "Ich möchte meine Vorstellung üben.", "Welches Essen empfiehlst du?"],
    placeholder: "试着用德语说点什么…",
    phrase: "Ich lerne noch, aber ich möchte es versuchen.",
  },
  韩语: {
    prompts: ["오늘 수업은 어땠어요?", "자기소개를 연습하고 싶어요.", "어떤 음식을 추천해요?"],
    placeholder: "试着用韩语说点什么…",
    phrase: "아직 배우고 있지만 한번 해 보고 싶어요.",
  },
};

const welcomeMessage = {
  role: "assistant",
  content: "Hi，我是 Wug。这里不怕说错，也不用一次说得完美。我们从简单的开始：How was your day?",
  createdAt: Date.now(),
};

const storedChat = loadJson(storageKey, null);
const validStoredMessages = Array.isArray(storedChat)
  ? storedChat.filter(
    (message) =>
      message &&
      ["user", "assistant"].includes(message.role) &&
      typeof message.content === "string" &&
      message.content.trim(),
  )
  : [];
let chat = (validStoredMessages.length ? validStoredMessages : [welcomeMessage]).map((message) => ({
  role: message.role,
  content: (
    message.role === "assistant"
      ? message.content.replaceAll("卡皮巴拉", "Wug").replaceAll("我是Wug", "我是 Wug")
      : message.content
  ).slice(0, 4000),
  createdAt: Number.isFinite(Number(message.createdAt)) ? Number(message.createdAt) : Date.now(),
  provider: typeof message.provider === "string" ? message.provider : undefined,
  fallback: Boolean(message.fallback),
  id: createMessageId(),
  streaming: false,
}));
const storedSettings = loadJson(settingsKey, {});
const allowedLevels = new Set([...elements.level.options].map((option) => option.value));
let settings = {
  language: Object.hasOwn(languageContent, storedSettings?.language) ? storedSettings.language : "英语",
  level: allowedLevels.has(storedSettings?.level) ? storedSettings.level : "日常交流",
};
const today = localDateKey();
const historyCountToday = chat.filter(
  (message) => message.role === "user" && localDateKey(message.createdAt) === today,
).length;
const storedStats = loadJson(statsKey, null);
let stats = storedStats?.date === today
  ? { date: today, count: Math.max(Number(storedStats.count) || 0, historyCountToday) }
  : { date: today, count: historyCountToday };
let isSending = false;

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function createMessageId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

function messageMarkup(message) {
  const isUser = message.role === "user";
  const modeNote = message.fallback
    ? '<span class="fallback-note" title="模型调用失败，本条由基础回复生成">基础回复</span>'
    : message.provider === "demo"
      ? '<span class="fallback-note">离线演示</span>'
      : "";
  const waitingMarkup = '<span class="stream-wait" aria-label="Wug 正在思考"><i></i><i></i><i></i></span>';
  return `
    <div class="message-row ${isUser ? "user" : "assistant"}${message.streaming ? " streaming" : ""}" data-message-id="${message.id}">
      ${isUser ? "" : '<div class="message-avatar"><img src="./assets/wug-logo.png" alt="" /></div>'}
      <div class="message-content">
        <div class="message-bubble">${message.streaming && !message.content ? waitingMarkup : escapeHtml(message.content)}</div>
        <div class="message-meta">${formatTime(message.createdAt || Date.now())}${isUser ? "" : modeNote}</div>
      </div>
    </div>`;
}

function renderMessages() {
  elements.messages.innerHTML = chat.map(messageMarkup).join("");
  elements.count.textContent = stats.count;
  elements.progress.style.width = `${Math.min(stats.count / 5, 1) * 100}%`;
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function renderLanguageContent() {
  const content = languageContent[settings.language] || languageContent.英语;
  elements.quickPrompts.innerHTML = content.prompts
    .map((prompt) => `<button type="button">${escapeHtml(prompt)}</button>`)
    .join("");
  elements.input.placeholder = content.placeholder;
  elements.phrase.textContent = `“${content.phrase}”`;
}

function updateMessageElement(message) {
  const row = elements.messages.querySelector(`[data-message-id="${message.id}"]`);
  if (!row) return;
  const distanceFromBottom = elements.messages.scrollHeight - elements.messages.scrollTop - elements.messages.clientHeight;
  const bubble = row.querySelector(".message-bubble");
  const meta = row.querySelector(".message-meta");
  row.classList.toggle("streaming", Boolean(message.streaming));
  if (message.content) {
    bubble.textContent = message.content;
  } else if (message.streaming) {
    bubble.innerHTML = '<span class="stream-wait" aria-label="Wug 正在思考"><i></i><i></i><i></i></span>';
  }
  const modeNote = message.fallback
    ? '<span class="fallback-note" title="模型调用失败，本条由基础回复生成">基础回复</span>'
    : message.provider === "demo"
      ? '<span class="fallback-note">离线演示</span>'
      : "";
  meta.innerHTML = `${formatTime(message.createdAt || Date.now())}${modeNote}`;
  if (distanceFromBottom < 120) elements.messages.scrollTop = elements.messages.scrollHeight;
}

function saveChat() {
  const completedMessages = chat.filter((message) => message.content?.trim());
  saveJson(storageKey, completedMessages.slice(-40));
}

function saveStats() {
  saveJson(statsKey, stats);
}

function incrementStats() {
  const currentDate = localDateKey();
  if (stats.date !== currentDate) stats = { date: currentDate, count: 0 };
  stats.count += 1;
  saveStats();
}

function friendlyErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/failed to fetch|networkerror|load failed/i.test(message)) return "网络连接失败";
  return message || "服务暂时不可用";
}

function updateSettings() {
  settings = { language: elements.language.value, level: elements.level.value };
  saveJson(settingsKey, settings);
  renderLanguageContent();
}

function autoResize() {
  elements.input.style.height = "auto";
  elements.input.style.height = `${Math.min(elements.input.scrollHeight, 110)}px`;
}

function localDemoReply(message) {
  const text = message.toLowerCase();
  if (/hello|hi|hey|你好|嗨/.test(text)) {
    return "Hello! Nice to meet you too. You can say, “I’m glad to meet you.” What would you like to talk about today?";
  }
  if (/class|lesson|study|learn|课|学习/.test(text)) {
    return "Good start! A natural way to say it is: “My class was interesting today.” What was the most interesting part?";
  }
  if (/food|dish|eat|料理|comida|菜|吃/.test(text)) {
    return "That sounds delicious! Try: “I’d recommend this dish because…” How would you describe its flavor?";
  }
  if (/weather|天气|气温|下雨|晴天/.test(text)) {
    return "我在离线演示模式下看不到实时天气。可以这样问：“What’s the weather like in Beijing today?” 查到天气后，试着用英语告诉我吧。";
  }
  if (/啥玩意|什么意思|没听懂|what do you mean/.test(text)) {
    return "抱歉，刚才的回复没有接住你的话。离线模式只能做基础练习；启动服务后我会根据上下文正常回答。";
  }
  const replies = [
    "Tell me one more detail, and I’ll help you make it sound more natural. What happened next?",
    "Let’s make that easier to express. Could you describe it in three simple words?",
    "Thanks for sharing. How did that make you feel—happy, surprised, or worried?",
  ];
  const seed = [...message].reduce((sum, character) => sum + character.codePointAt(0), 0);
  return replies[seed % replies.length];
}

async function requestReply(onEvent) {
  if (isFileMode) {
    const latestUserMessage = [...chat].reverse().find((message) => message.role === "user")?.content || "";
    const reply = localDemoReply(latestUserMessage);
    onEvent({ type: "meta", provider: "demo", fallback: false });
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    for (let index = 0; index < reply.length; index += 8) {
      onEvent({ type: "delta", delta: reply.slice(index, index + 8) });
      await new Promise((resolve) => window.setTimeout(resolve, 22));
    }
    return { reply, provider: "demo", fallback: false };
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      Accept: "application/x-ndjson",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: chat.map(({ role, content }) => ({ role, content })),
      language: settings.language,
      level: settings.level,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "发送失败");
  }

  if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
    const payload = await response.json();
    onEvent({ type: "meta", provider: payload.provider, fallback: payload.fallback });
    onEvent({ type: "delta", delta: payload.reply });
    return payload;
  }

  if (!response.body) throw new Error("浏览器无法读取流式响应");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const result = { reply: "", provider: "", fallback: false };
  let buffer = "";

  const processLine = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "error") throw new Error(event.error || "流式响应中断");
    if (event.type === "meta") {
      result.provider = event.provider || result.provider;
      result.fallback = Boolean(event.fallback);
      result.warning = event.warning;
      if (event.reset) result.reply = "";
    } else if (event.type === "delta") {
      result.reply += event.delta || "";
    } else if (event.type === "done") {
      result.provider = event.provider || result.provider;
      result.fallback = Boolean(event.fallback);
      result.warning = event.warning || result.warning;
    }
    onEvent(event);
  };

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = done ? "" : lines.pop() || "";
    lines.forEach(processLine);
    if (done) break;
  }

  if (buffer.trim()) processLine(buffer);
  if (!result.reply) throw new Error("模型没有返回有效内容");
  return result;
}

async function sendMessage(text) {
  const content = text.trim();
  if (!content || isSending) return;

  isSending = true;
  const submitButton = elements.form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  chat.push({ id: createMessageId(), role: "user", content, createdAt: Date.now() });
  incrementStats();
  const assistantMessage = {
    id: createMessageId(),
    role: "assistant",
    content: "",
    streaming: true,
    createdAt: Date.now(),
  };
  chat.push(assistantMessage);
  saveChat();
  renderMessages();
  elements.input.value = "";
  autoResize();
  elements.messages.setAttribute("aria-busy", "true");

  try {
    const result = await requestReply((event) => {
      if (event.type === "meta") {
        assistantMessage.provider = event.provider;
        assistantMessage.fallback = Boolean(event.fallback);
        if (event.reset) assistantMessage.content = "";
      } else if (event.type === "delta") {
        assistantMessage.content += event.delta || "";
      }
      updateMessageElement(assistantMessage);
    });
    if (!assistantMessage.content) assistantMessage.content = result.reply;
    assistantMessage.provider = result.provider;
    assistantMessage.fallback = Boolean(result.fallback);
  } catch (error) {
    assistantMessage.content = assistantMessage.content
      ? `${assistantMessage.content}\n\n（连接中断，你可以重新发送一次。）`
      : `刚才连接中断了：${friendlyErrorMessage(error)}。你可以再发一次试试。`;
  } finally {
    assistantMessage.streaming = false;
    elements.messages.setAttribute("aria-busy", "false");
    isSending = false;
    submitButton.disabled = false;
    saveChat();
    updateMessageElement(assistantMessage);
    elements.input.focus();
  }
}

async function loadStatus() {
  if (isFileMode) {
    elements.connection.textContent = "离线演示模式";
    elements.modeNote.classList.add("demo");
    elements.modeNote.innerHTML = "<span></span><p><strong>离线演示</strong><br />启动服务后自动启用智能对话</p>";
    return;
  }
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("offline");
    elements.connection.textContent = "智能语伴在线";
  } catch {
    elements.connection.textContent = "连接暂不可用";
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(elements.input.value);
});

elements.input.addEventListener("input", autoResize);
elements.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.form.requestSubmit();
  }
});

elements.quickPrompts.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) sendMessage(button.textContent);
});

elements.clear.addEventListener("click", () => {
  if (!window.confirm("确定清空当前浏览器里的聊天记录吗？")) return;
  chat = [{ ...welcomeMessage, id: createMessageId(), createdAt: Date.now() }];
  saveChat();
  renderMessages();
});

elements.usePhrase.addEventListener("click", () => {
  const content = languageContent[settings.language] || languageContent.英语;
  elements.input.value = content.phrase;
  autoResize();
  elements.input.focus();
});

[elements.language, elements.level].forEach((select) => select.addEventListener("change", updateSettings));

elements.language.value = settings.language;
elements.level.value = settings.level;
updateSettings();
saveStats();
saveChat();
renderMessages();
loadStatus();

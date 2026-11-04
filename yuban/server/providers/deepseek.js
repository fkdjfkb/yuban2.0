import { toChatMessages } from "./prompt.js";

function requestSignal(signal, timeoutMs) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

export async function* callDeepSeekStream(context, { signal } = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("尚未配置 DEEPSEEK_API_KEY");
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const timeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS || 60000);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
      messages: toChatMessages(context),
      thinking: { type: "disabled" },
      stream: true,
    }),
    signal: requestSignal(signal, timeoutMs),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    throw new Error(`DeepSeek API 调用失败（${response.status}）：${details}`);
  }

  if (!response.body) throw new Error("DeepSeek API 未返回可读取的数据流");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedText = false;

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = done ? "" : lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const payload = JSON.parse(data);
      const delta = payload?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) {
        receivedText = true;
        yield delta;
      }
    }

    if (done) break;
  }

  if (!receivedText) throw new Error("DeepSeek API 未返回有效回复");
}

export async function callDeepSeek(context, options) {
  let reply = "";
  for await (const delta of callDeepSeekStream(context, options)) reply += delta;
  return reply.trim();
}

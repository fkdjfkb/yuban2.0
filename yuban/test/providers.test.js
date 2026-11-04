import test from "node:test";
import assert from "node:assert/strict";
import { callDeepSeekStream } from "../server/providers/deepseek.js";
import { createFixedReply } from "../server/providers/fixed.js";
import { splitReplyIntoChunks, streamLanguagePartnerReply } from "../server/providers/index.js";
import { buildPrompt, toChatMessages } from "../server/providers/prompt.js";

const context = {
  messages: [{ role: "user", content: "Hello, I like food!" }],
  language: "英语",
  level: "日常交流",
};

test("fixed provider returns a follow-up question", () => {
  const reply = createFixedReply(context);
  assert.match(reply, /[?？]/);
});

test("Codex prompt includes learning context and transcript", () => {
  const prompt = buildPrompt(context);
  assert.match(prompt, /当前练习语言：英语/);
  assert.match(prompt, /学习者：Hello, I like food!/);
});

test("DeepSeek messages keep the system prompt separate", () => {
  const messages = toChatMessages(context);
  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
});

test("fixed provider handles weather and confusion contextually", () => {
  const weather = createFixedReply({ ...context, messages: [{ role: "user", content: "今天北京天气怎么样" }] });
  const confused = createFixedReply({ ...context, messages: [{ role: "user", content: "啥玩意" }] });
  assert.match(weather, /天气|weather/i);
  assert.match(confused, /抱歉|Sorry/i);
  assert.notEqual(weather, confused);
});

test("reply chunking preserves the complete Unicode text", () => {
  const reply = "你好！Streaming works，也不会拆坏 emoji 🐹。";
  const chunks = splitReplyIntoChunks(reply, 4);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.join(""), reply);
});

test("reply chunking does not split ordinary English words", () => {
  const chunks = splitReplyIntoChunks("What food would you recommend to a friend?", 5);
  assert.equal(chunks.join(""), "What food would you recommend to a friend?");
  assert.ok(chunks.every((chunk, index) => index === chunks.length - 1 || /[\s，。！？、,.!?;；:：]$/u.test(chunk)));
});

test("stream provider emits metadata, deltas and completion", async () => {
  const previousProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "fixed";
  try {
    const events = [];
    for await (const event of streamLanguagePartnerReply(context)) events.push(event);
    assert.equal(events[0].type, "meta");
    assert.equal(events.at(-1).type, "done");
    assert.equal(events[0].provider, "fixed");
    assert.match(events.filter((event) => event.type === "delta").map((event) => event.delta).join(""), /[?？]/);
  } finally {
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
  }
});

test("DeepSeek SSE chunks are forwarded as text deltas", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.DEEPSEEK_API_KEY;
  const encoder = new TextEncoder();
  process.env.DEEPSEEK_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    const requestBody = JSON.parse(options.body);
    assert.equal(requestBody.stream, true);
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hel'));
        controller.enqueue(encoder.encode('lo"}}]}\n\ndata: {"choices":[{"delta":{"content":"!"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    }));
  };

  try {
    const deltas = [];
    for await (const delta of callDeepSeekStream(context)) deltas.push(delta);
    assert.deepEqual(deltas, ["Hello", "!"]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = previousKey;
  }
});

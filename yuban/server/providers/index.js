import { accessSync, constants } from "node:fs";
import { delimiter } from "node:path";
import { callCodex } from "./codex-cli.js";
import { callDeepSeek, callDeepSeekStream } from "./deepseek.js";
import { createFixedReply } from "./fixed.js";

const supportedProviders = new Set(["auto", "codex", "deepseek", "fixed"]);

function commandExists(command) {
  if (command.includes("/")) {
    try {
      accessSync(command, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  return (process.env.PATH || "")
    .split(delimiter)
    .some((pathEntry) => {
      try {
        accessSync(`${pathEntry}/${command}`, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });
}

function selectedProvider() {
  const configured = (process.env.AI_PROVIDER || "auto").toLowerCase();
  return supportedProviders.has(configured) ? configured : "auto";
}

export function getProviderStatus() {
  const provider = selectedProvider();
  const codexPath = process.env.CODEX_CLI_PATH || "codex";
  return {
    ok: true,
    active: provider,
    label:
      provider === "deepseek"
        ? "DeepSeek API"
        : provider === "fixed"
          ? "固定回复"
          : "Codex CLI（固定回复兜底）",
    available: {
      codex: commandExists(codexPath),
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
      fixed: true,
    },
  };
}

export async function createLanguagePartnerReply(context) {
  const provider = selectedProvider();

  if (provider === "fixed") {
    return { reply: createFixedReply(context), provider: "fixed", fallback: false };
  }

  try {
    if (provider === "deepseek") {
      return { reply: await callDeepSeek(context), provider: "deepseek", fallback: false };
    }

    return { reply: await callCodex(context), provider: "codex", fallback: false };
  } catch (error) {
    const warning = error instanceof Error ? error.message : "模型服务暂不可用";
    console.warn(`[provider fallback] ${warning}`);
    return {
      reply: createFixedReply(context),
      provider: "fixed",
      fallback: true,
      warning,
    };
  }
}

export function splitReplyIntoChunks(reply, targetSize = 5) {
  const characters = Array.from(reply);
  const chunks = [];
  let current = "";

  for (const character of characters) {
    current += character;
    const naturalBreak = /[\s，。！？、,.!?;；:：]/u.test(character);
    if (current.length >= targetSize && naturalBreak) {
      chunks.push(current);
      current = "";
    } else if (current.length >= targetSize * 2) {
      const endsInsideLatinWord = /[\p{Letter}\p{Number}]$/u.test(current);
      if (!endsInsideLatinWord || current.length >= targetSize * 6) {
        chunks.push(current);
        current = "";
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function* streamBufferedReply(reply) {
  for (const delta of splitReplyIntoChunks(reply)) {
    yield delta;
    await new Promise((resolve) => setTimeout(resolve, 28));
  }
}

export async function* streamLanguagePartnerReply(context, { signal } = {}) {
  const provider = selectedProvider();
  let emittedText = false;

  try {
    if (provider === "fixed") {
      yield { type: "meta", provider: "fixed", fallback: false };
      for await (const delta of streamBufferedReply(createFixedReply(context))) {
        emittedText = true;
        yield { type: "delta", delta };
      }
      yield { type: "done", provider: "fixed", fallback: false };
      return;
    }

    if (provider === "deepseek") {
      yield { type: "meta", provider: "deepseek", fallback: false };
      for await (const delta of callDeepSeekStream(context, { signal })) {
        emittedText = true;
        yield { type: "delta", delta };
      }
      yield { type: "done", provider: "deepseek", fallback: false };
      return;
    }

    yield { type: "meta", provider: "codex", fallback: false };
    const reply = await callCodex(context, { signal });
    for await (const delta of streamBufferedReply(reply)) {
      emittedText = true;
      yield { type: "delta", delta };
    }
    yield { type: "done", provider: "codex", fallback: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    const warning = error instanceof Error ? error.message : "模型服务暂不可用";
    console.warn(`[provider fallback] ${warning}`);
    yield {
      type: "meta",
      provider: "fixed",
      fallback: true,
      warning,
      reset: emittedText,
    };
    for await (const delta of streamBufferedReply(createFixedReply(context))) {
      yield { type: "delta", delta };
    }
    yield { type: "done", provider: "fixed", fallback: true, warning };
  }
}

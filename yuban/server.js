import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createLanguagePartnerReply,
  getProviderStatus,
  streamLanguagePartnerReply,
} from "./server/providers/index.js";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(rootDir, "public");
const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 128 * 1024;

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendStream(response, iterator, abortController) {
  response.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();

  return (async () => {
    try {
      for await (const event of iterator) {
        if (abortController.signal.aborted || response.destroyed) break;
        response.write(`${JSON.stringify(event)}\n`);
      }
    } catch (error) {
      if (!response.destroyed) {
        response.write(`${JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "语伴暂时走神了，请稍后再试。",
        })}\n`);
      }
    } finally {
      if (!response.destroyed) response.end();
    }
  })();
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBodyBytes) {
      throw new HttpError(413, "消息内容过长");
    }
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new HttpError(400, "请求格式不正确");
  }
}

function serveStatic(pathname, response) {
  let requestedPath;
  try {
    requestedPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const safePath = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return false;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": [".html", ".css", ".js"].includes(extname(filePath))
      ? "no-cache"
      : "public, max-age=3600",
  });
  createReadStream(filePath).pipe(response);
  return true;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, getProviderStatus());
  }

  if (request.method === "POST" && url.pathname === "/api/chat") {
    try {
      const body = await readJson(request);
      const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
      const validMessages = messages.filter(
        (message) =>
          message &&
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string" &&
          message.content.trim().length > 0 &&
          message.content.length <= 4000,
      );

      if (!validMessages.length || validMessages.at(-1).role !== "user") {
        return sendJson(response, 400, { error: "请先输入一条消息。" });
      }

      const context = {
        messages: validMessages,
        language: typeof body.language === "string" ? body.language.slice(0, 30) : "英语",
        level: typeof body.level === "string" ? body.level.slice(0, 30) : "日常交流",
      };

      if (request.headers.accept?.includes("application/x-ndjson")) {
        const abortController = new AbortController();
        request.on("aborted", () => abortController.abort(new Error("客户端已断开连接")));
        response.on("close", () => {
          if (!response.writableEnded) abortController.abort(new Error("客户端已断开连接"));
        });
        return await sendStream(
          response,
          streamLanguagePartnerReply(context, { signal: abortController.signal }),
          abortController,
        );
      }

      const result = await createLanguagePartnerReply(context);
      return sendJson(response, 200, result);
    } catch (error) {
      return sendJson(response, error instanceof HttpError ? error.statusCode : 500, {
        error: error instanceof Error ? error.message : "语伴暂时走神了，请稍后再试。",
      });
    }
  }

  if (url.pathname === "/api/chat" || url.pathname === "/api/health") {
    response.setHeader("Allow", url.pathname === "/api/chat" ? "POST" : "GET");
    return sendJson(response, 405, { error: "请求方法不支持" });
  }

  if (request.method === "GET" && serveStatic(url.pathname, response)) {
    return;
  }

  sendJson(response, 404, { error: "页面不存在" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Wug 语伴已启动：http://127.0.0.1:${port}`);
  console.log(`当前模型策略：${process.env.AI_PROVIDER || "auto (Codex CLI → 固定回复)"}`);
});

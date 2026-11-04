import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectDir = fileURLToPath(new URL("..", import.meta.url));

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("测试服务启动超时");
}

test("HTTP server validates input and supports JSON plus NDJSON replies", async (context) => {
  const port = 39000 + (process.pid % 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: projectDir,
    env: { ...process.env, AI_PROVIDER: "fixed", PORT: String(port) },
    stdio: "ignore",
  });
  context.after(() => child.kill("SIGTERM"));
  await waitForServer(baseUrl);

  const jsonResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
  });
  const jsonPayload = await jsonResponse.json();
  assert.equal(jsonResponse.status, 200);
  assert.equal(jsonPayload.provider, "fixed");
  assert.ok(jsonPayload.reply);

  const streamResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { Accept: "application/x-ndjson", "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "I like food" }] }),
  });
  const events = (await streamResponse.text()).trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(streamResponse.status, 200);
  assert.equal(events[0].type, "meta");
  assert.equal(events.at(-1).type, "done");
  assert.ok(events.some((event) => event.type === "delta"));

  const malformedResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad-json",
  });
  assert.equal(malformedResponse.status, 400);

  const oversizedResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "x".repeat(140_000) }] }),
  });
  assert.equal(oversizedResponse.status, 413);

  const methodResponse = await fetch(`${baseUrl}/api/chat`, { method: "PUT" });
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get("allow"), "POST");
});

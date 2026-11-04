import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPrompt } from "./prompt.js";

export async function callCodex(context, { signal } = {}) {
  const runDir = await mkdtemp(join(tmpdir(), "zisu-yuban-codex-"));
  const outputPath = join(runDir, "reply.txt");
  const command = process.env.CODEX_CLI_PATH || "codex";
  const timeoutMs = Number(process.env.CODEX_TIMEOUT_MS || 90000);
  const args = [
    "exec",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "--color",
    "never",
    "--skip-git-repo-check",
    "--output-last-message",
    outputPath,
    "-C",
    runDir,
  ];

  if (process.env.CODEX_MODEL) {
    args.push("--model", process.env.CODEX_MODEL);
  }
  args.push("-");

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: runDir,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stderr = "";
      let stdout = "";
      let settled = false;
      const abort = () => {
        child.kill("SIGTERM");
        if (!settled) {
          settled = true;
          reject(signal?.reason instanceof Error ? signal.reason : new Error("请求已取消"));
        }
      };
      signal?.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        if (!settled) {
          settled = true;
          reject(new Error("Codex CLI 响应超时，已切换固定回复"));
        }
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout = (stdout + chunk.toString()).slice(-8000);
      });
      child.stderr.on("data", (chunk) => {
        stderr = (stderr + chunk.toString()).slice(-8000);
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        if (!settled) {
          settled = true;
          reject(new Error(`无法启动 Codex CLI：${error.message}`));
        }
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        if (settled) return;
        settled = true;
        if (code === 0) resolve(stdout);
        else reject(new Error(`Codex CLI 调用失败（${code}）：${stderr.trim().slice(-300)}`));
      });

      child.stdin.end(buildPrompt(context));
    });

    const reply = (await readFile(outputPath, "utf8")).trim();
    if (!reply) throw new Error("Codex CLI 未返回有效回复");
    return reply;
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
}

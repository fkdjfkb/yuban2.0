import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexPath = new URL("../public/index.html", import.meta.url);
const appPath = new URL("../public/app.js", import.meta.url);

test("standalone page uses relative local assets", async () => {
  const html = await readFile(indexPath, "utf8");
  assert.match(html, /href="\.\/styles\.css\?v=13"/);
  assert.match(html, /src="\.\/app\.js\?v=13"/);
  assert.doesNotMatch(html, /<script[^>]+type="module"/);
  assert.doesNotMatch(html, /(?:href|src)="\/(?!\/)/);
});

test("standalone file mode has a local reply path", async () => {
  const source = await readFile(appPath, "utf8");
  assert.match(source, /window\.location\.protocol === "file:"/);
  assert.match(source, /localDemoReply\(latestUserMessage\)/);
  assert.match(source, /function saveJson\(key, value\)/);
});

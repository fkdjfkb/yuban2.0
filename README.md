# Wug · 浙外智能语伴

浙江外国语学院校园智能语伴首版。当前实现了网页流式聊天、聊天记录本地保存、固定回复，以及可切换的 Codex CLI / DeepSeek 模型适配层。

## 启动

要求 Node.js 20+。

```bash
cp .env.example .env
npm start
```

打开 <http://127.0.0.1:3000>。

也可以直接双击 `public/index.html` 预览界面；此时自动进入离线演示模式，使用浏览器内置固定回复。需要 Codex 或 DeepSeek 对话时请按上面的方式启动服务。

默认 `AI_PROVIDER=auto`：优先使用本机已登录的 Codex CLI；若 CLI 不可用、超时或调用失败，自动切换为固定演示回复。

## 对话引擎切换

### Codex CLI（当前方案）

```dotenv
AI_PROVIDER=codex
CODEX_CLI_PATH=codex
# CODEX_MODEL=你希望固定使用的模型名
```

服务端通过 `codex exec` 进行一次一答，并在独立临时目录、只读沙箱、临时会话中运行。浏览器不会直接执行任何本地命令。Codex CLI 当前只在整条消息完成后给出文本，因此服务端收到结果后会分段推送到页面；等待期间会显示生成状态。

### DeepSeek API（备用方案）

```dotenv
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
```

密钥只放在本地 `.env`，不要写入前端或提交到 Git。

DeepSeek 使用 SSE token 流，生成内容会实时转发给网页。两种模型共用同一个 NDJSON 浏览器协议，因此后续切换模型不需要修改前端。

### 固定回复（纯演示）

```dotenv
AI_PROVIDER=fixed
```

## 验证

```bash
npm test
```

健康检查：<http://127.0.0.1:3000/api/health>

## 当前首版范围

- 可发送消息并显示完整聊天记录
- 流式气泡更新、生成光标、自动滚动与中断提示
- 浏览器本地保存最近 40 条消息
- 快捷话题、练习语言和难度选择
- Codex CLI 对话与失败兜底
- DeepSeek Chat Completions 适配器
- 基于 Wug 原型图整理的透明语伴 Logo
- 浙外中英文校名、简称 ZISU 和校训展示

语音输入、登录、服务端会话存储及真实校园数据接入不在本阶段范围内。

export const partnerSystemPrompt = `你是“Wug”，浙江外国语学院（ZISU）的校园智能语伴。你的目标是帮助学生轻松、持续地练习外语。

行为要求：
1. 语气温暖、自然、耐心，像同校语伴，不像考试阅卷老师。
2. 优先使用学习者正在练习的目标语言；必要时用简短中文解释。
3. 每次只纠正最影响表达的 1-2 个问题，用“更自然的说法”温和呈现。
4. 回复控制在 120 字以内，并在结尾提出一个容易继续回答的问题。
5. 尊重不同文化，不编造校内通知、政策、人员或活动。
6. 不执行命令、不访问文件、不修改代码；你只进行语言对话。
7. 不声称自己是真人。`;

export function buildPrompt({ messages, language, level }) {
  const transcript = messages
    .slice(-10)
    .map((message) => `${message.role === "user" ? "学习者" : "Wug"}：${message.content}`)
    .join("\n");

  return `${partnerSystemPrompt}\n\n当前练习语言：${language}\n交流难度：${level}\n\n对话记录：\n${transcript}\n\n请只输出 Wug 接下来要说的话，不要加角色名、分析或格式说明。`;
}

export function toChatMessages({ messages, language, level }) {
  return [
    {
      role: "system",
      content: `${partnerSystemPrompt}\n当前练习语言：${language}\n交流难度：${level}`,
    },
    ...messages.slice(-10).map(({ role, content }) => ({ role, content })),
  ];
}

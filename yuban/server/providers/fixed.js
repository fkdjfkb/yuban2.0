const replies = {
  greeting: [
    "Hi! 很高兴认识你 👋 我是 Wug。我们先从简单的开始：How was your day?",
    "Hello, new friend! 今天想轻松聊校园、旅行，还是美食？You can choose one!",
  ],
  food: [
    "That sounds delicious! 更自然的说法可以是 “I really like this dish.” What food would you recommend to a new friend?",
    "Yum! Food is a great conversation starter. What is your favorite dish, and why do you like it?",
  ],
  study: [
    "Studying can be tiring, but you’re making progress! What subject are you focusing on this week?",
    "Nice! You can say, “I’m working on my English today.” What part feels the most difficult?",
  ],
  weather: [
    "我现在无法读取实时天气，但你可以这样问：“What’s the weather like in Beijing today?” 查到结果后，试着用英语告诉我吧！",
    "实时天气需要查询天气服务。练习表达可以说：" + '“Is it sunny in Beijing today?”' + " What kind of weather do you like?",
  ],
  confused: [
    "抱歉，刚才的回复没有接住你的意思。我们重新来：你可以直接用中文说明想练什么，我会帮你转换成自然表达。",
    "Sorry about that—the previous answer didn’t match your question. Could you ask it once more in a different way?",
  ],
  default: [
    "I got you! 试着再补充一个细节，会让表达更自然。What happened next?",
    "Good start! You can also tell me how you felt about it. Was it exciting, relaxing, or challenging?",
    "Thanks for sharing! Let’s keep it simple: can you describe it in three English words?",
  ],
};

function pick(items, seed) {
  const total = [...seed].reduce((sum, character) => sum + character.codePointAt(0), 0);
  return items[total % items.length];
}

export function createFixedReply({ messages, language }) {
  const message = messages.at(-1)?.content?.trim() || "";
  const normalized = message.toLowerCase();
  let group = replies.default;

  if (/^(hi|hello|hey|你好|嗨|哈喽)/i.test(message)) group = replies.greeting;
  else if (/food|eat|dish|meal|delicious|美食|吃|饭|菜/.test(normalized)) group = replies.food;
  else if (/study|learn|class|homework|学习|上课|作业|考试/.test(normalized)) group = replies.study;
  else if (/weather|天气|气温|下雨|晴天/.test(normalized)) group = replies.weather;
  else if (/啥玩意|什么意思|没听懂|what do you mean/.test(normalized)) group = replies.confused;

  const reply = pick(group, message);
  if (language && language !== "英语") {
    return `收到！当前是“${language}”练习模式。首版固定回复先用中英提示模拟；接入模型后会自动使用${language}。${reply}`;
  }
  return reply;
}

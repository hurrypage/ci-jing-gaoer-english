const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const decode = (base64) => Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));

const assets = /*__ASSETS__*/;

function staticAsset(pathname) {
  const item = assets[pathname] || (pathname === "/" ? assets["/index.html"] : null);
  if (!item) return null;
  return new Response(decode(item.data), { headers: { "content-type": item.type, "cache-control": pathname.includes("/data/") ? "public, max-age=3600" : "no-cache" } });
}

function clean(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/health") return json({ ready: Boolean(env.DEEPSEEK_API_KEY) });
    if (url.pathname !== "/api/explain") {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      const response = staticAsset(url.pathname);
      return response || new Response("Not found", { status: 404 });
    }
    if (request.method !== "POST") return json({ error: "仅支持 POST 请求。" }, 405);
    if (!env.DEEPSEEK_API_KEY) return json({ error: "AI 服务尚未配置。请由站点管理员在保密配置中设置 DeepSeek API。" }, 503);
    let payload;
    try { payload = await request.json(); } catch { return json({ error: "请求内容无法识别。" }, 400); }
    const question = clean(payload.question, 8000);
    const answer = clean(payload.answer, 4000);
    const explain = clean(payload.explain, 4000);
    const studentAnswer = clean(payload.studentAnswer, 5000);
    const questionType = clean(payload.questionType, 120);
    if (!question || !answer) return json({ error: "题干或参考答案缺失。" }, 400);

    const system = "你是面向上海普通高中高二学生的英语学习助教。用简洁、具体的中文解释一道编辑练习。严格依据提供的题干、参考答案和说明；不要把题目称为上海高考真题，不要虚构试卷来源、评分标准或课标结论。回答采用四段：考什么、怎么做、易错点、下一步。若有学生作答，温和指出与参考答案的关键差异。总长度控制在 450 字以内。";
    const user = `题型：${questionType || "英语练习"}\n题干：${question}\n参考答案：${answer}\n已有说明：${explain || "无"}\n学生作答：${studentAnswer || "未填写"}`;
    let upstream;
    try {
      upstream = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
        body: JSON.stringify({ model: "deepseek-chat", temperature: 0.25, max_tokens: 700, messages: [{ role: "system", content: system }, { role: "user", content: user }] })
      });
    } catch { return json({ error: "暂时无法连接 AI 服务，请稍后重试。" }, 502); }
    if (!upstream.ok) return json({ error: "AI 服务暂时无法完成解释，请稍后重试。" }, 502);
    let result;
    try { result = await upstream.json(); } catch { return json({ error: "AI 服务返回异常，请稍后重试。" }, 502); }
    const explanation = clean(result?.choices?.[0]?.message?.content, 6000);
    if (!explanation) return json({ error: "AI 暂未生成有效解释，请稍后重试。" }, 502);
    return json({ explanation });
  }
};

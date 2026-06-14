import assert from "node:assert/strict";

process.env.DASHSCOPE_API_KEY = "test-key";
process.env.JOB_SOURCE_PROVIDER = "local";
process.env.OFFER_FAST_RESUME_OPTIMIZER = "true";

globalThis.fetch = (async () =>
  new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              profile: {
                name: "张同学",
                summary: "软件工程本科，目标前端开发。",
                education: "本科",
                major: "软件工程",
                degree: "本科",
                targetRoles: ["前端开发"],
                cities: ["上海"],
                skills: ["React", "TypeScript"],
                tools: ["Vite"],
                languages: ["JavaScript"],
                internships: [],
                projects: ["校园二手交易平台"],
                strengths: ["工程实现"],
                risks: [],
                keywords: ["React", "TypeScript"]
              }
            })
          }
        }
      ]
    })
  )) as typeof fetch;

const { runOfferCatcherPipelineStream } = await import("./registry.js");

const events = [];
for await (const event of runOfferCatcherPipelineStream(
  "张同学 本科 软件工程 技能 React TypeScript Vite 项目 校园二手交易平台"
)) {
  events.push(event);
}

assert.deepEqual(
  events.map((event) => event.type),
  ["profile_ready", "matches_ready", "optimizer_ready", "coaching_ready", "done"]
);
assert.equal(events[0]?.payload.profile.name, "张同学");
assert.ok(events[1]?.payload.matches.length > 0);
assert.ok(events[2]?.payload.matches[0]?.rewriteExample);
assert.ok(events[3]?.payload.tencentCoaching.resumeReview.actions.length > 0);
assert.equal(events[4]?.payload.model, "qwen-plus");

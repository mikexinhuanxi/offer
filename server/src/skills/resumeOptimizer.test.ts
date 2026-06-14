import assert from "node:assert/strict";
import type { CandidateProfile, JobMatch } from "../types.js";

process.env.OFFER_FAST_RESUME_OPTIMIZER = "true";
process.env.DASHSCOPE_API_KEY = "test-key";

let fetchCalled = false;
globalThis.fetch = (async () => {
  fetchCalled = true;
  throw new Error("fast optimizer should not call model fetch");
}) as typeof fetch;

const { optimizeResume } = await import("./resumeOptimizer.js");

const profile: CandidateProfile = {
  name: "张同学",
  summary: "软件工程本科，目标后台开发。",
  education: "本科",
  major: "软件工程",
  degree: "本科",
  targetRoles: ["后台开发"],
  cities: ["深圳"],
  skills: ["Java", "MySQL"],
  tools: ["Redis"],
  languages: ["Java"],
  internships: [],
  projects: ["招聘匹配系统"],
  strengths: ["工程实现"],
  risks: [],
  keywords: ["后台开发"]
};

const matches: Omit<JobMatch, "rewriteExample">[] = [
  {
    job: {
      id: "job-1",
      company: "腾讯",
      title: "软件开发-后台开发方向",
      city: "深圳",
      type: "实习",
      description: "负责后台服务开发。",
      requirements: "Java MySQL Redis 数据结构",
      bonus: "Docker 云原生",
      link: "https://join.qq.com",
      deadline: ""
    },
    score: 72,
    fitLevel: "匹配",
    screeningProbability: 66,
    breakdown: {
      skills: 70,
      experience: 65,
      keywords: 72,
      location: 86,
      growth: 70
    },
    reasons: ["岗位与 Java、MySQL 有直接交集。"],
    risks: ["项目指标还不够明确。", "JD 关键词 QQ、PCG、BG 在简历中覆盖还不够明确。"],
    missingKeywords: ["Redis", "数据结构", "QQ"],
    resumeActions: ["补充后台接口设计和数据库优化证据。"]
  }
];

const optimized = await optimizeResume("张同学 本科 软件工程 Java MySQL 项目", profile, matches);

assert.equal(fetchCalled, false);
assert.equal(optimized.length, 1);
assert.ok(optimized[0]?.rewriteExample.includes("招聘匹配系统"));
assert.ok(optimized[0]?.resumeActions.length);
assert.ok(optimized[0]?.risks.every((risk) => !/QQ|PCG|BG/.test(risk)));
assert.ok(optimized[0]?.resumeActions.every((action) => !/QQ|PCG|BG/.test(action)));

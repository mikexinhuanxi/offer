import assert from "node:assert/strict";
import type { CandidateProfile, JobMatch, ResumeReview } from "../types.js";
import { buildResumeAudit } from "./resumeAudit.js";

const profile: CandidateProfile = {
  name: "张同学",
  summary: "信息与通信工程硕士，具备 AI Agent 开发和产品实习经历。",
  education: "硕士 信息与通信工程",
  major: "信息与通信工程",
  degree: "硕士",
  targetRoles: ["AI 产品", "Agent 开发"],
  cities: ["深圳"],
  skills: ["Prompt Engineering", "LangChain", "Python"],
  tools: ["Figma"],
  languages: ["Python"],
  internships: ["产品经理实习，协助需求分析和原型设计"],
  projects: ["AI Agent 求职匹配系统", "自媒体内容运营"],
  strengths: ["AI Agent 项目时效性强", "自媒体项目有 200k+ 浏览"],
  risks: ["学校名称缺失"],
  keywords: ["AI Agent", "产品经理"]
};

const match: JobMatch = {
  job: {
    id: "job-1",
    company: "腾讯",
    title: "AI 产品策划",
    city: "深圳",
    type: "校招",
    description: "负责 AI 产品设计。",
    requirements: "PRD 用户研究 数据分析",
    bonus: "大模型应用经验",
    link: "https://join.qq.com",
    deadline: ""
  },
  score: 72,
  fitLevel: "匹配",
  screeningProbability: 66,
  breakdown: { skills: 70, experience: 68, keywords: 72, location: 80, growth: 74 },
  reasons: ["AI Agent 项目与岗位方向相关。"],
  risks: ["产品实习指标不够明确。"],
  missingKeywords: ["用户研究", "数据分析"],
  resumeActions: ["补充 PRD、原型和上线结果。"],
  rewriteExample: "围绕 AI Agent 项目补充产品判断和可验证结果。"
};

const review: ResumeReview = {
  highlights: ["AI Agent 项目时效性强", "自媒体项目有明确数据"],
  issues: ["量化成果覆盖不均", "产品实习表达偏弱"],
  actions: ["补充核心项目的任务完成率和响应速度指标"],
  rewritePrinciples: ["只基于真实经历优化表达"]
};

const resumeText = `
读研专业：信息与通信工程
项目经历：AI Agent 求职匹配系统，基于 LangChain 设计多 Agent 协作流程。
产品经理实习：协助产品经理负责产品功能流程与原型设计。
自媒体项目：累计 200k+ 浏览量，10k+ 点赞收藏。
技能：Prompt Engineering、LangChain、Python、Figma。
`;

const audit = buildResumeAudit(resumeText, profile, [match], review);

assert.equal(audit.totalCount, 7);
assert.equal(audit.checks.length, 7);
assert.equal(audit.checks.find((check) => check.id === "R006")?.status, "建议改进");
assert.ok(audit.checks.find((check) => check.id === "R006")?.detail.includes("协助"));
assert.ok(audit.score > 0);
assert.ok(audit.prioritizedIssues.some((issue) => issue.title.includes("表达")));
assert.ok(audit.nextActions.some((action) => action.includes("量化")));
assert.equal(audit.integrityNote, "建议只基于真实经历补充证据和表达，不编造学校、公司、奖项、项目或数据。");

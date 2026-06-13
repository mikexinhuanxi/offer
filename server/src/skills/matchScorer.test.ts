import assert from "node:assert/strict";
import type { CandidateProfile, RetrievedJob } from "../types.js";
import { buildFallbackMatchesForJobs } from "./matchScorer.js";

const profile: CandidateProfile = {
  summary: "软件工程学生",
  education: "本科",
  major: "软件工程",
  degree: "本科",
  targetRoles: ["前端开发"],
  cities: ["深圳"],
  skills: ["React", "TypeScript"],
  tools: ["Vite"],
  languages: [],
  internships: [],
  projects: ["校园项目"],
  strengths: [],
  risks: [],
  keywords: ["React"]
};

function job(id: string, type: string): RetrievedJob {
  return {
    id,
    company: "腾讯",
    title: `${type}岗位 ${id}`,
    city: "深圳",
    type,
    description: "负责 Web 产品体验",
    requirements: "React TypeScript 工程化",
    bonus: "AI 产品经验",
    link: "https://join.qq.com",
    deadline: "",
    retrievalScore: 4,
    matchedTerms: ["React", "TypeScript"]
  };
}

const matches = buildFallbackMatchesForJobs(profile, [
  ...Array.from({ length: 6 }, (_, index) => job(`intern-${index + 1}`, "实习")),
  ...Array.from({ length: 6 }, (_, index) => job(`campus-${index + 1}`, "校招"))
]);

assert.equal(matches.filter((match) => match.job.type === "实习").length, 5);
assert.equal(matches.filter((match) => match.job.type === "校招").length, 5);
assert.ok(matches.every((match) => match.recommendation?.sourceLabel.includes("join.qq.com")));

const variedMatches = buildFallbackMatchesForJobs(profile, [
  {
    ...job("react-fit", "实习"),
    title: "React 前端开发实习生",
    requirements: "React TypeScript Vite 组件封装",
    bonus: "Web 性能优化",
    matchedTerms: ["React", "TypeScript", "Vite"]
  },
  {
    ...job("java-gap", "实习"),
    title: "Java 后端开发实习生",
    requirements: "Java Spring MySQL 分布式系统",
    bonus: "高并发经验",
    matchedTerms: []
  }
]);

const reactMatch = variedMatches.find((match) => match.job.id === "react-fit");
const javaMatch = variedMatches.find((match) => match.job.id === "java-gap");

assert.ok(reactMatch);
assert.ok(javaMatch);
assert.ok(reactMatch.score > javaMatch.score);
assert.ok(reactMatch.screeningProbability > javaMatch.screeningProbability);
assert.ok(reactMatch.missingKeywords.length < javaMatch.missingKeywords.length);

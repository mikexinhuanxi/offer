import assert from "node:assert/strict";
import type { CandidateProfile, Job } from "../types.js";
import { buildTencentSkillMatches } from "./tencentMatchBuilder.js";

const profile: CandidateProfile = {
  summary: "软件工程学生，目标前端开发。",
  education: "本科",
  major: "软件工程",
  degree: "本科",
  targetRoles: ["前端开发"],
  cities: ["深圳"],
  skills: ["React", "TypeScript"],
  tools: ["Vite"],
  languages: [],
  internships: [],
  projects: ["组件库项目"],
  strengths: [],
  risks: [],
  keywords: ["React"]
};

function job(id: string, title: string, reasons: string[]): Job {
  return {
    id,
    company: "腾讯",
    title,
    city: "深圳",
    type: "实习",
    description: "负责 Web 产品体验和组件建设。",
    requirements: "React TypeScript 前端工程化",
    bonus: "AI 产品经验",
    link: `https://join.qq.com/post_detail.html?postid=${id}`,
    deadline: "",
    skillMatchReasons: reasons
  };
}

const matches = buildTencentSkillMatches(
  profile,
  [
    job("tencent-2", "前端开发实习生 B", ["技能/经历关键词匹配：TypeScript"]),
    job("tencent-1", "前端开发实习生 A", ["技能/经历关键词匹配：React"])
  ],
  "腾讯校招官网 join.qq.com via Tencent Campus Recruit skill"
);

assert.deepEqual(
  matches.map((match) => match.job.id),
  ["tencent-2", "tencent-1"]
);
assert.equal(matches[0]?.score, 0);
assert.equal(matches[0]?.screeningProbability, 0);
assert.deepEqual(matches[0]?.breakdown, {
  skills: 0,
  experience: 0,
  keywords: 0,
  location: 0,
  growth: 0
});
assert.equal(matches[0]?.recommendation?.matchReason, "技能/经历关键词匹配：TypeScript");
assert.ok(matches[0]?.recommendation?.sourceLabel.includes("Tencent Campus Recruit skill"));

const noisyOrgJob: Job = {
  id: "tencent-data",
  company: "腾讯",
  title: "数据分析实习生",
  city: "深圳",
  type: "实习",
  description: "招聘部门：QQ / PCG技术线-AI和大数据平台方向\nBG/组织：PCG平台与内容事业群",
  requirements: "本科以上学历；数学；统计；运筹学；计算机等相关专业；QQ",
  bonus: "有 SQL 或 Python 经验",
  link: "https://join.qq.com/post_detail.html?postid=tencent-data",
  deadline: "",
  skillMatchReasons: []
};

const [noisyOrgMatch] = buildTencentSkillMatches(profile, [noisyOrgJob]);
assert.ok(noisyOrgMatch);
assert.deepEqual(noisyOrgMatch.recommendation?.jdInterpretation.hardRequirements, [
  "本科以上学历",
  "数学",
  "统计",
  "运筹学",
  "计算机等相关专业"
]);
assert.ok(!noisyOrgMatch.missingKeywords.includes("QQ"));
assert.ok(!noisyOrgMatch.missingKeywords.includes("PCG"));
assert.ok(!noisyOrgMatch.missingKeywords.includes("BG"));
assert.ok(noisyOrgMatch.risks.every((risk) => !/QQ|PCG|BG/.test(risk)));

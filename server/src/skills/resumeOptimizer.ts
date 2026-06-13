import { chatJson } from "../modelClient.js";
import { loadTencentResumeGuidance } from "../tencentSkill.js";
import type { CandidateProfile, JobMatch } from "../types.js";

interface ResumeOptimizerOutput {
  optimizations: Array<{
    jobId: string;
    rewriteExample: string;
    resumeActions: string[];
    risks: string[];
  }>;
}

export async function optimizeResume(
  resumeText: string,
  profile: CandidateProfile,
  matches: Omit<JobMatch, "rewriteExample">[],
  jobSource = ""
): Promise<JobMatch[]> {
  if (useFastResumeOptimizer()) {
    return matches.map((match) => ({
      ...match,
      resumeActions: mergeLists(match.resumeActions, buildFastActions(profile, match)),
      risks: mergeLists(match.risks, buildFastRisks(match)),
      rewriteExample: buildFastRewriteExample(profile, match)
    }));
  }

  const topMatches = matches.slice(0, 6);
  const tencentGuidance = jobSource.includes("Tencent Campus Recruit")
    ? await loadTencentResumeGuidance()
    : "";
  const result = await chatJson<ResumeOptimizerOutput>({
    skillName: "简历优化 Skill",
    maxTokens: 2600,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "你是一个简历优化 Skill。你只能基于候选人真实简历和目标岗位提出优化，不要编造学校、公司、奖项或经历。涉及腾讯校招岗位时，遵守真实经历、STAR 表达、院校中性、不夸大、不承诺通过率/录取率/HC/薪酬的边界。只返回 JSON。"
      },
      {
        role: "user",
        content: `请为每个岗位生成简历优化建议，输出格式：
{
  "optimizations": [
    {
      "jobId": "岗位 id",
      "rewriteExample": "一段适合写进简历的项目/经历改写示例，必须基于原简历事实，不超过120字",
      "resumeActions": ["可执行优化动作，最多4条"],
      "risks": ["需要补证据或避免夸大的风险，最多3条"]
    }
  ]
}

候选人画像：
${JSON.stringify(profile, null, 2)}

简历原文：
${resumeText.slice(0, 10000)}

目标岗位：
${JSON.stringify(
  topMatches.map((match) => ({
    id: match.job.id,
    company: match.job.company,
    title: match.job.title,
    requirements: match.job.requirements,
    bonus: match.job.bonus,
    missingKeywords: match.missingKeywords,
    currentActions: match.resumeActions
  })),
  null,
  2
)}

${
  tencentGuidance
    ? `腾讯校招简历优化参考摘录（只吸收原则，不要复述来源）：\n${tencentGuidance}`
    : ""
}`
      }
    ]
  });

  const optimizationMap = new Map(result.optimizations.map((item) => [item.jobId, item]));

  return matches.map((match) => {
    const optimization = optimizationMap.get(match.job.id);
    return {
      ...match,
      resumeActions: mergeLists(match.resumeActions, optimization?.resumeActions),
      risks: mergeLists(match.risks, optimization?.risks),
      rewriteExample:
        optimization?.rewriteExample?.trim() ||
        "建议先补充与该岗位要求直接相关的项目量化结果，再进行定制化改写。"
    };
  });
}

function mergeLists(primary: string[], secondary?: string[]) {
  return Array.from(new Set([...primary, ...(secondary ?? [])].filter(Boolean))).slice(0, 5);
}

function useFastResumeOptimizer() {
  return /^(1|true|yes)$/i.test(process.env.OFFER_FAST_RESUME_OPTIMIZER ?? "");
}

function buildFastActions(profile: CandidateProfile, match: Omit<JobMatch, "rewriteExample">) {
  const project = profile.projects[0] || "核心项目";
  const keywords = match.missingKeywords.slice(0, 3);
  return [
    `把「${project}」改写成背景、动作、结果三段式，突出个人贡献。`,
    keywords.length > 0
      ? `补充与 ${keywords.join("、")} 对应的真实项目证据。`
      : "补充可验证的交付结果，例如效率、规模、覆盖范围或反馈。",
    `围绕「${match.job.title}」前置最相关的技术栈、业务场景和结果。`
  ];
}

function buildFastRisks(match: Omit<JobMatch, "rewriteExample">) {
  const risks = [
    ...match.risks,
    "不要为了贴合 JD 编造未做过的项目、指标或技术细节。"
  ];
  return Array.from(new Set(risks)).slice(0, 3);
}

function buildFastRewriteExample(profile: CandidateProfile, match: Omit<JobMatch, "rewriteExample">) {
  const project = profile.projects[0] || "核心项目";
  const skills = [...profile.skills, ...profile.tools, ...profile.languages].filter(Boolean).slice(0, 4);
  const skillText = skills.length > 0 ? `使用 ${skills.join("、")}` : "围绕岗位要求";
  return `在「${project}」中，${skillText}完成与${match.job.title}相关的模块，补充个人负责动作、关键难点和可验证结果。`;
}

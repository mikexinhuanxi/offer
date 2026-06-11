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

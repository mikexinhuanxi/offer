import { chatJson } from "../modelClient.js";
import type {
  CandidateProfile,
  JobMatch,
  JobRecommendation,
  RetrievedJob,
  ScoreBreakdown
} from "../types.js";

interface MatchScorerOutput {
  matches: Array<{
    jobId: string;
    score: number;
    fitLevel: JobMatch["fitLevel"];
    screeningProbability: number;
    breakdown: ScoreBreakdown;
    reasons: string[];
    risks: string[];
    missingKeywords: string[];
    resumeActions: string[];
  }>;
}

const MAX_MATCHES_PER_CATEGORY = 5;

export async function scoreMatches(
  profile: CandidateProfile,
  jobs: RetrievedJob[],
  jobSource = ""
): Promise<Omit<JobMatch, "rewriteExample">[]> {
  const usesTencentSkill = jobSource.includes("Tencent Campus Recruit");
  let result: MatchScorerOutput;
  try {
    result = await chatJson<MatchScorerOutput>({
      skillName: "匹配评分 Skill",
      maxTokens: 3200,
      temperature: 0.15,
      messages: [
        {
          role: "system",
          content:
            "你是一个岗位匹配评分 Skill。只基于给定候选人画像和岗位库评分，不要编造岗位。只返回 JSON。分数必须可解释、克制，避免所有岗位都高分。screeningProbability 是本产品内部的简历覆盖参考，不代表企业官方通过率、录取率或录用承诺。"
        },
        {
          role: "user",
          content: `请对候选岗位评分，输出格式：
{
      "matches": [
    {
      "jobId": "岗位 id",
      "score": 0-100,
      "fitLevel": "冲刺|匹配|稳妥|不建议",
      "screeningProbability": 0-100,
      "breakdown": {
        "skills": 0-100,
        "experience": 0-100,
        "keywords": 0-100,
        "location": 0-100,
        "growth": 0-100
      },
      "reasons": ["匹配理由，最多3条"],
      "risks": ["短板风险，最多3条"],
      "missingKeywords": ["JD中重要但简历弱覆盖的关键词"],
      "resumeActions": ["针对简历的动作建议，最多3条"]
    }
  ]
}

最多输出 10 个 matches：实习岗位最多 5 个，校招岗位最多 5 个。若某类候选岗位不足 5 个，则输出该类全部候选。必须返回完整、可解析的 JSON，不要添加 Markdown。

候选人画像：
${JSON.stringify(profile, null, 2)}

岗位源：
${jobSource || "本地岗位库"}
${usesTencentSkill ? "这些岗位来自腾讯校招官网公开接口。不要推测薪酬、HC、官方通过率、录取率或竞争比。" : ""}

候选岗位：
${JSON.stringify(
  jobs.map((job) => ({
    id: job.id,
    company: job.company,
    title: job.title,
    city: job.city,
    type: job.type,
    description: job.description,
    requirements: job.requirements,
    bonus: job.bonus,
    retrievalScore: job.retrievalScore,
    matchedTerms: job.matchedTerms
  })),
  null,
  2
)}`
        }
      ]
    });
  } catch {
    return buildFallbackMatchesForJobs(profile, jobs).sort((a, b) => b.score - a.score);
  }

  const jobMap = new Map(jobs.map((job) => [job.id, job]));
  const matches: Omit<JobMatch, "rewriteExample">[] = [];

  for (const match of result.matches) {
    const job = jobMap.get(match.jobId);
    if (!job) {
      continue;
    }
    matches.push({
      job,
      score: clamp(match.score),
      fitLevel: normalizeFitLevel(match.fitLevel),
      screeningProbability: clamp(match.screeningProbability),
      breakdown: normalizeBreakdown(match.breakdown),
      reasons: normalizeList(match.reasons),
      risks: normalizeList(match.risks),
      missingKeywords: normalizeList(match.missingKeywords),
      resumeActions: normalizeList(match.resumeActions),
      recommendation: buildRecommendation(profile, job, match)
    });
  }

  return ensureCategoryCoverage(profile, jobs, matches).sort((a, b) => b.score - a.score);
}

export function buildFallbackMatchesForJobs(profile: CandidateProfile, jobs: RetrievedJob[]) {
  return ensureCategoryCoverage(profile, jobs, []);
}

function clamp(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeBreakdown(value?: Partial<ScoreBreakdown>): ScoreBreakdown {
  return {
    skills: clamp(value?.skills),
    experience: clamp(value?.experience),
    keywords: clamp(value?.keywords),
    location: clamp(value?.location),
    growth: clamp(value?.growth)
  };
}

function normalizeFitLevel(value: unknown): JobMatch["fitLevel"] {
  if (value === "冲刺" || value === "匹配" || value === "稳妥" || value === "不建议") {
    return value;
  }
  return "匹配";
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 5);
}

function ensureCategoryCoverage(
  profile: CandidateProfile,
  jobs: RetrievedJob[],
  matches: Omit<JobMatch, "rewriteExample">[]
) {
  const byId = new Set(matches.map((match) => match.job.id));
  const completed = [...matches];

  for (const category of ["internship", "campus"] as const) {
    const currentCount = completed.filter((match) => getJobCategory(match.job.type) === category).length;
    const needed = MAX_MATCHES_PER_CATEGORY - currentCount;
    if (needed <= 0) {
      continue;
    }

    const fallbackJobs = jobs
      .filter((job) => getJobCategory(job.type) === category && !byId.has(job.id))
      .slice(0, needed);

    for (const job of fallbackJobs) {
      byId.add(job.id);
      completed.push(buildFallbackMatch(profile, job));
    }
  }

  return completed;
}

function buildFallbackMatch(profile: CandidateProfile, job: RetrievedJob): Omit<JobMatch, "rewriteExample"> {
  const signals = buildJobFitSignals(profile, job);
  const score = signals.score;
  const missingKeywords = signals.missingKeywords;
  const resumeActions = [
    `围绕「${job.title}」补充最贴近 JD 的项目职责、技术动作和结果。`,
    missingKeywords.length > 0
      ? `在简历中自然补齐关键词：${missingKeywords.slice(0, 3).join("、")}。`
      : "把项目经历写成可判断的证据：背景、动作、结果和复盘。"
  ];

  const match = {
    jobId: job.id,
    score,
    fitLevel: score >= 82 ? "稳妥" : score >= 70 ? "匹配" : score >= 56 ? "冲刺" : "不建议",
    screeningProbability: signals.screeningProbability,
    breakdown: {
      skills: signals.skillsScore,
      experience: signals.experienceScore,
      keywords: signals.keywordsScore,
      location: signals.locationScore,
      growth: signals.growthScore
    },
    reasons: fallbackReasons(profile, job),
    risks: missingKeywords.length > 0 ? [`简历中对 ${missingKeywords.slice(0, 2).join("、")} 的覆盖还不够明确。`] : [],
    missingKeywords,
    resumeActions
  } satisfies MatchScorerOutput["matches"][number];

  return {
    job,
    score: match.score,
    fitLevel: match.fitLevel,
    screeningProbability: match.screeningProbability,
    breakdown: match.breakdown,
    reasons: normalizeList(match.reasons),
    risks: normalizeList(match.risks),
    missingKeywords: normalizeList(match.missingKeywords),
    resumeActions: normalizeList(match.resumeActions),
    recommendation: buildRecommendation(profile, job, match)
  };
}

function getJobCategory(type: string) {
  const normalized = type.toLowerCase();
  return normalized.includes("实习") || normalized.includes("intern") ? "internship" : "campus";
}

function fallbackReasons(profile: CandidateProfile, job: RetrievedJob) {
  const skills = profile.skills.slice(0, 3);
  const matchedTerms = job.matchedTerms.slice(0, 3);
  return [
    matchedTerms.length > 0
      ? `岗位 JD 与简历关键词 ${matchedTerms.join("、")} 有直接交集。`
      : `岗位方向与${profile.major || "候选人背景"}存在可迁移关系。`,
    skills.length > 0
      ? `可用 ${skills.join("、")} 相关经历支撑岗位要求。`
      : "可以通过项目经历补充岗位要求的具体证据。"
  ];
}

function fallbackMissingKeywords(profile: CandidateProfile, job: RetrievedJob) {
  return buildJobFitSignals(profile, job).missingKeywords;
}

function buildJobFitSignals(profile: CandidateProfile, job: RetrievedJob) {
  const profileTerms = [
    ...profile.targetRoles,
    ...profile.skills,
    ...profile.tools,
    ...profile.keywords,
    profile.major,
    ...profile.projects,
    ...profile.internships
  ].filter(Boolean);
  const jobKeywords = extractJobKeywords(job);
  const matchedKeywords = jobKeywords.filter((keyword) => termMatches(profileTerms, keyword));
  const matchedTermCount = new Set([...matchedKeywords, ...job.matchedTerms]).size;
  const missingKeywords = jobKeywords.filter((keyword) => !termMatches(profileTerms, keyword)).slice(0, 5);
  const keywordRatio = jobKeywords.length > 0 ? matchedKeywords.length / jobKeywords.length : 0;
  const retrievalBoost = Math.min(10, Math.max(0, job.retrievalScore ?? 0) * 2);
  const locationScore =
    profile.cities.length === 0 || profile.cities.some((city) => job.city.includes(city)) ? 86 : 62;
  const skillsScore = clamp(42 + keywordRatio * 46 + Math.min(12, matchedTermCount * 4));
  const keywordsScore = clamp(40 + keywordRatio * 52 + Math.min(8, matchedKeywords.length * 2));
  const experienceScore = clamp(46 + Math.min(18, profile.projects.length * 6 + profile.internships.length * 8) + keywordRatio * 24);
  const growthScore = clamp(64 + Math.min(16, matchedTermCount * 3) + Math.min(8, profile.strengths.length * 2));
  const score = clamp(
    skillsScore * 0.34 +
      keywordsScore * 0.24 +
      experienceScore * 0.18 +
      locationScore * 0.12 +
      growthScore * 0.08 +
      retrievalBoost * 0.04
  );
  const screeningProbability = clamp(score - Math.min(18, missingKeywords.length * 4) + Math.min(8, matchedTermCount * 2));

  return {
    score,
    screeningProbability,
    skillsScore,
    experienceScore,
    keywordsScore,
    locationScore,
    growthScore,
    missingKeywords
  };
}

function extractJobKeywords(job: RetrievedJob) {
  const words = `${job.title} ${job.requirements} ${job.bonus} ${job.description}`
    .split(/[,\s/|，、；;。:：()（）【】\[\]<>《》]+/)
    .map(cleanKeyword)
    .filter((word) => word.length >= 2 && !isGenericKeyword(word));
  return Array.from(new Set(words)).slice(0, 12);
}

function cleanKeyword(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/(实习生|工程师|岗位|方向|经验|能力|相关|优先)$/g, "")
    .trim();
}

function isGenericKeyword(value: string) {
  return [
    "负责",
    "参与",
    "支持",
    "腾讯",
    "实习",
    "校招",
    "开发",
    "产品",
    "平台",
    "系统",
    "业务",
    "团队",
    "工作",
    "要求",
    "具备",
    "熟悉",
    "掌握",
    "良好",
    "优秀",
    "以及",
    "或者",
    "包括",
    "使用"
  ].includes(value);
}

function termMatches(terms: string[], keyword: string) {
  const normalizedKeyword = keyword.toLowerCase();
  return terms.some((term) => {
    const normalizedTerm = term.toLowerCase();
    return normalizedTerm.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedTerm);
  });
}

function buildRecommendation(
  profile: CandidateProfile,
  job: RetrievedJob,
  match: MatchScorerOutput["matches"][number]
): JobRecommendation {
  const reasons = normalizeList(match.reasons).slice(0, 2);
  const direction = inferDirection(job);
  return {
    summary: `${job.title} · ${job.type} · ${job.city}`,
    matchReason:
      reasons.join("；") ||
      `该岗位与候选人的${profile.major || "专业背景"}、${profile.skills.slice(0, 3).join("、") || "项目经历"}有可说明的对应关系。`,
    sourceLabel: "岗位名、招聘类型、工作地、JD 和投递链接均来自腾讯校招官网 join.qq.com。",
    jdInterpretation: {
      hardRequirements: sentenceList(job.requirements, 4),
      softQualities: softQualities(direction, job),
      bonusPoints: sentenceList(job.bonus, 3),
      resumeFocus: normalizeList(match.resumeActions).slice(0, 4),
      interviewPrep: interviewPrep(direction, job, normalizeList(match.missingKeywords))
    }
  };
}

function sentenceList(value: string, limit: number) {
  const cleaned = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return [];
  }
  return cleaned
    .split(/(?:[。；;]|(?:\d+[.、]))/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4)
    .slice(0, limit);
}

function inferDirection(job: RetrievedJob) {
  const text = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
  if (/(后台|后端|服务端|java|go|python|c\+\+|开发|技术|数据库|架构)/i.test(text)) {
    return "技术";
  }
  if (/(算法|机器学习|深度学习|推荐|搜索|nlp|大模型|数据科学|ai)/i.test(text)) {
    return "算法/数据";
  }
  if (/(产品|用户|需求|策略|商业化)/i.test(text)) {
    return "产品";
  }
  if (/(游戏|策划|玩法|关卡|引擎)/i.test(text)) {
    return "游戏";
  }
  if (/(市场|运营|销售|财务|法务|hr|职能)/i.test(text)) {
    return "市场/职能";
  }
  return "通用";
}

function softQualities(direction: string, job: RetrievedJob) {
  const map: Record<string, string[]> = {
    技术: ["计算机基础扎实", "能清楚解释工程取舍", "学习能力和问题拆解能力稳定"],
    "算法/数据": ["能把业务问题抽象为数据/模型问题", "重视实验对比和指标解释", "能复盘误差与边界"],
    产品: ["有用户视角和产品热情", "表达逻辑清晰", "能用数据和案例支撑判断"],
    游戏: ["有深度游戏体验和品类理解", "能把玩法想法落成方案", "重视体验细节"],
    "市场/职能": ["执行细节扎实", "沟通协作稳定", "保持开放学习心态"]
  };
  return map[direction] ?? sentenceList(job.description, 3);
}

function interviewPrep(direction: string, job: RetrievedJob, missingKeywords: string[]) {
  const common = [
    "准备 1-2 个最贴近 JD 的项目，讲清职责、动作、结果和复盘。",
    "围绕 JD 要求准备可追问的真实细节，不要只背简历。"
  ];
  const byDirection: Record<string, string[]> = {
    技术: ["复习数据结构、操作系统、网络、数据库等基础，并准备代码/工程题追问。"],
    "算法/数据": ["准备模型评估、数据处理、实验设计和误差分析相关问题。"],
    产品: ["准备产品案例分析、用户洞察、指标拆解和优先级判断。"],
    游戏: ["准备游戏体验拆解、核心循环、玩法/数值/关卡设计思考。"],
    "市场/职能": ["准备案例分析、情景沟通和过往执行细节复盘。"]
  };
  const gapPrep =
    missingKeywords.length > 0
      ? [`补齐 JD 弱覆盖关键词：${missingKeywords.slice(0, 3).join("、")}。`]
      : [];
  return [...common, ...(byDirection[direction] ?? []), ...gapPrep].slice(0, 5);
}

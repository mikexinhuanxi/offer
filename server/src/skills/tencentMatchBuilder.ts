import type {
  CandidateProfile,
  JdInterpretation,
  Job,
  JobMatch,
  JobRecommendation,
  ScoreBreakdown
} from "../types.js";

const TENCENT_SOURCE_LABEL = "腾讯校招官网 join.qq.com via Tencent Campus Recruit skill";
const EMPTY_BREAKDOWN: ScoreBreakdown = {
  skills: 0,
  experience: 0,
  keywords: 0,
  location: 0,
  growth: 0
};

export function buildTencentSkillMatches(
  profile: CandidateProfile,
  jobs: Partial<Job>[],
  sourceLabel = TENCENT_SOURCE_LABEL
): Omit<JobMatch, "rewriteExample">[] {
  return jobs
    .map((job, index) => normalizeTencentJob(job, index))
    .filter(isJob)
    .slice(0, 5)
    .map((job) => {
      const missingKeywords = buildMissingKeywords(profile, job);
      const reasons = buildReasons(profile, job);
      const resumeActions = buildResumeActions(job, missingKeywords);
      const recommendation = buildRecommendation(job, reasons, sourceLabel);

      return {
        job,
        score: 0,
        fitLevel: "匹配",
        screeningProbability: 0,
        breakdown: { ...EMPTY_BREAKDOWN },
        reasons,
        risks: buildRisks(missingKeywords),
        missingKeywords,
        resumeActions,
        recommendation
      };
    });
}

function normalizeTencentJob(job: Partial<Job>, index: number): Job {
  return {
    id: stringOrFallback(job.id, `tencent-job-${index + 1}`),
    company: stringOrFallback(job.company, "腾讯"),
    title: stringOrFallback(job.title, "腾讯校招岗位"),
    city: stringOrFallback(job.city, "不限"),
    type: stringOrFallback(job.type, "腾讯校招"),
    description: stringOrFallback(job.description, ""),
    requirements: stringOrFallback(job.requirements, ""),
    bonus: stringOrFallback(job.bonus, ""),
    link: stringOrFallback(job.link, ""),
    deadline: stringOrFallback(job.deadline, ""),
    skillMatchReasons: Array.isArray(job.skillMatchReasons) ? job.skillMatchReasons : []
  };
}

function buildReasons(profile: CandidateProfile, job: Job) {
  const skillReasons = (job.skillMatchReasons ?? []).map((item) => item.trim()).filter(Boolean);
  if (skillReasons.length > 0) {
    return skillReasons.slice(0, 2);
  }

  const profileSignals = unique([
    ...profile.skills,
    ...profile.tools,
    ...profile.targetRoles,
    profile.major,
    ...profile.keywords
  ]);
  const jobText = jobToText(job).toLowerCase();
  const matched = profileSignals.filter((signal) => jobText.includes(signal.toLowerCase())).slice(0, 3);

  if (matched.length > 0) {
    return [`简历中的 ${matched.join("、")} 与岗位 JD 存在直接对应。`];
  }
  return ["岗位信息来自腾讯校招官网，可结合你的项目经历进一步判断。"];
}

function buildMissingKeywords(profile: CandidateProfile, job: Job) {
  const profileText = unique([
    ...profile.skills,
    ...profile.tools,
    ...profile.languages,
    ...profile.keywords,
    ...profile.projects,
    ...profile.internships
  ])
    .join(" ")
    .toLowerCase();
  return extractKeywords(job)
    .filter((keyword) => !profileText.includes(keyword.toLowerCase()))
    .slice(0, 5);
}

function buildResumeActions(job: Job, missingKeywords: string[]) {
  return [
    `围绕「${job.title}」补充最贴近 JD 的真实项目背景、个人动作和结果。`,
    missingKeywords.length > 0
      ? `把 ${missingKeywords.slice(0, 3).join("、")} 映射到真实经历或学习实践中。`
      : "用 STAR 结构补齐项目的背景、任务、行动和结果。",
    "不要为了贴合 JD 编造项目、奖项、公司或数据。"
  ];
}

function buildRisks(missingKeywords: string[]) {
  if (missingKeywords.length === 0) {
    return ["简历表达仍需补充可验证结果，方便筛选者快速判断个人贡献。"];
  }
  return [`JD 关键词 ${missingKeywords.slice(0, 3).join("、")} 在简历中覆盖还不够明确。`];
}

function buildRecommendation(job: Job, reasons: string[], sourceLabel: string): JobRecommendation {
  return {
    summary: `${job.title}｜${job.city}｜${job.type}`,
    matchReason: reasons.slice(0, 2).join("；"),
    sourceLabel,
    jdInterpretation: buildJdInterpretation(job)
  };
}

function buildJdInterpretation(job: Job): JdInterpretation {
  return {
    hardRequirements: splitText(job.requirements),
    softQualities: inferSoftQualities(job),
    bonusPoints: splitText(job.bonus),
    resumeFocus: [
      "优先呈现与 JD 要求直接相关的真实项目或实习证据。",
      "技能名后补使用场景，说明你解决的问题和承担的动作。"
    ],
    interviewPrep: [
      "准备 1-2 段最贴近岗位的项目深挖材料。",
      "按岗位方向复盘基础知识、关键决策和改进空间。"
    ]
  };
}

function inferSoftQualities(job: Job) {
  const text = jobToText(job);
  const qualities = [
    text.includes("协作") ? "跨团队沟通协作" : "",
    text.includes("学习") ? "学习能力和开放心态" : "",
    text.includes("用户") || text.includes("产品") ? "用户理解和业务判断" : "",
    text.includes("技术") || text.includes("开发") ? "工程实现和问题拆解" : ""
  ].filter(Boolean);
  return qualities.length > 0 ? qualities.slice(0, 4) : ["结构化表达", "学习能力", "协作意识"];
}

function extractKeywords(job: Job) {
  const text = jobToText(job);
  const englishTerms = text.match(/[A-Za-z][A-Za-z0-9+#.]{1,20}/g) ?? [];
  // 中文要求至少3个字，减少通用虚词
  const chineseTerms = text.match(/[\u4e00-\u9fa5]{3,8}/g) ?? [];
  const allTerms = [...englishTerms, ...chineseTerms];
  const stopWords = new Set([
    "腾讯", "岗位", "负责", "相关", "进行", "具备", "优先", "工作", "项目",
    "能力", "经验", "熟悉", "掌握", "了解", "参与", "协助", "配合", "完成",
    "良好", "优秀", "较强", "一定", "能够", "可以", "需要", "以及", "或者",
    "等", "的", "了", "在", "与", "和", "对", "为", "有", "是", "不",
    "深圳", "总部", "北京", "上海", "广州", "城市", "地点", "实习", "应届",
    "本科", "硕士", "博士", "学历", "学位", "专业", "学校", "大学",
    "软件开发", "数据工程", "运营开发", "方向", "计划", "招聘"
  ]);
  return unique(allTerms)
    .filter((term) => !stopWords.has(term))
    .slice(0, 10);
}

function splitText(text: string) {
  return text
    .split(/[，,、;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^\d{1,2}[\.\、\s]*$/.test(item))
    .slice(0, 5);
}

function jobToText(job: Job) {
  return [job.title, job.city, job.type, job.description, job.requirements, job.bonus].join(" ");
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isJob(job: Job) {
  return `${job.company}${job.title}${job.description}${job.requirements}`.trim().length > 0;
}

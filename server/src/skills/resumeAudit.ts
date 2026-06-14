import type {
  CandidateProfile,
  JobMatch,
  ResumeAudit,
  ResumeAuditCheck,
  ResumeAuditIssue,
  ResumeReview
} from "../types.js";

const INTEGRITY_NOTE = "建议只基于真实经历补充证据和表达，不编造学校、公司、奖项、项目或数据。";
const WEAK_EXPRESSIONS = ["参与了", "协助", "沟通能力强", "学习能力强"];
const QUANTIFIED_RESULT_PATTERN =
  /(\d+(?:\.\d+)?\s*(?:%|％|倍|万|w|W|k|K|人|次|个|条|小时|天|月|\+))|((?:提升|增长|减少|降低|覆盖)[^。；;，,\n]{0,12}\d+)/;

interface CheckDefinition {
  id: string;
  name: string;
  severity: ResumeAuditCheck["severity"];
  passed: boolean;
  detail: string;
  suggestion: string;
}

export function buildResumeAudit(
  resumeText: string,
  profile: CandidateProfile,
  matches: JobMatch[],
  review: ResumeReview
): ResumeAudit {
  const normalizedResume = normalizeText(resumeText);
  const weakExpressions = WEAK_EXPRESSIONS.filter((expression) => normalizedResume.includes(expression));
  const length = Array.from(normalizedResume).length;

  const checkDefinitions = [
    buildEducationCheck(normalizedResume),
    buildProjectCheck(normalizedResume),
    buildSkillCheck(normalizedResume),
    buildStarCheck(normalizedResume),
    buildQuantifiedResultCheck(normalizedResume),
    buildExpressionCheck(weakExpressions, length),
    buildLengthCheck(length)
  ];
  const checks = checkDefinitions.map(toAuditCheck);

  const passedCount = checks.filter((check) => check.status === "通过").length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    score,
    passedCount,
    totalCount: checks.length,
    verdict: buildVerdict(score),
    checks,
    highlights: buildHighlights(profile, matches, review),
    prioritizedIssues: buildIssues(checkDefinitions, review),
    nextActions: buildNextActions(checkDefinitions, review, matches),
    integrityNote: INTEGRITY_NOTE
  };
}

function buildEducationCheck(resumeText: string): CheckDefinition {
  const passed = /(本科|硕士|博士|大专|专业|学院|大学|学校|毕业|读研|学历|教育经历)/.test(resumeText);

  return {
    id: "R001",
    name: "教育背景",
    severity: "error",
    passed,
    detail: passed
      ? "简历原文已呈现教育背景线索。"
      : "教育背景信息不够清晰，筛选者难以快速判断学历、专业或学校信息。",
    suggestion: "补充真实的学校、学历、专业、时间段和相关课程，不编造院校或奖项。"
  };
}

function buildProjectCheck(resumeText: string): CheckDefinition {
  const passed = /项目|系统|平台|应用|作品|产品经理实习|实习经历|项目经历/.test(resumeText);

  return {
    id: "R002",
    name: "项目经历",
    severity: "error",
    passed,
    detail: passed
      ? "简历原文已呈现项目或实习经历线索。"
      : "项目经历不足，缺少能支撑岗位判断的真实案例。",
    suggestion: "选择最贴近目标岗位的真实项目，补充背景、个人动作、技术或产品判断和结果。"
  };
}

function buildSkillCheck(resumeText: string): CheckDefinition {
  const skillTerms = resumeText.match(/[A-Za-z][A-Za-z0-9+#. -]{1,30}|[\u4e00-\u9fa5]{2,12}/g) ?? [];
  const hasSkillSection = /技能|技术栈|工具|语言|熟悉|掌握/.test(resumeText);
  const technicalTerms = skillTerms.filter((term) =>
    (/[A-Za-z]/.test(term) || /设计|开发|分析|原型|数据|模型|工程|产品/.test(term)) &&
    !isNonSkillTerm(term)
  );
  const passed = hasSkillSection && unique(technicalTerms).length >= 3;

  return {
    id: "R003",
    name: "技能列表",
    severity: "warning",
    passed,
    detail: passed
      ? `技能列表已呈现${unique(technicalTerms).slice(0, 4).join("、")}。`
      : "技能呈现偏少，简历原文缺少清晰的技能、工具或语言列表。",
    suggestion: "把技能名和使用场景放在一起，优先补充与目标岗位真实相关的工具、语言和方法。"
  };
}

function buildStarCheck(resumeText: string): CheckDefinition {
  const hasSituation = /项目|实习|业务|用户|场景|背景|系统|平台/.test(resumeText);
  const hasTaskOrAction = /负责|设计|开发|搭建|分析|推进|优化|制定|基于|完成/.test(resumeText);
  const hasResult = QUANTIFIED_RESULT_PATTERN.test(resumeText) || /上线|落地|交付|成果|结果|产出|浏览量|点赞/.test(resumeText);
  const passed = hasSituation && hasTaskOrAction && hasResult;

  return {
    id: "R004",
    name: "STAR 结构",
    severity: "warning",
    passed,
    detail: passed
      ? "已能看到场景、行动和结果线索，可进一步压缩成 STAR 表达。"
      : "经历描述未完整覆盖背景、任务、行动、结果，个人贡献不够好判断。",
    suggestion: "按背景/任务、个人行动、结果三段压缩核心经历，突出你实际承担的部分。"
  };
}

function buildQuantifiedResultCheck(resumeText: string): CheckDefinition {
  const quantifiedSignals = resumeText.match(QUANTIFIED_RESULT_PATTERN) ?? [];
  const passed = quantifiedSignals.length > 0;

  return {
    id: "R005",
    name: "量化成果",
    severity: "suggestion",
    passed,
    detail: quantifiedSignals.length > 0
      ? `已出现 ${quantifiedSignals[0]} 等量化线索。`
      : "缺少百分比、人数、规模、效率提升或覆盖范围等可验证结果。",
    suggestion: "补充量化成果，例如规模、效率、转化、覆盖人数、任务完成率或增长/降低幅度。"
  };
}

function buildExpressionCheck(weakExpressions: string[], length: number): CheckDefinition {
  const hasEnoughContent = length >= 50;
  const passed = hasEnoughContent && weakExpressions.length === 0;

  return {
    id: "R006",
    name: "表达优化",
    severity: "suggestion",
    passed,
    detail: !hasEnoughContent
      ? "内容不足，建议先补充基础经历后再优化表达。"
      : passed
        ? "表达中未发现明显弱动作词，整体可继续强化个人贡献。"
        : `发现「${weakExpressions.join("、")}」，容易弱化个人贡献。`,
    suggestion: "把弱表达替换为真实动作，例如负责拆解需求、设计原型、推动评审、验证效果。"
  };
}

function buildLengthCheck(length: number): CheckDefinition {
  const passed = length >= 200 && length <= 3000;

  return {
    id: "R007",
    name: "篇幅",
    severity: "warning",
    passed,
    detail: passed ? `当前简历文本约 ${length} 字，篇幅适中。` : `当前简历文本约 ${length} 字，不在 200-3000 字建议范围内。`,
    suggestion: length < 200 ? "补充关键项目、实习、技能和结果证据。" : "压缩重复描述，保留与目标岗位最相关的证据。"
  };
}

function toAuditCheck(check: CheckDefinition): ResumeAuditCheck {
  return {
    id: check.id,
    name: check.name,
    status: check.passed ? "通过" : check.severity === "suggestion" ? "建议改进" : "不足",
    severity: check.severity,
    passed: check.passed,
    detail: check.detail
  };
}

function buildHighlights(profile: CandidateProfile, matches: JobMatch[], review: ResumeReview) {
  return unique([
    ...review.highlights,
    ...profile.strengths,
    ...matches.flatMap((match) => match.reasons)
  ]).slice(0, 6);
}

function buildIssues(checks: CheckDefinition[], review: ResumeReview): ResumeAuditIssue[] {
  const failedCheckIssues = checks
    .filter((check) => !check.passed)
    .map((check) => ({
      title: `${check.name}${check.severity === "suggestion" ? "建议改进" : "不足"}`,
      evidence: check.detail,
      suggestion: check.suggestion
    }));

  const reviewIssues = review.issues.map((issue) => ({
    title: issue,
    evidence: `已有简历审阅指出：${issue}。`,
    suggestion: issue.includes("量化") ? "补充量化成果和可验证证据。" : "基于真实经历补充更具体的个人动作和结果。"
  }));

  return uniqueIssues([...failedCheckIssues, ...reviewIssues]).slice(0, 6);
}

function buildNextActions(checks: CheckDefinition[], review: ResumeReview, matches: JobMatch[]) {
  const checkActions = checks.filter((check) => !check.passed).map((check) => check.suggestion);
  const issueActions = review.issues.map((issue) =>
    issue.includes("量化") ? `针对「${issue}」补充量化证据。` : `针对「${issue}」补充真实动作和结果。`
  );
  const matchActions = matches.flatMap((match) => match.resumeActions);

  return unique([...review.actions, ...issueActions, ...checkActions, ...matchActions, INTEGRITY_NOTE]).slice(0, 8);
}

function buildVerdict(score: number) {
  if (score >= 85) {
    return {
      title: "简历基础扎实",
      detail: "可做岗位定制优化，继续补充与目标岗位直接相关的证据。"
    };
  }
  if (score >= 65) {
    return {
      title: "简历具备匹配基础",
      detail: "建议补强证据和表达，让筛选者更快判断个人贡献。"
    };
  }
  return {
    title: "简历信息仍需补全",
    detail: "建议先补核心经历、技能证据和可验证结果。"
  };
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function uniqueIssues(issues: ResumeAuditIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.title}:${issue.suggestion}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const NON_SKILL_PATTERNS = [
  /@/,                          // email address
  /^https?:\/\//i,              // URL
  /\.(com|cn|net|org|edu|io|cc|xyz|top|app)\b/i,  // domain name
  /^\d+$/,                      // pure numbers
  /^[A-Za-z]+\d{3,}$/,         // username like manxinhuanxi123 (letters + 3+ digits)
  /^\d{4,}$/,                   // long digit strings (phone fragments, dates etc.)
  /^(qq|wechat|weixin|phone|tel|email|mail)$/i  // contact field labels
];

function isNonSkillTerm(term: string): boolean {
  const trimmed = term.trim().toLowerCase();
  // Skip single character terms
  if (trimmed.length <= 1) {
    return true;
  }
  return NON_SKILL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

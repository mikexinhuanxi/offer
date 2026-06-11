import type {
  CandidateProfile,
  GroupAndHrPrep,
  InterviewPrep,
  JobMatch,
  JobTailoring,
  MockInterviewQuestion,
  ResumeReview,
  TencentCoaching
} from "../types.js";

export async function generateTencentCoaching(
  _resumeText: string,
  profile: CandidateProfile,
  matches: JobMatch[],
  _jobSource: string
): Promise<TencentCoaching> {
  const topMatches = matches.slice(0, 5);
  return {
    resumeReview: buildResumeReview(profile, topMatches),
    jobTailoring: topMatches.map((match) => buildJobTailoring(profile, match)),
    interviewPrep: topMatches.map((match) => buildInterviewPrep(profile, match)),
    mockInterview: buildMockInterview(profile, topMatches[0]),
    groupAndHrPrep: buildGroupAndHrPrep()
  };
}

function buildResumeReview(profile: CandidateProfile, matches: JobMatch[]): ResumeReview {
  const topMissing = unique(matches.flatMap((match) => match.missingKeywords)).slice(0, 4);
  const strengths = unique([
    ...profile.strengths,
    ...profile.skills.slice(0, 3),
    ...profile.tools.slice(0, 2)
  ]).slice(0, 4);

  return {
    highlights:
      strengths.length > 0
        ? strengths.map((item) => `可以保留并前置呈现：${item}，但要补充具体场景和结果。`)
        : ["已有项目/实习经历可作为主体素材，建议补充职责、动作和结果。"],
    issues: unique([
      ...profile.risks,
      topMissing.length > 0 ? `目标岗位高频关键词覆盖不足：${topMissing.join("、")}。` : "",
      "项目描述如果只写职责，面试官较难判断你的真实贡献。",
      "技能栈需要和使用场景绑定，避免只罗列工具名。"
    ]).slice(0, 4),
    actions: [
      "按 STAR 重写核心项目：背景、任务、动作、结果各保留一句。",
      "把目标岗位 JD 中的关键词映射到真实项目或实习证据里。",
      "每段经历补 1 个可验证结果，例如覆盖范围、效率变化、交付物或用户反馈。",
      "把最贴近腾讯岗位要求的项目放到更靠前的位置。",
      "删除无法在面试中展开证明的空泛形容词。"
    ],
    rewritePrinciples: [
      "只基于真实经历优化表达，不虚构项目、奖项、公司或数据。",
      "先写解决了什么问题，再写你具体做了什么。",
      "技能名后面要跟使用场景，证明你不是只会写关键词。",
      "学校、学历只作为客观背景，重点放在项目、技能、学习能力和岗位匹配证据。"
    ]
  };
}

function buildJobTailoring(profile: CandidateProfile, match: JobMatch): JobTailoring {
  const direction = inferDirection(match);
  const keywords = unique([
    ...match.missingKeywords,
    ...profile.skills,
    ...profile.tools,
    direction
  ]).slice(0, 4);

  return {
    jobId: match.job.id,
    focus: `针对「${match.job.title}」，优先突出${direction}相关的真实项目、技术/业务判断和可验证结果。`,
    keywordStrategy:
      keywords.length > 0
        ? keywords.map((keyword) => `把「${keyword}」绑定到一段真实经历，写清使用场景、动作和结果。`)
        : ["从 JD 中抽取核心能力词，并逐一匹配到真实项目证据。"],
    rewriteExamples: [
      match.rewriteExample,
      buildRewriteExample(profile, match, direction)
    ].filter(Boolean).slice(0, 2),
    evidenceToAdd: unique([
      ...match.risks,
      ...match.missingKeywords.map((keyword) => `补充能证明「${keyword}」的项目细节或学习/实践记录。`),
      "准备面试时可展开的关键决策、取舍和复盘。"
    ]).slice(0, 4)
  };
}

function buildInterviewPrep(profile: CandidateProfile, match: JobMatch): InterviewPrep {
  const direction = inferDirection(match);
  return {
    jobId: match.job.id,
    focusAreas: directionFocus(direction),
    projectDeepDive: [
      "挑 1-2 个最贴近 JD 的项目，准备从目标、职责、关键动作、结果、复盘五步讲清楚。",
      "准备解释为什么采用当时的方案，以及有没有替代方案。",
      "把遇到的难点讲成问题分析过程，而不是只讲最终做法。",
      "准备一段能体现学习速度或协作方式的细节。"
    ],
    knowledgeTopics: knowledgeTopics(direction, match, profile),
    preparationPlan: [
      "用 30 分钟整理目标岗位 JD 的硬性要求和加分项。",
      "用 STAR 梳理两段项目经历，并准备面试官追问版细节。",
      "针对缺口关键词补一页复习笔记或小 demo 证据。",
      "面试前用 3 分钟版本和 8 分钟版本各讲一遍核心项目。"
    ]
  };
}

function buildMockInterview(
  profile: CandidateProfile,
  topMatch?: JobMatch
): MockInterviewQuestion[] {
  const title = topMatch?.job.title || profile.targetRoles[0] || "目标岗位";
  const direction = topMatch ? inferDirection(topMatch) : "岗位";
  const project = profile.projects[0] || "你最有代表性的项目";

  return [
    {
      jobId: topMatch?.job.id,
      type: "项目深挖",
      question: `请用 3 分钟介绍「${project}」，重点讲你的职责、关键决策和结果。`,
      interviewerFocus: "通常会关注你是否真正参与、是否能讲清问题拆解和个人贡献。",
      answerHint: "按背景、任务、动作、结果、复盘组织，不要只复述项目功能。"
    },
    {
      jobId: topMatch?.job.id,
      type: direction === "技术" ? "专业基础" : "岗位理解",
      question: `你认为「${title}」最核心的能力要求是什么？你的经历如何证明？`,
      interviewerFocus: "通常会看你是否理解岗位，而不是只泛泛表达兴趣。",
      answerHint: "先说 2-3 个能力关键词，再分别对应到真实项目或实习证据。"
    },
    {
      jobId: topMatch?.job.id,
      type: "行为面",
      question: "讲一次你遇到明显困难或分歧的经历，你是怎么推进的？",
      interviewerFocus: "通常会关注解决问题方式、协作风格和复盘能力。",
      answerHint: "把冲突或困难讲具体，突出你采取的动作和最后学到的东西。"
    },
    {
      jobId: topMatch?.job.id,
      type: "岗位理解",
      question: "如果加入这个方向，你觉得前 1-2 个月最需要补齐什么？",
      interviewerFocus: "通常会关注自我认知、学习计划和对岗位节奏的理解。",
      answerHint: "承认真实短板，同时给出可执行的补齐计划。"
    },
    {
      jobId: topMatch?.job.id,
      type: "HR面",
      question: "你理想中的工作状态是什么？为什么腾讯和这个岗位适合你？",
      interviewerFocus: "通常会关注意愿适配、稳定性和真实动机。",
      answerHint: "结合岗位内容、团队协作方式和个人成长目标回答，避免只说平台大。"
    }
  ];
}

function buildGroupAndHrPrep(): GroupAndHrPrep {
  return {
    groupInterview: [
      "群面不要执着抢固定角色，面试官更看重实质贡献。",
      "个人陈述先抓关键矛盾，再给结构化观点，避免堆模型名词。",
      "自由讨论中同时体现发言质量和协作表现，能整合他人观点会加分。",
      "有分歧时用事实和目标推进，不要把讨论变成争输赢。",
      "如果被追问，优先补充有信息量的观点，不要直接说没有补充。"
    ],
    hrQuestions: [
      "你理想的工作是什么样的？",
      "你做过最有挑战的事是什么？",
      "你如何快速了解一个陌生领域？",
      "你经历过最大的挫折是什么？",
      "你在团队分歧中通常怎么处理？"
    ],
    answerFrameworks: [
      "动机题：岗位理解 → 个人经历证据 → 未来成长目标。",
      "挑战题：具体情境 → 你的动作 → 结果和复盘。",
      "协作题：分歧是什么 → 如何沟通 → 如何达成共识。",
      "短板题：真实短板 → 已采取行动 → 后续补齐计划。"
    ],
    cautions: [
      "不要伪装人设，前后不一致在面试中很容易被追问出来。",
      "不要编造项目数据，所有细节都要能被继续深挖。",
      "不要评价学校或同学优劣，把表达集中在事实和能力证据上。",
      "不要讨论或猜测薪酬、HC、通过率、录取率等非公开信息。"
    ]
  };
}

function buildRewriteExample(profile: CandidateProfile, match: JobMatch, direction: string) {
  const project = profile.projects[0] || "核心项目";
  const skill = unique([...profile.skills, ...profile.tools])[0] || direction;
  return `围绕${match.job.title}要求，可将「${project}」改写为：基于${skill}完成关键模块/分析任务，明确个人负责范围、解决的问题和可验证结果，并补充复盘。`;
}

function inferDirection(match: JobMatch) {
  const text = `${match.job.title} ${match.job.description} ${match.job.requirements}`.toLowerCase();
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
  return "岗位";
}

function directionFocus(direction: string) {
  const map: Record<string, string[]> = {
    技术: ["计算机基础扎实度", "代码与工程实现能力", "项目问题拆解", "学习能力和技术热情"],
    "算法/数据": ["数学和建模基础", "数据处理与评估指标", "实验设计和复盘", "业务问题抽象能力"],
    产品: ["产品热情和用户洞察", "逻辑分析能力", "数据驱动意识", "跨团队沟通协作"],
    游戏: ["深度游戏体验", "品类和玩法理解", "demo 或引擎实践", "把想法落成方案的能力"],
    "市场/职能": ["执行细节质量", "沟通协调", "开放学习心态", "结构化表达"]
  };
  return map[direction] ?? ["岗位理解", "项目表达", "学习能力", "协作与复盘"];
}

function knowledgeTopics(direction: string, match: JobMatch, profile: CandidateProfile) {
  const base = unique([
    ...match.missingKeywords,
    ...profile.skills,
    ...profile.tools
  ]).slice(0, 3);
  const map: Record<string, string[]> = {
    技术: ["数据结构与算法", "操作系统/网络/数据库基础", "系统设计和工程质量"],
    "算法/数据": ["模型评估指标", "特征/数据处理", "实验对比和误差分析"],
    产品: ["需求分析", "用户研究", "指标拆解和优先级判断"],
    游戏: ["核心循环", "数值/关卡/体验分析", "竞品拆解"],
    "市场/职能": ["业务理解", "案例分析", "情景沟通"]
  };
  return unique([...base, ...(map[direction] ?? ["岗位 JD 关键词", "项目复盘", "行为面案例"])]).slice(0, 5);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

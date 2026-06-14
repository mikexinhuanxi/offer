import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import App from "./App";
import CardSwap, { Card } from "./components/CardSwap";

const sampleAnalysis = {
  profile: {
    summary: "软件工程学生，适合前端和 AI 产品方向。",
    education: "本科",
    major: "软件工程",
    degree: "本科",
    targetRoles: ["前端开发"],
    cities: ["深圳"],
    skills: ["React", "TypeScript"],
    tools: ["Vite"],
    languages: [],
    internships: [],
    projects: [],
    strengths: [],
    risks: [],
    keywords: ["React"]
  },
  matches: [
    {
      job: {
        id: "job-1",
        company: "腾讯",
        title: "前端开发工程师",
        city: "深圳总部 / 北京 / 上海 / 广州",
        type: "实习",
        description: "负责 Web 产品体验。",
        requirements: "React, TypeScript",
        bonus: "AI 产品经验",
        link: "https://join.qq.com",
        deadline: "2026-08-01"
      },
      score: 88,
      fitLevel: "匹配",
      screeningProbability: 76,
      breakdown: { skills: 80, experience: 70, keywords: 85, location: 90, growth: 80 },
      reasons: ["React 项目经历匹配"],
      risks: ["需要补充工程化证据"],
      missingKeywords: ["性能优化"],
      resumeActions: ["补充项目指标"],
      rewriteExample: "将项目经历改写为可量化成果。",
      recommendation: {
        summary: "适合优先投递。",
        matchReason: "React 和 TypeScript 经历与岗位要求一致。",
        sourceLabel: "腾讯官网 JD",
        jdInterpretation: {
          hardRequirements: ["React", "TypeScript"],
          softQualities: ["协作沟通"],
          bonusPoints: ["AI 产品经验"],
          resumeFocus: ["突出前端项目"],
          interviewPrep: ["准备项目深挖"]
        }
      }
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      job: {
        id: `intern-${index + 2}`,
        company: "腾讯",
        title: `前端实习岗位 ${index + 2}`,
        city: "深圳",
        type: "实习",
        description: "负责 Web 产品体验。",
        requirements: "React, TypeScript",
        bonus: "AI 产品经验",
        link: "https://join.qq.com",
        deadline: "2026-08-01"
      },
      score: 80 - index,
      fitLevel: "匹配",
      screeningProbability: 72,
      breakdown: { skills: 80, experience: 70, keywords: 85, location: 90, growth: 80 },
      reasons: ["React 项目经历匹配"],
      risks: ["需要补充工程化证据"],
      missingKeywords: ["性能优化"],
      resumeActions: ["补充项目指标"],
      rewriteExample: "将项目经历改写为可量化成果。",
      recommendation: {
        summary: "适合优先投递。",
        matchReason: `实习岗位 ${index + 2} 与前端经历匹配。`,
        sourceLabel: "腾讯官网 JD",
        jdInterpretation: {
          hardRequirements: ["React", "TypeScript"],
          softQualities: ["协作沟通"],
          bonusPoints: ["AI 产品经验"],
          resumeFocus: ["突出前端项目"],
          interviewPrep: ["准备项目深挖"]
        }
      }
    })),
    {
      job: {
        id: "job-2",
        company: "腾讯",
        title: "后端开发工程师",
        city: "北京",
        type: "校招",
        description: "负责服务端平台能力。",
        requirements: "Java, Spring",
        bonus: "分布式经验",
        link: "https://join.qq.com/campus",
        deadline: "2026-09-01"
      },
      score: 82,
      fitLevel: "匹配",
      screeningProbability: 70,
      breakdown: { skills: 70, experience: 72, keywords: 78, location: 80, growth: 84 },
      reasons: ["项目经历能迁移到后端工程能力"],
      risks: ["需要补充 Java 项目证据"],
      missingKeywords: ["Java", "Spring"],
      resumeActions: ["补充服务端项目"],
      rewriteExample: "将数据处理项目改写为服务端接口与性能优化经验。",
      recommendation: {
        summary: "适合作为校招方向对照投递。",
        matchReason: "工程化经历可迁移，但需要补充后端关键词。",
        sourceLabel: "腾讯官网 JD",
        jdInterpretation: {
          hardRequirements: ["Java", "Spring"],
          softQualities: ["学习能力"],
          bonusPoints: ["分布式经验"],
          resumeFocus: ["突出服务端项目"],
          interviewPrep: ["准备后端基础"]
        }
      }
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      job: {
        id: `campus-${index + 2}`,
        company: "腾讯",
        title: `后端校招岗位 ${index + 2}`,
        city: "北京",
        type: "校招",
        description: "负责服务端平台能力。",
        requirements: "Java, Spring",
        bonus: "分布式经验",
        link: "https://join.qq.com/campus",
        deadline: "2026-09-01"
      },
      score: 78 - index,
      fitLevel: "匹配",
      screeningProbability: 68,
      breakdown: { skills: 70, experience: 72, keywords: 78, location: 80, growth: 84 },
      reasons: ["项目经历能迁移到后端工程能力"],
      risks: ["需要补充 Java 项目证据"],
      missingKeywords: ["Java", "Spring"],
      resumeActions: ["补充服务端项目"],
      rewriteExample: "将数据处理项目改写为服务端接口与性能优化经验。",
      recommendation: {
        summary: "适合作为校招方向对照投递。",
        matchReason: `校招岗位 ${index + 2} 与工程经历匹配。`,
        sourceLabel: "腾讯官网 JD",
        jdInterpretation: {
          hardRequirements: ["Java", "Spring"],
          softQualities: ["学习能力"],
          bonusPoints: ["分布式经验"],
          resumeFocus: ["突出服务端项目"],
          interviewPrep: ["准备后端基础"]
        }
      }
    })),
    {
      job: {
        id: "job-duplicate-old",
        company: "腾讯",
        title: "旧校招占位岗位",
        city: "北京",
        type: "校招",
        description: "负责服务端平台能力。",
        requirements: "Java, Spring",
        bonus: "分布式经验",
        link: "https://join.qq.com/campus",
        deadline: "2026-09-01"
      },
      score: 82,
      fitLevel: "匹配",
      screeningProbability: 70,
      breakdown: { skills: 70, experience: 72, keywords: 78, location: 80, growth: 84 },
      reasons: ["项目经历能迁移到后端工程能力"],
      risks: ["需要补充 Java 项目证据"],
      missingKeywords: ["Java", "Spring"],
      resumeActions: ["补充服务端项目"],
      rewriteExample: "将数据处理项目改写为服务端接口与性能优化经验。",
      recommendation: {
        summary: "适合作为校招方向对照投递。",
        matchReason: "旧占位岗位不会进入前 5 个。",
        sourceLabel: "腾讯官网 JD",
        jdInterpretation: {
          hardRequirements: ["Java", "Spring"],
          softQualities: ["学习能力"],
          bonusPoints: ["分布式经验"],
          resumeFocus: ["突出服务端项目"],
          interviewPrep: ["准备后端基础"]
        }
      }
    }
  ],
  tencentCoaching: {
    resumeAudit: {
      score: 71,
      passedCount: 5,
      totalCount: 7,
      verdict: {
        title: "有投递基础，但证据还可以更强",
        detail: "简历已有可匹配素材，下一步重点是补量化结果、弱表达和岗位关键词证据。"
      },
      checks: [
        { id: "R001", name: "教育背景", status: "通过", severity: "error", passed: true, detail: "有专业、学历或教育背景信息。" },
        { id: "R002", name: "项目经历", status: "通过", severity: "error", passed: true, detail: "包含项目或实践经历描述。" },
        { id: "R003", name: "技能列表", status: "通过", severity: "warning", passed: true, detail: "包含技能、工具或技术栈描述。" },
        { id: "R004", name: "STAR 结构", status: "通过", severity: "warning", passed: true, detail: "项目描述具有 STAR 结构要素。" },
        { id: "R005", name: "量化成果", status: "建议改进", severity: "suggestion", passed: false, detail: "建议添加量化成果。" },
        {
          id: "R006",
          name: "表达优化",
          status: "建议改进",
          severity: "suggestion",
          passed: false,
          detail: "发现可优化表达：「协助」建议明确你的独立贡献。"
        },
        { id: "R007", name: "篇幅", status: "通过", severity: "warning", passed: true, detail: "长度适中。" }
      ],
      highlights: ["项目方向清晰", "AI Agent 项目时效性强"],
      prioritizedIssues: [
        {
          title: "量化成果建议改进",
          evidence: "建议添加量化成果。",
          suggestion: "为每段重点经历补 1 个指标。"
        },
        {
          title: "表达优化建议改进",
          evidence: "发现可优化表达：「协助」建议明确你的独立贡献。",
          suggestion: "把弱表达替换为独立产出、负责范围和被采纳结果。"
        }
      ],
      nextActions: ["补充指标", "把弱表达替换为独立产出。"],
      integrityNote: "建议只基于真实经历补充证据和表达，不编造学校、公司、奖项、项目或数据。"
    },
    resumeReview: {
      highlights: ["项目方向清晰"],
      issues: ["量化不足"],
      actions: ["补充指标"],
      rewritePrinciples: ["真实具体"]
    },
    jobTailoring: [
      {
        jobId: "job-1",
        focus: "突出 React 工程能力。",
        keywordStrategy: ["React", "TypeScript"],
        rewriteExamples: ["负责组件封装并提升复用率。"],
        evidenceToAdd: ["项目指标"]
      }
    ],
    interviewPrep: [
      {
        jobId: "job-1",
        focusAreas: ["项目架构"],
        projectDeepDive: ["组件设计"],
        knowledgeTopics: ["浏览器性能"],
        preparationPlan: ["准备一个完整项目复盘"]
      }
    ],
    mockInterview: [
      {
        type: "项目深挖",
        question: "你如何拆分组件？",
        interviewerFocus: "工程判断",
        answerHint: "说明边界和复用。"
      }
    ],
    groupAndHrPrep: {
      groupInterview: ["先澄清目标"],
      hrQuestions: ["为什么选择腾讯？"],
      answerFrameworks: ["经历-能力-岗位"],
      cautions: ["不夸大经历"]
    }
  },
  trace: [],
  model: "qwen-plus",
  jobSource: "tencent",
  jobCount: 1
};

const uploadedResumeText = `
信息与通信工程硕士
具备 AI Agent 开发、大模型应用与产品设计能力。
技能：Prompt 工程、AI Agent 架构设计、用户需求分析、PRD 撰写、Python、Linux。
`;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/health")) {
      return new Response(JSON.stringify({ ok: true, hasApiKey: true, model: "qwen-plus", baseUrl: "test" }));
    }
    if (url.endsWith("/api/jobs")) {
      return new Response(JSON.stringify({ count: 1, source: "tencent" }));
    }
    if (url.endsWith("/api/analyze")) {
      return new Response(JSON.stringify(sampleAnalysis));
    }
    return new Response("{}", { status: 404 });
  });
});

test("starts on a clean white home screen and enters upload from the CTA", async () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "Offer 捕手" })).toBeInTheDocument();
  expect(screen.queryByText("服务已连接")).not.toBeInTheDocument();
  expect(screen.queryByText("qwen-plus")).not.toBeInTheDocument();
  expect(screen.queryByText("1 个岗位")).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "放入你的简历" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));

  expect(await screen.findByRole("heading", { name: "放入你的简历" })).toBeInTheDocument();
  expect(screen.getByText("上传简历")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "载入样例" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "开始捕获" })).toBeInTheDocument();
  expect(screen.queryByText("粘贴内容")).not.toBeInTheDocument();
  expect(screen.getByText("JD 硬要求")).toBeInTheDocument();
  expect(screen.getByText("简历改写方向")).toBeInTheDocument();
  const swapPreview = screen.getByLabelText("捕获过程预览").querySelector(".card-swap-container");
  expect(swapPreview).toHaveStyle({ width: "780px", height: "500px" });
});

test("shows task tabs in results and switches to resume optimization", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));
  fireEvent.click(await screen.findByRole("button", { name: "载入样例" }));
  fireEvent.click(screen.getByRole("button", { name: "开始捕获" }));

  expect(await screen.findByRole("heading", { name: "推荐结果" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "岗位短名单" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "岗位" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "地点" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "理由" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "缺口" })).toBeInTheDocument();
  expect(screen.getByText("JD / 简历映射")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "放入你的简历" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("捕获过程预览")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "简历评估报告" })).toBeInTheDocument();
  expect(screen.getByText("自动规则检查 + 人工审阅")).toBeInTheDocument();
  expect(screen.getByText("71")).toBeInTheDocument();
  expect(screen.getByText("5/7 通过")).toBeInTheDocument();
  expect(screen.getByText("表达优化")).toBeInTheDocument();
  expect(screen.getByText("发现可优化表达：「协助」建议明确你的独立贡献。")).toBeInTheDocument();
  expect(screen.getByText("建议只基于真实经历补充证据和表达，不编造学校、公司、奖项、项目或数据。")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "推荐岗位" })).toBeInTheDocument();
  const shortlist = screen.getByLabelText("推荐岗位短名单");
  expect(shortlist).toBeInTheDocument();
  expect(within(shortlist).getAllByRole("button")).toHaveLength(5);
  expect(screen.getByRole("button", { name: /前端开发工程师/ })).toHaveAttribute("aria-current", "true");
  expect(screen.queryByRole("button", { name: /前端实习岗位 6/ })).not.toBeInTheDocument();
  expect(screen.queryByText("看右侧详情")).not.toBeInTheDocument();
  expect(screen.getByRole("tablist", { name: "结果内容" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "推荐概览", selected: true })).toBeInTheDocument();
  expect(screen.getAllByText("前端开发工程师").length).toBeGreaterThan(0);
  expect(screen.getAllByText("React 和 TypeScript 经历与岗位要求一致。").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("button", { name: "筛选推荐岗位" }));
  expect(screen.getByRole("checkbox", { name: "深圳总部" })).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "上海" })).toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: "深圳总部 / 北京 / 上海 / 广州" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "校招" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "北京" }));

  expect(screen.getByRole("checkbox", { name: "校招" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "北京" })).toBeChecked();
  expect(within(shortlist).getAllByRole("button")).toHaveLength(5);
  expect(screen.getByRole("button", { name: /后端开发工程师/ })).toHaveAttribute("aria-current", "true");
  expect(screen.queryByRole("button", { name: /后端校招岗位 6/ })).not.toBeInTheDocument();
  expect(screen.getAllByText("工程化经历可迁移，但需要补充后端关键词。").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("checkbox", { name: "校招" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "北京" }));
  expect(screen.getByRole("button", { name: /前端开发工程师/ })).toHaveAttribute("aria-current", "true");

  fireEvent.click(screen.getByRole("tab", { name: "简历优化" }));

  expect(screen.getByRole("tab", { name: "简历优化", selected: true })).toBeInTheDocument();
  expect(screen.getByText("突出 React 工程能力。")).toBeInTheDocument();
  expect(screen.getAllByText("项目方向清晰").length).toBeGreaterThan(0);
});

test("shows an empty state when audit checks are missing", async () => {
  const emptyChecksAnalysis = {
    ...sampleAnalysis,
    tencentCoaching: {
      ...sampleAnalysis.tencentCoaching,
      resumeAudit: {
        ...sampleAnalysis.tencentCoaching.resumeAudit,
        checks: []
      }
    }
  };

  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/health")) {
      return new Response(JSON.stringify({ ok: true, hasApiKey: true, model: "qwen-plus", baseUrl: "test" }));
    }
    if (url.endsWith("/api/jobs")) {
      return new Response(JSON.stringify({ count: 1, source: "tencent" }));
    }
    if (url.endsWith("/api/analyze")) {
      return new Response(JSON.stringify(emptyChecksAnalysis));
    }
    return new Response("{}", { status: 404 });
  });

  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));
  fireEvent.click(await screen.findByRole("button", { name: "载入样例" }));
  fireEvent.click(screen.getByRole("button", { name: "开始捕获" }));

  expect(await screen.findByRole("heading", { name: "简历评估报告" })).toBeInTheDocument();
  const checkTableBlock = screen.getByText("检查明细").closest(".audit-check-table-block");
  expect(checkTableBlock).not.toBeNull();
  expect(within(checkTableBlock as HTMLElement).getByText("暂无")).toBeInTheDocument();
});

test("does not pad filtered shortlist when only one job matches", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));
  fireEvent.click(await screen.findByRole("button", { name: "载入样例" }));
  fireEvent.click(screen.getByRole("button", { name: "开始捕获" }));

  expect(await screen.findByRole("heading", { name: "推荐结果" })).toBeInTheDocument();
  const shortlist = screen.getByLabelText("推荐岗位短名单");

  fireEvent.click(screen.getByRole("button", { name: "筛选推荐岗位" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "实习" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "上海" }));

  expect(within(shortlist).getAllByRole("button")).toHaveLength(1);
  expect(screen.getByRole("button", { name: /前端开发工程师/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /前端实习岗位 2/ })).not.toBeInTheDocument();
});

test("shows screening report after uploaded resume analysis without coaching payload", async () => {
  const uploadedAnalysis = {
    ...sampleAnalysis,
    tencentCoaching: undefined
  };

  vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/health")) {
      return new Response(JSON.stringify({ ok: true, hasApiKey: true, model: "qwen-plus", baseUrl: "test" }));
    }
    if (url.endsWith("/api/jobs")) {
      return new Response(JSON.stringify({ count: 1, source: "tencent" }));
    }
    if (url.endsWith("/api/extract-resume")) {
      return new Response(JSON.stringify({ text: uploadedResumeText }));
    }
    if (url.endsWith("/api/analyze")) {
      return new Response(JSON.stringify(uploadedAnalysis));
    }
    return new Response("{}", { status: 404 });
  });

  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));
  expect(await screen.findByRole("heading", { name: "放入你的简历" })).toBeInTheDocument();
  const input = document.querySelector<HTMLInputElement>(".resume-dropzone input[type='file']");
  expect(input).not.toBeNull();
  const file = new File([uploadedResumeText], "resume.txt", { type: "text/plain" });
  fireEvent.change(input!, { target: { files: [file] } });

  expect(await screen.findByText("resume.txt")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "开始捕获" }));

  expect(await screen.findByRole("heading", { name: "简历评估报告" })).toBeInTheDocument();
  expect(screen.getByText("已有项目、实习或课程经历可作为初筛判断素材。")).toBeInTheDocument();
  expect(screen.getByText("腾讯简历原则")).toBeInTheDocument();
});

test("keeps card swap running when hovering a visible card by default", () => {
  vi.useFakeTimers();
  const clearIntervalSpy = vi.spyOn(window, "clearInterval");

  render(
    <CardSwap delay={4200}>
      <Card>第一张</Card>
      <Card>第二张</Card>
      <Card>第三张</Card>
    </CardSwap>
  );

  clearIntervalSpy.mockClear();
  fireEvent.mouseEnter(screen.getByText("第一张"));

  expect(clearIntervalSpy).not.toHaveBeenCalled();
  vi.useRealTimers();
});

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import App from "./App";

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
        city: "深圳",
        type: "校招",
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
    }
  ],
  tencentCoaching: {
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
  expect(swapPreview).toHaveStyle({ width: "860px", height: "560px" });
});

test("shows task tabs in results and switches to resume optimization", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));
  fireEvent.click(await screen.findByRole("button", { name: "载入样例" }));
  fireEvent.click(screen.getByRole("button", { name: "开始捕获" }));

  expect(await screen.findByRole("heading", { name: "推荐结果" })).toBeInTheDocument();
  expect(screen.getByRole("tablist", { name: "结果内容" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "推荐概览", selected: true })).toBeInTheDocument();
  expect(screen.getAllByText("前端开发工程师").length).toBeGreaterThan(0);
  expect(screen.getAllByText("React 和 TypeScript 经历与岗位要求一致。").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("tab", { name: "简历优化" }));

  expect(screen.getByRole("tab", { name: "简历优化", selected: true })).toBeInTheDocument();
  expect(screen.getByText("突出 React 工程能力。")).toBeInTheDocument();
  expect(screen.getByText("项目方向清晰")).toBeInTheDocument();
});

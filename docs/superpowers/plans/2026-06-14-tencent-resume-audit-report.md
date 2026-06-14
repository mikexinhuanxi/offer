# 腾讯简历评估报告 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按腾讯校招 skill 的“规则检查 + 人工审阅”方式，为结果页实现混合式简历评估报告。

**Architecture:** 后端新增确定性的 `resumeAudit` 构建器，复现腾讯 `resume_checker.py` 的 7 项检查，并把检查结果整理成 UI 友好的结构。前端优先渲染 `tencentCoaching.resumeAudit`，旧响应缺失该字段时保留现有 `resumeReview` 兜底。

**Tech Stack:** TypeScript, React, Vitest, Testing Library, Node `assert`, `tsx`, CSS.

---

## 文件结构

- Create: `server/src/skills/resumeAudit.ts`
  - 负责 7 项规则检查、分数计算、亮点/问题/动作生成。
- Create: `server/src/skills/resumeAudit.test.ts`
  - 用 Node `assert` 验证审阅构建器的确定性输出。
- Modify: `server/src/types.ts`
  - 新增 `ResumeAudit`、`ResumeAuditCheck`、`ResumeAuditIssue` 类型，并挂到 `TencentCoaching`。
- Modify: `server/src/skills/tencentCoach.ts`
  - 在生成 `resumeReview` 后调用 `buildResumeAudit`，把结果放进 `resumeAudit`。
- Modify: `client/src/App.tsx`
  - 扩展前端类型，替换 `ScreeningReport` 展示结构，保留旧响应兜底。
- Modify: `client/src/styles.css`
  - 增加混合式报告布局样式，移动端不横向溢出。
- Modify: `client/src/App.test.tsx`
  - 更新样例数据和断言，覆盖新报告与旧响应兜底。

---

### Task 1: 后端类型与审阅构建器

**Files:**
- Modify: `server/src/types.ts`
- Create: `server/src/skills/resumeAudit.ts`
- Create: `server/src/skills/resumeAudit.test.ts`

- [ ] **Step 1: 写失败测试**

Create `server/src/skills/resumeAudit.test.ts`:

```ts
import assert from "node:assert/strict";
import type { CandidateProfile, JobMatch, ResumeReview } from "../types.js";
import { buildResumeAudit } from "./resumeAudit.js";

const profile: CandidateProfile = {
  name: "张同学",
  summary: "信息与通信工程硕士，具备 AI Agent 开发和产品实习经历。",
  education: "硕士 信息与通信工程",
  major: "信息与通信工程",
  degree: "硕士",
  targetRoles: ["AI 产品", "Agent 开发"],
  cities: ["深圳"],
  skills: ["Prompt Engineering", "LangChain", "Python"],
  tools: ["Figma"],
  languages: ["Python"],
  internships: ["产品经理实习，协助需求分析和原型设计"],
  projects: ["AI Agent 求职匹配系统", "自媒体内容运营"],
  strengths: ["AI Agent 项目时效性强", "自媒体项目有 200k+ 浏览"],
  risks: ["学校名称缺失"],
  keywords: ["AI Agent", "产品经理"]
};

const match: JobMatch = {
  job: {
    id: "job-1",
    company: "腾讯",
    title: "AI 产品策划",
    city: "深圳",
    type: "校招",
    description: "负责 AI 产品设计。",
    requirements: "PRD 用户研究 数据分析",
    bonus: "大模型应用经验",
    link: "https://join.qq.com",
    deadline: ""
  },
  score: 72,
  fitLevel: "匹配",
  screeningProbability: 66,
  breakdown: { skills: 70, experience: 68, keywords: 72, location: 80, growth: 74 },
  reasons: ["AI Agent 项目与岗位方向相关。"],
  risks: ["产品实习指标不够明确。"],
  missingKeywords: ["用户研究", "数据分析"],
  resumeActions: ["补充 PRD、原型和上线结果。"],
  rewriteExample: "围绕 AI Agent 项目补充产品判断和可验证结果。"
};

const review: ResumeReview = {
  highlights: ["AI Agent 项目时效性强", "自媒体项目有明确数据"],
  issues: ["量化成果覆盖不均", "产品实习表达偏弱"],
  actions: ["补充核心项目的任务完成率和响应速度指标"],
  rewritePrinciples: ["只基于真实经历优化表达"]
};

const resumeText = `
读研专业：信息与通信工程
项目经历：AI Agent 求职匹配系统，基于 LangChain 设计多 Agent 协作流程。
产品经理实习：协助产品经理负责产品功能流程与原型设计。
自媒体项目：累计 200k+ 浏览量，10k+ 点赞收藏。
技能：Prompt Engineering、LangChain、Python、Figma。
`;

const audit = buildResumeAudit(resumeText, profile, [match], review);

assert.equal(audit.totalCount, 7);
assert.equal(audit.checks.length, 7);
assert.equal(audit.checks.find((check) => check.id === "R006")?.status, "建议改进");
assert.ok(audit.checks.find((check) => check.id === "R006")?.detail.includes("协助"));
assert.ok(audit.score > 0);
assert.ok(audit.prioritizedIssues.some((issue) => issue.title.includes("表达")));
assert.ok(audit.nextActions.some((action) => action.includes("量化")));
assert.equal(audit.integrityNote, "建议只基于真实经历补充证据和表达，不编造学校、公司、奖项、项目或数据。");
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npx tsx server/src/skills/resumeAudit.test.ts
```

Expected: FAIL with module/type errors because `resumeAudit.ts` and `ResumeAudit` types do not exist.

- [ ] **Step 3: 新增后端类型**

Modify `server/src/types.ts` after `ResumeReview`:

```ts
export interface ResumeAuditCheck {
  id: string;
  name: string;
  status: "通过" | "不足" | "建议改进";
  severity: "error" | "warning" | "suggestion";
  passed: boolean;
  detail: string;
}

export interface ResumeAuditIssue {
  title: string;
  evidence?: string;
  suggestion: string;
}

export interface ResumeAudit {
  score: number;
  passedCount: number;
  totalCount: number;
  verdict: {
    title: string;
    detail: string;
  };
  checks: ResumeAuditCheck[];
  highlights: string[];
  prioritizedIssues: ResumeAuditIssue[];
  nextActions: string[];
  integrityNote: string;
}
```

Modify `TencentCoaching` in `server/src/types.ts`:

```ts
export interface TencentCoaching {
  resumeReview: ResumeReview;
  resumeAudit?: ResumeAudit;
  jobTailoring: JobTailoring[];
  interviewPrep: InterviewPrep[];
  mockInterview: MockInterviewQuestion[];
  groupAndHrPrep: GroupAndHrPrep;
}
```

- [ ] **Step 4: 实现审阅构建器**

Create `server/src/skills/resumeAudit.ts`:

```ts
import type { CandidateProfile, JobMatch, ResumeAudit, ResumeAuditCheck, ResumeReview } from "../types.js";

const integrityNote = "建议只基于真实经历补充证据和表达，不编造学校、公司、奖项、项目或数据。";

export function buildResumeAudit(
  resumeText: string,
  profile: CandidateProfile,
  matches: JobMatch[],
  review: ResumeReview
): ResumeAudit {
  const checks = runChecks(resumeText);
  const passedCount = checks.filter((check) => check.passed).length;
  const totalCount = checks.length;
  const score = Math.round((passedCount / totalCount) * 100);

  return {
    score,
    passedCount,
    totalCount,
    verdict: buildVerdict(score, checks),
    checks,
    highlights: buildHighlights(profile, review),
    prioritizedIssues: buildIssues(checks, profile, matches, review),
    nextActions: buildNextActions(checks, matches, review),
    integrityNote
  };
}

function runChecks(text: string): ResumeAuditCheck[] {
  return [
    checkEducation(text),
    checkProject(text),
    checkSkills(text),
    checkStar(text),
    checkQuantified(text),
    checkWeakVerbs(text),
    checkLength(text)
  ];
}

function checkEducation(text: string): ResumeAuditCheck {
  const found = ["大学", "学院", "本科", "硕士", "博士", "学士", "研究生", "毕业", "专业", "GPA", "学历"].some((keyword) =>
    text.includes(keyword)
  );
  return buildCheck("R001", "教育背景", "error", found, found ? "有专业、学历或教育背景信息。" : "未检测到教育背景，建议补充学校、专业、学历和毕业时间。");
}

function checkProject(text: string): ResumeAuditCheck {
  const count = ["项目", "开发", "设计", "实现", "负责", "参与", "搭建", "研发", "完成"].filter((keyword) => text.includes(keyword)).length;
  return buildCheck("R002", "项目经历", "error", count >= 2, count >= 2 ? "包含项目或实践经历描述。" : "项目经历不够突出，建议用 STAR 法则详细描述 2-3 个核心项目。");
}

function checkSkills(text: string): ResumeAuditCheck {
  const found = ["技能", "熟悉", "精通", "掌握", "熟练", "了解", "技术栈", "工具", "语言"].some((keyword) => text.includes(keyword));
  return buildCheck("R003", "技能列表", "warning", found, found ? "包含技能、工具或技术栈描述。" : "建议添加技能列表，明确列出掌握的技术、工具或方法。");
}

function checkStar(text: string): ResumeAuditCheck {
  const hasSituation = ["背景", "问题", "需求", "面临", "挑战", "场景", "痛点"].some((keyword) => text.includes(keyword));
  const hasAction = ["设计", "实现", "开发", "优化", "搭建", "采用", "使用", "通过"].some((keyword) => text.includes(keyword));
  const hasResult = ["提升", "增长", "降低", "减少", "达到", "实现了", "效果", "%", "倍"].some((keyword) => text.includes(keyword));
  const score = [hasSituation, hasAction, hasResult].filter(Boolean).length;
  const detail = score >= 3 ? "项目描述具有 STAR 结构要素。" : score >= 2 ? "部分使用 STAR 结构，建议补充缺失的情境、行动或结果。" : "建议按情境、任务、行动、结果重写核心项目。";
  return buildCheck("R004", "STAR 结构", "warning", score >= 2, detail);
}

function checkQuantified(text: string): ResumeAuditCheck {
  const patterns = [/\d+%/, /\d+倍/, /\d+万/, /\d+人/, /提升\d+/, /增长\d+/, /减少\d+/, /降低\d+/, /覆盖\d+/];
  const found = patterns.some((pattern) => pattern.test(text));
  return buildCheck("R005", "量化成果", "suggestion", found, found ? "包含可量化数据。" : "建议添加量化成果，例如提升比例、覆盖规模、用户反馈或交付数量。");
}

function checkWeakVerbs(text: string): ResumeAuditCheck {
  const weakPatterns: Record<string, string> = {
    "参与了": "建议改为具体职责，例如负责某模块的设计、分析或交付。",
    协助: "建议明确你的独立贡献和可验证产出。",
    沟通能力强: "建议用具体协作事例佐证。",
    学习能力强: "建议用具体学习经历或项目迁移能力佐证。"
  };
  const issues = Object.entries(weakPatterns)
    .filter(([pattern]) => text.includes(pattern))
    .map(([pattern, suggestion]) => `「${pattern}」${suggestion}`);
  return buildCheck("R006", "表达优化", "suggestion", issues.length === 0, issues.length === 0 ? "未发现常见弱表达。" : `发现可优化表达：${issues.join("；")}`);
}

function checkLength(text: string): ResumeAuditCheck {
  const length = text.length;
  if (length < 200) {
    return buildCheck("R007", "篇幅", "warning", false, `内容偏少（${length}字），建议补充更多项目、实习或成果证据。`);
  }
  if (length > 3000) {
    return buildCheck("R007", "篇幅", "warning", false, `内容偏长（${length}字），建议精简到一页核心内容。`);
  }
  return buildCheck("R007", "篇幅", "warning", true, `长度适中（${length}字）。`);
}

function buildCheck(
  id: string,
  name: string,
  severity: ResumeAuditCheck["severity"],
  passed: boolean,
  detail: string
): ResumeAuditCheck {
  return {
    id,
    name,
    severity,
    passed,
    status: passed ? "通过" : severity === "suggestion" ? "建议改进" : "不足",
    detail
  };
}

function buildVerdict(score: number, checks: ResumeAuditCheck[]) {
  const hasError = checks.some((check) => !check.passed && check.severity === "error");
  if (hasError || score < 60) {
    return {
      title: "需要先补齐基础信息",
      detail: "当前简历还缺少影响初筛判断的基础证据，建议先补教育背景、项目职责和技能使用场景。"
    };
  }
  if (score < 85) {
    return {
      title: "有投递基础，但证据还可以更强",
      detail: "简历已有可匹配素材，下一步重点是补量化结果、弱表达和岗位关键词证据。"
    };
  }
  return {
    title: "具备较清晰的初筛判断基础",
    detail: "简历结构和证据较完整，建议继续围绕目标岗位调整重点和表达顺序。"
  };
}

function buildHighlights(profile: CandidateProfile, review: ResumeReview) {
  return unique([...review.highlights, ...profile.strengths, ...profile.projects.slice(0, 2), ...profile.skills.slice(0, 2)]).slice(0, 4);
}

function buildIssues(
  checks: ResumeAuditCheck[],
  profile: CandidateProfile,
  matches: JobMatch[],
  review: ResumeReview
) {
  const failed = checks
    .filter((check) => !check.passed)
    .map((check) => ({
      title: `${check.name}${check.status === "不足" ? "不足" : "建议改进"}`,
      evidence: check.detail,
      suggestion: suggestionForCheck(check)
    }));
  const risks = unique([...profile.risks, ...review.issues, ...matches.flatMap((match) => match.risks)])
    .slice(0, 3)
    .map((risk) => ({
      title: risk,
      suggestion: "补充真实证据、项目细节或可验证结果，让筛选者能快速判断你的贡献。"
    }));
  return [...failed, ...risks].slice(0, 5);
}

function suggestionForCheck(check: ResumeAuditCheck) {
  const suggestions: Record<string, string> = {
    R001: "补充学校、专业、学历、入学和预计毕业时间。",
    R002: "选择 2-3 个核心项目，按背景、职责、动作、结果重写。",
    R003: "把技能按目标岗位排序，并补充每项技能的使用场景。",
    R004: "给核心项目补充问题背景、个人动作和结果复盘。",
    R005: "为每段重点经历补 1 个指标，例如效率、规模、覆盖范围或反馈。",
    R006: "把弱表达替换为独立产出、负责范围和被采纳结果。",
    R007: "控制一页篇幅，保留与目标岗位最相关的经历。"
  };
  return suggestions[check.id] ?? "补充更具体的真实经历证据。";
}

function buildNextActions(checks: ResumeAuditCheck[], matches: JobMatch[], review: ResumeReview) {
  const failedActions = checks.filter((check) => !check.passed).map(suggestionForCheck);
  const matchActions = matches.flatMap((match) => match.resumeActions).slice(0, 3);
  return unique([...failedActions, ...review.actions, ...matchActions, integrityNote]).slice(0, 5);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
```

- [ ] **Step 5: 运行后端审阅测试**

Run:

```bash
npx tsx server/src/skills/resumeAudit.test.ts
```

Expected: PASS with no output.

- [ ] **Step 6: 提交后端构建器**

Run:

```bash
git add server/src/types.ts server/src/skills/resumeAudit.ts server/src/skills/resumeAudit.test.ts
git commit -m "feat: add deterministic resume audit builder"
```

---

### Task 2: 后端接入腾讯辅导响应

**Files:**
- Modify: `server/src/skills/tencentCoach.ts`
- Test: `server/src/skills/resumeAudit.test.ts`

- [ ] **Step 1: 写接入断言**

Append to `server/src/skills/resumeAudit.test.ts`:

```ts
const { generateTencentCoaching } = await import("./tencentCoach.js");
const coaching = await generateTencentCoaching(resumeText, profile, [match], "Tencent Campus Recruit");

assert.equal(coaching.resumeAudit?.totalCount, 7);
assert.ok(coaching.resumeAudit?.checks.some((check) => check.name === "表达优化"));
assert.ok(coaching.resumeAudit?.integrityNote.includes("不编造"));
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
npx tsx server/src/skills/resumeAudit.test.ts
```

Expected: FAIL because `generateTencentCoaching` does not yet populate `resumeAudit`.

- [ ] **Step 3: 接入 `buildResumeAudit`**

Modify imports at the top of `server/src/skills/tencentCoach.ts`:

```ts
import { buildResumeAudit } from "./resumeAudit.js";
```

Modify `generateTencentCoaching`:

```ts
export async function generateTencentCoaching(
  resumeText: string,
  profile: CandidateProfile,
  matches: JobMatch[],
  _jobSource: string
): Promise<TencentCoaching> {
  const topMatches = matches.slice(0, 5);
  const resumeReview = buildResumeReview(profile, topMatches);
  return {
    resumeReview,
    resumeAudit: buildResumeAudit(resumeText, profile, topMatches, resumeReview),
    jobTailoring: topMatches.map((match) => buildJobTailoring(profile, match)),
    interviewPrep: topMatches.map((match) => buildInterviewPrep(profile, match)),
    mockInterview: buildMockInterview(profile, topMatches[0]),
    groupAndHrPrep: buildGroupAndHrPrep()
  };
}
```

- [ ] **Step 4: 运行后端测试和构建**

Run:

```bash
npx tsx server/src/skills/resumeAudit.test.ts
npm run build -w server
```

Expected: both commands PASS.

- [ ] **Step 5: 提交后端接入**

Run:

```bash
git add server/src/skills/tencentCoach.ts server/src/skills/resumeAudit.test.ts
git commit -m "feat: include resume audit in tencent coaching"
```

---

### Task 3: 前端类型、报告渲染与测试

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/App.test.tsx`

- [ ] **Step 1: 更新前端测试样例**

Modify `sampleAnalysis.tencentCoaching` in `client/src/App.test.tsx` to include `resumeAudit` before `resumeReview`:

```ts
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
        { id: "R006", name: "表达优化", status: "建议改进", severity: "suggestion", passed: false, detail: "发现可优化表达：「协助」建议明确你的独立贡献。" },
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
```

Update the `shows task tabs...` assertions:

```ts
  expect(screen.getByRole("heading", { name: "简历评估报告" })).toBeInTheDocument();
  expect(screen.getByText("自动规则检查 + 人工审阅")).toBeInTheDocument();
  expect(screen.getByText("71")).toBeInTheDocument();
  expect(screen.getByText("5/7 通过")).toBeInTheDocument();
  expect(screen.getByText("表达优化")).toBeInTheDocument();
  expect(screen.getByText("发现可优化表达：「协助」建议明确你的独立贡献。")).toBeInTheDocument();
  expect(screen.getByText("建议只基于真实经历补充证据和表达，不编造学校、公司、奖项、项目或数据。")).toBeInTheDocument();
```

Update the old-response fallback test assertions:

```ts
  expect(await screen.findByRole("heading", { name: "简历评估报告" })).toBeInTheDocument();
  expect(screen.getByText("已有项目、实习或课程经历可作为初筛判断素材。")).toBeInTheDocument();
  expect(screen.getByText("腾讯简历原则")).toBeInTheDocument();
```

- [ ] **Step 2: 运行前端测试并确认失败**

Run:

```bash
npm run test -w client -- App.test.tsx
```

Expected: FAIL because frontend types and report UI do not yet support `resumeAudit`.

- [ ] **Step 3: 增加前端类型**

Modify `client/src/App.tsx` after `ResumeReview`:

```ts
interface ResumeAuditCheck {
  id: string;
  name: string;
  status: "通过" | "不足" | "建议改进";
  severity: "error" | "warning" | "suggestion";
  passed: boolean;
  detail: string;
}

interface ResumeAuditIssue {
  title: string;
  evidence?: string;
  suggestion: string;
}

interface ResumeAudit {
  score: number;
  passedCount: number;
  totalCount: number;
  verdict: {
    title: string;
    detail: string;
  };
  checks: ResumeAuditCheck[];
  highlights: string[];
  prioritizedIssues: ResumeAuditIssue[];
  nextActions: string[];
  integrityNote: string;
}
```

Modify `TencentCoaching`:

```ts
interface TencentCoaching {
  resumeReview: ResumeReview;
  resumeAudit?: ResumeAudit;
  jobTailoring: JobTailoring[];
  interviewPrep: InterviewPrep[];
  mockInterview: MockInterviewQuestion[];
  groupAndHrPrep: GroupAndHrPrep;
}
```

- [ ] **Step 4: 替换 `ScreeningReport` JSX**

Replace the current `ScreeningReport` implementation in `client/src/App.tsx` with:

```tsx
function ScreeningReport({ analysis }: { analysis: AnalysisResponse }) {
  const review = analysis.tencentCoaching?.resumeReview;
  const audit = analysis.tencentCoaching?.resumeAudit;
  const topMatches = analysis.matches.slice(0, 5);
  const fallbackHighlights = normalizeReportItems(review?.highlights, [
    "已有项目、实习或课程经历可作为初筛判断素材。"
  ]);
  const fallbackIssues = normalizeReportItems(
    [
      ...(review?.issues ?? []),
      ...topMatches.flatMap((match) => match.risks)
    ],
    ["简历需要补充更清晰的岗位关键词、个人动作和可验证结果。"]
  );
  const fallbackActions = normalizeReportItems(review?.actions, [
    "按 STAR 梳理最核心项目，写清背景、任务、动作和结果。",
    "把目标岗位 JD 关键词映射到真实项目或实习证据里。"
  ]);
  const fallbackPrinciples = normalizeReportItems(review?.rewritePrinciples, [
    "只基于真实经历优化表达，不编造项目、奖项、公司或数据。"
  ]);
  const verdict = audit?.verdict ?? buildScreeningVerdict(fallbackIssues.length, fallbackHighlights.length, topMatches.length);

  if (!audit) {
    return (
      <section className="screening-report" aria-label="简历评估报告">
        <div className="screening-report-head">
          <span>Tencent resume check</span>
          <h2>简历评估报告</h2>
          <p>先看简历是否能被筛选者快速判断，再决定投哪些岗位和怎么改表达。</p>
        </div>
        <div className="screening-verdict">
          <span>初筛判断</span>
          <strong>{verdict.title}</strong>
          <p>{verdict.detail}</p>
        </div>
        <div className="screening-grid">
          <ReportBlock title="可保留亮点" items={fallbackHighlights} />
          <ReportBlock title="初筛风险" items={fallbackIssues} warn />
          <ReportBlock title="优先修改" items={fallbackActions} />
          <ReportBlock title="腾讯简历原则" items={fallbackPrinciples} />
        </div>
      </section>
    );
  }

  return (
    <section className="screening-report audit-report" aria-label="简历评估报告">
      <div className="audit-report-top">
        <div className="screening-report-head">
          <span>Tencent resume check</span>
          <h2>简历评估报告</h2>
          <p>自动规则检查 + 人工审阅</p>
        </div>
        <div className="audit-score-card" aria-label="简历规则检查得分">
          <strong>{audit.score}</strong>
          <span>/100</span>
          <p>{audit.passedCount}/{audit.totalCount} 通过</p>
        </div>
      </div>

      <div className="screening-verdict audit-verdict">
        <span>综合判断</span>
        <strong>{verdict.title}</strong>
        <p>{verdict.detail}</p>
      </div>

      <div className="audit-check-meter" aria-label="规则通过情况">
        {audit.checks.map((check) => (
          <span key={check.id} className={`audit-meter-segment ${check.passed ? "passed" : check.severity}`} />
        ))}
      </div>

      <div className="audit-layout">
        <AuditCheckTable checks={audit.checks} />
        <div className="audit-review-stack">
          <AuditList title="亮点" items={audit.highlights} />
          <PriorityIssueList issues={audit.prioritizedIssues} />
          <AuditList title="下一步修改" items={audit.nextActions} ordered />
        </div>
      </div>

      <p className="audit-integrity-note">{audit.integrityNote}</p>
    </section>
  );
}
```

- [ ] **Step 5: 增加报告子组件**

Add below `ScreeningReport` in `client/src/App.tsx`:

```tsx
function AuditCheckTable({ checks }: { checks: ResumeAuditCheck[] }) {
  return (
    <div className="audit-check-table">
      <div className="audit-check-row audit-check-head">
        <span>检查项</span>
        <span>结果</span>
        <span>说明</span>
      </div>
      {checks.map((check) => (
        <div className="audit-check-row" key={check.id}>
          <strong>{check.name}</strong>
          <span className={`audit-status ${check.passed ? "passed" : check.severity}`}>{check.status}</span>
          <p>{check.detail}</p>
        </div>
      ))}
    </div>
  );
}

function AuditList({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <section className="audit-review-panel">
      <strong>{title}</strong>
      <Tag>
        {items.length > 0 ? items.slice(0, 5).map((item) => <li key={item}>{item}</li>) : <li>暂无</li>}
      </Tag>
    </section>
  );
}

function PriorityIssueList({ issues }: { issues: ResumeAuditIssue[] }) {
  return (
    <section className="audit-review-panel warn">
      <strong>需要优先改</strong>
      <ol>
        {issues.length > 0 ? (
          issues.slice(0, 5).map((issue) => (
            <li key={`${issue.title}-${issue.suggestion}`}>
              <span>{issue.title}</span>
              {issue.evidence ? <em>{issue.evidence}</em> : null}
              <p>{issue.suggestion}</p>
            </li>
          ))
        ) : (
          <li>暂无明显优先风险，建议继续按目标岗位调整表达。</li>
        )}
      </ol>
    </section>
  );
}
```

- [ ] **Step 6: 运行前端测试**

Run:

```bash
npm run test -w client -- App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: 提交前端结构**

Run:

```bash
git add client/src/App.tsx client/src/App.test.tsx
git commit -m "feat: render tencent resume audit report"
```

---

### Task 4: 报告样式、构建验证与浏览器检查

**Files:**
- Modify: `client/src/styles.css`
- Verify: `client/src/App.tsx`, `server/src/skills/resumeAudit.ts`

- [ ] **Step 1: 添加报告样式**

Append near existing `.screening-report` styles in `client/src/styles.css`:

```css
.audit-report {
  display: grid;
  gap: 18px;
}

.audit-report-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
}

.audit-score-card {
  min-width: 132px;
  padding: 16px;
  border-radius: 16px;
  background: #111827;
  color: #ffffff;
  text-align: center;
}

.audit-score-card strong {
  display: block;
  font-size: 40px;
  line-height: 1;
}

.audit-score-card span {
  color: #d1d5db;
  font-size: 14px;
}

.audit-score-card p {
  margin: 8px 0 0;
  color: #e5e7eb;
  font-size: 13px;
}

.audit-check-meter {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.audit-meter-segment {
  height: 8px;
  border-radius: 999px;
  background: #f59e0b;
}

.audit-meter-segment.passed {
  background: #22c55e;
}

.audit-meter-segment.error {
  background: #ef4444;
}

.audit-meter-segment.warning,
.audit-meter-segment.suggestion {
  background: #f59e0b;
}

.audit-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 18px;
}

.audit-check-table,
.audit-review-panel {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
}

.audit-check-row {
  display: grid;
  grid-template-columns: minmax(84px, 0.8fr) minmax(72px, 0.55fr) minmax(0, 1.8fr);
  gap: 12px;
  align-items: start;
  padding: 12px 14px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.audit-check-row:first-child {
  border-top: 0;
}

.audit-check-head {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.audit-check-row strong {
  color: #0f172a;
}

.audit-check-row p {
  margin: 0;
  color: #475569;
  line-height: 1.55;
}

.audit-status {
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  background: #fff7ed;
  color: #b45309;
  font-size: 12px;
  font-weight: 700;
}

.audit-status.passed {
  background: #ecfdf5;
  color: #15803d;
}

.audit-status.error {
  background: #fef2f2;
  color: #b91c1c;
}

.audit-review-stack {
  display: grid;
  gap: 12px;
}

.audit-review-panel {
  padding: 14px 16px;
}

.audit-review-panel strong {
  display: block;
  margin-bottom: 10px;
  color: #0f172a;
}

.audit-review-panel ul,
.audit-review-panel ol {
  margin: 0;
  padding-left: 20px;
  color: #334155;
}

.audit-review-panel li + li {
  margin-top: 8px;
}

.audit-review-panel em {
  display: block;
  margin-top: 4px;
  color: #92400e;
  font-style: normal;
  font-size: 13px;
}

.audit-review-panel p {
  margin: 4px 0 0;
  color: #475569;
}

.audit-review-panel.warn {
  border-color: rgba(245, 158, 11, 0.32);
  background: rgba(255, 251, 235, 0.72);
}

.audit-integrity-note {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid rgba(59, 130, 246, 0.22);
  border-radius: 14px;
  background: rgba(239, 246, 255, 0.8);
  color: #1e3a8a;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .audit-report-top,
  .audit-layout {
    grid-template-columns: 1fr;
  }

  .audit-score-card {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .audit-check-row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: 运行完整验证**

Run:

```bash
npx tsx server/src/skills/resumeAudit.test.ts
npm run test -w client -- App.test.tsx
npm run build
```

Expected: all commands PASS.

- [ ] **Step 3: 启动本地服务**

Run:

```bash
npm run dev
```

Expected: terminal shows frontend and backend localhost URLs. Keep the session running for browser verification.

- [ ] **Step 4: 浏览器验证**

Open `http://127.0.0.1:5173` in the in-app browser.

Manual checks:

- Home page loads.
- Click `开始捕捉 Offer`.
- Click `载入样例`.
- Click `开始捕获`.
- Results page shows `简历评估报告`.
- Score block, `5/7 通过`, seven rule checks, `需要优先改`, `下一步修改`, and integrity note are visible.
- Resize or inspect a narrow viewport; rule rows stack vertically without horizontal overflow.

- [ ] **Step 5: 停止本地服务**

Stop the dev server with Ctrl-C in its terminal session.

- [ ] **Step 6: 提交样式和验证收尾**

Run:

```bash
git add client/src/styles.css
git commit -m "style: polish resume audit report layout"
```

---

## 自检清单

- 设计文档中的 7 项腾讯规则由 Task 1 覆盖。
- `resumeAudit` 数据模型由 Task 1 覆盖。
- 后端接入 `TencentCoaching` 由 Task 2 覆盖。
- 前端混合式审阅报告由 Task 3 覆盖。
- 移动端布局和视觉样式由 Task 4 覆盖。
- 旧响应兜底由 Task 3 覆盖。
- 没有新增模型调用，后端构建器是确定性逻辑。
- 没有对学校或学历做价值判断。

# 推荐结果后简历优化工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将结果页“简历优化”Tab 改成左侧诊断依据、右侧立即修改的岗位联动工作台。

**Architecture:** 复用现有 `resumeAudit`、`resumeReview`、`matches` 和 `selectedMatch` 数据，不新增后端模型调用。前端在 `client/src/App.tsx` 中新增聚焦组件 `ResumeOptimizationWorkbench`，让左列展示全局诊断，右列展示当前岗位的关键词、侧重、动作和改写示例。样式继续放在 `client/src/styles.css`，测试覆盖渲染、岗位切换和旧数据兜底。

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, CSS.

---

## 文件结构

- Modify: `client/src/App.tsx`
  - 用 `ResumeOptimizationWorkbench` 替换当前“简历优化”Tab 里的两个普通 `CoachSection`。
  - 新增小组件：`ResumeDiagnosticPanel`、`ResumeActionPanel`、`KeywordPillList`、`RewriteComparison`。
  - 复用现有 `AuditCheckTable`、`PriorityIssueList`、`AuditList`、`JobTailoringPanel` 的数据来源或展示逻辑。
- Modify: `client/src/styles.css`
  - 新增 `.resume-workbench`、`.resume-workbench-grid`、`.resume-diagnostic-panel`、`.resume-action-panel` 等样式。
  - 调整移动端断点，让工作台变成上下布局，不横向滚动。
- Modify: `client/src/App.test.tsx`
  - 更新“简历优化”Tab 测试，断言工作台标题、左诊断、右行动、当前岗位关键词和改写示例。
  - 新增岗位切换后简历优化内容随之更新的断言。
  - 保留 `resumeAudit` 缺失时的旧审阅兜底断言。

---

### Task 1: 测试描述工作台行为

**Files:**
- Modify: `client/src/App.test.tsx`

- [ ] **Step 1: 更新样例数据，确保第二个岗位有不同的优化内容**

In `client/src/App.test.tsx`, update the second real match in `sampleAnalysis.matches` so it has distinct missing keywords, actions, and rewrite example:

```ts
{
  job: {
    id: "job-2",
    company: "腾讯",
    title: "后端开发工程师",
    city: "北京",
    type: "校招",
    description: "负责后台系统开发。",
    requirements: "Java Spring MySQL",
    bonus: "分布式经验",
    link: "https://join.qq.com/job-2",
    deadline: ""
  },
  score: 76,
  fitLevel: "匹配",
  screeningProbability: 64,
  breakdown: { skills: 70, experience: 72, keywords: 78, location: 80, growth: 84 },
  reasons: ["项目经历能迁移到后端工程能力"],
  risks: ["需要补充 Java 项目证据"],
  missingKeywords: ["Java", "Spring"],
  resumeActions: ["补充服务端项目", "写清接口设计和数据库优化证据"],
  rewriteExample: "将数据处理项目改写为服务端接口设计、数据库查询优化和稳定性保障经验。",
  recommendation: {
    summary: "适合作为校招方向对照投递。",
    matchReason: "工程化经历可迁移，但需要补充后端关键词。",
    sourceLabel: "腾讯官网 JD",
    jdInterpretation: {
      hardRequirements: ["Java", "Spring"],
      softQualities: ["学习能力"],
      bonusPoints: ["分布式经验"],
      resumeFocus: ["突出服务端项目", "补充接口设计和数据库优化"],
      interviewPrep: ["准备后端基础"]
    }
  }
}
```

- [ ] **Step 2: 更新“切换到简历优化”断言为工作台结构**

Replace the end of `test("shows task tabs in results and switches to resume optimization", ...)` after clicking the `简历优化` tab with:

```ts
fireEvent.click(screen.getByRole("tab", { name: "简历优化" }));

expect(screen.getByRole("tab", { name: "简历优化", selected: true })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "简历优化工作台" })).toBeInTheDocument();
expect(screen.getByText("基于当前推荐岗位，简历最该补的是岗位证据、量化结果和个人动作。")).toBeInTheDocument();
expect(screen.getByText("诊断依据")).toBeInTheDocument();
expect(screen.getByText("立即修改")).toBeInTheDocument();
expect(screen.getByText("71")).toBeInTheDocument();
expect(screen.getByText("5/7 通过")).toBeInTheDocument();
expect(screen.getByText("检查明细")).toBeInTheDocument();
expect(screen.getByText("需要优先改")).toBeInTheDocument();
expect(screen.getByText("当前岗位")).toBeInTheDocument();
expect(screen.getByText("前端开发工程师")).toBeInTheDocument();
expect(screen.getByText("React")).toBeInTheDocument();
expect(screen.getByText("突出 React 工程能力。")).toBeInTheDocument();
expect(screen.getByText("负责组件封装并提升复用率。")).toBeInTheDocument();
expect(screen.getByText("将项目经历改写为可量化成果。")).toBeInTheDocument();
expect(screen.getByText("建议只基于真实经历补充证据和表达，不编造学校、公司、奖项、项目或数据。")).toBeInTheDocument();
```

- [ ] **Step 3: Add a岗位联动 test**

Add this test below the existing resume tab test:

```ts
test("updates resume workbench action column when the selected job changes", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));
  fireEvent.click(await screen.findByRole("button", { name: "载入样例" }));
  fireEvent.click(screen.getByRole("button", { name: "开始捕获" }));

  expect(await screen.findByRole("heading", { name: "推荐结果" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /后端开发工程师/ }));
  fireEvent.click(screen.getByRole("tab", { name: "简历优化" }));

  expect(screen.getByRole("heading", { name: "简历优化工作台" })).toBeInTheDocument();
  expect(screen.getByText("当前岗位")).toBeInTheDocument();
  expect(screen.getAllByText("后端开发工程师").length).toBeGreaterThan(0);
  expect(screen.getByText("Java")).toBeInTheDocument();
  expect(screen.getByText("Spring")).toBeInTheDocument();
  expect(screen.getByText("补充服务端项目")).toBeInTheDocument();
  expect(screen.getByText("写清接口设计和数据库优化证据")).toBeInTheDocument();
  expect(screen.getByText("将数据处理项目改写为服务端接口设计、数据库查询优化和稳定性保障经验。")).toBeInTheDocument();
  expect(screen.getByText("补充接口设计和数据库优化")).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the focused tests and confirm failure**

Run:

```bash
npm --prefix client test -- App.test.tsx
```

Expected: FAIL because `简历优化工作台` and the new workbench labels do not exist yet.

---

### Task 2: Implement the workbench components

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Replace the resume tab content**

In `ResultsShell`, replace the existing `activeTab === "resume"` block with:

```tsx
{activeTab === "resume" ? (
  <ResumeOptimizationWorkbench
    coaching={coaching}
    selectedMatch={selectedMatch}
  />
) : null}
```

- [ ] **Step 2: Add the workbench component**

Add this component near `SelectedOpportunity`:

```tsx
function ResumeOptimizationWorkbench({
  coaching,
  selectedMatch
}: {
  coaching?: TencentCoaching;
  selectedMatch?: JobMatch;
}) {
  const audit = coaching?.resumeAudit;
  const review = coaching?.resumeReview;
  const tailoring = selectedMatch ? coaching?.jobTailoring.find((item) => item.jobId === selectedMatch.job.id) : undefined;

  return (
    <section className="resume-workbench" aria-label="简历优化工作台">
      <div className="resume-workbench-head">
        <div>
          <span>Tencent resume</span>
          <h2>简历优化工作台</h2>
          <p>基于当前推荐岗位，简历最该补的是岗位证据、量化结果和个人动作。</p>
        </div>
        {selectedMatch ? (
          <div className="resume-workbench-job">
            <span>当前岗位</span>
            <strong>{selectedMatch.job.title}</strong>
            <p>
              {selectedMatch.job.city} · {selectedMatch.job.type}
            </p>
          </div>
        ) : null}
      </div>

      <div className="resume-workbench-grid">
        <ResumeDiagnosticPanel audit={audit} review={review} />
        <ResumeActionPanel audit={audit} review={review} match={selectedMatch} tailoring={tailoring} />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Add the diagnostic panel**

Add this component below `ResumeOptimizationWorkbench`:

```tsx
function ResumeDiagnosticPanel({ audit, review }: { audit?: ResumeAudit; review?: ResumeReview }) {
  const highlights = normalizeReportItems(audit?.highlights ?? review?.highlights, [
    "已有项目、实习或课程经历可作为初筛判断素材。"
  ]);
  const principles = normalizeReportItems(review?.rewritePrinciples, [
    "只基于真实经历优化表达，不编造项目、奖项、公司或数据。"
  ]);

  return (
    <section className="resume-diagnostic-panel" aria-label="诊断依据">
      <div className="resume-panel-title">
        <span>Left column</span>
        <h3>诊断依据</h3>
      </div>
      {audit ? (
        <>
          <div className="resume-score-row">
            <div className="audit-score compact">
              <strong>{audit.score}</strong>
              <span>/100</span>
            </div>
            <div>
              <strong>{`${audit.passedCount}/${audit.totalCount} 通过`}</strong>
              <p>{audit.verdict.detail}</p>
            </div>
          </div>
          <AuditCheckTable checks={audit.checks} compact />
          <AuditList title="亮点可保留" items={highlights.slice(0, 3)} />
          <p className="audit-integrity-note">{audit.integrityNote}</p>
        </>
      ) : (
        <>
          <AuditList title="亮点可保留" items={highlights.slice(0, 3)} />
          <AuditList title="腾讯简历原则" items={principles} />
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Allow compact audit checks**

Change `AuditCheckTable` signature and wrapper class:

```tsx
function AuditCheckTable({ checks, compact = false }: { checks: ResumeAuditCheck[]; compact?: boolean }) {
  return (
    <div className={`report-block audit-check-table-block ${compact ? "compact" : ""}`}>
      <strong>检查明细</strong>
      <table className="audit-check-table">
```

Leave the existing table body unchanged.

- [ ] **Step 5: Add the action panel and helpers**

Add these components below `ResumeDiagnosticPanel`:

```tsx
function ResumeActionPanel({
  audit,
  review,
  match,
  tailoring
}: {
  audit?: ResumeAudit;
  review?: ResumeReview;
  match?: JobMatch;
  tailoring?: JobTailoring;
}) {
  const issues = audit?.prioritizedIssues ?? buildLegacyIssues(review, match);
  const resumeFocus = normalizeReportItems(
    [
      tailoring?.focus,
      ...(tailoring?.evidenceToAdd ?? []),
      ...(match?.recommendation?.jdInterpretation.resumeFocus ?? [])
    ].filter(Boolean) as string[],
    ["先把目标岗位 JD 关键词映射到真实项目、实习或课程经历里。"]
  );
  const actions = normalizeReportItems([...(match?.resumeActions ?? []), ...(audit?.nextActions ?? review?.actions ?? [])], [
    "按 STAR 梳理最核心项目，写清背景、任务、动作和结果。"
  ]);
  const rewriteExamples = normalizeReportItems([...(tailoring?.rewriteExamples ?? []), match?.rewriteExample].filter(Boolean) as string[], [
    "先补充真实项目背景、个人动作和结果证据，再生成岗位定制表达。"
  ]);

  return (
    <section className="resume-action-panel" aria-label="立即修改">
      <div className="resume-panel-title">
        <span>Right column</span>
        <h3>立即修改</h3>
      </div>
      <PriorityIssueList issues={issues.slice(0, 3)} />
      <div className="resume-action-block">
        <strong>岗位定制</strong>
        <KeywordPillList title="待补关键词" items={match?.missingKeywords ?? []} emptyText="当前岗位没有明显待补关键词。" />
        <AuditList title="经历侧重" items={resumeFocus.slice(0, 4)} />
      </div>
      <RewriteComparison examples={rewriteExamples.slice(0, 2)} />
      <AuditList title="下一步动作" items={actions.slice(0, 5)} ordered />
    </section>
  );
}

function KeywordPillList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="keyword-pill-list">
      <span>{title}</span>
      {items.length > 0 ? (
        <div>
          {items.map((item) => (
            <strong key={item}>{item}</strong>
          ))}
        </div>
      ) : (
        <p>{emptyText}</p>
      )}
    </div>
  );
}

function RewriteComparison({ examples }: { examples: string[] }) {
  return (
    <div className="report-block rewrite-comparison">
      <strong>改写示例</strong>
      <div className="rewrite-comparison-grid">
        <div>
          <span>原表达问题</span>
          <p>表达偏泛时，优先补清楚个人动作、使用方法和真实结果。</p>
        </div>
        <div>
          <span>推荐表达</span>
          {examples.map((example) => (
            <p key={example}>{example}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add legacy issue builder**

Add this helper near `normalizeReportItems`:

```tsx
function buildLegacyIssues(review?: ResumeReview, match?: JobMatch): ResumeAuditIssue[] {
  const rawIssues = normalizeReportItems([...(review?.issues ?? []), ...(match?.risks ?? [])], [
    "简历需要补充更清晰的岗位关键词、个人动作和可验证结果。"
  ]);
  return rawIssues.map((issue) => ({
    title: issue,
    suggestion: "把问题改写成可验证的真实经历证据，再放到与目标岗位最相关的位置。"
  }));
}
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm --prefix client test -- App.test.tsx
```

Expected: FAIL only for missing styles is not possible in jsdom; functional assertions should PASS. If assertions fail, fix component text and data wiring before styling.

---

### Task 3: Style the workbench

**Files:**
- Modify: `client/src/styles.css`

- [ ] **Step 1: Add desktop workbench styles**

Add after existing audit styles:

```css
.resume-workbench {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid #dfe8ef;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 22px 64px rgba(19, 28, 45, 0.07);
}

.resume-workbench-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.34fr);
  gap: 16px;
  align-items: start;
}

.resume-workbench-head span,
.resume-panel-title span,
.resume-workbench-job span,
.keyword-pill-list span,
.rewrite-comparison span {
  color: #798497;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.resume-workbench-head h2,
.resume-panel-title h3 {
  margin: 0;
  color: #172033;
}

.resume-workbench-head h2 {
  font-size: 24px;
  line-height: 1.2;
}

.resume-workbench-head p,
.resume-workbench-job p,
.resume-score-row p,
.keyword-pill-list p,
.rewrite-comparison p {
  margin: 0;
  color: #667085;
  line-height: 1.58;
}

.resume-workbench-job {
  display: grid;
  gap: 5px;
  padding: 14px;
  border: 1px solid #e7ebf2;
  border-radius: 8px;
  background: #fbfcff;
}

.resume-workbench-job strong {
  color: #172033;
}

.resume-workbench-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.4fr) minmax(360px, 0.6fr);
  gap: 16px;
  align-items: start;
}

.resume-diagnostic-panel,
.resume-action-panel {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.resume-panel-title {
  display: grid;
  gap: 4px;
}

.resume-score-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 16px;
  border: 1px solid #dcefe9;
  border-radius: 8px;
  background: linear-gradient(135deg, #f2fffb, #fbfcff);
}

.audit-score.compact strong {
  color: #087f6f;
  font-size: 40px;
  line-height: 1;
}

.audit-score.compact span {
  color: #667085;
  font-weight: 800;
}

.audit-check-table-block.compact {
  overflow-x: visible;
}

.audit-check-table-block.compact .audit-check-table {
  min-width: 0;
  font-size: 13px;
}

.audit-check-table-block.compact .audit-check-table th,
.audit-check-table-block.compact .audit-check-table td {
  padding: 10px 8px;
}

.resume-action-block {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e7ebf2;
  border-radius: 8px;
  background: #fbfcff;
}

.resume-action-block > strong {
  color: #172033;
}

.keyword-pill-list {
  display: grid;
  gap: 8px;
}

.keyword-pill-list div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-pill-list strong {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  color: #8a5a00;
  background: #fff5d8;
  font-size: 12px;
}

.rewrite-comparison-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.45fr) minmax(0, 0.55fr);
  gap: 12px;
}

.rewrite-comparison-grid > div {
  display: grid;
  gap: 7px;
  min-width: 0;
}
```

- [ ] **Step 2: Add mobile workbench styles**

Inside the existing mobile media query, add:

```css
.resume-workbench {
  padding: 16px;
}

.resume-workbench-head,
.resume-workbench-grid,
.resume-score-row,
.rewrite-comparison-grid {
  grid-template-columns: 1fr;
}

.resume-action-panel {
  order: -1;
}

.audit-check-table-block.compact .audit-check-table,
.audit-check-table-block.compact .audit-check-table thead,
.audit-check-table-block.compact .audit-check-table tbody,
.audit-check-table-block.compact .audit-check-table tr,
.audit-check-table-block.compact .audit-check-table th,
.audit-check-table-block.compact .audit-check-table td {
  display: block;
}

.audit-check-table-block.compact .audit-check-table thead {
  display: none;
}

.audit-check-table-block.compact .audit-check-table tr {
  padding: 10px 0;
  border-bottom: 1px solid #edf0f5;
}

.audit-check-table-block.compact .audit-check-table td,
.audit-check-table-block.compact .audit-check-table th {
  border: 0;
}
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm --prefix client test -- App.test.tsx
```

Expected: PASS.

---

### Task 4: Full verification and browser QA

**Files:**
- Verify only; no planned edits.

- [ ] **Step 1: Run client tests**

Run:

```bash
npm --prefix client test
```

Expected: PASS.

- [ ] **Step 2: Run client build**

Run:

```bash
npm --prefix client run build
```

Expected: PASS with TypeScript and Vite build completing.

- [ ] **Step 3: Start the dev server**

Run:

```bash
npm run dev
```

Expected: local app starts on an available localhost port.

- [ ] **Step 4: Inspect in browser**

Open the local URL in the in-app browser. Use the sample resume flow, navigate to the “简历优化” Tab, and check:

- The workbench title is visible.
- Desktop layout shows diagnosis left and action right.
- Switching selected jobs updates the right column.
- No text overlaps in the workbench.

- [ ] **Step 5: Mobile viewport check**

Use the in-app browser responsive/mobile viewport or Playwright if available. Check:

- Workbench stacks vertically.
- Action content appears before the detailed check table.
- No horizontal overflow from the compact check table.

- [ ] **Step 6: Commit implementation**

Run:

```bash
git add client/src/App.tsx client/src/styles.css client/src/App.test.tsx docs/superpowers/plans/2026-06-14-resume-optimization-workbench.md
git commit -m "feat: add resume optimization workbench"
```

Expected: commit succeeds with only the implementation and plan files staged.

---

## Self-Review

- Spec coverage: The plan covers the result-page location, left diagnosis/right action layout, job-linked right column, existing data reuse, legacy fallback, mobile stacking, and tests.
- Placeholder scan: No TBD/TODO/fill-in placeholders are present.
- Type consistency: Components use existing `TencentCoaching`, `JobMatch`, `ResumeAudit`, `ResumeReview`, `ResumeAuditIssue`, and `JobTailoring` types already defined in `client/src/App.tsx`.

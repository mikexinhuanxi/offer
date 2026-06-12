# White Home and Task Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh Offer 捕手 with a white home screen, a clearer upload workbench, wrapped progress steps, and task-oriented result tabs.

**Architecture:** Keep the backend and analysis data contracts unchanged. Update `App.tsx` state and rendering to add a result tab state, recompose existing result panels into tab panes, and adjust CSS for the unified white workspace. Use existing React, CSS, lucide icons, and Testing Library tests.

**Tech Stack:** Vite, React 18, TypeScript, CSS, Vitest, Testing Library, jsdom.

---

## File Structure

- Modify `client/src/App.test.tsx`: replace the old "no tab workbench" expectation with tests for removed home status labels and result tab switching.
- Modify `client/src/App.tsx`: add a result tab state, remove home status rendering, and split result content into tab panels.
- Modify `client/src/styles.css`: restyle home as white, rework upload/results layout, add tab styling, and fix progress text wrapping.
- Modify `client/src/components/TrueFocus.css`: make the title work on a white background.

## Task 1: Update Tests First

**Files:**
- Modify: `client/src/App.test.tsx`

- [ ] **Step 1: Replace the home and results expectations**

Change the tests to assert that the home page has no visible status labels and that results use a tablist:

```tsx
test("starts on a clean white home screen and enters upload from the CTA", async () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "Offer 捕手" })).toBeInTheDocument();
  expect(screen.queryByText("服务已连接")).not.toBeInTheDocument();
  expect(screen.queryByText("qwen-plus")).not.toBeInTheDocument();
  expect(screen.queryByText("1 个岗位")).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "放入你的简历" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));

  expect(await screen.findByRole("heading", { name: "放入你的简历" })).toBeInTheDocument();
});

test("shows task tabs in results and switches to resume optimization", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));
  fireEvent.click(await screen.findByRole("button", { name: "载入样例" }));
  fireEvent.click(screen.getByRole("button", { name: "开始匹配" }));

  expect(await screen.findByRole("heading", { name: "推荐结果" })).toBeInTheDocument();
  expect(screen.getByRole("tablist", { name: "结果内容" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "推荐概览", selected: true })).toBeInTheDocument();
  expect(screen.getAllByText("React 和 TypeScript 经历与岗位要求一致。").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("tab", { name: "简历优化" }));

  expect(screen.getByRole("tab", { name: "简历优化", selected: true })).toBeInTheDocument();
  expect(screen.getByText("突出 React 工程能力。")).toBeInTheDocument();
  expect(screen.getByText("项目方向清晰")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -w client -- App.test.tsx
```

Expected: the test fails because the current home still renders status labels and the current results page has no tablist.

## Task 2: Implement The UI Changes

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/styles.css`
- Modify: `client/src/components/TrueFocus.css`

- [ ] **Step 1: Add result tab state and tab metadata**

In `client/src/App.tsx`, add:

```ts
type ResultsTab = "overview" | "resume" | "interview" | "mock";

const resultTabs: Array<{ id: ResultsTab; label: string }> = [
  { id: "overview", label: "推荐概览" },
  { id: "resume", label: "简历优化" },
  { id: "interview", label: "面试准备" },
  { id: "mock", label: "模拟 & HR" }
];
```

Inside `App`, add:

```ts
const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("overview");
```

Pass `activeResultsTab` and `setActiveResultsTab` into `ResultsDashboard`.

- [ ] **Step 2: Remove home status pills and update results heading**

Change `HomeScreen` props to:

```ts
function HomeScreen({ onEnter }: { onEnter: () => void }) {
```

Render only the brand in `home-topbar`; do not render `StatusPill` components in the home screen.

Change the result headline title from `推荐主线` to `推荐结果`.

- [ ] **Step 3: Split results into tab panels**

Update `ResultsDashboard` to render the job list on the left and a `results-content-card` on the right. The card contains a tablist and conditionally renders:

```tsx
{activeTab === "overview" && selectedMatch ? <SelectedOpportunity match={selectedMatch} /> : null}
{activeTab === "resume" ? (
  <div className="tab-panel-grid">
    <ResumeReviewPanel review={coaching?.resumeReview} />
    {selectedMatch ? <JobTailoringPanel match={selectedMatch} tailoring={tailoring} /> : <EmptyResults />}
  </div>
) : null}
{activeTab === "interview" && selectedMatch ? <InterviewPrepPanel match={selectedMatch} prep={interviewPrep} /> : null}
{activeTab === "mock" ? (
  <div className="tab-panel-grid">
    <MockInterviewPanel questions={coaching?.mockInterview ?? []} />
    <GroupHrPanel prep={coaching?.groupAndHrPrep} />
  </div>
) : null}
```

Use button tabs with `role="tab"`, `aria-selected`, `aria-controls`, and `role="tabpanel"`.

- [ ] **Step 4: Update CSS for white home, upload workbench, tabs, and progress wrapping**

In `client/src/styles.css`, replace the dark `.home-shell` and `.home-screen` treatment with white surfaces. Remove fixed nowrap from compact progress titles:

```css
.starter-with-results .progress-step strong {
  white-space: normal;
}
```

Add result tab styles:

```css
.results-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px;
  border: 1px solid #e6e9f0;
  border-radius: 8px;
  background: #f6f8fb;
}

.result-tab {
  min-height: 38px;
  padding: 0 13px;
  border-radius: 7px;
  color: #596579;
  background: transparent;
  cursor: pointer;
  font-weight: 800;
}

.result-tab.active {
  color: #ffffff;
  background: #111827;
}
```

In `client/src/components/TrueFocus.css`, set `.focus-word` to a dark color so the title is readable on the white home.

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```bash
npm test -w client -- App.test.tsx
```

Expected: both App tests pass.

## Task 3: Full Verification

**Files:**
- No additional files.

- [ ] **Step 1: Run the client build**

Run:

```bash
npm run build -w client
```

Expected: TypeScript and Vite build finish with exit code 0.

- [ ] **Step 2: Run browser verification**

Start the app:

```bash
npm run dev
```

Open the app at the printed Vite URL. Verify:

- The home page is white and has no home status pills.
- The CTA opens the upload workbench.
- Loading the sample resume and running analysis opens the results page.
- Result tabs switch between `推荐概览`, `简历优化`, `面试准备`, and `模拟 & HR`.
- Progress text wraps inside its cards at desktop and mobile-ish widths.

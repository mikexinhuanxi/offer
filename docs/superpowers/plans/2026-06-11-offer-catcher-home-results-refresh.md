# Offer Catcher Home and Results Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the independent `Offer 捕手` TrueFocus home screen and replace the tab-first results surface with a selected-opportunity dashboard.

**Architecture:** Keep the backend API and data contracts unchanged. Add the React Bits `TrueFocus` component under `client/src/components`, add a small page state in `App.tsx`, and reuse existing result subcomponents inside a new dashboard layout instead of tabs. Add focused UI tests so the state transition and non-tab results presentation are covered before implementation.

**Tech Stack:** Vite, React 18, TypeScript, CSS, `motion`, Vitest, Testing Library, jsdom.

---

## File Structure

- Modify `client/package.json`: add `motion`, test dependencies, and `test` script.
- Modify `package-lock.json`: update dependency lock after `npm install`.
- Modify `client/src/App.tsx`: add page state, home screen, upload/results composition, and dashboard results.
- Modify `client/src/styles.css`: add home screen, TrueFocus theme overrides, dashboard styling, responsive states, and reduced-motion rules.
- Create `client/src/components/TrueFocus.tsx`: React Bits component with TypeScript props.
- Create `client/src/components/TrueFocus.css`: React Bits component CSS adapted for this project.
- Create `client/src/App.test.tsx`: UI tests for home-to-upload and results dashboard behavior.
- Create `client/src/test/setup.ts`: jest-dom setup.

## Task 1: Test Harness and Baseline UI Tests

**Files:**
- Modify: `client/package.json`
- Create: `client/src/test/setup.ts`
- Create: `client/src/App.test.tsx`
- Modify: `client/vite.config.ts`
- Modify: `package-lock.json`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install motion -w client
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom -w client
```

Expected: `client/package.json` includes `motion`; dev dependencies include Vitest and Testing Library packages.

- [ ] **Step 2: Add test script and setup file**

In `client/package.json`, add:

```json
"test": "vitest run"
```

Create `client/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Configure Vitest**

In `client/vite.config.ts`, change the `defineConfig` import and add a `test` block:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});
```

- [ ] **Step 4: Write failing UI tests**

Create `client/src/App.test.tsx`:

```tsx
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

test("starts on the Offer 捕手 home screen and enters upload from the CTA", async () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "Offer 捕手" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "放入你的简历" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));

  expect(await screen.findByRole("heading", { name: "放入你的简历" })).toBeInTheDocument();
});

test("shows the results dashboard without the old tab workbench after analysis", async () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "开始捕捉 Offer" }));
  fireEvent.click(await screen.findByRole("button", { name: "载入样例" }));
  fireEvent.click(screen.getByRole("button", { name: "开始匹配" }));

  expect(await screen.findByRole("heading", { name: "推荐主线" })).toBeInTheDocument();
  expect(screen.getByText("前端开发工程师")).toBeInTheDocument();
  expect(screen.getByText("React 和 TypeScript 经历与岗位要求一致。")).toBeInTheDocument();
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
});
```

- [ ] **Step 5: Run test to verify it fails**

Run:

```bash
npm test -w client
```

Expected: FAIL because the home CTA and results dashboard heading do not exist yet.

- [ ] **Step 6: Keep the red test uncommitted and continue**

```bash
git status --short
```

Expected: test files, dependency files, and Vite config are modified or untracked. Do not commit this red state.

## Task 2: Integrate TrueFocus and Home State

**Files:**
- Create: `client/src/components/TrueFocus.tsx`
- Create: `client/src/components/TrueFocus.css`
- Modify: `client/src/App.tsx`
- Modify: `client/src/styles.css`

- [ ] **Step 1: Create `TrueFocus.tsx`**

Use the React Bits source with TypeScript props:

```tsx
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import "./TrueFocus.css";

interface TrueFocusProps {
  sentence?: string;
  separator?: string;
  manualMode?: boolean;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
}

export default function TrueFocus({
  sentence = "True Focus",
  separator = " ",
  manualMode = false,
  blurAmount = 5,
  borderColor = "green",
  glowColor = "rgba(0, 255, 0, 0.6)",
  animationDuration = 0.5,
  pauseBetweenAnimations = 1
}: TrueFocusProps) {
  const words = sentence.split(separator);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!manualMode) {
      const interval = window.setInterval(() => {
        setCurrentIndex((previous) => (previous + 1) % words.length);
      }, (animationDuration + pauseBetweenAnimations) * 1000);

      return () => window.clearInterval(interval);
    }
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length]);

  useEffect(() => {
    if (currentIndex === null || currentIndex === -1) return;
    if (!wordRefs.current[currentIndex] || !containerRef.current) return;

    const parentRect = containerRef.current.getBoundingClientRect();
    const activeRect = wordRefs.current[currentIndex].getBoundingClientRect();

    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height
    });
  }, [currentIndex, words.length]);

  function handleMouseEnter(index: number) {
    if (manualMode) {
      setLastActiveIndex(index);
      setCurrentIndex(index);
    }
  }

  function handleMouseLeave() {
    if (manualMode && lastActiveIndex !== null) {
      setCurrentIndex(lastActiveIndex);
    }
  }

  return (
    <div className="focus-container" ref={containerRef}>
      {words.map((word, index) => {
        const isActive = index === currentIndex;
        return (
          <span
            key={`${word}-${index}`}
            ref={(element) => {
              wordRefs.current[index] = element;
            }}
            className={`focus-word ${manualMode ? "manual" : ""} ${isActive && !manualMode ? "active" : ""}`}
            style={{
              filter: isActive ? "blur(0px)" : `blur(${blurAmount}px)`,
              "--border-color": borderColor,
              "--glow-color": glowColor,
              transition: `filter ${animationDuration}s ease`
            } as React.CSSProperties}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            {word}
          </span>
        );
      })}

      <motion.div
        className="focus-frame"
        animate={{
          x: focusRect.x,
          y: focusRect.y,
          width: focusRect.width,
          height: focusRect.height,
          opacity: currentIndex >= 0 ? 1 : 0
        }}
        transition={{ duration: animationDuration }}
        style={
          {
            "--border-color": borderColor,
            "--glow-color": glowColor
          } as React.CSSProperties
        }
      >
        <span className="corner top-left"></span>
        <span className="corner top-right"></span>
        <span className="corner bottom-left"></span>
        <span className="corner bottom-right"></span>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Create `TrueFocus.css`**

Copy the React Bits CSS and adjust only responsive font sizing and reduced motion:

```css
.focus-container {
  position: relative;
  display: flex;
  gap: 0.3em;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  outline: none;
  user-select: none;
}

.focus-word {
  position: relative;
  font-size: clamp(3.4rem, 10vw, 8.6rem);
  font-weight: 900;
  cursor: pointer;
  transition:
    filter 0.3s ease,
    color 0.3s ease;
  outline: none;
  user-select: none;
}

.focus-word.active {
  filter: blur(0);
}

.focus-frame {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  box-sizing: content-box;
  border: none;
}

.corner {
  position: absolute;
  width: 1rem;
  height: 1rem;
  border: 3px solid var(--border-color, #fff);
  filter: drop-shadow(0 0 4px var(--glow-color, #fff));
  border-radius: 3px;
  transition: none;
}

.top-left { top: -10px; left: -10px; border-right: none; border-bottom: none; }
.top-right { top: -10px; right: -10px; border-left: none; border-bottom: none; }
.bottom-left { bottom: -10px; left: -10px; border-right: none; border-top: none; }
.bottom-right { bottom: -10px; right: -10px; border-left: none; border-top: none; }

@media (prefers-reduced-motion: reduce) {
  .focus-word {
    filter: blur(0) !important;
    transition: none !important;
  }
}
```

- [ ] **Step 3: Add page state and home screen**

In `client/src/App.tsx`, import `TrueFocus`, remove `ResultTab` and tab state, and add:

```tsx
type AppView = "home" | "upload" | "results";

const [view, setView] = useState<AppView>("home");
```

Add `HomeScreen`:

```tsx
function HomeScreen({
  health,
  jobInfo,
  onEnter
}: {
  health: HealthInfo | null;
  jobInfo: JobInfo | null;
  onEnter: () => void;
}) {
  return (
    <section className="home-screen" aria-label="Offer 捕手首页">
      <nav className="home-topbar" aria-label="应用状态">
        <div className="brand-lockup home-brand">
          <Sparkles size={18} />
          <span>Offer 捕手</span>
        </div>
        <div className="status-row">
          <StatusPill icon={<Database size={15} />} label={`${jobInfo?.count ?? 0} 个岗位`} />
          <StatusPill
            icon={health?.hasApiKey ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            label={health?.hasApiKey ? "服务已连接" : "待配置"}
            tone={health?.hasApiKey ? "good" : "warn"}
          />
          <StatusPill label={health?.model ?? "qwen-plus"} quiet />
        </div>
      </nav>
      <div className="home-focus">
        <p className="home-kicker">Resume to offer shortlist</p>
        <h1 className="sr-only">Offer 捕手</h1>
        <TrueFocus
          sentence="Offer 捕手"
          blurAmount={4}
          borderColor="#15d7bc"
          glowColor="rgba(21, 215, 188, 0.55)"
          animationDuration={0.7}
          pauseBetweenAnimations={1.1}
        />
        <button className="home-cta primary-button" onClick={onEnter}>
          <span className="button-glare" />
          <span className="button-content">
            <WandSparkles size={18} />
            开始捕捉 Offer
          </span>
        </button>
      </div>
    </section>
  );
}
```

Return this before the upload UI:

```tsx
if (view === "home") {
  return (
    <main className="app-shell home-shell">
      <HomeScreen health={health} jobInfo={jobInfo} onEnter={() => setView(analysis ? "results" : "upload")} />
    </main>
  );
}
```

- [ ] **Step 4: Verify first test passes far enough**

Run:

```bash
npm test -w client
```

Expected: first test PASS; second test still FAIL because results dashboard is not implemented.

## Task 3: Replace Tabs with Selected-Opportunity Dashboard

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/styles.css`
- Modify: `client/src/App.test.tsx` only if accessible names need harmless adjustment after implementation.

- [ ] **Step 1: Update state transitions**

In `runAnalysis`, set results view:

```tsx
setAnalysis(payload);
setSelectedId(payload.matches?.[0]?.job.id ?? "");
setView("results");
setJobInfo({ count: payload.jobCount, source: payload.jobSource });
```

Remove `ResultTab`, `resultTabs`, `activeTab`, `setActiveTab`, and `TabNav`.

- [ ] **Step 2: Replace `ResultWorkbench` with dashboard component**

Create `ResultsDashboard`:

```tsx
function ResultsDashboard({
  analysis,
  selectedMatch,
  selectedId,
  onSelectJob
}: {
  analysis: AnalysisResponse;
  selectedMatch?: JobMatch;
  selectedId: string;
  onSelectJob: (id: string) => void;
}) {
  const coaching = analysis.tencentCoaching;
  const tailoring = coaching?.jobTailoring.find((item) => item.jobId === selectedMatch?.job.id);
  const interviewPrep = coaching?.interviewPrep.find((item) => item.jobId === selectedMatch?.job.id);

  return (
    <section className="results-dashboard" aria-label="匹配结果">
      <div className="results-headline">
        <SectionTitle eyebrow="Tencent shortlist" title="推荐主线" />
        <p>先看最值得投的岗位，再顺着证据、风险和下一步动作改简历。</p>
      </div>
      <div className="opportunity-layout">
        <aside className="opportunity-rail" aria-label="推荐岗位列表">
          <MatchList matches={analysis.matches} selectedId={selectedId} onSelectJob={onSelectJob} />
        </aside>
        {selectedMatch ? <SelectedOpportunity match={selectedMatch} /> : <EmptyResults />}
      </div>
      <section className="coaching-sections" aria-label="求职辅导">
        <ResumeReviewPanel review={coaching?.resumeReview} />
        {selectedMatch ? <JobTailoringPanel match={selectedMatch} tailoring={tailoring} /> : null}
        {selectedMatch ? <InterviewPrepPanel match={selectedMatch} prep={interviewPrep} /> : null}
        <MockInterviewPanel questions={coaching?.mockInterview ?? []} />
        <GroupHrPanel prep={coaching?.groupAndHrPrep} />
      </section>
    </section>
  );
}
```

Add `SelectedOpportunity`:

```tsx
function SelectedOpportunity({ match }: { match: JobMatch }) {
  const interpretation = match.recommendation?.jdInterpretation;

  return (
    <article className="selected-opportunity">
      <div className="job-hero">
        <span>{match.job.company}</span>
        <h3>{match.job.title}</h3>
        <p>{match.job.city} · {match.job.type}</p>
        {match.job.link ? (
          <a href={match.job.link} target="_blank" rel="noreferrer">
            投递链接 <ArrowUpRight size={14} />
          </a>
        ) : null}
      </div>
      <div className="focus-box">
        <span>推荐理由</span>
        <p>{match.recommendation?.matchReason || match.reasons.slice(0, 2).join("；")}</p>
        <small>{match.recommendation?.sourceLabel || "岗位信息来自后端岗位源。"}</small>
      </div>
      <div className="opportunity-grid">
        <InsightBlock title="JD 硬要求" items={interpretation?.hardRequirements ?? [match.job.requirements]} />
        <InsightBlock title="简历侧重" items={interpretation?.resumeFocus ?? match.resumeActions} />
        <InsightBlock title="风险缺口" items={match.risks} warn />
        <InsightBlock title="下一步动作" items={match.resumeActions} />
      </div>
      <div className="rewrite-box">
        <span>建议改写</span>
        <p>{match.rewriteExample}</p>
      </div>
    </article>
  );
}
```

Add `EmptyResults`:

```tsx
function EmptyResults() {
  return (
    <div className="selected-opportunity empty-results">
      <strong>还没有推荐结果</strong>
      <p>可以调整简历内容，或稍后刷新岗位库后重新匹配。</p>
    </div>
  );
}
```

- [ ] **Step 3: Update render tree**

In the main `return`, use:

```tsx
<section className={`starter ${analysis ? "starter-with-results" : ""}`}>
  ...
</section>

{analysis ? (
  <FadeContent>
    <section className="results-shell">
      <ProfileSummary profile={analysis.profile} />
      <ResultsDashboard
        analysis={analysis}
        selectedMatch={selectedMatch}
        selectedId={selectedId}
        onSelectJob={setSelectedId}
      />
    </section>
  </FadeContent>
) : null}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -w client
```

Expected: both tests PASS.

- [ ] **Step 5: Commit dashboard implementation**

```bash
git add client/src/App.tsx client/src/App.test.tsx
git commit -m "feat: add home flow and results dashboard"
```

## Task 4: Polish Styling and Responsive Behavior

**Files:**
- Modify: `client/src/styles.css`
- Modify: `client/src/components/TrueFocus.css`

- [ ] **Step 1: Add home screen styles**

Add this CSS block:

```css
.home-shell {
  padding: 18px;
  color: #f7fafc;
  background:
    linear-gradient(135deg, rgba(21, 215, 188, 0.16), transparent 32%),
    linear-gradient(225deg, rgba(255, 83, 147, 0.12), transparent 36%),
    #101114;
}

.home-screen {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: calc(100vh - 36px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.home-screen::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(circle at 50% 52%, black, transparent 74%);
  pointer-events: none;
}

.home-topbar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px;
}

.home-brand {
  color: #15d7bc;
}

.home-screen .status-pill {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.07);
  color: rgba(247, 250, 252, 0.78);
  box-shadow: none;
}

.home-screen .status-pill.good {
  color: #7fffe8;
  border-color: rgba(21, 215, 188, 0.32);
}

.home-screen .status-pill.warn {
  color: #ffd999;
  border-color: rgba(255, 217, 153, 0.3);
}

.home-focus {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 28px;
  min-height: 0;
  padding: 54px 24px 78px;
  text-align: center;
}

.home-kicker {
  margin: 0;
  color: rgba(247, 250, 252, 0.54);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-cta {
  min-height: 52px;
  padding-inline: 22px;
  color: #101114;
  background: #15d7bc;
  box-shadow: 0 20px 60px rgba(21, 215, 188, 0.22);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 2: Add dashboard styles**

Add this CSS block and remove unused `.tab-nav` rules after `TabNav` is deleted:

```css
.results-dashboard {
  display: grid;
  gap: 18px;
}

.results-headline {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
  border: 1px solid #e6e9f0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 22px 64px rgba(19, 28, 45, 0.07);
}

.results-headline p {
  max-width: 440px;
  margin: 0;
  color: #667085;
  line-height: 1.62;
}

.opportunity-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.72fr) minmax(0, 1.28fr);
  gap: 18px;
  align-items: start;
}

.opportunity-rail,
.selected-opportunity,
.coaching-sections {
  min-width: 0;
  border: 1px solid #e6e9f0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 22px 64px rgba(19, 28, 45, 0.07);
}

.opportunity-rail {
  padding: 14px;
}

.selected-opportunity {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.opportunity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.coaching-sections {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.empty-results {
  align-content: center;
  min-height: 260px;
}

.empty-results strong {
  color: #172033;
  font-size: 20px;
}

.empty-results p {
  margin: 0;
  color: #667085;
}
```

- [ ] **Step 3: Add responsive and reduced-motion CSS**

Add mobile rules:

```css
@media (max-width: 960px) {
  .opportunity-layout,
  .opportunity-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .home-screen {
    min-height: calc(100vh - 36px);
  }

  .home-topbar {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: build exits 0.

- [ ] **Step 5: Commit styling**

```bash
git add client/src/styles.css client/src/components/TrueFocus.css
git commit -m "style: polish offer catcher refresh"
```

## Task 5: Browser Verification

**Files:**
- No code changes expected unless verification finds a bug.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected: frontend available at `http://127.0.0.1:5173` and backend at `http://127.0.0.1:8787`.

- [ ] **Step 2: Verify desktop flow in Browser**

Open `http://127.0.0.1:5173`.

Check:

- Home screen shows `Offer 捕手` as the first visual signal.
- Home CTA enters upload.
- Upload card and progress card are visible.
- Sample resume can be loaded.
- If API key is unavailable, analysis failure stays near upload and preserves text.
- If API key is available, results dashboard renders and no tablist appears.

- [ ] **Step 3: Verify mobile-ish viewport**

Use a narrow viewport around `390x844`.

Check:

- The TrueFocus title fits without overlapping status or CTA.
- The CTA text fits.
- Upload controls stack cleanly.
- Job cards and selected opportunity do not overlap.

- [ ] **Step 4: Final verification**

Run:

```bash
npm test -w client
npm run build
git status --short
```

Expected: tests pass, build exits 0, and git status shows only intentional changes or is clean after commits.

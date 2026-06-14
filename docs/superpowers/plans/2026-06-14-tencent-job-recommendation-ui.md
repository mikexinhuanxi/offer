# Tencent Job Recommendation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the results-page job shortlist table with Tencent-skill-style recommendation cards while preserving the split workbench and improving the selected job detail panel.

**Architecture:** Keep the existing `ResultsDashboard` data flow and selected-job state. Change only the React rendering and CSS for the shortlist/detail area, using the existing `JobMatch` and `JobRecommendation` fields with current fallbacks.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, CSS modules via global `styles.css`, lucide-react icons already imported in `App.tsx`.

---

## File Structure

- Modify `client/src/App.test.tsx`: update the results test so it expects recommendation cards instead of table column headers, and add assertions that score/probability language is absent from the recommendation UI.
- Modify `client/src/App.tsx`: replace `MatchList` table markup with accessible card buttons; add small helper functions for card source/reason/count labels; expand `SelectedOpportunity` to render JD interpretation sections.
- Modify `client/src/styles.css`: replace table-specific shortlist styles with card styles; add JD detail grid/list styles; preserve responsive behavior.
- No backend files change. No type contract changes.

## Task 1: Update Tests For Tencent Recommendation Cards

**Files:**
- Modify: `client/src/App.test.tsx`

- [ ] **Step 1: Change the results test to expect cards, not table headers**

In `client/src/App.test.tsx`, inside the test named `shows task tabs in results and switches to resume optimization`, replace these assertions:

```tsx
expect(screen.getByRole("columnheader", { name: "岗位" })).toBeInTheDocument();
expect(screen.getByRole("columnheader", { name: "地点" })).toBeInTheDocument();
expect(screen.getByRole("columnheader", { name: "理由" })).toBeInTheDocument();
expect(screen.getByRole("columnheader", { name: "缺口" })).toBeInTheDocument();
```

with:

```tsx
expect(screen.queryByRole("columnheader", { name: "岗位" })).not.toBeInTheDocument();
expect(screen.queryByRole("columnheader", { name: "地点" })).not.toBeInTheDocument();
expect(screen.queryByRole("columnheader", { name: "理由" })).not.toBeInTheDocument();
expect(screen.queryByRole("columnheader", { name: "缺口" })).not.toBeInTheDocument();
expect(screen.getByText("腾讯官网 JD")).toBeInTheDocument();
expect(screen.getByText("1 个待补关键词")).toBeInTheDocument();
expect(screen.getByRole("button", { name: /前端开发工程师/ })).toHaveTextContent(
  "React 和 TypeScript 经历与岗位要求一致。"
);
expect(screen.queryByText("88")).not.toBeInTheDocument();
expect(screen.queryByText("76")).not.toBeInTheDocument();
```

- [ ] **Step 2: Add assertions for the expanded JD detail sections**

In the same test, after:

```tsx
expect(screen.getByText("JD / 简历映射")).toBeInTheDocument();
```

add:

```tsx
expect(screen.getByText("硬性条件")).toBeInTheDocument();
expect(screen.getByText("软性素质")).toBeInTheDocument();
expect(screen.getByText("加分项")).toBeInTheDocument();
expect(screen.getByText("简历侧重")).toBeInTheDocument();
expect(screen.getByText("面试准备")).toBeInTheDocument();
expect(screen.getByText("协作沟通")).toBeInTheDocument();
expect(screen.getByText("AI 产品经验")).toBeInTheDocument();
expect(screen.getByText("突出前端项目")).toBeInTheDocument();
expect(screen.getByText("准备项目深挖")).toBeInTheDocument();
```

- [ ] **Step 3: Run the targeted test and verify it fails before implementation**

Run:

```bash
npm --prefix client test -- client/src/App.test.tsx
```

Expected: FAIL. The current UI still renders table column headers and does not render all JD interpretation section titles.

## Task 2: Replace The Shortlist Table With Recommendation Cards

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add card label helper functions**

In `client/src/App.tsx`, near the other helper functions at the bottom of the file, add:

```tsx
function getRecommendationReason(match: JobMatch) {
  return match.recommendation?.matchReason || match.reasons[0] || "腾讯官网岗位匹配";
}

function getRecommendationSource(match: JobMatch) {
  return match.recommendation?.sourceLabel || "腾讯校招官网岗位";
}

function getMissingKeywordLabel(match: JobMatch) {
  const count = match.missingKeywords.length;
  return count > 0 ? `${count} 个待补关键词` : "暂无明显关键词缺口";
}
```

- [ ] **Step 2: Replace `MatchList` table markup with button cards**

In `client/src/App.tsx`, replace the current `MatchList` implementation body with:

```tsx
function MatchList({
  icon,
  matches,
  selectedId,
  onSelectJob
}: {
  icon: ReactNode;
  matches: JobMatch[];
  selectedId: string;
  onSelectJob: (id: string) => void;
}) {
  return (
    <section className="match-column" aria-label="推荐岗位短名单">
      <div className="match-column-title">
        {icon}
        <h3>岗位短名单</h3>
        <span>{matches.length} 个</span>
      </div>
      <div className="match-list">
        {matches.length > 0 ? (
          matches.map((match) => {
            const selected = selectedId === match.job.id;
            return (
              <button
                key={match.job.id}
                className={`recommendation-card ${selected ? "selected" : ""}`}
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelectJob(match.job.id)}
              >
                <span className="recommendation-source">{getRecommendationSource(match)}</span>
                <strong>{match.job.title}</strong>
                <span className="recommendation-meta">
                  {match.job.city} · {match.job.type}
                </span>
                <span className="recommendation-reason">{getRecommendationReason(match)}</span>
                <span className={match.missingKeywords.length > 2 ? "recommendation-gap warn" : "recommendation-gap"}>
                  {getMissingKeywordLabel(match)}
                </span>
              </button>
            );
          })
        ) : (
          <div className="empty-match-column">
            <strong>暂无岗位</strong>
            <p>换一份简历或刷新岗位库后再试。</p>
          </div>
        )}
      </div>
    </section>
  );
}
```

This removes the custom table-row keyboard handler because native `button` elements already support click, focus, `Enter`, and `Space`.

- [ ] **Step 3: Remove the now-unused `KeyboardEvent` import**

At the top of `client/src/App.tsx`, change:

```tsx
  type KeyboardEvent,
```

to remove that line from the React import list.

- [ ] **Step 4: Run the targeted test**

Run:

```bash
npm --prefix client test -- client/src/App.test.tsx
```

Expected: The table-header assertions now pass, but the JD detail section assertions may still fail until Task 3 is complete.

## Task 3: Expand The Selected Job Detail Panel

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add a reusable JD list panel component**

In `client/src/App.tsx`, after `KeywordMappingTable`, add:

```tsx
function JdListPanel({ title, items }: { title: string; items?: string[] }) {
  const visibleItems = (items ?? []).filter(Boolean).slice(0, 5);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section className="jd-list-panel">
      <strong>{title}</strong>
      <ul>
        {visibleItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Update `SelectedOpportunity` to render JD interpretation sections**

In `SelectedOpportunity`, replace the existing `.opportunity-grid compact-decision-grid` block:

```tsx
<div className="opportunity-grid compact-decision-grid">
  <KeywordMappingTable
    keywords={interpretation?.hardRequirements ?? splitRequirementText(match.job.requirements)}
    missingKeywords={match.missingKeywords}
  />
  <CompactListPanel title="风险缺口" items={match.risks} warn />
  <CompactListPanel title="下一步动作" items={match.resumeActions} />
</div>
```

with:

```tsx
<div className="jd-interpretation-grid">
  <KeywordMappingTable
    keywords={interpretation?.hardRequirements ?? splitRequirementText(match.job.requirements)}
    missingKeywords={match.missingKeywords}
  />
  <JdListPanel title="软性素质" items={interpretation?.softQualities} />
  <JdListPanel title="加分项" items={interpretation?.bonusPoints} />
  <JdListPanel title="简历侧重" items={interpretation?.resumeFocus} />
  <JdListPanel title="面试准备" items={interpretation?.interviewPrep} />
  <CompactListPanel title="风险缺口" items={match.risks} warn />
  <CompactListPanel title="下一步动作" items={match.resumeActions} />
</div>
```

- [ ] **Step 3: Rename the keyword mapping heading to match the Tencent skill wording**

In `KeywordMappingTable`, change:

```tsx
<strong>JD / 简历映射</strong>
```

to:

```tsx
<strong>硬性条件</strong>
```

In `client/src/App.test.tsx`, update the existing assertion:

```tsx
expect(screen.getByText("JD / 简历映射")).toBeInTheDocument();
```

to:

```tsx
expect(screen.getByText("硬性条件")).toBeInTheDocument();
```

If Task 1 already added both assertions, remove the older `JD / 简历映射` assertion and keep only `硬性条件`.

- [ ] **Step 4: Run the targeted test**

Run:

```bash
npm --prefix client test -- client/src/App.test.tsx
```

Expected: PASS for the updated results-page assertions.

## Task 4: Update Styling And Responsive Behavior

**Files:**
- Modify: `client/src/styles.css`

- [ ] **Step 1: Replace shortlist table styling with recommendation card styling**

In `client/src/styles.css`, keep `.match-list`, `.match-column-title`, and `.empty-match-column`. Add these rules near the existing shortlist styles:

```css
.recommendation-card {
  position: relative;
  display: grid;
  gap: 7px;
  width: 100%;
  min-height: 128px;
  padding: 12px 12px 12px 14px;
  text-align: left;
  border: 1px solid #e7ebf2;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease,
    background 160ms ease;
}

.recommendation-card:hover,
.recommendation-card.selected {
  border-color: rgba(18, 166, 144, 0.32);
  background: #f7fffc;
  box-shadow: 0 12px 26px rgba(18, 166, 144, 0.1);
}

.recommendation-card.selected::before {
  content: "";
  position: absolute;
  inset: 10px auto 10px 0;
  width: 3px;
  border-radius: 999px;
  background: #12a690;
}

.recommendation-card:focus-visible {
  outline: 3px solid rgba(18, 166, 144, 0.2);
  outline-offset: 2px;
}

.recommendation-card strong {
  display: -webkit-box;
  overflow: hidden;
  color: #172033;
  font-size: 15px;
  line-height: 1.32;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.recommendation-source,
.recommendation-meta,
.recommendation-reason,
.recommendation-gap {
  min-width: 0;
}

.recommendation-source {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  min-height: 22px;
  padding: 0 8px;
  overflow: hidden;
  border-radius: 7px;
  color: #087f6f;
  background: #ecfbf7;
  font-size: 11px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-meta {
  overflow: hidden;
  color: #798497;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-reason {
  display: -webkit-box;
  overflow: hidden;
  color: #4b5565;
  font-size: 12px;
  line-height: 1.48;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.recommendation-gap {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 7px;
  color: #087f6f;
  background: #ecfbf7;
  font-size: 11px;
  font-weight: 900;
}

.recommendation-gap.warn {
  color: #a26011;
  background: #fff3d8;
}
```

- [ ] **Step 2: Add JD interpretation grid styles**

Add these rules near `.compact-decision-grid` and `.decision-panel`:

```css
.jd-interpretation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.jd-list-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e7ebf2;
  border-radius: 8px;
  background: #ffffff;
}

.jd-list-panel > strong {
  display: block;
  min-height: 34px;
  padding: 9px 11px 0;
  color: #172033;
  font-size: 13px;
}

.jd-list-panel ul {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.jd-list-panel li {
  min-height: 34px;
  padding: 8px 11px;
  border-top: 1px solid #edf0f5;
  color: #4b5565;
  font-size: 12px;
  line-height: 1.45;
}
```

- [ ] **Step 3: Keep mobile layout single-column**

In the `@media (max-width: 960px)` block, add `.jd-interpretation-grid` to the selector that already sets grids to one column:

```css
  .starter,
  .opportunity-layout,
  .opportunity-grid,
  .jd-interpretation-grid,
  .profile-summary,
  .screening-report,
  .screening-metrics,
  .screening-grid,
  .audit-review-stack,
  .coach-grid.two-columns {
    grid-template-columns: 1fr;
  }
```

- [ ] **Step 4: Split shared table CSS and remove old shortlist-only selectors after tests pass**

After Task 2 and Task 3 pass, remove old shortlist table selectors while keeping `decision-table` styling for `KeywordMappingTable`.

Remove these selectors entirely because `MatchList` no longer renders a table:

```css
.match-table-wrap
.match-table
.match-table th
.match-table td
.match-table th:nth-child(1)
.match-table th:nth-child(2)
.match-table th:nth-child(3)
.match-table th:nth-child(4)
.match-table-row
.match-table-row:hover
.match-table-row.selected
.match-table-row:focus-visible
.match-table td strong
.match-table td span:not(.table-pill):not(.score-bar)
```

Keep or create these `decision-table` rules so `KeywordMappingTable` still renders correctly:

```css
.decision-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.decision-table th,
.decision-table td {
  border-bottom: 1px solid #edf0f5;
  color: #4b5565;
  font-size: 12px;
  text-align: left;
  vertical-align: middle;
}

.decision-table tr:last-child th,
.decision-table tr:last-child td {
  border-bottom: 0;
}
```

Then keep the existing more specific `.decision-table th`, `.decision-table td`, `.decision-table td:last-child`, and `.keyword-table td:last-child` rules that appear below `.decision-panel`.

- [ ] **Step 5: Run the full client test suite and build**

Run:

```bash
npm --prefix client test
npm --prefix client run build
```

Expected: both commands pass.

## Task 5: Browser Verification

**Files:**
- No file changes unless visual verification finds an issue.

- [ ] **Step 1: Start the local dev server**

Run:

```bash
npm run dev
```

Expected: the frontend is available at `http://127.0.0.1:5173` and the backend at `http://127.0.0.1:8787`.

- [ ] **Step 2: Open the app in the in-app browser**

Navigate to:

```text
http://127.0.0.1:5173
```

Use the sample resume flow:

1. Click `开始捕捉 Offer`.
2. Click `载入样例`.
3. Click `开始捕获`.

Expected on desktop:

- Left side shows recommendation cards, not a table.
- Each visible card includes title, source cue, city/type, match reason, and missing keyword label.
- Selected card has a clear accent and no layout jump.
- Right side shows recommendation reason, hard requirements, soft qualities, bonus points, resume focus, interview prep, risk gaps, next actions, and rewrite suggestion.
- No score, probability, ranking, or percentage confidence language appears in the recommendation UI.

- [ ] **Step 3: Verify mobile width**

Use a mobile viewport around 390px wide.

Expected:

- Shortlist stacks above the detail panel.
- Card text clamps cleanly and does not overflow.
- Tabs remain usable.
- Detail sections stack in one column.

- [ ] **Step 4: Commit implementation**

If all tests and browser checks pass:

```bash
git add client/src/App.tsx client/src/styles.css client/src/App.test.tsx
git commit -m "feat: show tencent recommendation cards"
```

Expected: commit includes only the frontend implementation and tests.

## Self-Review

- Spec coverage: The plan covers the left card shortlist, right JD detail structure, existing data flow, visual constraints, accessibility, and verification requirements.
- Placeholder scan: No placeholder steps are present. Every task includes concrete files, code, commands, and expected outcomes.
- Type consistency: The plan uses existing `JobMatch`, `ReactNode`, `recommendation`, `jdInterpretation`, `risks`, `missingKeywords`, `resumeActions`, and `rewriteExample` fields already defined in `client/src/App.tsx`.

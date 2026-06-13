# Compact Results Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace prose-heavy results UI with compact tables and metrics for faster job comparison.

**Architecture:** Keep the existing single-file React structure in `client/src/App.tsx`, adding focused helper components for metric strips, score breakdown rows, and compact tables. Update `client/src/styles.css` with table and responsive styles. Extend `client/src/App.test.tsx` to assert the new decision-workbench affordances.

**Tech Stack:** React 18, TypeScript, Vite, React Testing Library, Vitest, CSS.

---

### Task 1: Add Failing UI Coverage

**Files:**
- Modify: `client/src/App.test.tsx`

- [ ] Add assertions to the existing results test for compact table UI:
  - `岗位短名单`
  - table headers `岗位`, `匹配`, `初筛`, `缺口`
  - `决策指标`
  - `评分拆解`
  - `JD / 简历映射`

- [ ] Run `npm test -w client -- --runInBand` or `npm test -w client`.

Expected: the test fails because these labels are not implemented yet.

### Task 2: Implement Compact Tables

**Files:**
- Modify: `client/src/App.tsx`

- [ ] Replace `MatchList` card markup with a compact table preserving button-based row selection.
- [ ] Add `DecisionMetrics`, `ScoreBreakdownTable`, and `KeywordMappingTable` helper components.
- [ ] Update `SelectedOpportunity` to render the new metrics and tables before the rewrite example.
- [ ] Keep existing data fallbacks for recommendation and JD interpretation fields.

### Task 3: Add Compact Table Styling

**Files:**
- Modify: `client/src/styles.css`

- [ ] Add compact table, metric strip, score bar, and responsive overflow styles.
- [ ] Keep border radius at 8px or lower and match the current neutral workbench visual language.
- [ ] Ensure mobile layouts stack cleanly and table text truncates instead of overflowing.

### Task 4: Verify

**Files:**
- Test: `client/src/App.test.tsx`

- [ ] Run `npm test -w client`.
- [ ] Run `npm run build -w client`.
- [ ] Start or reuse the dev server and inspect the results page in the in-app browser.

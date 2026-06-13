# Job Shortlist Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-select category and city filtering to the recommended jobs table while preserving a 5-row shortlist.

**Architecture:** Keep filter state inside `ResultsDashboard`, derive filter options from `analysis.matches`, and pass the computed shortlist plus filter controls into the recommendation rail. Use small helper functions for toggling arrays and creating the filled 5-row shortlist.

**Tech Stack:** React 18, TypeScript, Vite, React Testing Library, Vitest, CSS.

---

### Task 1: Failing Test

**Files:**
- Modify: `client/src/App.test.tsx`

- [ ] Add a test flow that opens `筛选推荐岗位`, selects `校招` and `北京`, and asserts the visible shortlist has 5 selectable rows.
- [ ] Run `npm test -w client -- App.test.tsx`.
- [ ] Expected result: FAIL because the filter button is not implemented.

### Task 2: Filter State And Shortlist

**Files:**
- Modify: `client/src/App.tsx`

- [ ] Add selected category and city state to `ResultsDashboard`.
- [ ] Derive category and city options from `analysis.matches`.
- [ ] Add a `buildFilteredShortlist` helper that returns matching jobs first and fills to 5 with remaining jobs.
- [ ] Keep the selected job synchronized with the visible shortlist.

### Task 3: Filter UI

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/styles.css`

- [ ] Add a compact filter button and popover inside the recommendation rail.
- [ ] Render category and city checkboxes with selected chips.
- [ ] Style the control to match the compact table visual language.

### Task 4: Verify

**Files:**
- Test: `client/src/App.test.tsx`

- [ ] Run `npm test -w client`.
- [ ] Run `npm run build -w client`.

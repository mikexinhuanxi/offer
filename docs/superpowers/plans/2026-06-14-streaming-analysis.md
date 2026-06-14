# Streaming Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add streaming analysis so the results page can render profile, matches, resume advice, and coaching as each pipeline step completes.

**Architecture:** Keep `/api/analyze` as the existing JSON endpoint. Add a streaming pipeline generator and expose it through `/api/analyze/stream` using newline-delimited SSE events over `fetch`, then update the React app to merge partial payloads into a single analysis state.

**Tech Stack:** Express, TypeScript, React, Vite, Vitest, Fetch Streams.

---

### Task 1: Server Streaming Pipeline

**Files:**
- Modify: `server/src/skills/registry.ts`
- Modify: `server/src/index.ts`
- Test: `server/src/skills/registry.test.ts`

- [ ] Add a failing test that consumes `runOfferCatcherPipelineStream()` and expects ordered `profile_ready`, `matches_ready`, `optimizer_ready`, `coaching_ready`, and `done` events.
- [ ] Implement `runOfferCatcherPipelineStream()` by yielding after each existing pipeline step.
- [ ] Add `/api/analyze/stream` that validates input, sends `text/event-stream`, writes each yielded event, and sends an `error` event on failure.
- [ ] Run `npm run build -w server`.

### Task 2: Client Incremental Rendering

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/App.test.tsx`
- Modify: `client/src/styles.css`

- [ ] Add a failing client test that mocks a streamed response and verifies the results page appears after `matches_ready` before the final coaching event.
- [ ] Replace the JSON-only analyze call with a stream reader for `/api/analyze/stream`, with fallback-friendly SSE parsing.
- [ ] Add partial result state and lightweight loading copy for sections whose payload has not arrived yet.
- [ ] Run `npm run test -w client`.

### Task 3: Final Verification

**Files:**
- All changed files

- [ ] Run `npm run build`.
- [ ] Inspect `git diff --stat`.
- [ ] Report verified commands and changed files.

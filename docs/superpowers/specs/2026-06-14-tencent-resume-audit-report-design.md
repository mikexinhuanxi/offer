# Tencent Resume Audit Report Design

## Goal

Redesign the resume evaluation report around the Tencent campus recruit skill workflow. The UI should make the report feel like a credible review rather than a generic advice list.

The selected direction is the hybrid audit report:

1. Show rule-based scoring first.
2. Show Tencent skill checks as a compact evidence layer.
3. Follow with human-readable highlights, prioritized issues, and next actions.

## Source Behavior

The Tencent skill evaluates resumes through two layers:

- `scripts/resume_checker.py` runs seven rule checks:
  - Education background
  - Project experience
  - Skill list
  - STAR structure
  - Quantified results
  - Weak expression
  - Resume length
- `references/resume-guide.md` turns those rule hits into practical advice:
  - Use STAR structure.
  - Add measurable results.
  - Replace weak phrases such as "参与了" and "协助" with concrete ownership.
  - Keep school and education comments neutral and fact-based.
  - Only optimize true experience; do not invent or exaggerate facts.
  - Adjust emphasis by target direction, such as technical, product, game, design, or functional roles.

## Product Shape

The report should appear near the top of the results page, replacing the current generic `ScreeningReport` layout.

### Header

Show:

- Title: `简历评估报告`
- Subtitle: `自动规则检查 + 人工审阅`
- Score block: `71/100` style score, plus `5/7 通过`
- One-sentence verdict based on score and unresolved risks

The header should feel operational and scan-friendly, not like a marketing hero.

### Rule Evidence

Display the seven Tencent checks as a compact table or status grid.

Each row should include:

- Check name
- Status: `通过`, `不足`, or `建议改进`
- Short detail from the rule result

Status color should be restrained:

- Pass: green
- Warning or suggestion: amber
- Error: red only for missing critical basics

### Human Review

Below the rule evidence, show three readable sections:

- `亮点`: 2-4 strengths that should be kept and moved forward.
- `需要优先改`: 3-5 prioritized issues, ordered by impact on screening.
- `下一步修改`: 3-5 concrete actions, preferably phrased as edits the user can make immediately.

Issues can include evidence snippets when available, such as weak phrases found in the resume.

### Tencent Boundary Note

Include a small boundary note, not a large warning:

`建议只基于真实经历补充证据和表达，不编造学校、公司、奖项、项目或数据。`

This keeps the Tencent skill's integrity rule visible without making the report feel punitive.

## Data Model

Add an optional structured audit object to the existing coaching response.

```ts
interface ResumeAudit {
  score: number;
  passedCount: number;
  totalCount: number;
  verdict: {
    title: string;
    detail: string;
  };
  checks: Array<{
    id: string;
    name: string;
    status: "通过" | "不足" | "建议改进";
    severity: "error" | "warning" | "suggestion";
    passed: boolean;
    detail: string;
  }>;
  highlights: string[];
  prioritizedIssues: Array<{
    title: string;
    evidence?: string;
    suggestion: string;
  }>;
  nextActions: string[];
  integrityNote: string;
}
```

`TencentCoaching.resumeReview` should remain for compatibility. The new UI can use `resumeAudit` when present and fall back to the current `resumeReview` fields when absent.

## Backend Design

Create a small deterministic audit builder in `server/src/skills/tencentCoach.ts` or a nearby focused module.

Inputs:

- Raw resume text
- Parsed `CandidateProfile`
- Top job matches
- Existing `ResumeReview`

Responsibilities:

- Reproduce the seven Tencent rule checks in TypeScript, matching `resume_checker.py` semantics closely enough for this product.
- Compute score from passed checks.
- Convert check messages into UI-friendly details.
- Derive highlights from parsed strengths, projects, skills, tools, and match evidence.
- Derive prioritized issues from failed checks, profile risks, top match risks, and missing keywords.
- Keep all suggestions grounded in resume text or known match data.

No external model call is required for this first implementation.

## Frontend Design

Update `client/src/App.tsx`:

- Extend the TypeScript interfaces with `ResumeAudit`.
- Replace the current four-card `ScreeningReport` with the hybrid audit layout.
- Keep `MiniMetric` or similar small primitives where useful.
- Add focused components if the JSX becomes hard to read:
  - `AuditScoreCard`
  - `AuditCheckTable`
  - `AuditReviewColumn`
  - `PriorityIssueList`

Update `client/src/styles.css`:

- Use dense, workbench-like layout.
- Avoid nested cards.
- Keep the score block visually strong but compact.
- Ensure the rule table and issue list fit on mobile without horizontal overflow.

## Fallback Behavior

If `resumeAudit` is missing:

- Build a lightweight fallback from existing `resumeReview`, top match risks, and missing keywords.
- Do not show fake rule pass/fail details.
- Show the current verdict logic as a compatibility path.

If resume text is very short:

- Score should drop through length and missing content checks.
- The primary next action should be to complete basic resume sections before job tailoring.

## Testing

Add or update tests for:

- Backend audit builder returns seven checks and a stable score.
- Weak expressions such as `协助` or `参与了` produce `建议改进`.
- Missing quantification produces an issue.
- Frontend renders the report title, score, check names, priority issues, and integrity note.
- Existing responses without `resumeAudit` still render.

## Non-Goals

- Do not redesign the whole results page.
- Do not add another model call just for the report.
- Do not expose internal scoring weights or imply Tencent official screening probability.
- Do not make school or education value judgments.

# Tencent Job Recommendation UI Design

## Context

Offer Catcher currently renders Tencent job recommendations in a split results workbench: a left shortlist and a right detail panel. The Tencent Campus Recruit skill recommends jobs in a specific output style: 3-5 real jobs from `join.qq.com`, no scores or probabilities, a brief match reason, official source context, JD interpretation, risk gaps, next actions, and an application link.

The goal is to make the UI feel closer to that skill output while keeping the efficient workbench layout.

## Decision

Use Option B: keep the left shortlist plus right detail workbench, but replace the current left table with Tencent-style recommendation cards.

The left side should help users scan the recommended jobs quickly. The right side should help users understand and act on the selected recommendation.

## Left Shortlist

Replace the table rows with compact recommendation cards. Each card shows:

- Job title.
- City and recruit type.
- Tencent official source cue, using the existing `recommendation.sourceLabel` when available.
- One concise match reason from `recommendation.matchReason` or the first `reasons` item.
- Missing keyword or risk cue, shown as a neutral count such as `3 个待补关键词`.
- Selected state with a clear left accent and subtle background.

The card list keeps existing behavior:

- Clicking or keyboard activating a card selects the job.
- Filters for job category and city continue to work.
- Empty state remains available when filters hide every job.
- The displayed order follows the backend/Tencent skill result order.

The UI must not display match score, screening probability, ranking algorithm language, or percentage-based confidence.

## Right Detail Panel

Keep the selected job detail panel and organize it around the Tencent skill structure:

- Job basic information: company, title, city, recruit type.
- Application link, if available.
- Recommendation reason and source label.
- JD interpretation sections:
  - Hard requirements.
  - Soft qualities.
  - Bonus points, when available.
  - Resume focus.
  - Interview prep.
- Risk gaps from `match.risks`.
- Next actions from `match.resumeActions`.
- Rewrite suggestion from `match.rewriteExample`.

The panel should lead with the recommendation reason, then move into JD interpretation and actions. This mirrors the skill's "先结论后解释" style while still supporting deeper reading.

## Data Flow

No backend data contract change is required.

The UI should use existing fields:

- `match.job.title`, `match.job.city`, `match.job.type`, `match.job.company`, `match.job.link`.
- `match.recommendation.summary`, `match.recommendation.matchReason`, `match.recommendation.sourceLabel`.
- `match.recommendation.jdInterpretation`.
- `match.reasons`, `match.risks`, `match.missingKeywords`, `match.resumeActions`, `match.rewriteExample`.

Fallbacks should preserve current behavior when `recommendation` is absent.

## Visual Behavior

The recommendation area should remain dense and work-focused:

- Use 8px radius or less, matching the current design system.
- Avoid nested cards.
- Keep row/card heights stable so selecting a job does not shift the layout.
- Use neutral colors with the existing green accent for source and selected state.
- Keep long titles and reasons clamped on the left, with full detail visible on the right.
- Preserve responsive behavior: on narrow screens the shortlist stacks above the detail panel.

## Accessibility

Recommendation cards should remain keyboard accessible:

- Use button elements or preserve row-like keyboard handlers with `Enter` and `Space`.
- Maintain visible focus styling.
- Expose selected state with `aria-current` or `aria-pressed`.
- Keep the shortlist section labeled for screen readers.

## Testing

Verification should include:

- Unit or component-level assertions for recommendation card rendering if current test setup supports it.
- Existing app tests.
- TypeScript check.
- Manual browser verification on desktop and mobile width.
- Confirm no score/probability/ranking language appears in the recommendation UI.

## Out of Scope

- Backend matching changes.
- Tencent skill script changes.
- New scoring or ranking logic.
- New saved job workflow.
- Changing resume, interview, or mock interview tabs beyond preserving selected job context.

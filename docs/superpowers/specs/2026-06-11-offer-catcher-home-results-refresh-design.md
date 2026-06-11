# Offer Catcher Home and Results Refresh Design

## Goal

Refresh Offer 捕手 with a memorable first screen and a calmer, clearer results experience. The app should open on an independent "Offer 捕手" home screen, use the React Bits `TrueFocus` component for the large title effect, then transition into the existing resume upload workflow. After analysis, results should move away from the current tab-heavy workbench into a more direct recommendation and coaching surface.

## User Flow

1. The user lands on a standalone home screen.
2. The home screen shows a large animated "Offer 捕手" title, compact service/job status, and one primary action: "开始捕捉 Offer".
3. Clicking the action switches the app into the upload page without requiring scroll navigation.
4. The upload page keeps the existing resume upload/paste, sample resume, analysis progress, and backend status behavior.
5. After analysis, the results page opens as a recommendation dashboard:
   - a candidate summary strip,
   - a prioritized selected-job area,
   - a concise job list,
   - and coaching sections for resume, tailoring, interview, mock interview, and group/HR prep.

## Home Screen

The selected direction is "聚焦捕手".

- Use a dark, minimal, product-like first screen rather than a marketing landing page.
- Render the main title through `TrueFocus` with sentence `Offer 捕手`.
- Keep the title as the first-viewport signal and avoid extra explanatory copy.
- Add a single primary button to enter the upload page.
- Keep status pills visible but secondary: job count, service connection state, and model name.
- Use a restrained scan-grid or focus-frame feel, with no decorative blobs or heavy gradients.
- Respect reduced-motion preferences by keeping the page usable if animation is disabled or slow.

## Component Integration

Add `motion` as a client dependency and place the React Bits component in the client source tree, for example:

- `client/src/components/TrueFocus.tsx`
- `client/src/components/TrueFocus.css`

The component should stay close to the provided JavaScript + CSS source, with TypeScript typing added if needed. The app imports the component and CSS from the component module.

Preferred props:

- `sentence="Offer 捕手"`
- `manualMode={false}`
- `blurAmount={4}`
- `borderColor="#15d7bc"`
- `glowColor="rgba(21, 215, 188, 0.55)"`
- `animationDuration={0.7}`
- `pauseBetweenAnimations={1.1}`

## Upload Page

The upload page should keep the current functional surface and become the second app state instead of the initial screen.

- Preserve file upload, text paste, sample resume, start matching, and source status.
- Keep cards at 8px border radius or less.
- Keep the layout quiet and tool-like after the home screen.
- When results exist, keep upload controls accessible but compact, so the user can run another analysis without returning to the home screen.
- Show error banners in the upload/results state rather than on the home screen unless a landing status call fails critically.

## Results Page

Replace the tab-first presentation with a selected-opportunity dashboard.

- Candidate summary remains near the top, condensed into a scanning strip.
- The left or top rail lists recommended jobs as compact cards with company, role, city, fit label, and source label.
- The selected job detail becomes the main result card:
  - recommendation summary,
  - why this job fits,
  - official JD focus,
  - risks or gaps,
  - missing keywords,
  - next resume actions.
- Do not emphasize numeric scores, percentages, pass rates, or ranking algorithms.
- Coaching content appears as clear sections below or beside the selected job:
  - 简历诊断
  - 岗位定制
  - 面试准备
  - 模拟面试
  - 群面/HR
- Use section cards, chips, and short action lists instead of deep tabs.
- Keep all existing analysis data contracts intact unless a small view-model helper makes rendering cleaner.

## State Model

The frontend can use a simple page state:

- `home`: default state, no upload controls visible.
- `upload`: upload and progress controls visible.
- `results`: upload controls compact, results visible.

Existing analysis state continues to drive selected job, progress, errors, and backend job information. Returning from results to upload should not erase the current resume text unless the user edits or replaces it.

## Error Handling

- If `/api/health` or `/api/jobs` fails, show a quiet unavailable status and keep the home CTA enabled.
- If resume extraction fails, stay on upload and show the existing error banner.
- If analysis fails, keep the resume text and show the error banner near the upload controls.
- If no matches are returned, show an empty results state with a practical next action: edit resume text or retry after refreshing jobs.

## Testing

Implementation should be verified by:

- `npm install` or targeted dependency install if needed for `motion`.
- `npm run build`
- Browser check at desktop width for:
  - home screen,
  - home CTA entering upload,
  - upload page,
  - sample resume analysis path,
  - results dashboard.
- Browser check at a mobile-ish viewport for title fit, button fit, upload controls, and results cards.
- Confirm `.env` remains ignored and no visual companion files are committed.

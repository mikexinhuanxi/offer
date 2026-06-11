# White Home and Task Tabs Design

## Goal

Refresh Offer 捕手 so the entry screen, upload workflow, and results dashboard feel like one coherent white workspace. The home page should lose the dark standalone treatment and remove the noisy right-side status pills. The upload and results pages should be reorganized for scanning, with results split into attractive task-oriented tabs instead of placing every recommendation and coaching section in one long page.

## Scope

- Change the home screen from dark to white.
- Remove the home top-right status pills for job count, service connection state, and model name.
- Keep the main `Offer 捕手` title and primary entry action.
- Rebuild the upload page into a clearer workbench layout.
- Fix analysis progress text overflow.
- Rebuild the results page around job selection plus task tabs.
- Keep all backend API contracts and analysis response types unchanged.

## Home Screen

The home page becomes a quiet white first screen that visually matches the later app states.

- Use the same white and light-gray surface language as the upload and results pages.
- Keep `Offer 捕手` as the primary first-viewport signal.
- Keep one primary action: `开始捕捉 Offer`.
- Remove the visible home status row that currently shows job count, service connection, and model name.
- Keep status fetching in state so upload and results pages can still use job source information where useful.
- Use the existing `TrueFocus` component, restyled for dark text on a white background.

## Upload Page

The upload page should feel like a workbench instead of a marketing hero followed by two cards.

- Use a compact top bar with brand only.
- Keep the upload area, resume textarea, sample resume, and start matching action.
- Place analysis progress in a dedicated side panel on desktop and below the upload card on smaller screens.
- Keep job source information close to the upload action, but avoid making global status pills visually dominant.
- When results exist, keep upload controls accessible in a compact form for reruns.

## Progress Layout

The current compact result-state progress grid can force step names outside their boundaries. Replace that fragile grid behavior with a layout that allows text to wrap and cards to keep stable width.

- Use `min-width: 0`, normal wrapping, and compact row spacing.
- In result state, use an auto-fitting compact step grid rather than six fixed columns.
- Do not use `white-space: nowrap` on progress step titles.
- Keep step dots fixed-size so icons and numbers do not shift layout.

## Results Page

The selected direction is task-oriented tabs.

- Keep a left rail of recommended jobs.
- The right panel changes based on the selected job.
- Add a polished tab bar with these tabs:
  - `推荐概览`
  - `简历优化`
  - `面试准备`
  - `模拟 & HR`
- The active tab should be visually clear, keyboard-accessible, and responsive.
- `推荐概览` contains the selected job hero, recommendation reason, JD hard requirements, resume focus, risks, missing keywords, and rewrite example.
- `简历优化` contains global resume review plus selected-job tailoring.
- `面试准备` contains selected-job interview prep and JD interview topics.
- `模拟 & HR` contains mock interview questions plus group and HR prep.

## Empty And Error States

- If analysis has no matches, show a concise empty state inside the results panel.
- If health or job source loading fails, keep the primary flow usable.
- Resume extraction and analysis errors stay near the upload workbench.

## Testing

Automated tests should cover the user-visible changes:

- Home starts on a white home screen and does not render the removed home status labels.
- The CTA enters the upload page.
- Running analysis shows a tablist.
- The default results tab is `推荐概览`.
- Switching to `简历优化` shows resume and tailoring content.
- The old assertion that no tablist exists must be replaced.

Manual browser verification should check:

- Desktop home, upload, and results layouts.
- Desktop result tab switching.
- Mobile-ish widths for home title fit, upload layout, progress wrapping, and tab wrapping.

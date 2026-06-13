# Compact Results Tables Design

## Goal

Reduce visual fatigue in the results page by replacing dense prose blocks with compact tables, metric strips, and concise decision fields.

## Approved Direction

The user selected the table-first direction and confirmed the compact variant. The implementation should make the results page feel like a job decision workbench instead of a reading-heavy report.

## Scope

- Convert the recommendation rail from prose-heavy cards into a compact shortlist table.
- Add a compact screening metric strip to the resume screening report.
- Convert the selected opportunity overview into a decision-oriented layout:
  - primary metrics for score, screening probability, missing keywords, action count, and fit level
  - score breakdown table
  - JD-to-resume mapping table
  - compact risk and action lists
- Preserve the existing result tabs, category switch, selection behavior, and coaching tab content.
- Keep implementation in React and CSS without adding a charting dependency.

## Responsive Behavior

- Desktop keeps the two-column results layout.
- Compact tables may horizontally scroll on narrow screens.
- Metric strips wrap into fewer columns on mobile.

## Testing

- Add React Testing Library coverage for the new compact table labels and fields.
- Keep existing selection and tab-switching tests passing.

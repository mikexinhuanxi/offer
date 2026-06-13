# Job Shortlist Filter Design

## Goal

Add an elegant filter control to the recommended jobs area so users can filter by job category and work location without losing the compact table workflow.

## Approved Behavior

- Add a `筛选` button in the recommended jobs panel.
- Clicking it opens a compact panel with checkbox filters.
- Filters support multiple selections for:
  - job category: `实习`, `校招`
  - work location: cities derived from current match results
- Filters update the shortlist immediately.
- The shortlist always attempts to show 5 rows:
  - matching rows appear first
  - if fewer than 5 rows match, remaining jobs fill the list by score
  - if the total available jobs are fewer than 5, all jobs are shown
- If the selected job is no longer in the visible shortlist, select the first visible row.

## UI Notes

The filter control should feel calm and workbench-like: small button, quiet panel, clear checked state, and selected filter chips. It should not compete with the result tabs or selected job detail.

## Testing

Add React Testing Library coverage for opening the filter, selecting category/location checkboxes, and confirming the shortlist still renders 5 rows.

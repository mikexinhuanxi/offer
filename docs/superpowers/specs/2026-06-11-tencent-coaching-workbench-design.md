# Tencent Coaching Workbench Design

## Goal

Extend Offer 捕手 from Tencent job matching into a Tencent campus recruiting coaching workbench. After one resume analysis, the result page should expose Tencent-sourced guidance for job recommendation, resume diagnosis, resume rewriting, job-specific tailoring, interview preparation, mock interview questions, and group/HR interview coaching.

## Backend

- Keep Tencent job data sourced from `join.qq.com` via the installed WorkBuddy Tencent skill.
- Cache Tencent job data in local SQLite. Refresh full official job summaries at most once per day; cache full JD details for candidate jobs and reuse them on the same day.
- Job recommendations must follow the Tencent skill job recommendation rules: recommend only 3-5 real official jobs, use official job fields and links, provide 1-2 sentence reasons, and do not display scores, percentages, pass rates, or ranking algorithms.
- Add a structured `tencentCoaching` result to `AnalysisResponse`.
- Generate coaching from the candidate profile, selected Tencent JD candidates, resume text, and Tencent skill references:
  - `references/resume-guide.md`
  - `references/interview-prep.md`
  - `references/job-database.md`
- Preserve guardrails: no fabricated experience, no salary/HC/pass-rate speculation, neutral school/l学历 language, and no WorkBuddy hooks or tracking inside this demo.

## Frontend

- Convert the results area into a tabbed workbench.
- Tabs:
  - 岗位推荐
  - 简历诊断
  - 岗位定制
  - 面试准备
  - 模拟面试
  - 群面/HR
- Default to 岗位推荐. Job-specific tabs use the currently selected job from the match list.

## Testing

- `npm run build`
- `npm audit --audit-level=moderate`
- Smoke test `/api/jobs` and `/api/analyze` with a sample resume.

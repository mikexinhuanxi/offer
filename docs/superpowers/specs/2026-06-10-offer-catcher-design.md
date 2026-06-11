# Offer Catcher Design

## Goal

Build a real AI-powered web demo for "Offer 捕手", a student job-matching agent. The first screen should feel like a usable product prototype, not a marketing page. The user uploads a resume, while the backend reads a prepared job dataset. The agent extracts the candidate profile, searches the job pool, scores fit, and generates resume optimization advice for target roles.

## Product Flow

1. The user uploads or pastes a resume.
2. The backend loads job information from `server/data/jobs.json`, `server/data/jobs.csv`, or a configured `JOBS_FILE` path.
3. The agent runs a visible skill pipeline:
   - Resume parsing skill
   - Job retrieval skill
   - Match scoring skill
   - Resume optimization skill
4. The page shows a ranked job list with match scores, reasons, risks, and key missing keywords.
5. Selecting a job opens a diagnosis panel with screening pass probability, score breakdown, and resume rewrite suggestions.

## Skill Model

The demo uses a pluggable skill registry in the backend. Each skill has a name, purpose, input contract, output contract, and implementation function.

For the initial demo, the repository includes general-purpose built-in skills:

- `resumeParser`: extracts structured candidate profile fields from resume text with Alibaba Cloud Model Studio.
- `jobRetriever`: filters and normalizes the uploaded job pool using deterministic code.
- `matchScorer`: combines deterministic keyword scoring with model-based semantic reasoning.
- `resumeOptimizer`: generates role-specific resume advice and rewrite examples with the model.

This design reflects the user's requirement to use existing-style skills. The built-in skills are intentionally generic and replaceable, so future versions can call platform skills, third-party parsing services, vector search, or a dedicated scoring service without changing the frontend workflow.

## Data Inputs

Resume input supports:

- Plain text paste
- `.txt`, `.md`, `.json`, and `.csv` text-based uploads
- `.pdf` and `.docx` uploads with graceful fallback messaging if local extraction is limited

Job data supports:

- Built-in demo jobs if no backend data file exists
- Backend JSON files
- Backend CSV files

Expected job fields:

- `company`
- `title`
- `city`
- `type`
- `description`
- `requirements`
- `bonus`
- `link`
- `deadline`

Missing fields are tolerated. The backend normalizes available fields before matching.

## Technical Architecture

Frontend:

- Vite
- React
- TypeScript
- Single-page dashboard
- Framer Motion-style interaction if dependencies are available; CSS fallback if not
- Visual style inspired by React Bits: clean layout, animated glow borders, subtle particles, glass-like panels, and polished transitions

Backend:

- Node.js
- Express
- Alibaba Cloud Model Studio through OpenAI-compatible Chat Completions
- Environment variables:
  - `DASHSCOPE_API_KEY`
  - `DASHSCOPE_BASE_URL`, default `https://dashscope.aliyuncs.com/compatible-mode/v1`
  - `DASHSCOPE_MODEL`, default `qwen-plus`
  - `JOBS_FILE`, optional explicit backend job data path

API endpoints:

- `GET /api/health`: reports server and model configuration status.
- `GET /api/jobs`: reports loaded backend job count and source.
- `POST /api/analyze`: runs the complete skill pipeline and returns structured results.

## AI Contract

The backend asks the model to return strict JSON. The server attempts JSON repair only for minor formatting issues. If the model response cannot be parsed, the server returns a clear error instead of showing fabricated results.

The model must not invent live job listings. It can only reason over the uploaded or built-in job pool.

## Error Handling

- Missing API key: show a setup prompt and keep sample UI usable.
- Empty resume: request resume content before running analysis.
- Empty job pool: load built-in jobs or ask the user to place a valid job file under `server/data`.
- Model/network failure: show the failed skill step and a concise error message.
- Invalid JSON/CSV: show parser errors and keep the previous valid job pool.

## Visual Design

The app uses a minimalist card layout. The first screen should feel like a polished student-facing tool instead of an AI operations console.

- Light neutral background with white cards, fine borders, and soft shadows
- A compact product header with the title "Offer 捕手" and a quiet status row
- A primary resume upload card before analysis
- Results appear progressively after analysis: job ranking, selected role diagnosis, and resume advice
- "Skill Trace" is renamed to "分析进度" to reduce AI-console language
- Alibaba Cloud Model Studio status is kept visible but visually secondary
- React Bits-inspired local effects are used sparingly:
  - gradient text for the product name and important numbers
  - spotlight hover cards for upload and result cards
  - fade-in/slide-up content entrance
  - subtle glare on the primary action button
  - smooth animated score rings and progress bars

The page should remain an actual tool. Decorative effects must not obscure text, reduce contrast, or make the workflow feel like a component showcase.

## Verification

Implementation should be verified by:

- Installing dependencies
- Starting frontend and backend
- Opening the local page in the browser
- Checking desktop and mobile-ish viewport layout
- Running the analysis flow in missing-key state
- Running the analysis flow with API if `DASHSCOPE_API_KEY` is available

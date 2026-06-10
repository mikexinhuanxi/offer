# Offer Catcher Design

## Goal

Build a real AI-powered web demo for "Offer 捕手", a student job-matching agent. The first screen should feel like a usable product prototype, not a marketing page. The user uploads a resume and a prepared job dataset, then the agent extracts the candidate profile, searches the job pool, scores fit, and generates resume optimization advice for target roles.

## Product Flow

1. The user uploads or pastes a resume.
2. The user imports job information from CSV, JSON, or a built-in sample set.
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

Job input supports:

- Built-in demo jobs
- CSV paste or upload
- JSON paste or upload

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

API endpoints:

- `GET /api/health`: reports server and model configuration status.
- `POST /api/analyze`: runs the complete skill pipeline and returns structured results.

## AI Contract

The backend asks the model to return strict JSON. The server attempts JSON repair only for minor formatting issues. If the model response cannot be parsed, the server returns a clear error instead of showing fabricated results.

The model must not invent live job listings. It can only reason over the uploaded or built-in job pool.

## Error Handling

- Missing API key: show a setup prompt and keep sample UI usable.
- Empty resume: request resume content before running analysis.
- Empty job pool: load built-in jobs or ask the user to upload jobs.
- Model/network failure: show the failed skill step and a concise error message.
- Invalid JSON/CSV: show parser errors and keep the previous valid job pool.

## Visual Design

The app uses a product-workbench layout with a more luminous finish:

- Dark gradient canvas with subtle grid and particle effects
- Glass panels with restrained glow borders
- Upload zones with animated focus states
- Skill execution trace as a live vertical rail
- Ranked job cards with compact score chips
- Right-side diagnosis panel with score rings, bars, and action-oriented suggestions

The page should remain an actual tool. Decorative effects must not obscure text, reduce contrast, or make the workflow feel like a landing page.

## Verification

Implementation should be verified by:

- Installing dependencies
- Starting frontend and backend
- Opening the local page in the browser
- Checking desktop and mobile-ish viewport layout
- Running the analysis flow in missing-key state
- Running the analysis flow with API if `DASHSCOPE_API_KEY` is available


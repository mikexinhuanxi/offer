import { execFile as execFileCallback } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { CandidateProfile, Job } from "./types.js";

const execFile = promisify(execFileCallback);

const DEFAULT_TENCENT_SKILL_DIR =
  "/Users/mike/.workbuddy/skills/skill_2054903442024890368";
const SCRIPT_RELATIVE_PATH = "scripts/fetch_recruit_jds.py";
const TENCENT_SOURCE_LABEL =
  "腾讯校招官网 join.qq.com via Tencent Campus Recruit skill";
const SCRIPT_TIMEOUT_MS = 45_000;
const SCRIPT_MAX_BUFFER = 8 * 1024 * 1024;

export interface TencentPosition {
  post_id?: unknown;
  title?: unknown;
  project_name?: unknown;
  recruit_label?: unknown;
  bgs?: unknown;
  work_cities?: unknown;
  apply_url?: unknown;
  match_reasons?: unknown;
  jd?: TencentJd;
}

export interface TencentJd {
  post_id?: unknown;
  title?: unknown;
  direction?: unknown;
  project_name?: unknown;
  recruit_label?: unknown;
  description?: unknown;
  requirements?: unknown;
  graduate_bonus?: unknown;
  intern_bonus?: unknown;
  introduction?: unknown;
  departments?: unknown;
  department_bg_names?: unknown;
  work_cities?: unknown;
  apply_url?: unknown;
}

interface TencentMatchOutput {
  success?: boolean;
  source?: string;
  message?: string;
  matches?: TencentPosition[];
}

interface TencentAllOutput {
  success?: boolean;
  count?: unknown;
  message?: string;
  positions?: TencentPosition[];
}

interface TencentDetailOutput {
  success?: boolean;
  message?: string;
  jd?: TencentJd;
}

export function getJobSourceProvider() {
  const value = process.env.JOB_SOURCE_PROVIDER?.trim().toLowerCase();
  if (value === "local" || value === "tencent") {
    return value;
  }
  return "auto";
}

export async function loadTencentSkillJobs(resumeOrProfile: string | CandidateProfile) {
  const query =
    typeof resumeOrProfile === "string"
      ? resumeOrProfile.trim().slice(0, 5000)
      : buildProfileQuery(resumeOrProfile);
  const result = await runTencentScript<TencentMatchOutput>([
    "match",
    query,
    "--top-n",
    process.env.TENCENT_SKILL_TOP_N ?? "5",
    "--detail-candidates",
    process.env.TENCENT_SKILL_DETAIL_CANDIDATES ?? "10",
    "--max-pages",
    process.env.TENCENT_SKILL_MAX_PAGES ?? "8"
  ]);

  if (!result.success) {
    throw new Error(result.message || "腾讯校招 skill 未返回可用结果。");
  }

  const jobs = (result.matches ?? []).map(mapTencentPositionToJob).filter(isJob);
  if (jobs.length === 0) {
    throw new Error("腾讯校招 skill 未匹配到可用岗位。");
  }

  return {
    jobs,
    count: jobs.length,
    source: TENCENT_SOURCE_LABEL
  };
}

export async function loadTencentSkillStatus() {
  const result = await runTencentScript<TencentAllOutput>([
    "all",
    "--max-pages",
    "1",
    "--page-size",
    "1"
  ]);

  if (!result.success) {
    throw new Error(result.message || "腾讯校招 skill 状态检查失败。");
  }

  return {
    jobs: (result.positions ?? []).map(mapTencentPositionToJob).filter(isJob),
    count: numberOrFallback(result.count, result.positions?.length ?? 0),
    source: TENCENT_SOURCE_LABEL
  };
}

export async function fetchTencentPositionSummaries() {
  const result = await runTencentScript<TencentAllOutput>([
    "all",
    "--max-pages",
    process.env.TENCENT_SKILL_ALL_MAX_PAGES ?? "50",
    "--page-size",
    process.env.TENCENT_SKILL_ALL_PAGE_SIZE ?? "100"
  ]);

  if (!result.success) {
    throw new Error(result.message || "腾讯校招 skill 全量岗位摘要抓取失败。");
  }

  return {
    count: numberOrFallback(result.count, result.positions?.length ?? 0),
    positions: result.positions ?? []
  };
}

export async function fetchTencentPositionDetail(postId: string) {
  const result = await runTencentScript<TencentDetailOutput>(["detail", postId]);
  if (!result.success || !result.jd) {
    throw new Error(result.message || `腾讯校招 skill 未获取到岗位详情：${postId}`);
  }
  return result.jd;
}

export async function loadTencentResumeGuidance() {
  return loadTencentReference("resume-guide.md", 6000);
}

export async function loadTencentCoachingReferences() {
  const [resumeGuide, interviewPrep, jobDatabase] = await Promise.all([
    loadTencentReference("resume-guide.md", 5000),
    loadTencentReference("interview-prep.md", 7000),
    loadTencentReference("job-database.md", 5000)
  ]);

  return {
    resumeGuide,
    interviewPrep,
    jobDatabase
  };
}

async function loadTencentReference(fileName: string, limit: number) {
  const skillDir = getTencentSkillDir();
  const guidePath = resolve(skillDir, "references", fileName);
  try {
    const content = await readFile(guidePath, "utf8");
    return content.slice(0, limit);
  } catch {
    return "";
  }
}

function buildProfileQuery(profile: CandidateProfile) {
  const pieces = [
    profile.major,
    profile.degree,
    profile.education,
    ...profile.targetRoles,
    ...profile.cities,
    ...profile.skills,
    ...profile.tools,
    ...profile.languages,
    ...profile.keywords,
    ...profile.internships.slice(0, 3),
    ...profile.projects.slice(0, 4),
    ...profile.strengths.slice(0, 4)
  ];

  return pieces
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 5000);
}

async function runTencentScript<T>(args: string[]): Promise<T> {
  const skillDir = getTencentSkillDir();
  const scriptPath = resolve(skillDir, SCRIPT_RELATIVE_PATH);
  await ensureReadable(scriptPath);

  const pythonCandidates = [
    process.env.TENCENT_SKILL_PYTHON?.trim(),
    "python3",
    "python"
  ].filter(Boolean) as string[];

  const errors: string[] = [];
  for (const pythonBin of pythonCandidates) {
    try {
      const { stdout } = await execFile(pythonBin, [scriptPath, ...args, "--compact"], {
        cwd: skillDir,
        timeout: SCRIPT_TIMEOUT_MS,
        maxBuffer: SCRIPT_MAX_BUFFER,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8"
        }
      });
      return parseJson<T>(stdout);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${pythonBin}: ${message}`);
      if (!message.includes("ENOENT")) {
        break;
      }
    }
  }

  throw new Error(`腾讯校招 skill 脚本执行失败：${errors.join("；")}`);
}

function getTencentSkillDir() {
  return process.env.TENCENT_SKILL_DIR?.trim() || DEFAULT_TENCENT_SKILL_DIR;
}

async function ensureReadable(filePath: string) {
  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new Error(`未找到腾讯校招 skill 脚本：${filePath}`);
  }
}

function parseJson<T>(stdout: string): T {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const jsonText = start >= 0 && end > start ? text.slice(start, end + 1) : text;
  return JSON.parse(jsonText) as T;
}

export function mapTencentPositionToJob(position: TencentPosition): Partial<Job> | null {
  const jd = isObject(position.jd) ? position.jd : {};
  const postId = stringValue(jd.post_id) || stringValue(position.post_id);
  if (!postId) {
    return null;
  }

  const departments = textValue(jd.departments);
  const bgNames = textValue(jd.department_bg_names) || stringValue(position.bgs);
  const city = textValue(jd.work_cities) || textValue(position.work_cities) || "不限";
  const type =
    stringValue(jd.recruit_label) ||
    stringValue(position.recruit_label) ||
    stringValue(jd.project_name) ||
    stringValue(position.project_name) ||
    "腾讯校招";

  return {
    id: `tencent-${postId}`,
    company: "腾讯",
    title: stringValue(jd.title) || stringValue(position.title) || "腾讯校招岗位",
    city,
    type,
    description: joinSections([
      stringValue(jd.direction) ? `岗位方向：${stringValue(jd.direction)}` : "",
      departments ? `招聘部门：${departments}` : "",
      bgNames ? `BG/组织：${bgNames}` : "",
      stringValue(jd.description) || stringValue(jd.introduction)
    ]),
    requirements: stringValue(jd.requirements),
    bonus: joinSections([
      stringValue(jd.graduate_bonus),
      stringValue(jd.intern_bonus),
      stringValue(jd.project_name) || stringValue(position.project_name)
    ]),
    link:
      stringValue(jd.apply_url) ||
      stringValue(position.apply_url) ||
      `https://join.qq.com/post_detail.html?postid=${encodeURIComponent(postId)}`,
    deadline: "",
    skillMatchReasons: arrayTextValue(position.match_reasons)
  };
}

function joinSections(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean).join("\n");
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join(" / ");
  }
  if (isObject(value)) {
    return stringValue(value.name) || stringValue(value.title) || stringValue(value.label);
  }
  return stringValue(value);
}

function arrayTextValue(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(textValue).filter(Boolean);
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function numberOrFallback(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isJob(value: Partial<Job> | null): value is Partial<Job> {
  return value !== null;
}

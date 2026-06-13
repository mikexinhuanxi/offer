import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  fetchTencentPositionDetail,
  fetchTencentPositionSummaries,
  mapTencentPositionToJob,
  type TencentJd,
  type TencentPosition
} from "./tencentSkill.js";
import type { CandidateProfile, Job } from "./types.js";

const CACHE_SOURCE_LABEL = "腾讯校招官网 join.qq.com via daily Tencent skill cache";
const DEFAULT_DB_FILE = "data/tencent-jobs.sqlite";
const DEFAULT_TOP_N = 5;
const DEFAULT_DETAIL_CANDIDATES = 12;

interface CacheRow {
  post_id: string;
  summary_json: string;
  detail_json?: string;
  search_text: string;
  detail_date?: string;
}

interface RankedPosition {
  row: CacheRow;
  score: number;
  matchedTerms: string[];
}

export async function loadTencentCachedStatus() {
  await ensureDailySummaryCache();
  const db = await openCacheDb();
  try {
    return {
      jobs: [],
      count: getOfficialCount(db),
      source: CACHE_SOURCE_LABEL
    };
  } finally {
    db.close();
  }
}

export async function loadTencentCachedJobs(profile: CandidateProfile) {
  await ensureDailySummaryCache();
  const db = await openCacheDb();
  try {
    const ranked = rankCachedPositions(db, profile);
    await ensureDetailsForCandidates(db, selectRankedPositionsByCategory(ranked, detailCandidateCount()));
    const refreshed = rankCachedPositions(db, profile);
    const jobs = selectDetailedJobsByCategory(
      refreshed.map((item) => rowToJob(item.row)).filter(isJobWithDetail),
      topN()
    );

    if (jobs.length === 0) {
      throw new Error("腾讯岗位缓存中没有可推荐的完整 JD。");
    }

    return {
      jobs,
      count: jobs.length,
      source: CACHE_SOURCE_LABEL
    };
  } finally {
    db.close();
  }
}

export async function refreshTencentJobCache(options: { includeDetails?: boolean } = {}) {
  const db = await openCacheDb();
  try {
    const positions = await refreshSummaryCache(db);
    let detailCount = 0;
    if (options.includeDetails) {
      detailCount = await refreshDetailsForPositions(db, positions);
    }
    return {
      count: positions.length,
      detailCount,
      source: CACHE_SOURCE_LABEL
    };
  } finally {
    db.close();
  }
}

async function ensureDailySummaryCache() {
  const db = await openCacheDb();
  try {
    const cachedDate = getMetadata(db, "summary_date");
    if (cachedDate === todayKey() && getCachedRowCount(db) > 0) {
      return;
    }
    try {
      await refreshSummaryCache(db);
    } catch (error) {
      if (getCachedRowCount(db) > 0) {
        return;
      }
      throw error;
    }
  } finally {
    db.close();
  }
}

async function refreshSummaryCache(db: DatabaseSync) {
  const result = await fetchTencentPositionSummaries();
  const today = todayKey();
  db.exec("BEGIN");
  try {
    const upsert = db.prepare(`
      INSERT INTO tencent_jobs (
        post_id, title, project_name, recruit_label, bgs, work_cities, apply_url,
        summary_json, search_text, summary_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(post_id) DO UPDATE SET
        title = excluded.title,
        project_name = excluded.project_name,
        recruit_label = excluded.recruit_label,
        bgs = excluded.bgs,
        work_cities = excluded.work_cities,
        apply_url = excluded.apply_url,
        summary_json = excluded.summary_json,
        search_text = excluded.search_text,
        summary_date = excluded.summary_date
    `);

    const seen = new Set<string>();
    for (const position of result.positions) {
      const postId = stringValue(position.post_id);
      if (!postId) {
        continue;
      }
      seen.add(postId);
      upsert.run(
        postId,
        stringValue(position.title),
        stringValue(position.project_name),
        stringValue(position.recruit_label),
        stringValue(position.bgs),
        stringValue(position.work_cities),
        stringValue(position.apply_url),
        JSON.stringify(position),
        buildSearchText(position),
        today
      );
    }

    const removeStale = db.prepare("DELETE FROM tencent_jobs WHERE summary_date <> ?");
    removeStale.run(today);
    setMetadata(db, "summary_date", today);
    setMetadata(db, "official_count", String(result.count || seen.size));
    db.exec("COMMIT");
    return result.positions;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

async function refreshDetailsForPositions(db: DatabaseSync, positions: TencentPosition[]) {
  let count = 0;
  for (const position of positions) {
    const postId = stringValue(position.post_id);
    if (!postId) {
      continue;
    }
    try {
      const detail = await fetchTencentPositionDetail(postId);
      saveDetail(db, postId, detail);
      count += 1;
    } catch {
      // Keep the summary row; a later candidate refresh can try again.
    }
  }
  return count;
}

async function ensureDetailsForCandidates(db: DatabaseSync, candidates: RankedPosition[]) {
  for (const candidate of candidates) {
    if (candidate.row.detail_json && candidate.row.detail_date === todayKey()) {
      continue;
    }
    try {
      const detail = await fetchTencentPositionDetail(candidate.row.post_id);
      saveDetail(db, candidate.row.post_id, detail);
    } catch {
      // Skip this candidate if detail fetch fails; recommendations require detail.
    }
  }
}

function saveDetail(db: DatabaseSync, postId: string, detail: TencentJd) {
  const row = getRow(db, postId);
  const summary = row ? parseJson<TencentPosition>(row.summary_json, {}) : { post_id: postId };
  const mergedPosition = { ...summary, jd: detail };
  const job = mapTencentPositionToJob(mergedPosition);
  db.prepare(
    `UPDATE tencent_jobs
     SET detail_json = ?, job_json = ?, search_text = ?, detail_date = ?
     WHERE post_id = ?`
  ).run(
    JSON.stringify(detail),
    JSON.stringify(job ?? {}),
    buildSearchText(mergedPosition),
    todayKey(),
    postId
  );
}

function rankCachedPositions(db: DatabaseSync, profile: CandidateProfile): RankedPosition[] {
  const rows = db.prepare(
    "SELECT post_id, summary_json, detail_json, search_text, detail_date FROM tencent_jobs"
  ).all() as unknown as CacheRow[];
  const terms = buildProfileTerms(profile);
  const targetRoles = profile.targetRoles.map((item) => item.toLowerCase()).filter(Boolean);

  return rows
    .map((row) => {
      const searchText = row.search_text.toLowerCase();
      const matchedTerms = terms.filter((term) => searchText.includes(term));
      const title = stringValue(parseJson<TencentPosition>(row.summary_json, {}).title).toLowerCase();
      const titleBonus = targetRoles.some((role) => title.includes(role) || role.includes(title))
        ? 6
        : 0;
      const cityBonus = profile.cities.some((city) => row.search_text.includes(city)) ? 3 : 0;
      const detailBonus = row.detail_json ? 2 : 0;
      return {
        row,
        score: matchedTerms.length * 2 + titleBonus + cityBonus + detailBonus,
        matchedTerms
      };
    })
    .sort((a, b) => b.score - a.score);
}

function selectRankedPositionsByCategory(positions: RankedPosition[], limitPerCategory = topN()) {
  const internships = positions
    .filter((item) => getJobCategory(rowRecruitType(item.row)) === "internship")
    .slice(0, limitPerCategory);
  const campus = positions
    .filter((item) => getJobCategory(rowRecruitType(item.row)) === "campus")
    .slice(0, limitPerCategory);
  return [...internships, ...campus];
}

export function selectDetailedJobsByCategory<T extends Pick<Job, "type">>(jobs: T[], limitPerCategory = topN()) {
  const internships = jobs.filter((job) => getJobCategory(job.type) === "internship").slice(0, limitPerCategory);
  const campus = jobs.filter((job) => getJobCategory(job.type) === "campus").slice(0, limitPerCategory);
  return [...internships, ...campus];
}

function rowRecruitType(row: CacheRow) {
  const summary = parseJson<TencentPosition>(row.summary_json, {});
  return (
    stringValue(summary.recruit_label) ||
    stringValue(summary.project_name) ||
    row.search_text
  );
}

function getJobCategory(type: string) {
  const normalized = type.toLowerCase();
  return normalized.includes("实习") || normalized.includes("intern") ? "internship" : "campus";
}

function rowToJob(row: CacheRow): Partial<Job> | null {
  const summary = parseJson<TencentPosition>(row.summary_json, {});
  const detail = row.detail_json ? parseJson<TencentJd>(row.detail_json, {}) : undefined;
  return mapTencentPositionToJob(detail ? { ...summary, jd: detail } : summary);
}

async function openCacheDb() {
  const dbPath = cacheDbPath();
  await mkdir(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tencent_jobs (
      post_id TEXT PRIMARY KEY,
      title TEXT,
      project_name TEXT,
      recruit_label TEXT,
      bgs TEXT,
      work_cities TEXT,
      apply_url TEXT,
      summary_json TEXT NOT NULL,
      detail_json TEXT,
      job_json TEXT,
      search_text TEXT NOT NULL,
      summary_date TEXT NOT NULL,
      detail_date TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tencent_jobs_summary_date ON tencent_jobs(summary_date);
    CREATE INDEX IF NOT EXISTS idx_tencent_jobs_detail_date ON tencent_jobs(detail_date);
  `);
  return db;
}

function getRow(db: DatabaseSync, postId: string): CacheRow | undefined {
  return db
    .prepare("SELECT post_id, summary_json, detail_json, search_text, detail_date FROM tencent_jobs WHERE post_id = ?")
    .get(postId) as unknown as CacheRow | undefined;
}

function getCachedRowCount(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM tencent_jobs").get();
  return Number(row?.count ?? 0);
}

function getOfficialCount(db: DatabaseSync) {
  const value = Number(getMetadata(db, "official_count"));
  return Number.isFinite(value) && value > 0 ? value : getCachedRowCount(db);
}

function getMetadata(db: DatabaseSync, key: string) {
  const row = db.prepare("SELECT value FROM metadata WHERE key = ?").get(key);
  return typeof row?.value === "string" ? row.value : "";
}

function setMetadata(db: DatabaseSync, key: string, value: string) {
  db.prepare(
    "INSERT INTO metadata(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

function cacheDbPath() {
  const configured = process.env.TENCENT_JD_CACHE_DB?.trim() || DEFAULT_DB_FILE;
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.TZ || "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function buildProfileTerms(profile: CandidateProfile) {
  return unique([
    ...profile.skills,
    ...profile.tools,
    ...profile.languages,
    ...profile.targetRoles,
    ...profile.keywords,
    profile.major,
    profile.degree
  ])
    .flatMap((term) => term.split(/[,\s/|，、；;]+/))
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 2);
}

function buildSearchText(position: TencentPosition) {
  const jd = position.jd;
  return [
    position.title,
    position.project_name,
    position.recruit_label,
    position.bgs,
    position.work_cities,
    position.apply_url,
    jd?.title,
    jd?.direction,
    jd?.project_name,
    jd?.recruit_label,
    jd?.description,
    jd?.requirements,
    jd?.graduate_bonus,
    jd?.intern_bonus,
    textValue(jd?.departments),
    textValue(jd?.department_bg_names),
    textValue(jd?.work_cities)
  ]
    .map(textValue)
    .filter(Boolean)
    .join(" ");
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join(" / ");
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function stringValue(value: unknown) {
  return textValue(value);
}

function topN() {
  return parsePositiveInt(process.env.TENCENT_RECOMMEND_TOP_N, DEFAULT_TOP_N);
}

function detailCandidateCount() {
  return parsePositiveInt(process.env.TENCENT_CACHE_DETAIL_CANDIDATES, DEFAULT_DETAIL_CANDIDATES);
}

function parsePositiveInt(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isJobWithDetail(value: Partial<Job> | null): value is Job {
  return Boolean(value?.id && value.title && (value.description || value.requirements));
}

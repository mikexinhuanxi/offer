import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, isAbsolute, resolve } from "node:path";
import Papa from "papaparse";
import { sampleJobs } from "./sampleJobs.js";
import { loadTencentCachedStatus } from "./tencentJobCache.js";
import { getJobSourceProvider, loadTencentSkillJobs } from "./tencentSkill.js";
import type { CandidateProfile, Job } from "./types.js";

export interface JobPool {
  jobs: Partial<Job>[];
  source: string;
  count?: number;
}

const dataDir = resolve(process.cwd(), "data");

export async function loadJobPool(): Promise<JobPool> {
  const provider = getJobSourceProvider();
  if (provider === "tencent") {
    return loadTencentCachedStatus();
  }
  if (provider === "auto") {
    try {
      return await loadTencentCachedStatus();
    } catch {
      return loadLocalJobPool();
    }
  }
  return loadLocalJobPool();
}

export async function loadAnalysisJobPool(profile: CandidateProfile, resumeText = ""): Promise<JobPool> {
  const provider = getJobSourceProvider();
  if (provider === "local") {
    return loadLocalJobPool();
  }
  return loadTencentSkillJobs(resumeText || profile);
}

async function loadLocalJobPool(): Promise<JobPool> {
  const configuredPath = process.env.JOBS_FILE?.trim();
  const candidates = configuredPath
    ? [isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath)]
    : [resolve(dataDir, "jobs.json"), resolve(dataDir, "jobs.csv")];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      const jobs = await parseJobFile(candidate);
      return {
        jobs,
        source: candidate
      };
    }
  }

  return {
    jobs: sampleJobs,
    source: "built-in sample jobs"
  };
}

async function parseJobFile(filePath: string): Promise<Partial<Job>[]> {
  const content = await readFile(filePath, "utf8");
  const extension = extname(filePath).toLowerCase();

  if (extension === ".json") {
    const parsed = JSON.parse(content) as unknown;
    const records = Array.isArray(parsed)
      ? parsed
      : isObject(parsed) && Array.isArray(parsed.jobs)
        ? parsed.jobs
        : [];
    return records.filter(isObject).map(mapJobRecord);
  }

  if (extension === ".csv") {
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true
    });
    if (parsed.errors.length > 0) {
      throw new Error(`岗位 CSV 解析失败：${parsed.errors[0].message}`);
    }
    return parsed.data.filter(isObject).map(mapJobRecord);
  }

  throw new Error("JOBS_FILE 只支持 .json 或 .csv 文件。");
}

function mapJobRecord(record: Record<string, unknown>, index: number): Partial<Job> {
  return {
    id: pick(record, ["id", "ID", "岗位ID", "编号"]) || `job-${index + 1}`,
    company: pick(record, ["company", "公司", "企业", "公司名称"]),
    title: pick(record, ["title", "岗位", "职位", "岗位名称", "职位名称"]),
    city: pick(record, ["city", "城市", "地点", "工作地点"]),
    type: pick(record, ["type", "类型", "岗位类型", "招聘类型"]),
    description: pick(record, ["description", "岗位描述", "职位描述", "JD", "jd", "职责"]),
    requirements: pick(record, ["requirements", "任职要求", "岗位要求", "要求", "能力要求"]),
    bonus: pick(record, ["bonus", "加分项", "优先项", "优先条件"]),
    link: pick(record, ["link", "链接", "投递链接", "url", "URL"]),
    deadline: pick(record, ["deadline", "截止时间", "投递截止", "截止日期"])
  };
}

function pick(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

async function exists(filePath: string) {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

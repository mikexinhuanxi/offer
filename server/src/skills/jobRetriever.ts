import { sampleJobs } from "../sampleJobs.js";
import type { CandidateProfile, Job, RetrievedJob } from "../types.js";

const FALLBACK_TEXT = "未填写";

export function normalizeJobs(jobs: Partial<Job>[]): Job[] {
  const source = jobs.length > 0 ? jobs : sampleJobs;
  return source
    .map((job, index) => ({
      id: stringOrFallback(job.id, `job-${index + 1}`),
      company: stringOrFallback(job.company, FALLBACK_TEXT),
      title: stringOrFallback(job.title, "未命名岗位"),
      city: stringOrFallback(job.city, "不限"),
      type: stringOrFallback(job.type, "岗位"),
      description: stringOrFallback(job.description, ""),
      requirements: stringOrFallback(job.requirements, ""),
      bonus: stringOrFallback(job.bonus, ""),
      link: stringOrFallback(job.link, ""),
      deadline: stringOrFallback(job.deadline, "")
    }))
    .filter((job) => `${job.company}${job.title}${job.description}${job.requirements}`.trim());
}

export function retrieveJobs(profile: CandidateProfile, jobs: Partial<Job>[]): RetrievedJob[] {
  const normalized = normalizeJobs(jobs);
  const terms = buildProfileTerms(profile);

  return normalized
    .map((job) => {
      const text = jobToText(job);
      const matchedTerms = terms.filter((term) => text.includes(term.toLowerCase()));
      const cityBonus =
        profile.cities.length === 0 ||
        profile.cities.some((city) => job.city.includes(city) || city.includes(job.city))
          ? 2
          : 0;
      const titleBonus = profile.targetRoles.some((role) => job.title.includes(role)) ? 3 : 0;
      return {
        ...job,
        retrievalScore: matchedTerms.length + cityBonus + titleBonus,
        matchedTerms
      };
    })
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, 8);
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildProfileTerms(profile: CandidateProfile) {
  const rawTerms = [
    ...profile.skills,
    ...profile.tools,
    ...profile.languages,
    ...profile.targetRoles,
    ...profile.keywords,
    profile.major,
    profile.degree
  ];
  return Array.from(
    new Set(
      rawTerms
        .flatMap((term) => term.split(/[,\s/|，、；;]+/))
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length >= 2)
    )
  );
}

function jobToText(job: Job) {
  return [
    job.company,
    job.title,
    job.city,
    job.type,
    job.description,
    job.requirements,
    job.bonus
  ]
    .join(" ")
    .toLowerCase();
}

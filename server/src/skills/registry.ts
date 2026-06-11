import type { AnalysisResponse, SkillTraceStep } from "../types.js";
import { loadAnalysisJobPool } from "../jobData.js";
import { retrieveJobs } from "./jobRetriever.js";
import { scoreMatches } from "./matchScorer.js";
import { parseResume } from "./resumeParser.js";
import { optimizeResume } from "./resumeOptimizer.js";
import { generateTencentCoaching } from "./tencentCoach.js";
import { modelConfig } from "../modelClient.js";

export async function runOfferCatcherPipeline(
  resumeText: string
): Promise<AnalysisResponse> {
  const trace: SkillTraceStep[] = [];

  const profile = await timed(trace, "resume-parser", "简历解析 Skill", async () =>
    parseResume(resumeText)
  );

  const pool = await timed(trace, "job-source", "腾讯岗位源 Skill", async () =>
    loadAnalysisJobPool(profile)
  );

  const retrievedJobs = await timed(trace, "job-retriever", "岗位库检索 Skill", async () =>
    retrieveJobs(profile, pool.jobs)
  );

  const scoredMatches = await timed(trace, "match-scorer", "匹配评分 Skill", async () =>
    scoreMatches(profile, retrievedJobs, pool.source)
  );

  const matches = await timed(trace, "resume-optimizer", "简历优化 Skill", async () =>
    optimizeResume(resumeText, profile, scoredMatches, pool.source)
  );

  const tencentCoaching = await timed(trace, "tencent-coach", "腾讯辅导 Skill", async () =>
    generateTencentCoaching(resumeText, profile, matches, pool.source)
  );

  return {
    profile,
    matches,
    tencentCoaching,
    trace,
    model: modelConfig.model,
    jobSource: pool.source,
    jobCount: pool.count ?? pool.jobs.length
  };
}

async function timed<T>(
  trace: SkillTraceStep[],
  id: string,
  name: string,
  task: () => Promise<T>
): Promise<T> {
  const started = Date.now();
  try {
    const result = await task();
    trace.push({
      id,
      name,
      status: "completed",
      summary: summarizeResult(result),
      durationMs: Date.now() - started
    });
    return result;
  } catch (error) {
    trace.push({
      id,
      name,
      status: "failed",
      summary: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started
    });
    throw error;
  }
}

function summarizeResult(result: unknown) {
  if (Array.isArray(result)) {
    return `完成，产出 ${result.length} 条结果。`;
  }
  if (result && typeof result === "object") {
    return "完成，已生成结构化结果。";
  }
  return "完成。";
}

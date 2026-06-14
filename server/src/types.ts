export interface Job {
  id: string;
  company: string;
  title: string;
  city: string;
  type: string;
  description: string;
  requirements: string;
  bonus: string;
  link: string;
  deadline: string;
}

export interface CandidateProfile {
  name?: string;
  summary: string;
  education: string;
  major: string;
  degree: string;
  targetRoles: string[];
  cities: string[];
  skills: string[];
  tools: string[];
  languages: string[];
  internships: string[];
  projects: string[];
  strengths: string[];
  risks: string[];
  keywords: string[];
}

export interface ScoreBreakdown {
  skills: number;
  experience: number;
  keywords: number;
  location: number;
  growth: number;
}

export interface JdInterpretation {
  hardRequirements: string[];
  softQualities: string[];
  bonusPoints: string[];
  resumeFocus: string[];
  interviewPrep: string[];
}

export interface JobRecommendation {
  summary: string;
  matchReason: string;
  sourceLabel: string;
  jdInterpretation: JdInterpretation;
}

export interface JobMatch {
  job: Job;
  score: number;
  fitLevel: "冲刺" | "匹配" | "稳妥" | "不建议";
  screeningProbability: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  risks: string[];
  missingKeywords: string[];
  resumeActions: string[];
  rewriteExample: string;
  recommendation?: JobRecommendation;
}

export interface ResumeReview {
  highlights: string[];
  issues: string[];
  actions: string[];
  rewritePrinciples: string[];
}

export interface ResumeAuditCheck {
  id: string;
  title: string;
  status: "通过" | "不足" | "建议改进";
  severity: "required" | "suggestion";
  detail: string;
  suggestion: string;
}

export interface ResumeAuditIssue {
  checkId: string;
  title: string;
  detail: string;
  action: string;
  severity: "required" | "suggestion";
}

export interface ResumeAudit {
  score: number;
  passedCount: number;
  totalCount: number;
  verdict: string;
  checks: ResumeAuditCheck[];
  highlights: string[];
  prioritizedIssues: ResumeAuditIssue[];
  nextActions: string[];
  integrityNote: string;
}

export interface JobTailoring {
  jobId: string;
  focus: string;
  keywordStrategy: string[];
  rewriteExamples: string[];
  evidenceToAdd: string[];
}

export interface InterviewPrep {
  jobId: string;
  focusAreas: string[];
  projectDeepDive: string[];
  knowledgeTopics: string[];
  preparationPlan: string[];
}

export interface MockInterviewQuestion {
  jobId?: string;
  type: "项目深挖" | "专业基础" | "岗位理解" | "行为面" | "HR面";
  question: string;
  interviewerFocus: string;
  answerHint: string;
}

export interface GroupAndHrPrep {
  groupInterview: string[];
  hrQuestions: string[];
  answerFrameworks: string[];
  cautions: string[];
}

export interface TencentCoaching {
  resumeReview: ResumeReview;
  resumeAudit?: ResumeAudit;
  jobTailoring: JobTailoring[];
  interviewPrep: InterviewPrep[];
  mockInterview: MockInterviewQuestion[];
  groupAndHrPrep: GroupAndHrPrep;
}

export interface SkillTraceStep {
  id: string;
  name: string;
  status: "completed" | "failed";
  summary: string;
  durationMs: number;
}

export interface AnalysisRequest {
  resumeText: string;
}

export interface AnalysisResponse {
  profile: CandidateProfile;
  matches: JobMatch[];
  tencentCoaching?: TencentCoaching;
  trace: SkillTraceStep[];
  model: string;
  jobSource: string;
  jobCount: number;
}

export interface RetrievedJob extends Job {
  retrievalScore: number;
  matchedTerms: string[];
}

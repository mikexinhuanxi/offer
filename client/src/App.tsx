import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Radar,
  Sparkles,
  UploadCloud,
  WandSparkles
} from "lucide-react";
import {
  type ChangeEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";
import CardSwap, { Card } from "./components/CardSwap";
import CurvedLoop from "./components/CurvedLoop";
import InteractiveHoverButton from "./components/InteractiveHoverButton";
import TrueFocus from "./components/TrueFocus";

interface JobInfo {
  count: number;
  source: string;
}

interface CandidateProfile {
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

interface Job {
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

interface ScoreBreakdown {
  skills: number;
  experience: number;
  keywords: number;
  location: number;
  growth: number;
}

interface JdInterpretation {
  hardRequirements: string[];
  softQualities: string[];
  bonusPoints: string[];
  resumeFocus: string[];
  interviewPrep: string[];
}

interface JobRecommendation {
  summary: string;
  matchReason: string;
  sourceLabel: string;
  jdInterpretation: JdInterpretation;
}

interface JobMatch {
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

interface ResumeReview {
  highlights: string[];
  issues: string[];
  actions: string[];
  rewritePrinciples: string[];
}

interface JobTailoring {
  jobId: string;
  focus: string;
  keywordStrategy: string[];
  rewriteExamples: string[];
  evidenceToAdd: string[];
}

interface InterviewPrep {
  jobId: string;
  focusAreas: string[];
  projectDeepDive: string[];
  knowledgeTopics: string[];
  preparationPlan: string[];
}

interface MockInterviewQuestion {
  jobId?: string;
  type: "项目深挖" | "专业基础" | "岗位理解" | "行为面" | "HR面";
  question: string;
  interviewerFocus: string;
  answerHint: string;
}

interface GroupAndHrPrep {
  groupInterview: string[];
  hrQuestions: string[];
  answerFrameworks: string[];
  cautions: string[];
}

interface TencentCoaching {
  resumeReview: ResumeReview;
  jobTailoring: JobTailoring[];
  interviewPrep: InterviewPrep[];
  mockInterview: MockInterviewQuestion[];
  groupAndHrPrep: GroupAndHrPrep;
}

interface SkillTraceStep {
  id: string;
  name: string;
  status: "completed" | "failed";
  summary: string;
  durationMs: number;
}

interface AnalysisResponse {
  profile: CandidateProfile;
  matches: JobMatch[];
  tencentCoaching?: TencentCoaching;
  trace: SkillTraceStep[];
  model: string;
  jobSource: string;
  jobCount: number;
}

type AppView = "home" | "upload" | "results";
type ResultsTab = "overview" | "resume" | "interview" | "mock";

const resultTabs: Array<{ id: ResultsTab; label: string }> = [
  { id: "overview", label: "推荐概览" },
  { id: "resume", label: "简历优化" },
  { id: "interview", label: "面试准备" },
  { id: "mock", label: "模拟 & HR" }
];

const progressSteps = ["读取简历", "获取岗位源", "查找岗位", "计算匹配", "生成建议", "腾讯辅导"];

const exampleResume = `张同学
本科 软件工程

求职方向：前端开发实习生、AI 产品助理

技能：JavaScript、TypeScript、React、Vite、CSS、Python、SQL、Figma

项目经历：
1. 参与校园二手交易平台开发，负责商品发布、搜索筛选、聊天入口等前端模块，使用 React 和 TypeScript 完成组件封装。
2. 设计并实现求职信息整理工具，支持岗位标签、投递状态和简历版本管理。
3. 使用 Python 对招聘岗位文本做关键词统计，输出岗位技能热词看板。

实习经历：
在互联网产品团队担任产品运营实习生，整理用户反馈，协助撰写需求文档，并参与数据看板维护。

优势：学习速度快，能把产品需求拆成页面和数据结构，熟悉前端工程化基础。`;

export default function App() {
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [view, setView] = useState<AppView>("home");
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("overview");
  const [error, setError] = useState("");

  const selectedMatch = useMemo(() => {
    return analysis?.matches.find((match) => match.job.id === selectedId) ?? analysis?.matches[0];
  }, [analysis, selectedId]);

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    const jobsResponse = await fetch("/api/jobs");
    if (jobsResponse.ok) {
      setJobInfo(await jobsResponse.json());
    }
  }

  async function handleResumeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setFileName(file.name);
    setError("");
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      const response = await fetch("/api/extract-resume", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "简历提取失败");
      }
      setResumeText(payload.text);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setExtracting(false);
    }
  }

  async function runAnalysis() {
    setError("");
    setAnalyzing(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ resumeText })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.hint ? `${payload.error} ${payload.hint}` : payload.error);
      }
      setAnalysis(payload);
      setSelectedId(payload.matches?.[0]?.job.id ?? "");
      setActiveResultsTab("overview");
      setView("results");
      setJobInfo({ count: payload.jobCount, source: payload.jobSource });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setAnalyzing(false);
    }
  }

  if (view === "home") {
    return (
      <main className="app-shell home-shell">
        <HomeScreen onEnter={() => setView(analysis ? "results" : "upload")} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className={`hero ${analysis ? "hero-compact" : ""}`}>
        <nav className="topbar" aria-label="主导航">
          <div className="brand-lockup">
            <Sparkles size={18} />
            <GradientText>Offer 捕手</GradientText>
          </div>
        </nav>

        <div className="hero-copy">
          <h1>上传简历，找到更值得投的岗位。</h1>
          <p>
            岗位推荐基于腾讯官网真实 JD，结果聚焦推荐理由、JD 解读和可以直接修改的简历表达。
          </p>
        </div>
      </section>

      {error ? (
        <FadeContent>
          <section className="error-banner">
            <AlertCircle size={17} />
            <span>{error}</span>
          </section>
        </FadeContent>
      ) : null}

      <section className={`starter upload-stage ${analysis ? "starter-with-results" : ""}`}>
        <div className="upload-workbench">
          <div className="upload-intro">
            <span>Step 01</span>
            <h2>放入你的简历</h2>
            <p>先把简历丢进来，再开始捕获岗位信号。样例只保留一个小入口，方便快速试跑。</p>
          </div>

          <label className="resume-dropzone">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.json,.csv,text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeFile}
            />
            <span className="resume-dropzone-icon">
              <UploadCloud size={24} />
            </span>
            <span>上传简历</span>
            <strong>{extracting ? "正在读取文件" : fileName || "PDF / DOCX / TXT"}</strong>
          </label>

          <textarea
            id="resume-text"
            className="resume-paste-field"
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="也可以直接粘贴简历正文..."
          />

          <div className="capture-command-row">
            <button className="sample-button" onClick={() => setResumeText(exampleResume)}>
              <FileText size={16} />
              载入样例
            </button>
            <GlareButton disabled={analyzing || extracting || resumeText.trim().length < 30} onClick={runAnalysis}>
              {analyzing ? <Loader2 className="spin" size={17} /> : <WandSparkles size={17} />}
              {analyzing ? "捕获中" : "开始捕获"}
            </GlareButton>
          </div>

          <div className="source-line upload-source-line">
            <span>岗位库</span>
            <strong>{jobInfo?.count ?? 0} 条</strong>
            <small>{shortenSource(jobInfo?.source)}</small>
          </div>
        </div>

        <aside className="swap-stage" aria-label="捕获过程预览">
          <CardSwap
            width={860}
            height={560}
            cardDistance={92}
            verticalDistance={78}
            delay={4200}
            pauseOnHover
            skewAmount={4}
            easing="elastic"
          >
            <Card customClass="swap-card swap-card-jd">
              <div className="swap-card-inner">
                <div className="swap-card-topline">
                  <Radar size={19} />
                  <span>JD 硬要求</span>
                </div>
                <div className="swap-card-body">
                  <h3>先抓真正筛人的条件</h3>
                  <ul className="swap-insight-list">
                    <li>技能栈是否直接命中岗位描述里的工具和语言。</li>
                    <li>项目经历是否能证明完整交付，而不只是参与。</li>
                    <li>城市、岗位类型和截止时间是否值得优先投递。</li>
                  </ul>
                </div>
              </div>
            </Card>
            <Card customClass="swap-card swap-card-rewrite">
              <div className="swap-card-inner">
                <div className="swap-card-topline">
                  <Sparkles size={19} />
                  <span>简历改写方向</span>
                </div>
                <div className="swap-card-body">
                  <h3>把经历改成招聘方能判断的证据</h3>
                  <div className="rewrite-preview">
                    <span>原表达</span>
                    <p>参与校园二手平台前端开发。</p>
                    <span>建议方向</span>
                    <p>负责发布、筛选、消息入口组件，沉淀可复用表单和状态管理方案。</p>
                  </div>
                </div>
              </div>
            </Card>
            <Card customClass="swap-card swap-card-priority">
              <div className="swap-card-inner">
                <div className="swap-card-topline">
                  <Database size={19} />
                  <span>岗位优先级</span>
                </div>
                <div className="swap-card-body">
                  <h3>{jobInfo?.count ?? 0} 条 JD 会被压成投递顺序</h3>
                  <ul className="swap-metric-list">
                    <li>
                      <strong>冲刺</strong>
                      <span>能力接近但需要补关键词</span>
                    </li>
                    <li>
                      <strong>匹配</strong>
                      <span>经历和硬要求直接对齐</span>
                    </li>
                    <li>
                      <strong>稳妥</strong>
                      <span>投递成本低，适合保底</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </CardSwap>
        </aside>
      </section>

      {analysis ? (
        <FadeContent>
          <section className="results-shell">
            <ProfileSummary profile={analysis.profile} />
            <ResultsDashboard
              analysis={analysis}
              selectedMatch={selectedMatch}
              selectedId={selectedId}
              onSelectJob={setSelectedId}
              activeTab={activeResultsTab}
              onTabChange={setActiveResultsTab}
            />
          </section>
        </FadeContent>
      ) : null}
    </main>
  );
}

function ResultsDashboard({
  analysis,
  selectedMatch,
  selectedId,
  onSelectJob,
  activeTab,
  onTabChange
}: {
  analysis: AnalysisResponse;
  selectedMatch?: JobMatch;
  selectedId: string;
  onSelectJob: (id: string) => void;
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
}) {
  const coaching = analysis.tencentCoaching;
  const tailoring = coaching?.jobTailoring.find((item) => item.jobId === selectedMatch?.job.id);
  const interviewPrep = coaching?.interviewPrep.find((item) => item.jobId === selectedMatch?.job.id);
  const activeTabLabel = resultTabs.find((tab) => tab.id === activeTab)?.label ?? resultTabs[0].label;

  return (
    <section className="results-dashboard" aria-label="匹配结果">
      <div className="results-headline">
        <SectionTitle eyebrow="Tencent shortlist" title="推荐结果" />
        <p>先选岗位，再按推荐、简历、面试和模拟问答拆开看，避免所有建议挤在一屏里。</p>
      </div>

      <div className="opportunity-layout">
        <aside className="opportunity-rail" aria-label="推荐岗位列表">
          <MatchList matches={analysis.matches} selectedId={selectedId} onSelectJob={onSelectJob} />
        </aside>
        <div className="results-tab-stack">
          <div className="results-tabs" role="tablist" aria-label="结果内容">
            {resultTabs.map((tab) => (
              <button
                key={tab.id}
                id={`results-tab-${tab.id}`}
                className={`result-tab ${activeTab === tab.id ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`results-panel-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className="results-tab-panel"
            id={`results-panel-${activeTab}`}
            role="tabpanel"
            aria-label={activeTabLabel}
            aria-labelledby={`results-tab-${activeTab}`}
          >
            {activeTab === "overview" ? (
              selectedMatch ? <SelectedOpportunity match={selectedMatch} /> : <EmptyResults />
            ) : null}

            {activeTab === "resume" ? (
              <div className="tab-panel-grid">
                <CoachSection eyebrow="Tencent resume" title="简历诊断">
                  <ResumeReviewPanel review={coaching?.resumeReview} />
                </CoachSection>
                <CoachSection eyebrow="Targeted resume" title="岗位定制">
                  {selectedMatch ? <JobTailoringPanel match={selectedMatch} tailoring={tailoring} /> : <EmptyResults />}
                </CoachSection>
              </div>
            ) : null}

            {activeTab === "interview" ? (
              <CoachSection eyebrow="Interview prep" title="面试准备">
                {selectedMatch ? <InterviewPrepPanel match={selectedMatch} prep={interviewPrep} /> : <EmptyResults />}
              </CoachSection>
            ) : null}

            {activeTab === "mock" ? (
              <div className="tab-panel-grid">
                <CoachSection eyebrow="Mock interview" title="模拟面试">
                  <MockInterviewPanel questions={coaching?.mockInterview ?? []} />
                </CoachSection>
                <CoachSection eyebrow="Group & HR" title="群面 / HR 面">
                  <GroupHrPanel prep={coaching?.groupAndHrPrep} />
                </CoachSection>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CoachSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="coach-section">
      <SectionTitle eyebrow={eyebrow} title={title} />
      {children}
    </section>
  );
}

function SelectedOpportunity({ match }: { match: JobMatch }) {
  const interpretation = match.recommendation?.jdInterpretation;

  return (
    <article className="selected-opportunity">
      <div className="job-hero">
        <span>{match.job.company}</span>
        <h3>{match.job.title}</h3>
        <p>
          {match.job.city} · {match.job.type}
        </p>
        {match.job.link ? (
          <a href={match.job.link} target="_blank" rel="noreferrer">
            投递链接 <ArrowUpRight size={14} />
          </a>
        ) : null}
      </div>

      <div className="focus-box">
        <span>推荐理由</span>
        <p>{match.recommendation?.matchReason || match.reasons.slice(0, 2).join("；")}</p>
        <small>{match.recommendation?.sourceLabel || "岗位信息来自后端岗位源。"}</small>
      </div>

      <div className="opportunity-grid">
        <InsightBlock title="JD 硬要求" items={interpretation?.hardRequirements ?? [match.job.requirements]} />
        <InsightBlock title="简历侧重" items={interpretation?.resumeFocus ?? match.resumeActions} />
        <InsightBlock title="风险缺口" items={match.risks} warn />
        <InsightBlock title="下一步动作" items={match.resumeActions} />
      </div>

      <div className="rewrite-box">
        <span>建议改写</span>
        <p>{match.rewriteExample}</p>
      </div>
    </article>
  );
}

function EmptyResults() {
  return (
    <div className="selected-opportunity empty-results">
      <strong>还没有推荐结果</strong>
      <p>可以调整简历内容，或稍后刷新岗位库后重新匹配。</p>
    </div>
  );
}

function HomeScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="home-screen" aria-label="Offer 捕手首页">
      <nav className="home-topbar" aria-label="主导航">
        <div className="brand-lockup home-brand">
          <Sparkles size={18} />
          <span>Offer 捕手</span>
        </div>
      </nav>
      <div className="home-focus">
        <h1 className="sr-only">Offer 捕手</h1>
        <TrueFocus
          sentence="Offer 捕手"
          blurAmount={4}
          borderColor="#15d7bc"
          glowColor="rgba(21, 215, 188, 0.55)"
          animationDuration={0.7}
          pauseBetweenAnimations={1.1}
        />
        <InteractiveHoverButton onClick={onEnter}>
          开始捕捉 Offer
        </InteractiveHoverButton>
        <div className="home-curved-loop">
          <CurvedLoop
            marqueeText="✦ Resume to Offer Shortlist ✦"
            speed={1.5}
            curveAmount={300}
            direction="left"
            interactive={true}
          />
        </div>
      </div>
    </section>
  );
}

function GradientText({ children }: { children: ReactNode }) {
  return <span className="gradient-text">{children}</span>;
}

function FadeContent({ children }: { children: ReactNode }) {
  return <div className="fade-content">{children}</div>;
}

function SpotlightCard({ className, children }: { className: string; children: ReactNode }) {
  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  }

  return (
    <div className={`spotlight-card ${className}`} onMouseMove={handleMouseMove}>
      {children}
    </div>
  );
}

function GlareButton({
  children,
  disabled,
  onClick
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button className="primary-button" disabled={disabled} onClick={onClick}>
      <span className="button-glare" />
      <span className="button-content">{children}</span>
    </button>
  );
}

function ProgressList({ trace, active }: { trace?: SkillTraceStep[]; active: boolean }) {
  const steps = trace ?? progressSteps.map((name, index) => ({ id: name, name, index }));

  return (
    <div className="progress-list">
      {steps.map((step, index) => {
        const completed = "status" in step && step.status === "completed";
        const failed = "status" in step && step.status === "failed";
        const pending = !("status" in step);
        const current = active && pending && index === 0;
        return (
          <div className={`progress-step ${completed ? "done" : ""} ${failed ? "failed" : ""}`} key={step.id}>
            <span className="step-dot">
              {current ? <Loader2 className="spin" size={13} /> : completed ? <CheckCircle2 size={14} /> : index + 1}
            </span>
            <div>
              <strong>{displayStepName(step.name, index)}</strong>
              <p>
                {"summary" in step
                  ? `${step.status === "completed" ? "已完成" : "未完成"} · ${formatDuration(step.durationMs)}`
                  : active
                    ? "等待中"
                    : "准备就绪"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileSummary({ profile }: { profile: CandidateProfile }) {
  const skills = [...profile.skills, ...profile.tools].slice(0, 8);
  return (
    <section className="profile-summary">
      <div>
        <span>简历摘要</span>
        <h2>{profile.summary || "已完成简历读取"}</h2>
      </div>
      <div className="profile-facts">
        <MiniMetric label="专业" value={profile.major || "未识别"} />
        <MiniMetric label="学历" value={profile.degree || profile.education || "未识别"} />
        <MiniMetric label="关键词" value={`${skills.length} 个`} />
      </div>
      <div className="tag-row">
        {skills.map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}

function MatchList({
  matches,
  selectedId,
  onSelectJob
}: {
  matches: JobMatch[];
  selectedId: string;
  onSelectJob: (id: string) => void;
}) {
  return (
    <div className="match-list">
      {matches.map((match) => (
        <button
          key={match.job.id}
          className={`match-card ${selectedId === match.job.id ? "selected" : ""}`}
          onClick={() => onSelectJob(match.job.id)}
        >
          <div className="match-main">
            <div className="match-heading">
              <strong>{match.job.title}</strong>
              <span>{match.job.type}</span>
            </div>
            <p>
              {match.job.company} · {match.job.city} · {match.job.type}
            </p>
            <p className="match-reason">
              {match.recommendation?.matchReason || match.reasons.slice(0, 2).join("；")}
            </p>
            <div className="tag-row">
              {match.missingKeywords.slice(0, 3).map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ResumeReviewPanel({ review }: { review?: ResumeReview }) {
  return (
    <div className="coach-grid two-columns">
      <CoachBlock title="亮点可保留" items={review?.highlights} />
      <CoachBlock title="需要修正" items={review?.issues} warn />
      <CoachBlock title="修改动作" items={review?.actions} />
      <CoachBlock title="改写原则" items={review?.rewritePrinciples} />
    </div>
  );
}

function JobTailoringPanel({
  match,
  tailoring
}: {
  match: JobMatch;
  tailoring?: JobTailoring;
}) {
  return (
    <div className="coach-detail">
      <JobContext match={match} />
      <div className="focus-box">
        <span>定制重点</span>
        <p>{tailoring?.focus || "围绕该岗位 JD 中最核心的能力要求，优先呈现真实项目证据。"}</p>
      </div>
      <div className="coach-grid two-columns">
        <CoachBlock title="关键词策略" items={tailoring?.keywordStrategy} />
        <CoachBlock title="需要补证据" items={tailoring?.evidenceToAdd} warn />
      </div>
      <CoachBlock title="岗位定制改写" items={tailoring?.rewriteExamples} boxed />
    </div>
  );
}

function InterviewPrepPanel({ match, prep }: { match: JobMatch; prep?: InterviewPrep }) {
  return (
    <div className="coach-detail">
      <JobContext match={match} />
      <div className="coach-grid two-columns">
        <CoachBlock title="准备重点" items={prep?.focusAreas} />
        <CoachBlock title="项目深挖" items={prep?.projectDeepDive} />
        <CoachBlock title="知识主题" items={prep?.knowledgeTopics} />
        <CoachBlock title="准备动作" items={prep?.preparationPlan} />
      </div>
    </div>
  );
}

function MockInterviewPanel({ questions }: { questions: MockInterviewQuestion[] }) {
  return (
    <div className="question-list">
      {questions.length > 0 ? (
        questions.map((item, index) => (
          <article className="question-card" key={`${item.type}-${item.question}`}>
            <span>
              {index + 1}. {item.type}
            </span>
            <h3>{item.question}</h3>
            <p>
              <strong>关注点</strong>
              {item.interviewerFocus}
            </p>
            <p>
              <strong>回答建议</strong>
              {item.answerHint}
            </p>
          </article>
        ))
      ) : (
        <EmptyCoach />
      )}
    </div>
  );
}

function GroupHrPanel({ prep }: { prep?: GroupAndHrPrep }) {
  return (
    <div className="coach-grid two-columns">
      <CoachBlock title="群面策略" items={prep?.groupInterview} />
      <CoachBlock title="HR 面问题" items={prep?.hrQuestions} />
      <CoachBlock title="回答框架" items={prep?.answerFrameworks} />
      <CoachBlock title="注意事项" items={prep?.cautions} warn />
    </div>
  );
}

function JobContext({ match }: { match: JobMatch }) {
  return (
    <div className="job-context">
      <span>当前岗位</span>
      <strong>{match.job.title}</strong>
      <p>
        {match.job.company} · {match.job.city} · {match.job.type}
      </p>
    </div>
  );
}

function CoachBlock({
  title,
  items,
  warn,
  boxed
}: {
  title: string;
  items?: string[];
  warn?: boolean;
  boxed?: boolean;
}) {
  return (
    <div className={`coach-block ${warn ? "warn" : ""} ${boxed ? "boxed" : ""}`}>
      <strong>{title}</strong>
      {items && items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <EmptyCoach />
      )}
    </div>
  );
}

function EmptyCoach() {
  return <p className="empty-coach">暂无可展示内容。</p>;
}

function InsightBlock({ title, items, warn }: { title: string; items: string[]; warn?: boolean }) {
  return (
    <div className={`insight-block ${warn ? "warn" : ""}`}>
      <strong>{title}</strong>
      <ul>
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>暂无</li>}
      </ul>
    </div>
  );
}

function displayStepName(name: string, index: number) {
  const normalized = name
    .replace("简历解析 Skill", "读取简历")
    .replace("腾讯岗位源 Skill", "获取岗位源")
    .replace("岗位库检索 Skill", "查找岗位")
    .replace("匹配评分 Skill", "计算匹配")
    .replace("简历优化 Skill", "生成建议")
    .replace("腾讯辅导 Skill", "腾讯辅导");
  return normalized.includes("Skill") ? progressSteps[index] ?? normalized : normalized;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function shortenSource(source?: string) {
  if (!source) {
    return "读取中";
  }
  const normalized = source.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts.slice(-2).join("/");
}

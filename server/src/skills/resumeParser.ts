import { chatJson } from "../modelClient.js";
import type { CandidateProfile } from "../types.js";

interface ResumeParserOutput {
  profile: CandidateProfile;
}

const emptyProfile: CandidateProfile = {
  summary: "",
  education: "",
  major: "",
  degree: "",
  targetRoles: [],
  cities: [],
  skills: [],
  tools: [],
  languages: [],
  internships: [],
  projects: [],
  strengths: [],
  risks: [],
  keywords: []
};

export async function parseResume(resumeText: string): Promise<CandidateProfile> {
  const result = await chatJson<ResumeParserOutput>({
    skillName: "简历解析 Skill",
    maxTokens: 1800,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "你是一个通用简历解析 Skill。只返回 JSON，不要 Markdown。不要编造简历中没有的信息；缺失字段用空字符串或空数组。"
      },
      {
        role: "user",
        content: `请从学生简历中抽取结构化画像，输出格式：
{
  "profile": {
    "name": "姓名，可缺省",
    "summary": "一句话候选人摘要",
    "education": "学校或教育背景",
    "major": "专业",
    "degree": "学历",
    "targetRoles": ["可能适合或简历中出现的目标岗位"],
    "cities": ["简历中体现的目标城市或所在城市"],
    "skills": ["技能关键词"],
    "tools": ["工具/框架/平台"],
    "languages": ["编程语言或语言能力"],
    "internships": ["实习经历摘要"],
    "projects": ["项目经历摘要"],
    "strengths": ["优势"],
    "risks": ["可能影响初筛的短板"],
    "keywords": ["用于岗位检索的关键词"]
  }
}

简历文本：
${resumeText.slice(0, 14000)}`
      }
    ]
  });

  return normalizeProfile(result.profile);
}

function normalizeProfile(profile?: Partial<CandidateProfile>): CandidateProfile {
  return {
    ...emptyProfile,
    ...profile,
    targetRoles: normalizeArray(profile?.targetRoles),
    cities: normalizeArray(profile?.cities),
    skills: normalizeArray(profile?.skills),
    tools: normalizeArray(profile?.tools),
    languages: normalizeArray(profile?.languages),
    internships: normalizeArray(profile?.internships),
    projects: normalizeArray(profile?.projects),
    strengths: normalizeArray(profile?.strengths),
    risks: normalizeArray(profile?.risks),
    keywords: normalizeArray(profile?.keywords)
  };
}

function normalizeArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
}

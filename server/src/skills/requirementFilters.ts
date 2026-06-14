const ORG_STOP_WORDS = [
  "QQ",
  "PCG",
  "BG",
  "CDG",
  "CSIG",
  "IEG",
  "TEG",
  "WXG",
  "S1",
  "S2",
  "腾讯视频",
  "应用宝",
  "腾讯新闻",
  "腾讯云",
  "腾讯文档",
  "腾讯地图",
  "腾讯健康",
  "QQ浏览器",
  "腾讯金融科技",
  "腾讯营销",
  "腾讯职能线",
  "平台与内容事业群",
  "企业发展事业群",
  "互动娱乐事业群",
  "技术工程事业群",
  "微信事业群",
  "云与智慧产业事业群"
];

const ORG_CONTEXT_PATTERN =
  /(?:招聘部门|BG\/组织|事业群|工作室群|技术线|产品线|职能线|团队|平台部|事业部)/;

export function isCandidateRequirement(term: string) {
  const normalized = term.trim();
  if (!normalized) {
    return false;
  }
  const upper = normalized.toUpperCase();
  if (ORG_STOP_WORDS.some((word) => upper === word.toUpperCase())) {
    return false;
  }
  if (/^(?:[A-Z]{1,4}|S\d+)(?:\s*(?:\/|、|,|，)\s*(?:[A-Z]{1,4}|S\d+))*$/.test(upper)) {
    return false;
  }
  if (ORG_CONTEXT_PATTERN.test(normalized)) {
    return false;
  }
  return true;
}

export function filterCandidateRequirements(items: string[]) {
  return items.filter(isCandidateRequirement);
}

export function filterOrganizationNoise(items: string[]) {
  return items.filter((item) => !containsOrganizationNoise(item));
}

export function organizationStopWords() {
  return ORG_STOP_WORDS;
}

function containsOrganizationNoise(text: string) {
  if (ORG_CONTEXT_PATTERN.test(text)) {
    return true;
  }
  return ORG_STOP_WORDS.some((word) => containsStandaloneTerm(text, word));
}

function containsStandaloneTerm(text: string, term: string) {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}+#.])${escapeRegex(term)}($|[^\\p{L}\\p{N}+#.])`, "u");
  return pattern.test(text);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

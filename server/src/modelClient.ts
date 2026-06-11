import "./env.js";

type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export class ModelConfigurationError extends Error {
  constructor() {
    super("未配置 DASHSCOPE_API_KEY，无法调用阿里云百炼。");
    this.name = "ModelConfigurationError";
  }
}

export const modelConfig = {
  apiKey: process.env.DASHSCOPE_API_KEY ?? "",
  baseUrl:
    process.env.DASHSCOPE_BASE_URL ??
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
  model: process.env.DASHSCOPE_MODEL ?? "qwen-plus"
};

export function hasModelKey() {
  return Boolean(modelConfig.apiKey);
}

export async function chatJson<T>(options: {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  skillName: string;
}): Promise<T> {
  if (!modelConfig.apiKey) {
    throw new ModelConfigurationError();
  }

  const body = {
    model: modelConfig.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 1800
  };

  const response = await postChat({ ...body, response_format: { type: "json_object" } });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 400 && errorText.includes("response_format")) {
      const retryResponse = await postChat(body);
      if (retryResponse.ok) {
        return parseModelJson(await readContent(retryResponse), options.skillName);
      }
      throw new Error(await formatApiError(retryResponse, options.skillName));
    }
    throw new Error(formatRawApiError(response.status, errorText, options.skillName));
  }

  return parseModelJson(await readContent(response), options.skillName);
}

async function postChat(body: Record<string, unknown>) {
  const endpoint = `${modelConfig.baseUrl.replace(/\/$/, "")}/chat/completions`;
  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${modelConfig.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function readContent(response: Response): Promise<string> {
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (content) {
    return JSON.stringify(content);
  }
  throw new Error("模型没有返回可读内容。");
}

async function formatApiError(response: Response, skillName: string) {
  return formatRawApiError(response.status, await response.text(), skillName);
}

function formatRawApiError(status: number, body: string, skillName: string) {
  return `${skillName} 调用百炼失败：HTTP ${status} ${body.slice(0, 500)}`;
}

function parseModelJson<T>(content: string, skillName: string): T {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const candidate =
    start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  try {
    return JSON.parse(candidate) as T;
  } catch (error) {
    throw new Error(
      `${skillName} 返回的内容不是合法 JSON：${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

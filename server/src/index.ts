import "./env.js";
import cors from "cors";
import express from "express";
import multer from "multer";
import { extractTextFromFile } from "./fileExtractors.js";
import { loadJobPool } from "./jobData.js";
import { refreshTencentJobCache } from "./tencentJobCache.js";
import { hasModelKey, modelConfig, ModelConfigurationError } from "./modelClient.js";
import { runOfferCatcherPipeline, runOfferCatcherPipelineStream } from "./skills/registry.js";
import type { AnalysisRequest } from "./types.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: "6mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: hasModelKey(),
    model: modelConfig.model,
    baseUrl: modelConfig.baseUrl
  });
});

app.get("/api/jobs", async (_req, res) => {
  try {
    const pool = await loadJobPool();
    res.json({
      count: pool.count ?? pool.jobs.length,
      source: pool.source
    });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.post("/api/jobs/refresh", async (req, res) => {
  try {
    const includeDetails =
      typeof req.query.details === "string" && req.query.details.toLowerCase() === "true";
    const result = await refreshTencentJobCache({ includeDetails });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.post("/api/extract-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "没有收到简历文件。" });
      return;
    }

    const text = await extractTextFromFile(req.file);
    if (!text) {
      res.status(422).json({ error: "文件中没有提取到可用文本，请尝试粘贴简历正文。" });
      return;
    }

    res.json({ text });
  } catch (error) {
    res.status(422).json({ error: getErrorMessage(error) });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const body = req.body as AnalysisRequest;
    const resumeText = String(body.resumeText ?? "").trim();

    if (!hasModelKey()) {
      throw new ModelConfigurationError();
    }

    if (resumeText.length < 30) {
      res.status(400).json({ error: "请先上传或粘贴一份可分析的简历。" });
      return;
    }

    const response = await runOfferCatcherPipeline(resumeText);
    res.json(response);
  } catch (error) {
    const status = error instanceof ModelConfigurationError ? 503 : 500;
    res.status(status).json({
      error: getErrorMessage(error),
      hint:
        error instanceof ModelConfigurationError
          ? "请复制 .env.example 为 .env，并填写 DASHSCOPE_API_KEY。"
          : undefined
    });
  }
});

app.post("/api/analyze/stream", async (req, res) => {
  let streamStarted = false;
  try {
    const body = req.body as AnalysisRequest;
    const resumeText = String(body.resumeText ?? "").trim();

    if (!hasModelKey()) {
      throw new ModelConfigurationError();
    }

    if (resumeText.length < 30) {
      res.status(400).json({ error: "请先上传或粘贴一份可分析的简历。" });
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    streamStarted = true;

    writeStreamEvent(res, "started", {
      model: modelConfig.model
    });

    for await (const event of runOfferCatcherPipelineStream(resumeText)) {
      writeStreamEvent(res, event.type, event.payload);
    }
    res.end();
  } catch (error) {
    if (!streamStarted) {
      const status = error instanceof ModelConfigurationError ? 503 : 500;
      res.status(status).json({
        error: getErrorMessage(error),
        hint:
          error instanceof ModelConfigurationError
            ? "请复制 .env.example 为 .env，并填写 DASHSCOPE_API_KEY。"
            : undefined
      });
      return;
    }

    writeStreamEvent(res, "error", {
      error: getErrorMessage(error)
    });
    res.end();
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, "127.0.0.1", () => {
  console.log(`Offer Catcher server listening on http://127.0.0.1:${port}`);
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function writeStreamEvent(res: express.Response, type: string, payload: unknown) {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const originalName = file.originalname.toLowerCase();
  const mimetype = file.mimetype;

  if (originalName.endsWith(".pdf") || mimetype === "application/pdf") {
    const parsed = await pdfParse(file.buffer);
    return parsed.text.trim();
  }

  if (
    originalName.endsWith(".docx") ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return parsed.value.trim();
  }

  if (
    originalName.endsWith(".txt") ||
    originalName.endsWith(".md") ||
    originalName.endsWith(".csv") ||
    originalName.endsWith(".json") ||
    mimetype.startsWith("text/")
  ) {
    return file.buffer.toString("utf8").trim();
  }

  throw new Error("暂不支持该文件类型，请上传 PDF、DOCX、TXT、MD、CSV 或 JSON。");
}

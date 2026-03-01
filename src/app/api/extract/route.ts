import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/validate"

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "mdx", "csv", "json", "jsonl", "yaml", "yml",
  "ts", "tsx", "js", "jsx", "py", "rb", "go", "rs", "java",
  "html", "htm", "css", "scss", "sql", "xml", "toml", "env",
  "sh", "bash", "zsh", "fish", "conf", "ini", "log",
])

function ext(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? ""
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>
  const data = await pdfParse(buffer)
  return data.text?.trim() ?? ""
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")).default
  const result = await mammoth.extractRawText({ buffer })
  return result.value?.trim() ?? ""
}

async function extractXlsx(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx")
  const wb = XLSX.read(buffer, { type: "buffer" })
  const lines: string[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(ws)
    if (csv.trim()) {
      lines.push(`## Feuille: ${sheetName}`)
      lines.push(csv.trim())
    }
  }
  return lines.join("\n\n")
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return apiError("No file provided", 400)

  const maxSize = 20 * 1024 * 1024 // 20 MB
  if (file.size > maxSize) return apiError("File too large (max 20 MB)", 400)

  const filename = file.name
  const mimeType = file.type
  const fileExt = ext(filename)
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    let content = ""
    let method = ""

    // Images → return as base64 data URL for vision
    if (mimeType.startsWith("image/")) {
      const base64 = buffer.toString("base64")
      const dataUrl = `data:${mimeType};base64,${base64}`
      return apiSuccess({ filename, type: "image", dataUrl, content: null })
    }

    // PDF
    if (mimeType === "application/pdf" || fileExt === "pdf") {
      content = await extractPdf(buffer)
      method = "pdf-parse"

    // DOCX / Word
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileExt === "docx"
    ) {
      content = await extractDocx(buffer)
      method = "mammoth"

    // XLSX / Excel
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel" ||
      fileExt === "xlsx" || fileExt === "xls" || fileExt === "csv"
    ) {
      content = fileExt === "csv"
        ? buffer.toString("utf-8")
        : await extractXlsx(buffer)
      method = "xlsx"

    // Plain text / code
    } else if (TEXT_EXTENSIONS.has(fileExt) || mimeType.startsWith("text/")) {
      content = buffer.toString("utf-8")
      method = "text"

    } else {
      return apiError(`Unsupported file type: ${mimeType || fileExt}`, 415)
    }

    // Truncate if too large (max ~50k chars ≈ ~12k tokens)
    const truncated = content.length > 50000
    if (truncated) content = content.slice(0, 50000) + "\n\n[… contenu tronqué à 50 000 caractères]"

    return apiSuccess({
      filename,
      type: "text",
      content,
      method,
      chars: content.length,
      truncated,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return apiError(`Extraction failed: ${msg}`, 500)
  }
}

"use client"

const CLIENT_TEXT_EXTS = new Set([
  "txt", "md", "mdx", "json", "jsonl", "yaml", "yml", "csv",
  "ts", "tsx", "js", "jsx", "py", "rb", "go", "rs", "java",
  "html", "htm", "css", "scss", "sql", "xml", "toml", "sh",
  "bash", "conf", "ini", "log", "env",
])

export interface ExtractedFile {
  name: string
  type: string
  size: number
  /** "text" | "image" | "binary" */
  kind: "text" | "image" | "binary"
  /** Extracted text content (text files) */
  content?: string
  /** Base64 data URL (images) — sent to vision API */
  dataUrl?: string
  /** True if content was truncated */
  truncated?: boolean
}

function getExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? ""
}

function isClientText(file: File) {
  const e = getExt(file.name)
  return CLIENT_TEXT_EXTS.has(e) || file.type.startsWith("text/")
}

function isImage(file: File) {
  return file.type.startsWith("image/")
}

async function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, "utf-8")
  })
}

async function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function extractViaApi(file: File): Promise<{ content?: string; dataUrl?: string; truncated?: boolean }> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch("/api/extract", { method: "POST", body: fd })
  if (!res.ok) throw new Error(`Extract API error: ${res.status}`)
  const json = await res.json()
  return {
    content: json.content ?? undefined,
    dataUrl: json.dataUrl ?? undefined,
    truncated: json.truncated ?? false,
  }
}

export async function extractFile(file: File): Promise<ExtractedFile> {
  const base: ExtractedFile = { name: file.name, type: file.type, size: file.size, kind: "binary" }

  // Images — read as data URL client-side
  if (isImage(file)) {
    const dataUrl = await readDataUrl(file)
    return { ...base, kind: "image", dataUrl }
  }

  // Plain text — read client-side (no server round-trip)
  if (isClientText(file)) {
    let content = await readText(file)
    const truncated = content.length > 50000
    if (truncated) content = content.slice(0, 50000) + "\n\n[… tronqué]"
    return { ...base, kind: "text", content, truncated }
  }

  // PDF / DOCX / XLSX — server extraction
  const result = await extractViaApi(file)
  if (result.dataUrl) return { ...base, kind: "image", dataUrl: result.dataUrl }
  return {
    ...base,
    kind: "text",
    content: result.content,
    truncated: result.truncated,
  }
}

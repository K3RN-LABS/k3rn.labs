import archiver from "archiver"
import { Readable } from "stream"
import { db as prisma } from "./db"
import { invokeExpert } from "./claude"
import { uploadExportZip } from "./supabase-storage"

export async function generateExport(dossierId: string): Promise<string> {
  const subFolders = await prisma.subFolder.findMany({
    where: { dossierId },
    include: { cards: { where: { state: "VALIDATED" } } },
  })

  const allCards = subFolders.flatMap((sf: any) =>
    sf.cards.map((c: any) => ({ ...c, subFolderType: sf.type }))
  )

  const techCards = allCards.filter((c) =>
    ["system_architecture", "tech_stack", "data_model", "api_specification"].includes(c.type)
  )

  const projectStructure = await invokeExpert(
    `You are a senior software architect. Generate a complete project structure and code skeleton based on the validated technical cards. Return JSON with a "files" array where each item has "path" and "content" fields. Focus on the architecture defined in the cards.`,
    [{ role: "user", content: `Generate project structure from: ${JSON.stringify(techCards.map((c) => ({ type: c.type, content: c.content })), null, 2)}` }],
    []
  )

  const aiPrompt = `# AI Integration Prompt\n\nThis project was designed in k3rn.labs.\n\n## Vision\n${JSON.stringify(allCards.find((c) => c.type === "vision_statement")?.content, null, 2)}\n\n## Architecture\n${JSON.stringify(techCards.map((c) => c.content), null, 2)}\n\n## Instructions\nUse the above context to implement the full project following the defined architecture.`

  const buffer = await createZipBuffer(projectStructure, aiPrompt, allCards)
  const storagePath = await uploadExportZip(dossierId, buffer)
  return storagePath
}

async function createZipBuffer(
  projectStructure: { proposedCard: { content: Record<string, unknown> } },
  aiPrompt: string,
  cards: Array<{ type: string; title: string; content: unknown }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    archive.on("end", () => resolve(Buffer.concat(chunks)))
    archive.on("error", reject)

    archive.append(aiPrompt, { name: "ai-prompt.md" })
    archive.append(JSON.stringify(cards, null, 2), { name: "docs/validated-cards.json" })

    const files = (projectStructure.proposedCard?.content as { files?: Array<{ path: string; content: string }> })?.files ?? []
    for (const file of files) {
      if (file.path && file.content) {
        archive.append(file.content, { name: `src/${file.path}` })
      }
    }

    archive.finalize()
  })
}

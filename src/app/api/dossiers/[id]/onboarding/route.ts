import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { invokeChefDeProjet } from "@/lib/claude"
import type { ChatMessage, FileContext } from "@/lib/claude"
import {
  deserializeState,
  applyLLMResponse,
  toDTO,
  type AspectKey,
} from "@/lib/onboarding-state"
import { randomUUID } from "crypto"
import { z } from "zod"

const fileContextSchema = z.object({
  name: z.string(),
  kind: z.enum(["text", "image"]),
  content: z.string().optional(),
  dataUrl: z.string().optional(),
})

const schema = z.object({
  message: z.string().max(4000).default(""),
  attachments: z
    .array(z.object({ name: z.string(), type: z.string(), size: z.number().optional() }))
    .optional(),
  files: z.array(fileContextSchema).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({
    where: { id, ownerId: session.userId },
  })
  if (!dossier) return apiError("Dossier not found", 404)

  const history = (dossier.onboardingMessages ?? []) as ChatMessage[]
  const state = deserializeState(dossier.onboardingState)

  return apiSuccess({
    messages: history,
    dossier,
    onboardingState: toDTO(state),
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const dossier = await prisma.dossier.findFirst({
    where: { id, ownerId: session.userId },
  })
  if (!dossier) return apiError("Dossier not found", 404)

  // Restore authoritative state from DB
  const existingState = deserializeState(dossier.onboardingState)

  // Bail early if already complete (idempotency)
  if (existingState.status === "COMPLETE") {
    const history = (dossier.onboardingMessages ?? []) as ChatMessage[]
    return apiSuccess({
      messages: history,
      onboardingState: toDTO(existingState),
      isComplete: true,
      recommendedLab: existingState.recommendedLab,
    })
  }

  const history = (dossier.onboardingMessages ?? []) as ChatMessage[]
  const files = result.data.files as FileContext[] | undefined
  const messageText =
    result.data.message ||
    (files?.length ? `[Fichier(s) joint(s) : ${files.map((f) => f.name).join(", ")}]` : "")

  const userMsg: ChatMessage = {
    id: randomUUID(),
    role: "user",
    content: messageText,
    timestamp: new Date().toISOString(),
    attachments: result.data.attachments,
  }

  try {
    const confirmedAspects = Object.keys(existingState.confirmedAspects) as AspectKey[]
    const confirmedValues: Record<string, string> = {}
    for (const k of confirmedAspects) {
      const v = existingState.confirmedAspects[k]?.value
      if (v) confirmedValues[k] = v
    }
    const aiResponse = await invokeChefDeProjet(
      dossier.name,
      history,
      result.data.message,
      files,
      existingState.step,
      { currentQuestion: existingState.currentQuestion, confirmedAspects, confirmedValues }
    )

    const expertMsg: ChatMessage = {
      id: randomUUID(),
      role: "expert",
      content: aiResponse.message,
      timestamp: new Date().toISOString(),
      choices: aiResponse.choices,
    }

    const updatedMessages = [...history, userMsg, expertMsg]

    // Apply LLM response to authoritative state
    const llmAspects = (aiResponse.confirmedAspects ?? []) as AspectKey[]
    const newState = applyLLMResponse(existingState, llmAspects, messageText)
    const stateDTO = toDTO(newState)

    // Persist both messages and state atomically
    await prisma.dossier.update({
      where: { id },
      data: {
        onboardingMessages: updatedMessages,
        onboardingState: newState as unknown as Record<string, unknown>,
      },
    })

    return apiSuccess({
      messages: updatedMessages,
      onboardingState: stateDTO,
      recommendedLab: stateDTO.recommendedLab,
      isComplete: newState.status === "COMPLETE",
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur interne"
    console.error("[onboarding POST]", msg)
    return apiError(`Erreur IA : ${msg}`, 500)
  }
}

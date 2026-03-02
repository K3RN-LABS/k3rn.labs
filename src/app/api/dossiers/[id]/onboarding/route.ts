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
  kind: z.enum(["text", "image", "binary"]),
  content: z.string().optional(),
  dataUrl: z.string().optional(),
})

const schema = z.object({
  message: z.string().max(10000).default(""),
  attachments: z
    .array(z.object({ name: z.string(), type: z.string(), size: z.number().optional() }))
    .optional(),
  files: z.array(fileContextSchema).optional(),
})

// DELETE — pop the last user+expert exchange so the client can retry
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({
    where: { id, ownerId: session.userId },
  })
  if (!dossier) return apiError("Dossier not found", 404)

  const history = (dossier.onboardingMessages ?? []) as ChatMessage[]

  // Find and remove the last expert message and the user message just before it
  const lastExpertIdx = [...history].reverse().findIndex((m) => m.role === "expert")
  if (lastExpertIdx === -1) return apiError("No expert message to remove", 400)

  const expertIdx = history.length - 1 - lastExpertIdx
  // The user message is typically right before the expert message
  const userIdx = expertIdx - 1
  const retryText = userIdx >= 0 && history[userIdx].role === "user"
    ? history[userIdx].content
    : ""

  const trimmed = history.filter((_, i) => i !== expertIdx && i !== userIdx)

  await prisma.dossier.update({
    where: { id },
    data: { onboardingMessages: trimmed },
  })

  return apiSuccess({ messages: trimmed, retryText })
}

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
    const confirmedQualities: Partial<Record<string, "strong" | "weak">> = {}
    const challengeCounts: Partial<Record<string, number>> = {}
    for (const k of confirmedAspects) {
      const entry = existingState.confirmedAspects[k as AspectKey]
      if (entry?.value) confirmedValues[k] = entry.value
      if (entry?.quality) confirmedQualities[k] = entry.quality
      if (entry?.challengeCount !== undefined) challengeCounts[k] = entry.challengeCount
    }
    const aiResponse = await invokeChefDeProjet(
      dossier.name,
      history,
      result.data.message,
      files,
      existingState.step,
      {
        currentQuestion: existingState.currentQuestion,
        confirmedAspects,
        confirmedValues,
        confirmedQualities,
        challengeCounts,
      }
    )

    // Guard: only attach choices if the message actually contains a question
    const messageHasQuestion = /[?]|—\s*\w/.test(aiResponse.message)
    // questions block takes priority — if present, skip flat choices
    const hasQuestions = (aiResponse.questions?.length ?? 0) > 0
    const safeChoices = hasQuestions ? undefined : (messageHasQuestion ? aiResponse.choices : undefined)
    const safeQuestions = hasQuestions ? aiResponse.questions : undefined

    const expertMsg: ChatMessage = {
      id: randomUUID(),
      role: "expert",
      content: aiResponse.message,
      timestamp: new Date().toISOString(),
      choices: safeChoices,
      questions: safeQuestions,
    }

    // Strip choices+questions from all previous messages — only the latest expert message may show them
    const historyWithoutChoices = history.map((m) =>
      (m.choices?.length || m.questions?.length) ? { ...m, choices: undefined, questions: undefined } : m
    )
    const updatedMessages = [...historyWithoutChoices, userMsg, expertMsg]

    // Apply LLM response to authoritative state
    const llmAspects = (aiResponse.confirmedAspects ?? []) as AspectKey[]
    const llmQuality = (aiResponse.aspectQuality ?? {}) as Partial<Record<AspectKey, "strong" | "weak">>
    const llmChallengeCount = (aiResponse.challengeCount ?? {}) as Partial<Record<AspectKey, number>>
    const newState = applyLLMResponse(existingState, llmAspects, messageText, llmQuality, llmChallengeCount)

    // ── Guard: never signal COMPLETE in the same turn as pending choices ──────
    // If the AI reply still has choices, the last question is still open.
    // We persist the real computed state (so next POST starts correctly) but
    // return step: IN_PROGRESS to the client — the banner must not appear
    // while an unanswered question is on screen.
    const hasPendingChoices = (aiResponse.choices?.length ?? 0) > 0
    const stateForClient =
      hasPendingChoices && newState.step === "COMPLETE"
        ? { ...newState, step: "IN_PROGRESS" as const, status: "IN_PROGRESS" as const }
        : newState
    const stateDTO = toDTO(stateForClient)

    // Persist both messages and state atomically (persist real state, not deferred)
    const saved = await prisma.dossier.update({
      where: { id },
      data: {
        onboardingMessages: updatedMessages,
        onboardingState: newState as unknown as Record<string, unknown>,
      },
    })
    console.log("[onboarding POST] persisted messages count:", (saved?.onboardingMessages as unknown[])?.length ?? "save failed")

    return apiSuccess({
      messages: updatedMessages,
      onboardingState: stateDTO,
      recommendedLab: stateDTO.recommendedLab,
      isComplete: stateForClient.step === "COMPLETE",
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur interne"
    console.error("[onboarding POST]", msg)
    return apiError(`Erreur IA : ${msg}`, 500)
  }
}

import { describe, it, expect } from "vitest"
import {
  createInitialState,
  applyLLMResponse,
  deserializeState,
  assertCanComplete,
  assertValidLab,
  isComplete,
  nextAspect,
  safeValidateLab,
  toDTO,
  ASPECT_KEYS,
  VALID_LABS,
  STATE_SCHEMA_VERSION,
} from "../onboarding-state"

// ─── Invariant 1 : COMPLETE exige les 4 aspects ────────────────────────────

describe("Invariant 1 — isComplete", () => {
  it("est false sur un état initial", () => {
    const state = createInitialState()
    expect(isComplete(state)).toBe(false)
  })

  it("est false si seulement 3 aspects confirmés", () => {
    const state = createInitialState()
    const partial = applyLLMResponse(state, ["problem", "target", "outcome"], "Ma réponse")
    expect(isComplete(partial)).toBe(false)
    expect(partial.status).toBe("IN_PROGRESS")
  })

  it("est true si les 4 aspects sont confirmés", () => {
    let state = createInitialState()
    for (const aspect of ASPECT_KEYS) {
      state = applyLLMResponse(state, [aspect], `Réponse pour ${aspect}`)
    }
    expect(isComplete(state)).toBe(true)
    expect(state.status).toBe("COMPLETE")
  })

  it("assertCanComplete lève une erreur si aspect manquant", () => {
    const state = applyLLMResponse(createInitialState(), ["problem", "target"], "test")
    expect(() => assertCanComplete(state as any)).toThrow(/missing aspects/)
  })

  it("assertCanComplete ne lève pas si tous les aspects sont présents", () => {
    let state = createInitialState()
    for (const aspect of ASPECT_KEYS) {
      state = applyLLMResponse(state, [aspect], `Réponse ${aspect}`)
    }
    expect(() => assertCanComplete(state as any)).not.toThrow()
  })
})

// ─── Invariant 2 : recommendedLab hors enum → DISCOVERY ───────────────────

describe("Invariant 2 — recommendedLab", () => {
  it("safeValidateLab retourne DISCOVERY pour une valeur inconnue", () => {
    expect(safeValidateLab("bercall.connector")).toBe("DISCOVERY")
    expect(safeValidateLab("INVALID_LAB")).toBe("DISCOVERY")
    expect(safeValidateLab(undefined)).toBe("DISCOVERY")
    expect(safeValidateLab("")).toBe("DISCOVERY")
  })

  it("safeValidateLab accepte toutes les valeurs VALID_LABS", () => {
    for (const lab of VALID_LABS) {
      expect(safeValidateLab(lab)).toBe(lab)
    }
  })

  it("assertValidLab lève une erreur sur une valeur invalide", () => {
    expect(() => assertValidLab("bercall.connector")).toThrow(/Invalid lab/)
  })

  it("l'état contient toujours recommendedLab = DISCOVERY après applyLLMResponse", () => {
    const state = applyLLMResponse(createInitialState(), ["problem"], "test")
    expect(state.recommendedLab).toBe("DISCOVERY")
  })
})

// ─── Invariant 3 : currentQuestion = premier aspect non confirmé ───────────

describe("Invariant 3 — currentQuestion", () => {
  it("commence à 'problem'", () => {
    expect(createInitialState().currentQuestion).toBe("problem")
  })

  it("progresse dans l'ordre après chaque confirmation", () => {
    let state = createInitialState()
    expect(state.currentQuestion).toBe("problem")

    state = applyLLMResponse(state, ["problem"], "test")
    expect(state.currentQuestion).toBe("target")

    state = applyLLMResponse(state, ["target"], "test")
    expect(state.currentQuestion).toBe("outcome")

    state = applyLLMResponse(state, ["outcome"], "test")
    expect(state.currentQuestion).toBe("constraint")
  })

  it("devient null une fois COMPLETE", () => {
    let state = createInitialState()
    for (const aspect of ASPECT_KEYS) {
      state = applyLLMResponse(state, [aspect], "test")
    }
    expect(state.currentQuestion).toBeNull()
  })
})

// ─── Immuabilité une fois COMPLETE ────────────────────────────────────────

describe("Immuabilité après COMPLETE", () => {
  it("un état COMPLETE ne peut pas être modifié", () => {
    let state = createInitialState()
    for (const aspect of ASPECT_KEYS) {
      state = applyLLMResponse(state, [aspect], "test")
    }
    expect(state.status).toBe("COMPLETE")

    const after = applyLLMResponse(state, ["problem"], "nouveau message")
    expect(after).toBe(state) // référence identique → immuable
  })
})

// ─── Audit trail ──────────────────────────────────────────────────────────

describe("Audit trail", () => {
  it("enregistre la valeur de la réponse utilisateur et confirmedAt", () => {
    const state = applyLLMResponse(createInitialState(), ["problem"], "Réduire les coûts de production")
    expect(state.confirmedAspects.problem?.value).toBe("Réduire les coûts de production")
    expect(state.confirmedAspects.problem?.confirmedAt).toBeDefined()
  })

  it("n'écrase pas un aspect déjà confirmé", () => {
    let state = applyLLMResponse(createInitialState(), ["problem"], "Premier message")
    const originalValue = state.confirmedAspects.problem?.value

    state = applyLLMResponse(state, ["problem"], "Deuxième message tente d'écraser")
    expect(state.confirmedAspects.problem?.value).toBe(originalValue)
  })

  it("n'enregistre pas si userMessage est vide", () => {
    const state = applyLLMResponse(createInitialState(), ["problem"], "")
    expect(state.confirmedAspects.problem).toBeUndefined()
  })
})

// ─── Sérialisation / deserialisation ──────────────────────────────────────

describe("deserializeState", () => {
  it("retourne un état initial si null", () => {
    const state = deserializeState(null)
    expect(state.status).toBe("IN_PROGRESS")
    expect(state.stateSchemaVersion).toBe(STATE_SCHEMA_VERSION)
  })

  it("retourne un état initial si objet vide", () => {
    const state = deserializeState({})
    expect(state.status).toBe("IN_PROGRESS")
  })

  it("restaure un état complet depuis JSON", () => {
    let original = createInitialState()
    for (const aspect of ASPECT_KEYS) {
      original = applyLLMResponse(original, [aspect], `Réponse ${aspect}`)
    }
    const serialized = JSON.parse(JSON.stringify(original))
    const restored = deserializeState(serialized)

    expect(restored.status).toBe("COMPLETE")
    expect(restored.currentQuestion).toBeNull()
    expect(isComplete(restored)).toBe(true)
  })

  it("migre v0 (booléens) vers v1 (ConfirmedAspectEntry)", () => {
    const v0 = {
      stateSchemaVersion: 0,
      status: "IN_PROGRESS",
      confirmedAspects: { problem: "Mon problème métier" },
    }
    const migrated = deserializeState(v0)
    expect(migrated.stateSchemaVersion).toBe(STATE_SCHEMA_VERSION)
    expect(migrated.confirmedAspects.problem?.value).toBe("Mon problème métier")
  })
})

// ─── toDTO ────────────────────────────────────────────────────────────────

describe("toDTO", () => {
  it("n'expose que les valeurs, pas l'audit trail complet", () => {
    const state = applyLLMResponse(createInitialState(), ["problem"], "Test problème")
    const dto = toDTO(state)

    expect(dto.confirmedAspects.problem).toBe("Test problème")
    // L'audit trail (confirmedAt) ne doit pas être dans le DTO
    expect(typeof dto.confirmedAspects.problem).toBe("string")
  })

  it("isComplete dans le DTO correspond au status serveur", () => {
    let state = createInitialState()
    for (const aspect of ASPECT_KEYS) {
      state = applyLLMResponse(state, [aspect], "test")
    }
    const dto = toDTO(state)
    expect(dto.status).toBe("COMPLETE")
    expect(dto.currentQuestion).toBeNull()
  })
})

import type { LabType } from "@prisma/client"

export interface LabCondition {
  requiredValidatedCardTypes: string[]
  nextLab: LabType | null
}

export const LAB_CONDITIONS: Record<LabType, LabCondition> = {
  DISCOVERY: {
    requiredValidatedCardTypes: ["vision_statement", "problem_definition"],
    nextLab: "STRUCTURATION",
  },
  STRUCTURATION: {
    requiredValidatedCardTypes: ["information_architecture", "functional_requirements"],
    nextLab: "VALIDATION_MARCHE",
  },
  VALIDATION_MARCHE: {
    requiredValidatedCardTypes: ["market_size", "competitive_analysis"],
    nextLab: "DESIGN_PRODUIT",
  },
  DESIGN_PRODUIT: {
    requiredValidatedCardTypes: ["product_roadmap", "feature_matrix"],
    nextLab: "ARCHITECTURE_TECHNIQUE",
  },
  ARCHITECTURE_TECHNIQUE: {
    requiredValidatedCardTypes: ["system_architecture", "tech_stack", "data_model"],
    nextLab: "BUSINESS_FINANCE",
  },
  BUSINESS_FINANCE: {
    requiredValidatedCardTypes: ["business_model_canvas", "financial_projection"],
    nextLab: null,
  },
}

export function getLabOrder(): LabType[] {
  return [
    "DISCOVERY",
    "STRUCTURATION",
    "VALIDATION_MARCHE",
    "DESIGN_PRODUIT",
    "ARCHITECTURE_TECHNIQUE",
    "BUSINESS_FINANCE",
  ]
}

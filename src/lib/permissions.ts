import type { LabType, UserRole, ExpertSessionStatus } from "@prisma/client"
import { db as prisma } from "@/lib/db"

export interface Permissions {
  canCreateCard: boolean
  canValidateCard: boolean
  canActivateExpert: Record<string, boolean>
  canTransitionLab: boolean
  canExport: boolean
  canCreateCrowdfunding: boolean
  canViewCanvas: boolean
  canEditCanvas: boolean
}

interface ComputeParams {
  lab: LabType
  expertStates: { slug: string; status: ExpertSessionStatus; blocksLabTransition: boolean }[]
  score: number
  userRole: UserRole
  subFolderOpen: boolean
}

export async function computePermissions(params: ComputeParams): Promise<Permissions> {
  const { lab, expertStates, score, userRole, subFolderOpen } = params
  const isViewer = userRole === "VIEWER"
  const isOwnerOrCollab = userRole === "OWNER" || userRole === "COLLABORATOR"

  const labExperts = await prisma.expert.findMany({ where: { lab } })
  const canActivateExpert: Record<string, boolean> = {}
  for (const expert of labExperts) {
    const existing = expertStates.find((s) => s.slug === expert.slug)
    canActivateExpert[expert.slug] =
      isOwnerOrCollab &&
      (!existing || existing.status === "REJECTED")
  }

  const hasBlockingExperts = expertStates.some(
    (s) => s.blocksLabTransition && s.status !== "VALIDATED"
  )

  return {
    canCreateCard: isOwnerOrCollab,
    canValidateCard: isOwnerOrCollab,
    canActivateExpert,
    canTransitionLab: isOwnerOrCollab && !hasBlockingExperts,
    canExport: score > 90,
    canCreateCrowdfunding: score > 60,
    canViewCanvas: subFolderOpen,
    canEditCanvas: isOwnerOrCollab && subFolderOpen,
  }
}

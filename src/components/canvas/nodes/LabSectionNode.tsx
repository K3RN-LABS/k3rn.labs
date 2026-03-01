"use client"

import { memo } from "react"
import type { NodeProps } from "reactflow"
import { cn } from "@/lib/utils"

interface LabSectionData {
  label: string
  lab: string
}

const LAB_COLORS: Record<string, string> = {
  DISCOVERY: "bg-blue-500/10 border-blue-500/30",
  STRUCTURATION: "bg-violet-500/10 border-violet-500/30",
  VALIDATION_MARCHE: "bg-green-500/10 border-green-500/30",
  DESIGN_PRODUIT: "bg-pink-500/10 border-pink-500/30",
  ARCHITECTURE_TECHNIQUE: "bg-orange-500/10 border-orange-500/30",
  BUSINESS_FINANCE: "bg-emerald-500/10 border-emerald-500/30",
}

export const LabSectionNode = memo(({ data }: NodeProps<LabSectionData>) => {
  return (
    <div className={cn("rounded-xl border-2 p-3 w-[220px] text-center", LAB_COLORS[data.lab] ?? "bg-muted/20 border-muted")}>
      <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{data.label}</span>
    </div>
  )
})

LabSectionNode.displayName = "LabSectionNode"

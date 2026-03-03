"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { cn } from "@/lib/utils"
import type { CardState } from "@prisma/client"

const STATE_COLORS: Record<CardState, string> = {
  DRAFT: "border-yellow-400 bg-yellow-50 dark:bg-yellow-950",
  VALIDATED: "border-green-500 bg-green-50 dark:bg-green-950",
  REJECTED: "border-red-500 bg-red-50 dark:bg-red-950",
  ARCHIVED: "border-gray-400 bg-gray-50 dark:bg-gray-950",
}

const STATE_LABELS: Record<CardState, string> = {
  DRAFT: "Draft",
  VALIDATED: "Validated",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
}

interface CardNodeData {
  cardId: string
  title: string
  type: string
  state: CardState
  lab: string
  onOpen?: (cardId: string) => void
}

export const CardNode = memo(({ data, selected }: NodeProps<CardNodeData>) => {
  return (
    <div
      className={cn(
        "min-w-[160px] max-w-[200px] rounded-lg border-2 p-3 cursor-pointer transition-shadow",
        STATE_COLORS[data.state],
        selected && "ring-2 ring-primary ring-offset-2"
      )}
      onDoubleClick={() => data.onOpen?.(data.cardId)}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div className="text-[10px] font-jakarta text-muted-foreground uppercase tracking-wide mb-1">{data.type}</div>
      <div className="text-sm font-semibold leading-tight line-clamp-2">{data.title}</div>
      <div className="mt-2 text-[9px] font-medium uppercase tracking-wider opacity-60">{STATE_LABELS[data.state]}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  )
})

CardNode.displayName = "CardNode"

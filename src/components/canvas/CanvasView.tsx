"use client"

import { useEffect, useCallback, useMemo } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "reactflow"
import "reactflow/dist/style.css"
import { useGraphData } from "@/hooks/use-canvas"
import { useGraphRealtime } from "@/hooks/use-graph-realtime"
import { useWorkspaceStore } from "@/store/workspace.store"
import { CardNode } from "./nodes/CardNode"
import { LabSectionNode } from "./nodes/LabSectionNode"

const nodeTypes = {
  cardNode: CardNode,
  labSectionNode: LabSectionNode,
}

const POLE_COLORS: Record<string, string> = {
  P01_STRATEGIE: "#7c3aed",
  P02_MARKET: "#0284c7",
  P03_PRODUIT_TECH: "#059669",
  P04_FINANCE: "#d97706",
  P05_MARKETING: "#db2777",
  P06_LEGAL: "#475569",
  P07_TALENT_OPS: "#ea580c",
}

const CARD_TYPE_COLORS: Record<string, string> = {
  IDEA: "#8b5cf6",
  DECISION: "#ef4444",
  TASK: "#3b82f6",
  ANALYSIS: "#10b981",
  HYPOTHESIS: "#f59e0b",
  PROBLEM: "#dc2626",
  VISION: "#6366f1",
}

// Subfolder zone colors (subtle background tint per group)
const SUBFOLDER_ZONE: Record<string, { bg: string; label: string }> = {
  PRODUIT: { bg: "#1e40af22", label: "Product" },
  MARCHE: { bg: "#16653422", label: "Market" },
  TECHNOLOGIE: { bg: "#6d28d922", label: "Technology" },
  BUSINESS: { bg: "#d9770622", label: "Business" },
}

interface CanvasViewProps {
  dossierId: string
  subFolderId?: string | null // optional – if provided, filters to that folder
}

type CardRecord = {
  id: string
  title: string
  content: unknown
  cardType: string | null
  type: string | null
  state: string
  source: string
  poleCode: string | null
  lab: string | null
  createdAt: string
  subFolder?: { id?: string; type: string } | null
}

function autoLayout(cards: CardRecord[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  // Group by subfolder type first, then by pole/cardType within
  const groups: Record<string, string[]> = {}

  for (const card of cards) {
    const group = card.subFolder?.type ?? card.poleCode ?? card.cardType ?? "MISC"
    if (!groups[group]) groups[group] = []
    groups[group].push(card.id)
  }

  const groupKeys = Object.keys(groups)
  const COL_WIDTH = 320
  const ROW_HEIGHT = 200

  groupKeys.forEach((group, gi) => {
    const baseX = gi * COL_WIDTH
    groups[group].forEach((cardId, ci) => {
      positions.set(cardId, {
        x: baseX + (ci % 2) * 24,
        y: ci * ROW_HEIGHT,
      })
    })
  })

  return positions
}


export function CanvasView({ dossierId, subFolderId }: CanvasViewProps) {
  const { data: graphData } = useGraphData(dossierId)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Realtime — auto-invalidate graph query on remote updates
  useGraphRealtime(dossierId)

  // Canvas UI state from store
  const { canvasSearch, canvasFilterType, minimapEnabled } = useWorkspaceStore()

  useEffect(() => {
    if (!graphData) return

    const { cards: allCards, relations } = graphData

    // Apply filters: subfolder → cardType → search
    let cards = subFolderId
      ? allCards.filter((c) => c.subFolder && (c.subFolder as { id?: string }).id === subFolderId)
      : allCards

    if (canvasFilterType) {
      cards = cards.filter((c) => c.cardType === canvasFilterType)
    }

    if (canvasSearch.trim()) {
      const q = canvasSearch.toLowerCase()
      cards = cards.filter((c) => c.title.toLowerCase().includes(q))
    }

    if (cards.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    const positions = autoLayout(cards)

    const rfNodes: Node[] = cards.map((card, i) => {
      const pos = positions.get(card.id) ?? { x: (i % 5) * 320, y: Math.floor(i / 5) * 200 }
      const color =
        (card.poleCode && POLE_COLORS[card.poleCode]) ??
        (card.cardType && CARD_TYPE_COLORS[card.cardType]) ??
        "#94a3b8"
      return {
        id: card.id,
        type: "cardNode",
        position: pos,
        data: {
          label: card.title,
          type: card.cardType ?? card.type ?? "CARD",
          state: card.state,
          poleCode: card.poleCode,
          subFolderType: card.subFolder?.type,
          color,
          card,
        },
      }
    })

    // Only include edges between visible nodes
    const visibleIds = new Set(cards.map((c) => c.id))
    const rfEdges: Edge[] = relations
      .filter((rel) => visibleIds.has(rel.fromCardId) && visibleIds.has(rel.toCardId))
      .map((rel) => ({
        id: rel.id,
        source: rel.fromCardId,
        target: rel.toCardId,
        label: rel.type.replace(/_/g, " ").toLowerCase(),
        type: "smoothstep",
        animated: rel.type === "DERIVED_FROM",
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      }))

    setNodes(rfNodes)
    setEdges(rfEdges)
  }, [graphData, subFolderId, canvasSearch, canvasFilterType, setNodes, setEdges])

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => onNodesChange(changes),
    [onNodesChange]
  )

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => onEdgesChange(changes),
    [onEdgesChange]
  )

  const isEmpty = nodes.length === 0
  const isFiltered = !!canvasSearch.trim() || !!canvasFilterType

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1.2} color="#ffffff15" />
        <Controls className="!bottom-24 !right-6 !left-auto !m-0 !border-white/10 !bg-black/40 !backdrop-blur-xl !shadow-none !rounded-xl !overflow-hidden z-[55]" />
        {minimapEnabled && (
          <MiniMap
            nodeColor={(n) => (n.data?.color as string | undefined) ?? "#94a3b8"}
            className="!bottom-24 !right-24 !left-auto !m-0 !bg-black/40 !backdrop-blur-xl !border !border-white/10 !rounded-xl !overflow-hidden !shadow-none z-[50]"
            maskColor="rgba(0,0,0,0.75)"
            style={{ width: 180, height: 120 }}
          />
        )}
      </ReactFlow>

      {/* Empty state */}
      {isEmpty && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
          <div className="text-4xl opacity-20">✦</div>
          <p className="text-sm text-muted-foreground/50">
            {isFiltered
              ? "Aucune carte ne correspond à ce filtre"
              : subFolderId
                ? "Aucune carte dans ce sous-dossier"
                : "Le graphe est vide – consultez un expert pour créer des cartes"}
          </p>
        </div>
      )}
    </div>
  )
}

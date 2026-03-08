"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { NodeModal, type ModalNode } from "./NodeModal"

// ─── Types ────────────────────────────────────────────────────────────────────

const POLE_COLORS: Record<string, string> = {
  P01_STRATEGIE: "#8b5cf6",
  P02_MARKET: "#3b82f6",
  P03_PRODUIT_TECH: "#06b6d4",
  P04_FINANCE: "#22c55e",
  P05_MARKETING: "#f97316",
  P06_LEGAL: "#ef4444",
  P07_TALENT_OPS: "#ec4899",
}

const STATE_COLORS: Record<string, string> = {
  VALIDATED: "#22c55e",
  DRAFT: "#eab308",
  REJECTED: "#ef4444",
  ARCHIVED: "#6b7280",
}

const TASK_COLORS: Record<string, string> = {
  SUGGESTED: "#eab308",
  PLANNED: "#60a5fa",
  IN_PROGRESS: "#f59e0b",
  DONE: "#4ade80",
}

type ViewMode = "global" | "PRODUIT" | "MARCHE" | "TECHNOLOGIE" | "BUSINESS"

interface RawPole { code: string; managerName: string }
interface RawCard { id: string; title: string; cardType?: string; type?: string; state: string; poleCode?: string | null; subFolderId?: string | null }
interface RawRelation { fromCardId: string; toCardId: string }
interface RawDocument { id: string; type: string; title: string; producedBy: string; poleCode?: string | null; content?: { summary?: string } | null; metadata?: { relatedCards?: string[] } | null }
interface RawTask { id: string; title: string; description?: string | null; status: string; origin: string; assignedPole?: string | null; relatedCards?: string[] | null }

interface GraphNode {
  id: string
  kind: "pole" | "card" | "document" | "task"
  label: string
  color: string
  size: number
  // extra data for modal
  data: Record<string, unknown>
  // force-graph internal
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  kind: "membership" | "relation" | "produced" | "triggers"
  color: string
  width: number
}

interface ForceGraphProps {
  dossierId: string
  viewMode: ViewMode
  filterType: string | null
  searchQuery: string
  onOpenCard?: (cardId: string) => void
  onOpenPole?: (poleCode: string) => void
}

// Dynamic import — force-graph requires browser window
const ForceGraph2D = dynamic(() => import("react-force-graph-2d").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-white/20 text-sm">
      Chargement du graphe…
    </div>
  ),
})

// ─── SubFolder → Pole mapping ────────────────────────────────────────────────

const SUBFOLDER_POLES: Record<string, string[]> = {
  PRODUIT: ["P03_PRODUIT_TECH"],
  MARCHE: ["P02_MARKET", "P05_MARKETING"],
  TECHNOLOGIE: ["P03_PRODUIT_TECH", "P06_LEGAL"],
  BUSINESS: ["P04_FINANCE", "P01_STRATEGIE", "P07_TALENT_OPS"],
}

// ─── Build graph data ────────────────────────────────────────────────────────

function buildGraphData(
  poles: RawPole[],
  cards: RawCard[],
  relations: RawRelation[],
  documents: RawDocument[],
  tasks: RawTask[],
  viewMode: ViewMode,
  filterType: string | null,
  searchQuery: string
) {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []

  const nodeSet = new Set<string>()

  // Filter cards by viewMode
  const visiblePoleCodes = viewMode === "global" ? null : SUBFOLDER_POLES[viewMode] ?? null

  const filteredCards = cards.filter((c) => {
    if (visiblePoleCodes && c.poleCode && !visiblePoleCodes.includes(c.poleCode)) return false
    if (filterType && filterType !== "ALL" && c.cardType !== filterType && c.type !== filterType) return false
    return true
  })

  const filteredCardIds = new Set(filteredCards.map((c) => c.id))

  // Count relations per card
  const relationCount: Record<string, number> = {}
  relations.forEach((r) => {
    if (filteredCardIds.has(r.fromCardId)) relationCount[r.fromCardId] = (relationCount[r.fromCardId] ?? 0) + 1
    if (filteredCardIds.has(r.toCardId)) relationCount[r.toCardId] = (relationCount[r.toCardId] ?? 0) + 1
  })

  // Count cards + docs per pole
  const poleCardCount: Record<string, number> = {}
  const poleDocCount: Record<string, number> = {}
  filteredCards.forEach((c) => {
    if (c.poleCode) poleCardCount[c.poleCode] = (poleCardCount[c.poleCode] ?? 0) + 1
  })
  documents.forEach((d) => {
    if (d.poleCode) poleDocCount[d.poleCode] = (poleDocCount[d.poleCode] ?? 0) + 1
  })

  // Add pole hubs
  poles.forEach((pole) => {
    if (visiblePoleCodes && !visiblePoleCodes.includes(pole.code)) return
    const color = POLE_COLORS[pole.code] ?? "#666"
    nodes.push({
      id: `pole:${pole.code}`,
      kind: "pole",
      label: pole.managerName,
      color,
      size: 18,
      data: {
        kind: "pole",
        poleCode: pole.code,
        managerName: pole.managerName,
        color,
        cardCount: poleCardCount[pole.code] ?? 0,
        docCount: poleDocCount[pole.code] ?? 0,
      },
    })
    nodeSet.add(`pole:${pole.code}`)
  })

  // Add cards
  filteredCards.forEach((c) => {
    const rc = relationCount[c.id] ?? 0
    const size = Math.min(18, 6 + rc * 2)
    const color = STATE_COLORS[c.state] ?? "#6b7280"
    const cardType = c.cardType ?? c.type ?? "CARD"
    const nodeId = `card:${c.id}`
    nodes.push({
      id: nodeId,
      kind: "card",
      label: c.title,
      color,
      size,
      data: {
        kind: "card",
        cardId: c.id,
        label: c.title,
        type: cardType,
        state: c.state,
        poleCode: c.poleCode ?? null,
        relationCount: rc,
      },
    })
    nodeSet.add(nodeId)

    // Membership link hub → card
    if (c.poleCode && nodeSet.has(`pole:${c.poleCode}`)) {
      links.push({
        source: `pole:${c.poleCode}`,
        target: nodeId,
        kind: "membership",
        color: (POLE_COLORS[c.poleCode] ?? "#666") + "44",
        width: 0.5,
      })
    }
  })

  // Add relations card → card
  relations.forEach((r) => {
    if (!filteredCardIds.has(r.fromCardId) || !filteredCardIds.has(r.toCardId)) return
    links.push({
      source: `card:${r.fromCardId}`,
      target: `card:${r.toCardId}`,
      kind: "relation",
      color: "#ffffff33",
      width: 1.5,
    })
  })

  // Add documents (only if global or matching pole)
  const filteredDocs = documents.filter((d) => {
    if (visiblePoleCodes && d.poleCode && !visiblePoleCodes.includes(d.poleCode)) return false
    return true
  })

  filteredDocs.forEach((d) => {
    const nodeId = `doc:${d.id}`
    nodes.push({
      id: nodeId,
      kind: "document",
      label: d.title,
      color: "#a78bfa",
      size: 7,
      data: {
        kind: "document",
        docType: d.type,
        title: d.title,
        producedBy: d.producedBy,
        poleCode: d.poleCode ?? null,
        summary: d.content?.summary ?? "",
      },
    })
    nodeSet.add(nodeId)

    // Membership to pole
    if (d.poleCode && nodeSet.has(`pole:${d.poleCode}`)) {
      links.push({
        source: `pole:${d.poleCode}`,
        target: nodeId,
        kind: "membership",
        color: "#a78bfa33",
        width: 0.5,
      })
    }

    // Links to related cards
    const relCards = (d.metadata?.relatedCards ?? []) as string[]
    relCards.forEach((cardId) => {
      if (filteredCardIds.has(cardId)) {
        links.push({
          source: nodeId,
          target: `card:${cardId}`,
          kind: "produced",
          color: "#a78bfa55",
          width: 1,
        })
      }
    })
  })

  // Add tasks (non-done when filtering)
  const filteredTasks = tasks.filter((t) => {
    if (visiblePoleCodes && t.assignedPole && !visiblePoleCodes.includes(t.assignedPole)) return false
    return true
  })

  filteredTasks.forEach((t) => {
    const nodeId = `task:${t.id}`
    const color = TASK_COLORS[t.status] ?? "#60a5fa"
    const size = t.status === "DONE" ? 5 : 6
    nodes.push({
      id: nodeId,
      kind: "task",
      label: t.title,
      color,
      size,
      data: {
        kind: "task",
        title: t.title,
        description: t.description ?? null,
        status: t.status,
        origin: t.origin,
      },
    })
    nodeSet.add(nodeId)

    // Link to assigned pole
    if (t.assignedPole && nodeSet.has(`pole:${t.assignedPole}`)) {
      links.push({
        source: `pole:${t.assignedPole}`,
        target: nodeId,
        kind: "triggers",
        color: color + "44",
        width: 0.5,
      })
    }

    // Links to related cards
    const relCards = t.relatedCards ?? []
    relCards.forEach((cardId) => {
      if (filteredCardIds.has(cardId)) {
        links.push({
          source: nodeId,
          target: `card:${cardId}`,
          kind: "triggers",
          color: color + "55",
          width: 1,
        })
      }
    })
  })

  // Apply search: dim non-matching nodes
  const searchLower = searchQuery.toLowerCase().trim()
  if (searchLower) {
    nodes.forEach((n) => {
      if (!n.label.toLowerCase().includes(searchLower)) {
        n.color = n.color + "22"
        n.size = Math.max(n.size * 0.5, 3)
      }
    })
  }

  return { nodes, links }
}

// ─── ForceGraph component ─────────────────────────────────────────────────────

export function ForceGraph({
  dossierId,
  viewMode,
  filterType,
  searchQuery,
  onOpenCard,
  onOpenPole,
}: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: typeof window !== "undefined" ? window.innerWidth : 1200, height: typeof window !== "undefined" ? window.innerHeight - 120 : 800 })
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [modalNode, setModalNode] = useState<ModalNode | null>(null)

  // Raw data cache
  const rawDataRef = useRef<{
    poles: RawPole[]
    cards: RawCard[]
    relations: RawRelation[]
    documents: RawDocument[]
    tasks: RawTask[]
  } | null>(null)

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDimensions({ width: el.offsetWidth, height: el.offsetHeight })
    })
    ro.observe(el)
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight })
    return () => ro.disconnect()
  }, [])

  // Fetch data then immediately rebuild
  useEffect(() => {
    setLoading(true)
    fetch(`/api/dossiers/${dossierId}/graph`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          rawDataRef.current = data.data
          const { poles, cards, relations, documents, tasks } = data.data
          setGraphData(buildGraphData(poles, cards, relations, documents, tasks, viewMode, filterType, searchQuery))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId])

  // Rebuild graph when filters change (without refetching)
  useEffect(() => {
    if (!rawDataRef.current) return
    const { poles, cards, relations, documents, tasks } = rawDataRef.current
    setGraphData(buildGraphData(poles, cards, relations, documents, tasks, viewMode, filterType, searchQuery))
  }, [viewMode, filterType, searchQuery])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setModalNode(node.data as unknown as ModalNode)
  }, [])

  const handleOpenCard = useCallback((cardId: string) => {
    setModalNode(null)
    onOpenCard?.(cardId)
  }, [onOpenCard])

  const handleOpenPole = useCallback((poleCode: string) => {
    setModalNode(null)
    onOpenPole?.(poleCode)
  }, [onOpenPole])

  // Node canvas rendering
  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D) => {
    const { x = 0, y = 0, size, color, kind, label } = node

    // Draw circle
    ctx.beginPath()
    ctx.arc(x, y, size, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()

    // Pole hubs: ring
    if (kind === "pole") {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.arc(x, y, size + 4, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Label
    const fontSize = kind === "pole" ? 5 : 3.5
    ctx.font = `${kind === "pole" ? "600" : "400"} ${fontSize}px Inter, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#ffffff"
    ctx.globalAlpha = kind === "pole" ? 0.9 : 0.7

    const maxLen = kind === "pole" ? 14 : 18
    const truncated = label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label
    ctx.fillText(truncated, x, y + size + fontSize + 1)
    ctx.globalAlpha = 1
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/20 text-sm">
        Chargement du graphe…
      </div>
    )
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
        <p className="text-sm">Aucun nœud à afficher</p>
        <p className="text-xs">Commencez par créer des cartes avec les experts</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <ForceGraph2D
        graphData={graphData as any}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="transparent"
        nodeId="id"
        nodeLabel="label"
        nodeCanvasObject={nodeCanvasObject as any}
        nodeCanvasObjectMode={() => "replace"}
        linkColor={(link: any) => link.color ?? "#ffffff22"}
        linkWidth={(link: any) => link.width ?? 1}
        linkDirectionalParticles={(link: any) => link.kind === "relation" ? 2 : 0}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={(link: any) => link.color ?? "#ffffff44"}
        linkCurvature={(link: any) => link.kind === "membership" ? 0.2 : 0}
        onNodeClick={handleNodeClick as any}
        cooldownTicks={120}
        d3VelocityDecay={0.3}
        d3AlphaDecay={0.02}
        enableNodeDrag
        enableZoomInteraction
        minZoom={0.2}
        maxZoom={8}
      />

      {modalNode && (
        <NodeModal
          node={modalNode}
          onClose={() => setModalNode(null)}
          onOpenCard={handleOpenCard}
          onOpenPole={handleOpenPole}
        />
      )}
    </div>
  )
}

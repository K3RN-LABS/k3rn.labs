"use client"

import { X, ExternalLink, CheckCircle2, Clock, ChevronRight, FileText, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { getExpertImage, normalizeManagerName } from "@/lib/experts"

interface PoleNode {
  kind: "pole"
  id: string
  poleCode: string
  managerName: string
  color: string
  cardCount: number
  docCount: number
}

interface CardNode {
  kind: "card"
  id: string
  cardId: string
  label: string
  type: string
  state: string
  poleCode: string | null
  relationCount: number
}

interface DocumentNode {
  kind: "document"
  id: string
  docType: string
  title: string
  producedBy: string
  poleCode: string | null
  summary: string
}

interface TaskNode {
  kind: "task"
  id: string
  title: string
  description: string | null
  status: string
  origin: string
}

export type ModalNode = PoleNode | CardNode | DocumentNode | TaskNode

const STATE_COLOR: Record<string, string> = {
  VALIDATED: "text-green-400",
  DRAFT: "text-yellow-400",
  REJECTED: "text-red-400",
  ARCHIVED: "text-zinc-500",
}

const STATUS_LABEL: Record<string, string> = {
  SUGGESTED: "Suggérée",
  PLANNED: "Planifiée",
  IN_PROGRESS: "En cours",
  DONE: "Terminée",
}

interface NodeModalProps {
  node: ModalNode
  onClose: () => void
  onOpenCard?: (cardId: string) => void
  onOpenPole?: (poleCode: string) => void
}

export function NodeModal({ node, onClose, onOpenCard, onOpenPole }: NodeModalProps) {
  return (
    <div className={cn(
      "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
      "w-[380px] max-h-[70vh] flex flex-col",
      "rounded-2xl border border-white/12 bg-black/85 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)]",
      "animate-in fade-in zoom-in-95 duration-150"
    )}>
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-white/30 hover:text-white/70 transition-colors z-10"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="overflow-y-auto p-5">
        {node.kind === "pole" && <PoleContent node={node} onOpenPole={onOpenPole} />}
        {node.kind === "card" && <CardContent node={node} onOpenCard={onOpenCard} />}
        {node.kind === "document" && <DocumentContent node={node} />}
        {node.kind === "task" && <TaskContent node={node} />}
      </div>
    </div>
  )
}

function PoleContent({ node, onOpenPole }: { node: PoleNode; onOpenPole?: (code: string) => void }) {
  const name = normalizeManagerName(node.managerName)
  const img = getExpertImage(node.managerName)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
          {img ? (
            <Image src={img} alt={name} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-white/10 text-lg font-bold text-white/60">
              {name[0]}
            </div>
          )}
        </div>
        <div>
          <p className="font-jakarta font-semibold text-white text-base">{name}</p>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">{node.poleCode.replace("_", " ")}</p>
        </div>
      </div>
      <div className="flex gap-4 text-center">
        <div className="flex-1 bg-white/5 rounded-xl py-3">
          <p className="text-lg font-semibold font-jakarta text-white">{node.cardCount}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wide">Cartes</p>
        </div>
        <div className="flex-1 bg-white/5 rounded-xl py-3">
          <p className="text-lg font-semibold font-jakarta text-white">{node.docCount}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wide">Documents</p>
        </div>
      </div>
      {onOpenPole && (
        <button
          onClick={() => onOpenPole(node.poleCode)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-white/70 hover:text-white text-sm transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
          Lancer une session
        </button>
      )}
    </div>
  )
}

function CardContent({ node, onOpenCard }: { node: CardNode; onOpenCard?: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-3.5 w-3.5 text-white/30" />
          <span className="text-[10px] text-white/40 uppercase tracking-wide">{node.type}</span>
          <span className={cn("text-[10px] uppercase tracking-wide ml-auto", STATE_COLOR[node.state] ?? "text-white/40")}>
            {node.state}
          </span>
        </div>
        <p className="text-white font-semibold font-jakarta text-base leading-snug">{node.label}</p>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-white/30">
        <span>{node.relationCount} connexion{node.relationCount !== 1 ? "s" : ""}</span>
        {node.poleCode && <span>· {node.poleCode.replace("_", " ")}</span>}
      </div>
      {onOpenCard && (
        <button
          onClick={() => onOpenCard(node.cardId)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-white/70 hover:text-white text-sm transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ouvrir la carte
        </button>
      )}
    </div>
  )
}

function DocumentContent({ node }: { node: DocumentNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[10px] text-violet-400/70 uppercase tracking-wide">{node.docType}</span>
        </div>
        <p className="text-white font-semibold font-jakarta text-base leading-snug">{node.title}</p>
        <p className="text-[11px] text-white/40 mt-1">par {node.producedBy}</p>
      </div>
      {node.summary && (
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-sm text-white/70 leading-relaxed">{node.summary}</p>
        </div>
      )}
    </div>
  )
}

function TaskContent({ node }: { node: TaskNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          {node.status === "DONE" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-blue-400" />
          )}
          <span className="text-[10px] text-white/40 uppercase tracking-wide">
            {STATUS_LABEL[node.status] ?? node.status}
          </span>
          <span className="text-[10px] text-white/20 ml-auto italic">via {node.origin}</span>
        </div>
        <p className="text-white font-semibold font-jakarta text-base leading-snug">{node.title}</p>
        {node.description && (
          <p className="text-sm text-white/50 mt-2 leading-relaxed">{node.description}</p>
        )}
      </div>
    </div>
  )
}

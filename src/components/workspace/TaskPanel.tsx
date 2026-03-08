"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Plus, CheckCircle2, Circle, Clock, Ban, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type TaskStatus = "SUGGESTED" | "PLANNED" | "IN_PROGRESS" | "DONE" | "CANCELLED"

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  origin: string
  assignedPole: string | null
  createdAt: string
  completedAt: string | null
}

const STATUS_ORDER: TaskStatus[] = ["IN_PROGRESS", "PLANNED", "SUGGESTED", "DONE", "CANCELLED"]

const STATUS_LABEL: Record<TaskStatus, string> = {
  SUGGESTED: "Suggérée",
  PLANNED: "Planifiée",
  IN_PROGRESS: "En cours",
  DONE: "Terminée",
  CANCELLED: "Annulée",
}

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  SUGGESTED: <Clock className="h-3.5 w-3.5 text-yellow-400" />,
  PLANNED: <Circle className="h-3.5 w-3.5 text-blue-400" />,
  IN_PROGRESS: <ChevronRight className="h-3.5 w-3.5 text-amber-400" />,
  DONE: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
  CANCELLED: <Ban className="h-3.5 w-3.5 text-zinc-500" />,
}

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  SUGGESTED: "PLANNED",
  PLANNED: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
}

interface TaskPanelProps {
  dossierId: string
  onClose: () => void
}

export function TaskPanel({ dossierId, onClose }: TaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?dossierId=${dossierId}`)
      const data = await res.json()
      if (data.data) setTasks(data.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [dossierId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function createTask() {
    if (!newTitle.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId, title: newTitle.trim(), status: "PLANNED", origin: "user" }),
      })
      const data = await res.json()
      if (data.data) {
        setTasks((prev) => [data.data, ...prev])
        setNewTitle("")
      }
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  async function updateStatus(task: Task, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)))
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
    } catch {
      // revert on error
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    }
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    } catch {
      fetchTasks()
    }
  }

  const activeTasks = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED")
  const doneTasks = tasks.filter((t) => t.status === "DONE" || t.status === "CANCELLED")

  const sorted = [...activeTasks].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  )

  return (
    <div className={cn(
      "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
      "w-[420px] max-h-[70vh] flex flex-col",
      "rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7)]",
      "animate-in slide-in-from-bottom-4 duration-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold font-jakarta text-white/90">Tâches</span>
          {activeTasks.length > 0 && (
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
              {activeTasks.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* New task input */}
      <div className="px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTask()}
            placeholder="Nouvelle tâche..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-white/20"
          />
          <Button
            size="sm"
            onClick={createTask}
            disabled={!newTitle.trim() || creating}
            className="bg-blue-600/80 hover:bg-blue-600 border-0 text-white shrink-0"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
          </div>
        ) : sorted.length === 0 && doneTasks.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">
            Aucune tâche — créez-en une ci-dessus
          </div>
        ) : (
          <>
            {sorted.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onAdvance={() => {
                  const next = NEXT_STATUS[task.status]
                  if (next) updateStatus(task, next)
                }}
                onCancel={() => updateStatus(task, "CANCELLED")}
                onDelete={() => deleteTask(task.id)}
              />
            ))}

            {doneTasks.length > 0 && (
              <button
                onClick={() => setShowDone((v) => !v)}
                className="w-full text-left text-[11px] text-white/30 hover:text-white/50 px-2 py-2 transition-colors"
              >
                {showDone ? "▾" : "▸"} {doneTasks.length} tâche{doneTasks.length > 1 ? "s" : ""} terminée{doneTasks.length > 1 ? "s" : ""}
              </button>
            )}

            {showDone && doneTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onAdvance={undefined}
                onCancel={undefined}
                onDelete={() => deleteTask(task.id)}
                dimmed
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  onAdvance,
  onCancel,
  onDelete,
  dimmed,
}: {
  task: Task
  onAdvance: (() => void) | undefined
  onCancel: (() => void) | undefined
  onDelete: () => void
  dimmed?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors group",
        dimmed ? "opacity-40" : "hover:bg-white/5"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Status icon / advance button */}
      <button
        onClick={onAdvance}
        disabled={!onAdvance}
        className="mt-0.5 shrink-0 disabled:cursor-default"
        title={onAdvance ? `Passer à : ${STATUS_LABEL[NEXT_STATUS[task.status] ?? task.status]}` : undefined}
      >
        {STATUS_ICON[task.status]}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug text-white/80 truncate", dimmed && "line-through")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/30">{STATUS_LABEL[task.status]}</span>
          {task.origin !== "user" && (
            <span className="text-[10px] text-white/20 italic">via {task.origin}</span>
          )}
        </div>
      </div>

      {/* Actions on hover */}
      {hovered && (
        <div className="flex items-center gap-1 shrink-0">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-[10px] text-white/30 hover:text-red-400 transition-colors px-1"
              title="Annuler"
            >
              <Ban className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-[10px] text-white/30 hover:text-red-400 transition-colors px-1"
            title="Supprimer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

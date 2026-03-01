import { create } from "zustand"
import type { Node, Edge } from "reactflow"

interface CanvasState {
  nodes: Node[]
  edges: Edge[]
  isDirty: boolean
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  markClean: () => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  nodes: [],
  edges: [],
  isDirty: false,
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  markClean: () => set({ isDirty: false }),
}))

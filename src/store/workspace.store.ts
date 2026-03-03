import { create } from "zustand"
import type { MacroState, SubFolderType } from "@prisma/client"

export type ChatType = "pole" | "kael"
export type CanvasLayout = "auto" | "free"

export interface OpenChat {
  key: string // unique per chat window
  type: ChatType
  poleId?: string
  poleCode?: string
  managerName?: string
  minimized: boolean
}

interface WorkspaceState {
  // Dossier / subfolder context
  activeDossierId: string | null
  activeSubFolderId: string | null
  activeSubFolderType: SubFolderType | null
  macroState: MacroState

  // Multi-chat coworking
  openChats: OpenChat[]
  focusedChatKey: string | null

  // Unread counts per chat key — badge on Dock buttons
  unreadCounts: Record<string, number>

  // KAEL permanent panel (kept for backward compat — no longer used as side panel)
  kaelPanelOpen: boolean

  // Notification sound toggle (persisted in localStorage)
  notifSoundEnabled: boolean

  // Canvas UI state
  canvasSearch: string
  canvasFilterType: string | null
  canvasLayout: CanvasLayout

  // Actions — context
  setActiveDossier: (id: string | null) => void
  setActiveSubFolder: (id: string | null, type: SubFolderType | null) => void
  setMacroState: (state: MacroState) => void
  reset: () => void

  // Actions — KAEL panel (legacy)
  setKaelPanelOpen: (open: boolean) => void
  toggleKaelPanel: () => void

  // Actions — canvas
  setCanvasSearch: (q: string) => void
  setCanvasFilterType: (type: string | null) => void
  setCanvasLayout: (layout: CanvasLayout) => void

  // Actions — chats
  openPoleChat: (poleId: string, poleCode: string, managerName: string) => void
  openKaelChat: () => void
  closeChat: (key: string) => void
  toggleMinimizeChat: (key: string) => void
  focusChat: (key: string) => void

  // Actions — unread
  markUnread: (key: string) => void
  clearUnread: (key: string) => void

  // Actions — notifications
  toggleNotifSound: () => void

  // Actions — minimap
  minimapEnabled: boolean
  toggleMinimap: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeDossierId: null,
  activeSubFolderId: null,
  activeSubFolderType: null,
  macroState: "WORKSPACE_IDLE",
  openChats: [],
  focusedChatKey: null,
  unreadCounts: {},
  kaelPanelOpen: false,
  notifSoundEnabled:
    typeof window !== "undefined"
      ? localStorage.getItem("k3rn_notif_sound") !== "false"
      : true,
  minimapEnabled:
    typeof window !== "undefined"
      ? localStorage.getItem("k3rn_minimap_enabled") === "true"
      : false,
  canvasSearch: "",
  canvasFilterType: null,
  canvasLayout: "auto",

  setActiveDossier: (id) => set({ activeDossierId: id }),
  setActiveSubFolder: (id, type) =>
    set({
      activeSubFolderId: id,
      activeSubFolderType: type,
      macroState: id ? "SUBFOLDER_OPEN" : "WORKSPACE_IDLE",
    }),

  setMacroState: (state) => set({ macroState: state }),
  reset: () =>
    set({
      activeDossierId: null,
      activeSubFolderId: null,
      activeSubFolderType: null,
      macroState: "WORKSPACE_IDLE",
      openChats: [],
      focusedChatKey: null,
      unreadCounts: {},
    }),

  setKaelPanelOpen: (open) => set({ kaelPanelOpen: open }),
  toggleKaelPanel: () => set((s) => ({ kaelPanelOpen: !s.kaelPanelOpen })),

  setCanvasSearch: (q) => set({ canvasSearch: q }),
  setCanvasFilterType: (type) => set({ canvasFilterType: type }),
  setCanvasLayout: (layout) => set({ canvasLayout: layout }),

  openPoleChat: (poleId, poleCode, managerName) => {
    const { openChats } = get()
    const existingKey = `pole-${poleId}`
    if (openChats.find((c) => c.key === existingKey)) {
      set({
        openChats: openChats.map((c) =>
          c.key === existingKey ? { ...c, minimized: false } : c
        ),
        focusedChatKey: existingKey,
      })
      return
    }
    const newChat: OpenChat = { key: existingKey, type: "pole", poleId, poleCode, managerName, minimized: false }
    const expanded = openChats.filter((c) => !c.minimized)
    const chatsToSet = expanded.length >= 2
      ? openChats.map((c) => c.key === expanded[0].key ? { ...c, minimized: true } : c)
      : openChats
    set({ openChats: [...chatsToSet, newChat], focusedChatKey: existingKey })
  },

  openKaelChat: () => {
    const { openChats } = get()
    const key = "kael"
    if (openChats.find((c) => c.key === key)) {
      set({
        openChats: openChats.map((c) =>
          c.key === key ? { ...c, minimized: false } : c
        ),
        focusedChatKey: key,
      })
      return
    }
    set({ openChats: [...openChats, { key, type: "kael", minimized: false }], focusedChatKey: key })
  },

  closeChat: (key) =>
    set((state) => ({
      openChats: state.openChats.filter((c) => c.key !== key),
      focusedChatKey: state.focusedChatKey === key ? null : state.focusedChatKey,
      unreadCounts: Object.fromEntries(Object.entries(state.unreadCounts).filter(([k]) => k !== key)),
    })),

  toggleMinimizeChat: (key) =>
    set((state) => ({
      openChats: state.openChats.map((c) =>
        c.key === key ? { ...c, minimized: !c.minimized } : c
      ),
    })),

  focusChat: (key) => set({ focusedChatKey: key }),

  markUnread: (key) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [key]: (state.unreadCounts[key] ?? 0) + 1,
      },
    })),

  clearUnread: (key) =>
    set((state) => {
      const next = { ...state.unreadCounts }
      delete next[key]
      return { unreadCounts: next }
    }),

  toggleNotifSound: () =>
    set((state) => {
      const next = !state.notifSoundEnabled
      if (typeof window !== "undefined") {
        localStorage.setItem("k3rn_notif_sound", next ? "true" : "false")
      }
      return { notifSoundEnabled: next }
    }),

  toggleMinimap: () =>
    set((state) => {
      const next = !state.minimapEnabled
      if (typeof window !== "undefined") {
        localStorage.setItem("k3rn_minimap_enabled", next ? "true" : "false")
      }
      return { minimapEnabled: next }
    }),
}))

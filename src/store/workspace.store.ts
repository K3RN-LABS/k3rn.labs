import { create } from "zustand"
import type { MacroState, SubFolderType } from "@prisma/client"

export type ChatType = "pole" | "kael"

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

  // Actions — context
  setActiveDossier: (id: string | null) => void
  setActiveSubFolder: (id: string | null, type: SubFolderType | null) => void
  setMacroState: (state: MacroState) => void
  reset: () => void

  // Actions — chats
  openPoleChat: (poleId: string, poleCode: string, managerName: string) => void
  openKaelChat: () => void
  closeChat: (key: string) => void
  toggleMinimizeChat: (key: string) => void
  focusChat: (key: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeDossierId: null,
  activeSubFolderId: null,
  activeSubFolderType: null,
  macroState: "WORKSPACE_IDLE",
  openChats: [],
  focusedChatKey: null,

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
    }),

  openPoleChat: (poleId, poleCode, managerName) => {
    const { openChats } = get()
    const existingKey = `pole-${poleId}`
    // If already open, just focus + expand it
    if (openChats.find((c) => c.key === existingKey)) {
      set({
        openChats: openChats.map((c) =>
          c.key === existingKey ? { ...c, minimized: false } : c
        ),
        focusedChatKey: existingKey,
      })
      return
    }
    const newChat: OpenChat = {
      key: existingKey,
      type: "pole",
      poleId,
      poleCode,
      managerName,
      minimized: false,
    }
    set({ openChats: [...openChats, newChat], focusedChatKey: existingKey })
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
    set({
      openChats: [...openChats, { key, type: "kael", minimized: false }],
      focusedChatKey: key,
    })
  },

  closeChat: (key) =>
    set((state) => ({
      openChats: state.openChats.filter((c) => c.key !== key),
      focusedChatKey: state.focusedChatKey === key ? null : state.focusedChatKey,
    })),

  toggleMinimizeChat: (key) =>
    set((state) => ({
      openChats: state.openChats.map((c) =>
        c.key === key ? { ...c, minimized: !c.minimized } : c
      ),
    })),

  focusChat: (key) => set({ focusedChatKey: key }),
}))

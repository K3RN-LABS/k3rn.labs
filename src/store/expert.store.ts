import { create } from "zustand"

interface ExpertState {
  activeSessionId: string | null
  activeExpertSlug: string | null
  panelOpen: boolean
  openExpertPanel: (sessionId: string, expertSlug: string) => void
  closeExpertPanel: () => void
}

export const useExpertStore = create<ExpertState>((set) => ({
  activeSessionId: null,
  activeExpertSlug: null,
  panelOpen: false,
  openExpertPanel: (sessionId, expertSlug) =>
    set({ activeSessionId: sessionId, activeExpertSlug: expertSlug, panelOpen: true }),
  closeExpertPanel: () =>
    set({ activeSessionId: null, activeExpertSlug: null, panelOpen: false }),
}))

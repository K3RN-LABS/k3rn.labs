"use client"

import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace.store"
import { ChatTray } from "@/components/workspace/chat-tray"
import type { PoleData } from "@/hooks/use-poles"

interface ExpertPanelManagerProps {
    dossierId: string
    currentLab?: string
}

/**
 * ExpertPanelManager — orchestrates all open expert chat panels.
 *
 * Exposes three logical operations backed by the workspace store:
 *   openExpert(poleId, poleCode, managerName)
 *   closeExpert(key)
 *   focusExpert(key)
 *
 * Rendering is delegated to ChatTray (floating windows) which already
 * handles the multi-chat layout + minimized tabs.
 */
export function ExpertPanelManager({ dossierId, currentLab }: ExpertPanelManagerProps) {
    return (
        <ChatTray dossierId={dossierId} currentLab={currentLab} />
    )
}

/**
 * Hook — convenience wrapper that returns expert panel actions
 * from the workspace store with semantic names.
 */
export function useExpertPanelManager() {
    const { openPoleChat, closeChat, focusChat } = useWorkspaceStore()

    return {
        openExpert: openPoleChat,
        closeExpert: closeChat,
        focusExpert: focusChat,
    }
}

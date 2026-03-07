import { createSupabaseClient } from "./supabase"

export type RealtimeChannel = "canvas" | "score" | "lab" | "graph" | "mission"

export function subscribeToChannel(
  dossierId: string,
  channel: RealtimeChannel,
  onUpdate: (payload: unknown) => void
) {
  const supabase = createSupabaseClient()
  const channelName = `dossier:${dossierId}:${channel}`

  const sub = supabase
    .channel(channelName)
    .on("broadcast", { event: "update" }, (payload) => onUpdate(payload))
    .subscribe()

  return () => {
    supabase.removeChannel(sub)
  }
}

export async function broadcastToChannel(
  dossierId: string,
  channel: RealtimeChannel,
  payload: unknown
) {
  const { createSupabaseAdmin } = await import("./supabase")
  const supabase = createSupabaseAdmin()
  const channelName = `dossier:${dossierId}:${channel}`

  await supabase.channel(channelName).send({
    type: "broadcast",
    event: "update",
    payload,
  })
}

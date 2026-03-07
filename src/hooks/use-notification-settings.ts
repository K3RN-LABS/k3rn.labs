"use client"

import { useEffect, useState } from "react"

export type NotificationSettings = {
  telegramChatId: string | null
  missionProgressUpdates: boolean
  telegramOnComplete: boolean
}

let cachedSettings: NotificationSettings | null = null
let fetchPromise: Promise<NotificationSettings | null> | null = null

async function fetchSettings(): Promise<NotificationSettings | null> {
  if (cachedSettings) return cachedSettings
  if (fetchPromise) return fetchPromise

  fetchPromise = fetch("/api/user/notifications")
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      cachedSettings = data
      fetchPromise = null
      return data
    })
    .catch(() => {
      fetchPromise = null
      return null
    })

  return fetchPromise
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(cachedSettings)
  const [loading, setLoading] = useState(!cachedSettings)

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings)
      setLoading(false)
      return
    }
    fetchSettings().then(data => {
      setSettings(data)
      setLoading(false)
    })
  }, [])

  return { settings, loading }
}

export function invalidateNotificationSettingsCache() {
  cachedSettings = null
  fetchPromise = null
}

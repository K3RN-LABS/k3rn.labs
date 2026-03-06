"use client"

import { useEffect, useState } from "react"

export type UserProfile = {
  id: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  email: string
  plan: string
  missionBudget: number
}

let cachedProfile: UserProfile | null = null
let fetchPromise: Promise<UserProfile | null> | null = null

async function fetchProfile(): Promise<UserProfile | null> {
  if (cachedProfile) return cachedProfile
  if (fetchPromise) return fetchPromise

  fetchPromise = fetch("/api/user/profile")
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      cachedProfile = data
      fetchPromise = null
      return data
    })
    .catch(() => {
      fetchPromise = null
      return null
    })

  return fetchPromise
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile)
  const [loading, setLoading] = useState(!cachedProfile)

  useEffect(() => {
    if (cachedProfile) {
      setProfile(cachedProfile)
      setLoading(false)
      return
    }
    fetchProfile().then(data => {
      setProfile(data)
      setLoading(false)
    })
  }, [])

  const refresh = () => {
    cachedProfile = null
    fetchPromise = null
    setLoading(true)
    fetchProfile().then(data => {
      setProfile(data)
      setLoading(false)
    })
  }

  return { profile, loading, refresh }
}

export function invalidateUserProfileCache() {
  cachedProfile = null
  fetchPromise = null
}

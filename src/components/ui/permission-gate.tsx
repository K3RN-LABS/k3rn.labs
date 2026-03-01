"use client"

import { usePermissions } from "@/hooks/use-permissions"
import type { Permissions } from "@/lib/permissions"

interface PermissionGateProps {
  dossierId: string
  permission: keyof Omit<Permissions, "canActivateExpert">
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({ dossierId, permission, children, fallback = null }: PermissionGateProps) {
  const { data: permissions, isLoading } = usePermissions(dossierId)

  if (isLoading) return null
  if (!permissions || !permissions[permission]) return <>{fallback}</>

  return <>{children}</>
}

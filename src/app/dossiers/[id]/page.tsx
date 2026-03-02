"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/**
 * Legacy /dossiers/[id] route — redirects to the canonical
 * /workspace/[id] unified cognitive surface.
 *
 * Preserves backward compatibility with any existing links or bookmarks.
 */
export default function DossierRedirectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/workspace/${id}`)
  }, [id, router])

  return (
    <div className="h-dvh bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/logo-icon/logo.svg"
          alt="k3rn"
          width={48}
          height={48}
          className="animate-spin-double drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
        />
        <p className="text-sm text-white/40 animate-pulse tracking-wide">Redirection vers le workspace…</p>
      </div>
    </div>
  )
}

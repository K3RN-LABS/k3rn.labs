"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { CREDIT_PACKS, type CreditPack } from "@/lib/credit-packs"
import { Loader2, Zap, CheckCircle2 } from "lucide-react"

interface CreditsModalProps {
  open: boolean
  onClose: () => void
  /** Current budget to display — optional */
  currentBudget?: number
}

export function CreditsModal({ open, onClose, currentBudget }: CreditsModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleBuy(pack: CreditPack) {
    if (loading) return
    setLoading(pack.id)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      })
      const data = await res.json()
      if (data.data?.url) {
        window.location.href = data.data.url
        // Ne pas reset le loading — la page va changer
        return
      }
      // URL absente = erreur silencieuse
      setLoading(null)
    } catch {
      setLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-950 border border-white/8 rounded-3xl p-0 max-w-2xl w-full overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-jakarta font-bold text-white/90 tracking-tight">
              Recharger vos missions
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/40 mt-1.5 font-sans">
            Chaque mission active un appel expert. KAEL et les dossiers sont gratuits.
            {currentBudget !== undefined && (
              <span className="ml-2 text-white/30">
                Solde actuel : <span className={cn("font-semibold", currentBudget <= 5 ? "text-red-400/80" : "text-white/50")}>{currentBudget}</span>
              </span>
            )}
          </p>
        </div>

        {/* Packs grid */}
        <div className="px-8 py-6 grid grid-cols-2 gap-3">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => handleBuy(pack)}
              disabled={!!loading}
              className={cn(
                "relative flex flex-col gap-3 rounded-2xl border p-5 text-left transition-all duration-200",
                "hover:bg-white/5 hover:border-white/12",
                pack.highlight
                  ? "border-primary/30 bg-primary/5 hover:bg-primary/8 hover:border-primary/40"
                  : "border-white/8 bg-white/[0.02]",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {pack.highlight && (
                <span className="absolute top-3 right-3 text-[9px] font-jakarta font-bold uppercase tracking-[0.2em] text-primary/80 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                  Populaire
                </span>
              )}

              <div>
                <p className="text-[10px] font-jakarta font-bold uppercase tracking-[0.18em] text-white/30 mb-1">
                  {pack.credits} missions
                </p>
                <p className="text-xl font-jakarta font-black text-white/90 tracking-tight">
                  {pack.name}
                </p>
                <p className="text-[11px] text-white/35 mt-1 font-sans leading-snug">
                  {pack.tagline}
                </p>
              </div>

              <div className="flex items-end justify-between mt-auto">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-jakarta font-black text-white/80">{pack.priceEur}€</span>
                  <span className="text-[10px] text-white/30 font-sans">unique</span>
                </div>
                <div className={cn(
                  "h-7 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-semibold transition-all",
                  pack.highlight
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/8 text-white/60"
                )}>
                  {loading === pack.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                  {loading === pack.id ? "Redirection…" : "Acheter"}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center gap-2 text-[10px] text-white/25 font-sans">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Paiement sécurisé via Stripe. Missions créditées instantanément après confirmation.
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"
import Link from "next/link"

type Mode = "login" | "signup"

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Login failed")
        router.push("/home")
        router.refresh()
      } else {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Signup failed")
        setSuccess("Compte créé — vérifie ton email pour confirmer.")
        setMode("login")
        setPassword("")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + back link */}
        <div className="flex items-center justify-between mb-8">
          <Logo size="sm" />
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Retour
          </Link>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 w-full rounded-lg border border-border bg-muted/40 p-1 mb-6">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSuccess(null) }}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "login" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Bon retour" : "Créer un compte"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Accède à ton workspace cognitif."
              : "Gratuit pendant la phase beta."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="toi@startup.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder={mode === "signup" ? "Minimum 6 caractères" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-500">{success}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            style={{ background: "#E84000", border: "none", color: "white" }}
          >
            {loading
              ? (mode === "login" ? "Connexion…" : "Création…")
              : (mode === "login" ? "Accéder au workspace" : "Créer mon compte")}
          </Button>
        </form>

        <Separator className="my-6" />

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? "Pas de compte ?" : "Déjà inscrit ?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setSuccess(null) }}
            className="font-medium text-foreground underline underline-offset-4 hover:opacity-80 transition-opacity"
          >
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  )
}

"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DollarSign } from "lucide-react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Logo } from "@/components/ui/logo"

export default function InvestPage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const [amount, setAmount] = useState("")
  const [email, setEmail] = useState("")
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["public-campaign", shareToken],
    queryFn: async () => {
      const res = await fetch(`/api/public/campaigns/${shareToken}`)
      if (!res.ok) throw new Error("Campaign not found")
      return res.json()
    },
  })

  const { mutate: invest, isPending: investing } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/crowdfunding/${campaign.id}/invest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), email, currency: "usd" }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Investment failed")
      }
      return res.json()
    },
    onSuccess: () => setSuccess(true),
    onError: (err) => setError(err instanceof Error ? err.message : "Unknown error"),
  })

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading campaign...</div>
    </div>
  )

  if (!campaign) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-destructive">Campaign not found</p>
    </div>
  )

  const progress = campaign.goal ? (campaign.raised / campaign.goal) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center gap-2">
        <Logo size="sm" />
      </header>
      <main className="max-w-lg mx-auto px-6 py-12 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{campaign.dossierName ?? "Innovation Project"}</CardTitle>
            <CardDescription>Support this project with your investment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>${campaign.raised.toLocaleString()} raised</span>
                <span>Goal: ${campaign.goal.toLocaleString()}</span>
              </div>
              <Progress value={Math.min(100, progress)} />
            </div>
            {campaign.state !== "ACTIVE" && (
              <p className="text-sm text-muted-foreground text-center">This campaign is {campaign.state.toLowerCase()}</p>
            )}
          </CardContent>
        </Card>

        {campaign.state === "ACTIVE" && !success && (
          <Card>
            <CardHeader>
              <CardTitle>Make an Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); invest() }} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Amount (USD)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={investing}>
                  {investing ? "Processing..." : "Invest Now"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-lg font-semibold">Thank you for your investment!</p>
              <p className="text-muted-foreground text-sm mt-1">Your payment is being processed.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

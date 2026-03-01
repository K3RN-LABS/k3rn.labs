"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useCrowdfunding, useCreateCampaign, useCloseCampaign } from "@/hooks/use-crowdfunding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, Link2, Lock, DollarSign } from "lucide-react"

export default function CrowdfundingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: campaign, isLoading } = useCrowdfunding(id)
  const { mutate: createCampaign, isPending: creating } = useCreateCampaign()
  const { mutate: closeCampaign, isPending: closing } = useCloseCampaign()
  const [goal, setGoal] = useState("")

  const state = campaign?.state ?? "LOCKED"
  const progress = campaign?.goal ? (campaign.raised / campaign.goal) * 100 : 0
  const shareUrl = campaign?.shareToken ? `${process.env.NEXT_PUBLIC_APP_URL}/invest/${campaign.shareToken}` : null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dossiers/${id}`)}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <span className="font-semibold">Crowdfunding</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {isLoading ? (
          <div className="animate-pulse h-40 bg-muted rounded-xl" />
        ) : (
          <>
            {state === "LOCKED" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Crowdfunding Locked</CardTitle>
                  </div>
                  <CardDescription>Reach a global score above 60 to unlock crowdfunding</CardDescription>
                </CardHeader>
              </Card>
            )}

            {(state === "ELIGIBLE" || state === "LOCKED") && state === "ELIGIBLE" && (
              <Card>
                <CardHeader>
                  <CardTitle>Launch Campaign</CardTitle>
                  <CardDescription>Your project is eligible for crowdfunding</CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      createCampaign({ dossierId: id, goal: parseFloat(goal) })
                    }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Funding goal (USD)"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        min="1"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={creating}>
                      {creating ? "Launching..." : "Launch Campaign"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {(state === "ACTIVE" || state === "CLOSED") && campaign && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Campaign</CardTitle>
                    <Badge variant={state === "ACTIVE" ? "default" : "secondary"}>{state}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>${campaign.raised.toLocaleString()} raised</span>
                      <span>Goal: ${campaign.goal.toLocaleString()}</span>
                    </div>
                    <Progress value={Math.min(100, progress)} />
                  </div>

                  {shareUrl && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono truncate">{shareUrl}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(shareUrl)}
                        className="shrink-0 text-xs"
                      >
                        Copy
                      </Button>
                    </div>
                  )}

                  {state === "ACTIVE" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => closeCampaign({ campaignId: campaign.id, dossierId: id })}
                      disabled={closing}
                    >
                      {closing ? "Closing..." : "Close Campaign"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}

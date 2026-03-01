"use client"

import { useScore } from "@/hooks/use-score"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ScoreMeterProps {
  dossierId: string
}

export function ScoreMeter({ dossierId }: ScoreMeterProps) {
  const { data, isLoading } = useScore(dossierId)
  const latest = data?.latest

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />
  if (!latest) return <div className="text-muted-foreground text-sm p-4">No score yet</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Global Score</span>
          <span className="text-2xl font-bold">{latest.globalScore.toFixed(0)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Market</span>
            <span>{latest.marketScore.toFixed(0)}%</span>
          </div>
          <Progress value={latest.marketScore} className="h-1.5 [&>div]:bg-blue-500" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Tech</span>
            <span>{latest.techScore.toFixed(0)}%</span>
          </div>
          <Progress value={latest.techScore} className="h-1.5 [&>div]:bg-violet-500" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Finance</span>
            <span>{latest.financeScore.toFixed(0)}%</span>
          </div>
          <Progress value={latest.financeScore} className="h-1.5 [&>div]:bg-emerald-500" />
        </div>
      </CardContent>
    </Card>
  )
}

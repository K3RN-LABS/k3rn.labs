"use client"

import { useParams, useRouter } from "next/navigation"
import { useExport, useGenerateExport, useExportDownload } from "@/hooks/use-export"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Download, Zap, Lock } from "lucide-react"

const STATE_INFO: Record<string, { label: string; color: string; description: string }> = {
  LOCKED: { label: "Locked", color: "destructive", description: "Score must exceed 90 to unlock export" },
  ELIGIBLE: { label: "Eligible", color: "default", description: "You can generate the export now" },
  GENERATING: { label: "Generating", color: "secondary", description: "Export is being generated..." },
  READY: { label: "Ready", color: "success" as string, description: "Export is ready for download" },
  FAILED: { label: "Failed", color: "destructive", description: "Export generation failed. Try again." },
}

export default function ExportPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: exportData, isLoading } = useExport(id)
  const { mutate: generate, isPending: generating } = useGenerateExport()
  const { mutate: getDownload, isPending: downloading } = useExportDownload()

  const state = exportData?.state ?? "LOCKED"
  const info = STATE_INFO[state] ?? STATE_INFO.LOCKED

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dossiers/${id}`)}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <span className="font-semibold">Export Project</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="animate-pulse h-40 bg-muted rounded-xl" />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Code Export</CardTitle>
                <Badge variant={info.color as "default" | "destructive" | "secondary" | "outline"}>{info.label}</Badge>
              </div>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state === "LOCKED" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-5 w-5" />
                  <span className="text-sm">Reach a global score above 90 to unlock export</span>
                </div>
              )}
              {(state === "ELIGIBLE" || state === "FAILED") && (
                <Button
                  onClick={() => generate(id)}
                  disabled={generating}
                  className="w-full"
                >
                  <Zap className="h-4 w-4" />
                  {generating ? "Generating..." : "Generate Export"}
                </Button>
              )}
              {state === "GENERATING" && (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Generating project structure and code...</span>
                </div>
              )}
              {state === "READY" && (
                <Button
                  onClick={() => getDownload(id, {
                    onSuccess: (data) => { if (data.url) window.open(data.url, "_blank") },
                  })}
                  disabled={downloading}
                  className="w-full"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Preparing download..." : "Download ZIP"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

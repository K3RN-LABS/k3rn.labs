"use client"

import { useState } from "react"
import { useCreateExpertSession, useInvokeExpert, useValidateExpertSession, useRejectExpertSession } from "@/hooks/use-experts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { X, Send, CheckCircle, XCircle, ChevronRight } from "lucide-react"
import type { ExpertDefinition } from "@/lib/experts"

interface ExpertPanelProps {
  experts: ExpertDefinition[]
  dossierId: string
  onClose: () => void
}

export function ExpertPanel({ experts, dossierId, onClose }: ExpertPanelProps) {
  const [selectedExpert, setSelectedExpert] = useState<ExpertDefinition | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [response, setResponse] = useState<{ analysis: string; proposedCard: { type: string; title: string; content: unknown }; confidence: number } | null>(null)

  const { mutate: createSession, isPending: creatingSession } = useCreateExpertSession()
  const { mutate: invoke, isPending: invoking } = useInvokeExpert()
  const { mutate: validate, isPending: validating } = useValidateExpertSession()
  const { mutate: reject, isPending: rejecting } = useRejectExpertSession()

  function handleSelectExpert(expert: ExpertDefinition) {
    setSelectedExpert(expert)
    setSessionId(null)
    setResponse(null)
    setMessage("")
    createSession(
      { expertId: expert.id, dossierId },
      { onSuccess: (data) => setSessionId(data.id) }
    )
  }

  function handleInvoke() {
    if (!sessionId || !message.trim()) return
    invoke(
      { sessionId, message, dossierId },
      {
        onSuccess: (data) => {
          setResponse(data.response)
          setMessage("")
        },
      }
    )
  }

  function handleValidate() {
    if (!sessionId) return
    validate(
      { sessionId, dossierId },
      { onSuccess: () => { setResponse(null); setSelectedExpert(null); setSessionId(null); onClose() } }
    )
  }

  function handleReject() {
    if (!sessionId) return
    reject(
      { sessionId, dossierId },
      { onSuccess: () => { setResponse(null); setSelectedExpert(null); setSessionId(null) } }
    )
  }

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">Expert Panel</span>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!selectedExpert ? (
        <div className="flex-1 overflow-auto p-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">Select an expert to engage</p>
          {experts.map((expert) => (
            <button
              key={expert.id}
              className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
              onClick={() => handleSelectExpert(expert)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{expert.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{expert.targetCardType}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {expert.blocksLabTransition && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0">REQUIRED</Badge>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{selectedExpert.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{selectedExpert.targetCardType}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedExpert(null)}>
                Back
              </Button>
            </div>
            {creatingSession && <div className="text-xs text-muted-foreground mt-2 animate-pulse">Starting session...</div>}
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {response && (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg text-sm">{response.analysis}</div>
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Proposed Card</div>
                  <div className="font-medium text-sm">{response.proposedCard?.title}</div>
                  <div className="text-[10px] text-muted-foreground">{response.proposedCard?.type}</div>
                  <div className="text-xs text-muted-foreground">
                    Confidence: {((response.confidence ?? 0) * 100).toFixed(0)}%
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleValidate}
                    disabled={validating}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {validating ? "Saving..." : "Validate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={handleReject}
                    disabled={rejecting}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>

          {sessionId && !response && (
            <div className="p-4 border-t space-y-2">
              <Textarea
                placeholder={`Describe your project context for ${selectedExpert.name}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) handleInvoke()
                }}
              />
              <Button
                className="w-full"
                size="sm"
                onClick={handleInvoke}
                disabled={invoking || !message.trim()}
              >
                <Send className="h-3.5 w-3.5" />
                {invoking ? "Invoking..." : "Ask Expert (⌘+Enter)"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

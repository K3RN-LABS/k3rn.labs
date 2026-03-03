import { useRef, useState, useCallback } from "react"

interface UseSpeechOptions {
  lang?: string
  onResult: (transcript: string) => void
}

export function useSpeech({ lang = "fr-FR", onResult }: UseSpeechOptions) {
  const [isListening, setIsListening] = useState(false)
  const [interim, setInterim] = useState("")
  const recRef = useRef<any>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const stop = useCallback(() => {
    if (recRef.current) {
      recRef.current.onresult = null
      recRef.current.onend = null
      recRef.current.onerror = null
      try { recRef.current.stop() } catch { }
      recRef.current = null
    }
    setIsListening(false)
    setInterim("")
  }, [])

  const toggle = useCallback(() => {
    if (isListening) {
      stop()
      return
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    stop()

    const rec = new SR()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    recRef.current = rec

    rec.onresult = (e: any) => {
      let interimText = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          onResultRef.current(e.results[i][0].transcript)
          setInterim("")
        } else {
          interimText += e.results[i][0].transcript
        }
      }
      if (interimText) setInterim(interimText)
    }

    rec.onstart = () => setIsListening(true)
    rec.onend = () => {
      if (recRef.current) {
        try { recRef.current.start() } catch { }
      } else {
        setIsListening(false)
        setInterim("")
      }
    }
    rec.onerror = (e: any) => {
      if (e.error === "no-speech") return
      recRef.current = null
      setIsListening(false)
      setInterim("")
    }

    rec.start()
  }, [isListening, lang, onResult, stop])

  return { isListening, toggle, stop, interim }
}

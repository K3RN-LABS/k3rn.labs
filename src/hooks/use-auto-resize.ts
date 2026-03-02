import { useRef, useEffect, useCallback } from "react"

export function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    const maxHeight = parseInt(getComputedStyle(el).maxHeight) || 200
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  return ref
}

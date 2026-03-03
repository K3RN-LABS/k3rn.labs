"use client"

import { useCallback, useRef } from "react"

/**
 * Plays a short futuristic "pad" sound using Web Audio API.
 * No external file — pure synthesis.
 *
 * Sound design: two-oscillator chord (sine + triangle),
 * soft attack, quick decay, slight reverb tail via convolver.
 */
export function useNotificationSound() {
    const enabledRef = useRef<boolean>(
        typeof window !== "undefined"
            ? localStorage.getItem("k3rn_notif_sound") !== "false"
            : true
    )

    const play = useCallback(() => {
        if (!enabledRef.current) return
        try {
            const ctx = new AudioContext()

            // Master gain (overall volume) - sleek, quick fade
            const master = ctx.createGain()
            master.gain.setValueAtTime(0, ctx.currentTime)
            master.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01) // fast attack
            master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
            master.connect(ctx.destination)

            // Filter for an elegant, muffled glass effect
            const filter = ctx.createBiquadFilter()
            filter.type = "lowpass"
            filter.frequency.setValueAtTime(4000, ctx.currentTime)
            filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4)
            filter.connect(master)

            // Osc 1 — root note (A5 = 880 Hz)
            const osc1 = ctx.createOscillator()
            osc1.type = "sine"
            osc1.frequency.setValueAtTime(880, ctx.currentTime)

            // Osc 2 — perfect fifth (E6 = 1318.51 Hz)
            const osc2 = ctx.createOscillator()
            osc2.type = "sine"
            osc2.frequency.setValueAtTime(1318.51, ctx.currentTime)

            // Osc 3 — short attack transient (click)
            const osc3 = ctx.createOscillator()
            osc3.type = "triangle"
            osc3.frequency.setValueAtTime(2500, ctx.currentTime)
            osc3.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08)

            const g2 = ctx.createGain()
            g2.gain.value = 0.6
            osc2.connect(g2)

            const g3 = ctx.createGain()
            g3.gain.setValueAtTime(0, ctx.currentTime)
            g3.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.005)
            g3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
            osc3.connect(g3)

            osc1.connect(filter)
            g2.connect(filter)
            g3.connect(master)

            osc1.start(ctx.currentTime)
            osc2.start(ctx.currentTime)
            osc3.start(ctx.currentTime)

            osc1.stop(ctx.currentTime + 0.8)
            osc2.stop(ctx.currentTime + 0.8)
            osc3.stop(ctx.currentTime + 0.1)

            // Auto-close context
            setTimeout(() => ctx.close(), 1000)
        } catch {
            // AudioContext not available (SSR / permissions)
        }
    }, [])

    const setEnabled = useCallback((enabled: boolean) => {
        enabledRef.current = enabled
        localStorage.setItem("k3rn_notif_sound", enabled ? "true" : "false")
    }, [])

    const isEnabled = useCallback(() => enabledRef.current, [])

    return { play, setEnabled, isEnabled }
}

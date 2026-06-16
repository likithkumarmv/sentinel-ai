/**
 * ═══════════════════════════════════════════════════════════
 *  SENTINEL AI — TTS HOOK (V2.2)
 *  Real AI voices via Edge TTS (Microsoft Neural voices).
 *  100% FREE — No API key required.
 *
 *  Priority chain:
 *    1. Backend Edge TTS (free, realistic neural voices)
 *    2. Browser speechSynthesis (universal fallback)
 * ═══════════════════════════════════════════════════════════
 */
import { useCallback, useRef, useEffect, useState } from "react"
import useInterviewStore from "../stores/interviewStore"

/* ── Browser fallback voices ──────────────────────────── */
const BROWSER_VOICE_PREFERENCES = [
  "Microsoft Ryan Online",
  "Microsoft Jenny Online",
  "Microsoft Guy Online",
  "Microsoft Aria Online",
  "Google US English",
  "Google UK English Male",
  "Google UK English Female",
  "Natural", "Neural", "Premium", "English",
]

const BROWSER_VOICE_CONFIG = {
  architect: { pitch: 0.85, rate: 0.92, volume: 1.0 },
  observer:  { pitch: 1.05, rate: 0.85, volume: 0.9 },
  manager:   { pitch: 0.95, rate: 1.0,  volume: 1.0 },
  mentor:    { pitch: 0.90, rate: 0.90, volume: 1.0 },
}

function findBestBrowserVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  if (voices.length === 0) return null
  const english = voices.filter(v => v.lang.startsWith("en-") || v.lang === "en")
  for (const pref of BROWSER_VOICE_PREFERENCES) {
    const match = english.find(v => v.name.includes(pref))
    if (match) return match
  }
  return english.find(v => v.lang === "en-US") || english[0] || null
}

export default function useTTS() {
  const audioRef = useRef(null)
  const utterRef = useRef(null)
  const store = useInterviewStore
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const cachedVoiceRef = useRef(null)

  // Pre-load browser voices
  useEffect(() => {
    function onVoicesChanged() {
      cachedVoiceRef.current = findBestBrowserVoice()
      setVoicesLoaded(true)
    }
    if (window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        cachedVoiceRef.current = findBestBrowserVoice()
        setVoicesLoaded(true)
      }
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged)
      return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged)
    }
  }, [])

  // ── Helper: play audio blob and return a promise ────
  const playBlob = useCallback((blob, agent) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      store.getState().setAgentTalking(agent)

      audio.onended = () => {
        store.getState().setAgentState(agent, "idle")
        store.getState().stopSpeaking()
        audioRef.current = null
        URL.revokeObjectURL(url)
        resolve()
      }
      audio.onerror = () => {
        store.getState().setAllIdle()
        audioRef.current = null
        URL.revokeObjectURL(url)
        resolve()
      }
      audio.play().catch(() => {
        store.getState().setAllIdle()
        URL.revokeObjectURL(url)
        resolve()
      })
    })
  }, [])

  // ── Tier 1: Backend Edge TTS (FREE — Real Neural Voices) ──
  const speakWithEdgeTTS = useCallback(async (text, agent) => {
    try {
      const response = await fetch("http://localhost:8000/api/transcription/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, agent }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      if (blob.size < 100) throw new Error("Empty audio response")
      console.log(`[TTS] Edge TTS OK — agent: ${agent}, size: ${(blob.size / 1024).toFixed(1)}KB`)
      await playBlob(blob, agent)
      return true
    } catch (err) {
      console.warn("[TTS] Edge TTS backend failed:", err.message)
      return null
    }
  }, [playBlob])

  // ── Tier 2: Browser speechSynthesis (Universal fallback) ──
  const speakWithBrowser = useCallback((text, agent) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return }
      window.speechSynthesis.cancel()

      const utter = new SpeechSynthesisUtterance(text)
      utterRef.current = utter
      const cfg = BROWSER_VOICE_CONFIG[agent] || BROWSER_VOICE_CONFIG.architect

      const bestVoice = cachedVoiceRef.current || findBestBrowserVoice()
      if (bestVoice) {
        utter.voice = bestVoice
        console.log(`[TTS] Browser fallback: ${bestVoice.name}`)
      }

      utter.pitch = cfg.pitch
      utter.rate = cfg.rate
      utter.volume = cfg.volume
      utter.lang = "en-US"

      store.getState().setAgentTalking(agent)

      utter.onend = () => {
        store.getState().setAgentState(agent, "idle")
        store.getState().stopSpeaking()
        utterRef.current = null
        resolve()
      }
      utter.onerror = (e) => {
        console.warn("[TTS] Browser speech error:", e.error)
        store.getState().setAllIdle()
        utterRef.current = null
        resolve()
      }
      window.speechSynthesis.speak(utter)
    })
  }, [])

  // ── Main speak function ───────────────────────────────
  // Priority: Edge TTS backend → Browser
  const speak = useCallback(async (text, agent = "architect") => {
    if (!text) return
    cancel()

    // Tier 1: Edge TTS backend (FREE — realistic neural voices)
    const edgeOK = await speakWithEdgeTTS(text, agent)
    if (edgeOK) return

    // Tier 2: Browser fallback
    console.warn("[TTS] Edge backend failed → browser fallback")
    await speakWithBrowser(text, agent)
  }, [speakWithEdgeTTS, speakWithBrowser])

  const cancel = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    utterRef.current = null
    store.getState().setAllIdle()
  }, [])

  return { speak, cancel }
}

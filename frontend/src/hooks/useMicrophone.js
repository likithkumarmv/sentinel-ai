/**
 * ═══════════════════════════════════════════════════════════
 *  SENTINEL AI — MICROPHONE HOOK
 *  System microphone access via getUserMedia API.
 *  Handles permissions, recording, and audio chunk collection.
 * ═══════════════════════════════════════════════════════════
 */
import { useRef, useState, useCallback } from "react"

/**
 * useMicrophone — Robust system microphone access and recording.
 *
 * Features:
 * - Permission handling with graceful denial messaging
 * - MediaRecorder with codec negotiation
 * - Audio chunk collection for backend transcription
 * - Live speech recognition (browser-native) with fallback
 *
 * @returns {{ startRecording, stopRecording, isRecording, permissionState, transcript, audioChunks, mimeType, error }}
 */
export default function useMicrophone() {
  const [isRecording, setIsRecording] = useState(false)
  const [permissionState, setPermissionState] = useState("prompt") // "prompt" | "granted" | "denied"
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState(null)
  const [mimeType, setMimeType] = useState("audio/webm")

  const recorderRef = useRef(null)
  const audioStreamRef = useRef(null)
  const chunksRef = useRef([])
  const srRef = useRef(null)
  const transcriptRef = useRef("")
  const speechRecBrokenRef = useRef(false)

  // Keep transcript ref in sync
  const updateTranscript = useCallback((val) => {
    transcriptRef.current = val
    setTranscript(val)
  }, [])

  /**
   * Request microphone permission and start recording.
   * @returns {boolean} Whether recording started successfully
   */
  const startRecording = useCallback(async () => {
    setError(null)
    chunksRef.current = []
    speechRecBrokenRef.current = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      })
      audioStreamRef.current = stream
      setPermissionState("granted")

      // Negotiate best mime type
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
      ]
      let selectedMime = ""
      for (const t of mimeTypes) {
        if (MediaRecorder.isTypeSupported(t)) {
          selectedMime = t
          break
        }
      }
      const finalMime = selectedMime || "audio/webm"
      setMimeType(finalMime)

      // Create MediaRecorder
      const recorder = new MediaRecorder(
        stream,
        selectedMime ? { mimeType: selectedMime } : undefined
      )
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onerror = (e) => {
        console.error("[Mic] MediaRecorder error:", e)
        setError("Recording error occurred")
      }

      recorder.start(250) // Collect data every 250ms
      setIsRecording(true)
      updateTranscript("")

      // Attempt native SpeechRecognition for live subtitles
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SR) {
        try {
          const sr = new SR()
          srRef.current = sr
          sr.continuous = true
          sr.interimResults = true
          sr.lang = "en-US"

          sr.onresult = (e) => {
            let p = ""
            for (let i = 0; i < e.results.length; i++) {
              p += e.results[i][0].transcript + " "
            }
            updateTranscript(p.trim() + " ...")
          }

          sr.onerror = (e) => {
            console.warn("[Mic] SpeechRecognition error:", e.error)
            speechRecBrokenRef.current = true
          }

          sr.onend = () => {
            if (recorderRef.current?.state === "recording") {
              try { sr.start() } catch (err) { /* ignore restart failures */ }
            }
          }

          sr.start()
        } catch (e) {
          console.warn("[Mic] SpeechRecognition unavailable:", e)
          speechRecBrokenRef.current = true
        }
      }

      console.log("[Mic] Recording started. Mime:", finalMime)
      return true
    } catch (err) {
      console.error("[Mic] Permission denied or hardware error:", err)
      if (err.name === "NotAllowedError") {
        setPermissionState("denied")
        setError("Microphone access denied. Please allow microphone permission in your browser settings.")
      } else if (err.name === "NotFoundError") {
        setError("No microphone detected. Please connect a microphone and try again.")
      } else {
        setError(`Microphone error: ${err.message}`)
      }
      return false
    }
  }, [updateTranscript])

  /**
   * Stop recording and clean up resources.
   * @returns {Promise<{chunks: Blob[], mimeType: string, transcript: string}>}
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      // Stop speech recognition
      if (srRef.current) {
        srRef.current.onend = null
        srRef.current.abort()
        srRef.current = null
      }

      const finalize = () => {
        // Stop audio tracks
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop())
          audioStreamRef.current = null
        }
        setIsRecording(false)
        console.log("[Mic] Stopped. Total chunks:", chunksRef.current.length)
        resolve({
          chunks: [...chunksRef.current],
          mimeType: mimeType,
          transcript: transcriptRef.current,
        })
      }

      if (recorderRef.current?.state === "recording") {
        recorderRef.current.requestData() // Flush final data
        recorderRef.current.onstop = finalize
        recorderRef.current.stop()
      } else {
        finalize()
      }
    })
  }, [mimeType])

  /**
   * Get the collected audio as a single Blob.
   */
  const getAudioBlob = useCallback(() => {
    if (chunksRef.current.length === 0) return null
    return new Blob(chunksRef.current, { type: mimeType })
  }, [mimeType])

  /**
   * Reset all state for a new recording session.
   */
  const reset = useCallback(() => {
    chunksRef.current = []
    transcriptRef.current = ""
    setTranscript("")
    setError(null)
    setIsRecording(false)
  }, [])

  return {
    startRecording,
    stopRecording,
    isRecording,
    permissionState,
    transcript,
    transcriptRef,
    speechRecBrokenRef,
    chunksRef,
    mimeType,
    error,
    getAudioBlob,
    reset,
    updateTranscript,
  }
}

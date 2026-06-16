import { useRef, useState, useCallback, useEffect } from "react"
import * as faceapi from "face-api.js"

/**
 * useEmotionDetector - Real-time facial expression detection using face-api.js
 * 
 * Detects 7 emotions: neutral, happy, sad, angry, fearful, disgusted, surprised
 * Returns dominant emotion, confidence, full expression scores, and timeline history.
 * 
 * Based on: https://github.com/justadudewhohacks/face-api.js (16k+ ⭐)
 * 
 * ARCHITECTURE NOTE: Uses a ref-based detection function to avoid stale closures
 * in the detection loop. The loop is self-scheduling via setTimeout for stability.
 */

const EMOTION_LABELS = ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"]

const EMOTION_ICONS = {
  neutral: "😐",
  happy: "😄",
  sad: "😢",
  angry: "😠",
  fearful: "😨",
  disgusted: "🤢",
  surprised: "😲",
}

const EMOTION_COLORS = {
  neutral: "#8b95a5",
  happy: "#00ff9d",
  sad: "#4a9eff",
  angry: "#ff1a3c",
  fearful: "#a855f7",
  disgusted: "#ff6b00",
  surprised: "#c8ff00",
}

export default function useEmotionDetector(videoRef) {
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [dominantEmotion, setDominantEmotion] = useState("neutral")
  const [emotionConfidence, setEmotionConfidence] = useState(0)
  const [expressions, setExpressions] = useState({})
  const [emotionTimeline, setEmotionTimeline] = useState([])
  
  // Refs for the detection loop — avoids stale closure issues
  const modelsLoadedRef = useRef(false)
  const runningRef = useRef(false)
  const timeoutRef = useRef(null)
  const timelineRef = useRef([])
  const emotionCountsRef = useRef({})

  // Keep ref in sync with state
  useEffect(() => {
    modelsLoadedRef.current = modelsLoaded
  }, [modelsLoaded])

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    try {
      const MODEL_URL = "/models/face-api"
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ])
      modelsLoadedRef.current = true
      setModelsLoaded(true)
      console.log("[EmotionDetector] face-api.js models loaded successfully")
    } catch (err) {
      console.warn("[EmotionDetector] Failed to load models:", err)
    }
  }, [])

  // Core detection function — called in a self-scheduling loop.
  // Uses refs directly so it never goes stale.
  const detectOnce = useCallback(async () => {
    const video = videoRef?.current
    if (!video || video.readyState < 2 || !modelsLoadedRef.current) return

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.2 }))
        .withFaceLandmarks()
        .withFaceExpressions()

      if (detection) {
        // ... (rest of logic)
        const exp = detection.expressions
        setExpressions({ ...exp })

        // Find dominant emotion
        let maxEmotion = "neutral"
        let maxScore = 0
        for (const [emotion, score] of Object.entries(exp)) {
          if (score > maxScore) {
            maxScore = score
            maxEmotion = emotion
          }
        }

        setDominantEmotion(maxEmotion)
        setEmotionConfidence(maxScore)

        // Track emotion counts
        emotionCountsRef.current[maxEmotion] = (emotionCountsRef.current[maxEmotion] || 0) + 1

        // Add to timeline (every detection cycle, ~500ms)
        const entry = {
          t: Date.now(),
          emotion: maxEmotion,
          confidence: maxScore,
          expressions: { ...exp },
        }
        timelineRef.current.push(entry)
        setEmotionTimeline([...timelineRef.current])
      } else {
        // console.warn("[EmotionDetector] No face detected in this frame.")
      }
    } catch (err) {
      console.error("[EmotionDetector] Error during detection:", err)
    }
  }, [videoRef])

  // Self-scheduling detection loop — avoids setInterval stale closure pitfall
  const runLoop = useCallback(() => {
    if (!runningRef.current) return

    detectOnce().finally(() => {
      if (runningRef.current) {
        timeoutRef.current = setTimeout(runLoop, 500)
      }
    })
  }, [detectOnce])

  // Start detection loop
  const startDetection = useCallback(() => {
    if (runningRef.current) return // already running
    runningRef.current = true
    console.log("[EmotionDetector] Detection started")
    runLoop()
  }, [runLoop])

  // Stop detection loop
  const stopDetection = useCallback(() => {
    runningRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    console.log("[EmotionDetector] Detection stopped")
  }, [])

  // Get summary analytics for the session
  const getEmotionSummary = useCallback(() => {
    const timeline = timelineRef.current
    if (timeline.length === 0) {
      return {
        dominant_emotion: "neutral",
        emotion_distribution: {},
        emotion_changes: 0,
        stability_score: 100,
        timeline_length: 0,
      }
    }

    // Calculate distribution
    const counts = {}
    EMOTION_LABELS.forEach(e => counts[e] = 0)
    timeline.forEach(entry => {
      counts[entry.emotion] = (counts[entry.emotion] || 0) + 1
    })

    const total = timeline.length
    const distribution = {}
    Object.entries(counts).forEach(([k, v]) => {
      distribution[k] = parseFloat(((v / total) * 100).toFixed(1))
    })

    // Find overall dominant
    let dominant = "neutral"
    let maxCount = 0
    Object.entries(counts).forEach(([k, v]) => {
      if (v > maxCount) { maxCount = v; dominant = k }
    })

    // Count emotion changes (transitions)
    let changes = 0
    for (let i = 1; i < timeline.length; i++) {
      if (timeline[i].emotion !== timeline[i - 1].emotion) changes++
    }

    // Stability score: how consistent the emotions are (100 = very stable)
    const stability = Math.max(0, 100 - (changes / Math.max(1, total)) * 200)

    return {
      dominant_emotion: dominant,
      emotion_distribution: distribution,
      emotion_changes: changes,
      stability_score: parseFloat(stability.toFixed(1)),
      timeline_length: total,
      emotion_counts: counts,
    }
  }, [])

  // Reset state
  const reset = useCallback(() => {
    timelineRef.current = []
    emotionCountsRef.current = {}
    setEmotionTimeline([])
    setDominantEmotion("neutral")
    setEmotionConfidence(0)
    setExpressions({})
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection()
    }
  }, [stopDetection])

  return {
    modelsLoaded,
    loadModels,
    startDetection,
    stopDetection,
    dominantEmotion,
    emotionConfidence,
    expressions,
    emotionTimeline,
    getEmotionSummary,
    reset,
    EMOTION_ICONS,
    EMOTION_COLORS,
    EMOTION_LABELS,
  }
}

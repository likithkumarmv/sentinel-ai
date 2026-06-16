import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import BoardroomScene from "../three/BoardroomScene"
import useInterviewStore from "../stores/interviewStore"
import useTTS from "../hooks/useTTS"
import useEmotionDetector from "../hooks/useEmotionDetector"
import usePostureTracker from "../hooks/usePostureTracker"
import { initSession, saveQuestionResult, saveSessionResults, clearSession, getCompleteSessionData } from "../utils/interviewStorage"
import { evaluateAnswer } from "../utils/answerEvaluator"
import "./InterviewPage.css"

const QUESTION_TIME_LIMIT = 60 // seconds per question

/* ── Agent icon/color maps ──────────────────────────── */
const AGENT_META = {
  architect: { icon: "⚡", label: "THE ARCHITECT", color: "var(--ice)" },
  observer: { icon: "◉", label: "THE OBSERVER", color: "#a855f7" },
  manager: { icon: "▣", label: "THE MANAGER", color: "var(--amber)" },
}

export default function InterviewPage({ sessionData, onComplete }) {
  const [currentQ, setCurrentQ] = useState(sessionData?.first_question || null)
  const [qIndex, setQIndex] = useState(0)
  const [allQ, setAllQ] = useState(sessionData?.all_questions || [])
  const [showStressHud, setShowStressHud] = useState(true)
  const [stressLevel, setStressLevel] = useState(30)
  const [interruptedThisQ, setInterruptedThisQ] = useState(false)
  const [phase, setPhase] = useState("opening")
  const [transcript, setTranscript] = useState("")
  const [fullLog, setFullLog] = useState("")
  const [isRec, setIsRec] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoDevices, setVideoDevices] = useState([])
  const [selectedCamera, setSelectedCamera] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const [answerSec, setAnswerSec] = useState(0)
  const [scores, setScores] = useState([])
  const [fillerCount, setFillerCount] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [obsInterrupt, setObsInterrupt] = useState(null)
  const [cameraError, setCameraError] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false) // tracks if user has recorded audio at least once
  const [isTranscribing, setIsTranscribing] = useState(false) // tracks if Whisper is currently running
  const [micPermission, setMicPermission] = useState("pending") // "pending" | "granted" | "denied"
  const [screenExitCount, setScreenExitCount] = useState(0)

  // ── 60s Countdown Timer ─────────────────────────────
  const [countdown, setCountdown] = useState(QUESTION_TIME_LIMIT)
  const [timerActive, setTimerActive] = useState(false)
  const [autoAdvanceWarning, setAutoAdvanceWarning] = useState(false)
  const countdownRef = useRef(null)
  const countdownValRef = useRef(QUESTION_TIME_LIMIT)

  // ── Speech subtitle state ───────────────────────────
  const [subtitle, setSubtitle] = useState(null) // { agent, text }

  // ── Posture / Skeleton state ────────────────────────
  const [sittingAngle, setSittingAngle] = useState(0)
  const [postureStatus, setPostureStatus] = useState("—")
  const [livePosture, setLivePosture] = useState(70)

  const [blinkCount, setBlinkCount] = useState(0)
  const [gazeAwayCount, setGazeAwayCount] = useState(0)
  const [gazeStatus, setGazeStatus] = useState("FOCUSED")

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const poseRef = useRef(null)
  const faceRef = useRef(null)
  const animFrameRef = useRef(null)
  
  const isEyeClosedRef = useRef(false)
  const gazeAwayFramesRef = useRef(0)
  const isGazeAwayRef = useRef(false)
  const blinkCountRef = useRef(0)
  const gazeAwayCountRef = useRef(0)
  
  
  
  const recRef = useRef(null)
  const timerRef = useRef(null)
  const streamRef = useRef(null)      // video stream
  const audioStreamRef = useRef(null) // mic-only stream (kept separate from video)
  const chunksRef = useRef([])
  const srRef = useRef(null)
  const speechRecBrokenRef = useRef(false) // Tracks if native speech recognition threw an error
  const mimeTypeRef = useRef("audio/webm") // stored at record time so it survives stopRec
  const transcriptRef = useRef("") // always-fresh transcript value
  const kinematicFramesRef = useRef([])
  const detectedObjectsRef = useRef([])
  const screenExitLogRef = useRef([]) // {t, questionIndex, type: 'tab'|'blur'}
  const screenExitCountRef = useRef(0)
  const questionSnapshotsRef = useRef([]) // per-question data snapshots
  const perQBlinkRef = useRef(0) // blinks for current question
  const perQGazeRef = useRef(0) // gaze-away for current question

  const { speak, cancel: cancelTTS } = useTTS()
  const store = useInterviewStore

  // ── Posture Tracker ─────────────────────────────────
  const {
    sittingAngle: trackedAngle,
    postureStatus: trackedPostureStatus,
    livePosture: trackedLivePosture,
    processPosture,
    setCurrentQuestion: setPostureQuestion,
    getPostureSummary,
  } = usePostureTracker()

  // Sync posture tracker values to existing state
  useEffect(() => {
    setSittingAngle(trackedAngle)
    setPostureStatus(trackedPostureStatus)
    setLivePosture(trackedLivePosture)
  }, [trackedAngle, trackedPostureStatus, trackedLivePosture])

  // ── Emotion Detection (face-api.js) ────────────────
  const {
    modelsLoaded: emotionModelsLoaded,
    loadModels: loadEmotionModels,
    startDetection: startEmotionDetection,
    stopDetection: stopEmotionDetection,
    dominantEmotion,
    emotionConfidence,
    expressions,
    emotionTimeline,
    getEmotionSummary,
    EMOTION_ICONS,
    EMOTION_COLORS,
  } = useEmotionDetector(videoRef)

  // ── Track 1: Helper to count filler words ───────────
  function countFillerWords(text) {
    if (!text) return 0
    const words = text.toLowerCase().split(/\s+/)
    const fillers = ["um", "uh", "like", "you know", "actually", "basically", "so"]
    let count = 0
    for (let i = 0; i < words.length; i++) {
      const w = words[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      if (fillers.includes(w)) {
        count++
      } else if (w === "you" && words[i+1]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "") === "know") {
        count++
        i++ // skip 'know'
      }
    }
    return count
  }

  // Count fillers in real-time as user speaks or text updates
  useEffect(() => {
    if (isRec) {
      const count = countFillerWords(transcript)
      setFillerCount(count)
    }
  }, [transcript, isRec])

  // ── Track 1: Dynamic Stress HUD Calculator ──────────
  useEffect(() => {
    if (phase !== "questioning" && phase !== "feedback") return

    let score = 30 // baseline stress

    // Gaze Status
    if (gazeStatus === "AWAY") {
      score += 25
    }

    // Posture Status
    if (postureStatus === "POOR" || livePosture < 50) {
      score += 25
    } else if (postureStatus === "FAIR" || livePosture < 70) {
      score += 12
    }

    // Dominant Emotion
    if (dominantEmotion === "fearful") {
      score += 35
    } else if (dominantEmotion === "angry" || dominantEmotion === "sad") {
      score += 20
    } else if (dominantEmotion === "surprised") {
      score += 15
    } else if (dominantEmotion === "happy") {
      score -= 15
    } else if (dominantEmotion === "neutral") {
      score -= 5
    }

    // Blink rate (blinks for current question)
    score += Math.min(20, perQBlinkRef.current * 3)

    // Clamp 0-100
    const finalScore = Math.max(0, Math.min(100, score))
    setStressLevel(Math.round(finalScore))
  }, [gazeStatus, postureStatus, livePosture, dominantEmotion, blinkCount, phase])

  // ── Track 1: Boardroom Distractions ──────────────────
  function playSynthDistraction() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      const playBeep = (startTime, duration, frequency) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        
        osc.type = "sine"
        osc.frequency.setValueAtTime(frequency, startTime)
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02)
        gain.gain.setValueAtTime(0.12, startTime + duration - 0.02)
        gain.gain.linearRampToValueAtTime(0, startTime + duration)
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        
        osc.start(startTime)
        osc.stop(startTime + duration)
      }

      const now = ctx.currentTime
      playBeep(now, 0.08, 880) // beep 1
      playBeep(now + 0.14, 0.08, 880) // beep 2
      
    } catch (e) {
      console.warn("[WebAudio] Synth failed:", e)
    }
  }

  function triggerBoardroomDistraction() {
    playSynthDistraction()

    const eventType = Math.random() < 0.5 ? "distracted" : "whispering"
    
    if (eventType === "whispering") {
      // Both observer and manager whisper to each other
      store.getState().setAgentState("observer", "whispering")
      store.getState().setAgentState("manager", "whispering")
      
      setTimeout(() => {
        store.getState().setAgentState("observer", "idle")
        store.getState().setAgentState("manager", "idle")
      }, 6000)
    } else {
      // One or both look distracted
      const coin = Math.random()
      if (coin < 0.4) {
        store.getState().setAgentState("observer", "distracted")
        setTimeout(() => store.getState().setAgentState("observer", "idle"), 6000)
      } else if (coin < 0.8) {
        store.getState().setAgentState("manager", "distracted")
        setTimeout(() => store.getState().setAgentState("manager", "idle"), 6000)
      } else {
        store.getState().setAgentState("observer", "distracted")
        store.getState().setAgentState("manager", "distracted")
        setTimeout(() => {
          store.getState().setAgentState("observer", "idle")
          store.getState().setAgentState("manager", "idle")
        }, 6000)
      }
    }
  }

  useEffect(() => {
    let intervalId = null
    if (isRec) {
      intervalId = setInterval(() => {
        if (Math.random() < 0.15) {
          triggerBoardroomDistraction()
        }
      }, 15000)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isRec])

  // ── Track 2: Polite Interruption Mechanic ────────────
  const triggerPoliteInterruption = async () => {
    if (interruptedThisQ) return
    setInterruptedThisQ(true)
    
    console.log("[Interruption] Triggered! Pausing recording and countdown...")
    
    // Pause MediaRecorder
    if (recRef.current && recRef.current.state === "recording") {
      try {
        recRef.current.pause()
      } catch (err) {
        console.warn("[Interruption] Pause MediaRecorder failed:", err)
      }
    }
    
    // Pause SpeechRecognition
    if (srRef.current) {
      try {
        srRef.current.onend = null // prevent auto-restart
        srRef.current.abort()
      } catch (err) {
        console.warn("[Interruption] Aborting SpeechRecognition failed:", err)
      }
    }
    
    // Pause countdown timer
    stopCountdown()
    
    // Select interrupter agent and message
    const agents = ["architect", "manager", "observer"]
    const agent = agents[Math.floor(Math.random() * 3)]
    
    const messages = {
      architect: "Pardon the interruption, but let's keep it concise. Can you give me the exact technical trade-off?",
      manager: "That's very detailed! Let's make sure we address the core question directly. Could you summarize?",
      observer: "Interesting direction, but let's stay on topic. How does this apply to memory efficiency?"
    }
    
    const message = messages[agent]
    
    // Play speech and show subtitle
    await speakWithSub(message, agent)
    
    // Composure evaluation pause (2 seconds of quiet)
    console.log("[Interruption] Speech finished. Composure pause for 2s...")
    await new Promise(r => setTimeout(r, 2000))
    
    // Resume MediaRecorder
    if (recRef.current && recRef.current.state === "paused") {
      try {
        recRef.current.resume()
      } catch (err) {
        console.warn("[Interruption] Resume MediaRecorder failed:", err)
      }
    }
    
    // Resume SpeechRecognition
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR && isRec) {
      try {
        const sr = new SR()
        srRef.current = sr
        sr.continuous = true
        sr.interimResults = true
        sr.lang = "en-US"
        sr.onresult = e => {
          let p = ""
          for (let i = 0; i < e.results.length; i++) p += e.results[i][0].transcript + " "
          setTranscript(p.trim() + " ...")
        }
        sr.onend = () => {
          if (recRef.current && recRef.current.state === "recording") {
            try { sr.start() } catch (err) { console.warn("[SpeechRec] restart failed", err) }
          }
        }
        sr.start()
      } catch (err) {
        console.warn("[Interruption] Restarting SpeechRecognition failed:", err)
      }
    }
    
    // Resume countdown timer
    setTimerActive(true)
    countdownRef.current = setInterval(() => {
      countdownValRef.current -= 1
      setCountdown(countdownValRef.current)
      if (countdownValRef.current <= 0) {
        stopCountdown()
        handleTimerExpired()
      }
    }, 1000)
    
    console.log("[Interruption] Recording and countdown resumed!")
  }

  useEffect(() => {
    if (isRec && !interruptedThisQ) {
      if (answerSec >= 40 || fillerCount > 3) {
        triggerPoliteInterruption()
      }
    }
  }, [answerSec, fillerCount, isRec, interruptedThisQ])

  // ── Agent states (extracted at top level — hooks cannot be in loops) ──
  const agentStates = useInterviewStore(s => s.agentStates)
  // useEmotionDetector moved to top of component to avoid TDZ error

  // ── Speak with subtitle ────────────────────────────
  async function speakWithSub(text, agent) {
    setSubtitle({ agent, text })
    await speak(text, agent)
    // Keep subtitle visible briefly after speech ends
    await new Promise(r => setTimeout(r, 1500))
    setSubtitle(null)
  }

  // ── MediaPipe Models ─────────────────────────
  const initModels = useCallback(async () => {
    try {
      const { PoseLandmarker, FaceLandmarker, FilesetResolver } = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm"
      )
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      )
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      })
      poseRef.current = poseLandmarker

      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      })
      faceRef.current = faceLandmarker
      console.log("[Models] MediaPipe Pose & Face Landmarkers loaded")
    } catch (e) {
      console.warn("[Models] MediaPipe failed to load", e)
    }

    // Load face-api.js emotion models in parallel
    await loadEmotionModels()
  }, [])

  function drawSkeleton(landmarks) {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext("2d")
    canvas.width = video.videoWidth || 280
    canvas.height = video.videoHeight || 210
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const KEYPOINTS = Array.from({length: 33}, (_, i) => i)
    const TORSO = [[11, 12], [11, 23], [12, 24], [23, 24]]
    const ARMS = [[12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19]]
    const LEGS = [[23, 25], [25, 27], [27, 29], [27, 31], [24, 26], [26, 28], [28, 30], [28, 32]]
    const FACE = [[0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10]]
    
    const pts = {}
    // Mirror x because video is CSS-mirrored (scaleX(-1)) but canvas renders unmirrored
    for (const idx of KEYPOINTS) {
      const lm = landmarks[idx]
      if (!lm || (lm.visibility !== undefined && lm.visibility < 0.3)) continue
      pts[idx] = { x: (1 - lm.x) * canvas.width, y: lm.y * canvas.height }
    }

    const drawConn = (conn, color) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      for (const [a, b] of conn) {
        if (pts[a] && pts[b]) {
          ctx.beginPath()
          ctx.moveTo(pts[a].x, pts[a].y)
          ctx.lineTo(pts[b].x, pts[b].y)
          ctx.stroke()
        }
      }
    }
    
    drawConn(TORSO, "rgba(0, 255, 157, 0.85)")
    drawConn(ARMS, "rgba(0, 200, 255, 0.85)")
    drawConn(LEGS, "rgba(200, 100, 255, 0.85)")
    drawConn(FACE, "rgba(255, 255, 255, 0.7)")

    // Draw keypoints
    for (const idx of KEYPOINTS) {
      if (!pts[idx]) continue
      const r = idx === 0 ? 5 : [11,12,13,14,15,16,23,24].includes(idx) ? 4 : 3
      ctx.beginPath()
      ctx.arc(pts[idx].x, pts[idx].y, r, 0, Math.PI * 2)
      ctx.fillStyle = idx === 0 ? "#00ff9d" : [11,12,23,24].includes(idx) ? "#c8ff00" : "rgba(200, 255, 0, 0.9)"
      ctx.fill()
    }

    // Draw Object Detections (RF-DETR)
    const detections = detectedObjectsRef.current || []
    ctx.lineWidth = 2
    ctx.font = "12px monospace"
    for (const d of detections) {
      const [orig_xmin, ymin, orig_xmax, ymax] = d.bbox
      // Mirror the bounding box because canvas renders unmirrored but video is mirrored
      const xmin = canvas.width - orig_xmax
      const xmax = canvas.width - orig_xmin
      const w = xmax - xmin
      const h = ymax - ymin
      
      // Draw box
      ctx.strokeStyle = "rgba(255, 0, 85, 0.8)"
      ctx.strokeRect(xmin, ymin, w, h)
      
      // Draw label
      const text = `${d.label.toUpperCase()} ${(d.confidence*100).toFixed(0)}%`
      const tw = ctx.measureText(text).width
      ctx.fillStyle = "rgba(255, 0, 85, 0.8)"
      ctx.fillRect(xmin, ymin - 16, tw + 8, 16)
      
      ctx.fillStyle = "#fff"
      ctx.textAlign = "left"
      ctx.fillText(text, xmin + 4, ymin - 4)
    }

    // Calculate sitting angle via posture tracker hook (handles throttling + telemetry)
    if (pts[11] && pts[12] && pts[23] && pts[24]) {
      processPosture(pts)
    }
  }

  const lastDetectTimeRef = useRef(0)

  function runDetection(timestamp) {
    const video = videoRef.current
    const pose = poseRef.current
    const face = faceRef.current
    if (!video || !pose || !face || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(runDetection)
      return
    }
    
    // Throttle to ~10 FPS (every 100ms) to prevent choking the UI thread
    if (timestamp - lastDetectTimeRef.current < 100) {
      animFrameRef.current = requestAnimationFrame(runDetection)
      return
    }
    lastDetectTimeRef.current = timestamp

    try {
      const now = performance.now()
      const poseResult = pose.detectForVideo(video, now)
      const faceResult = face.detectForVideo(video, now)
      
      if (poseResult.landmarks && poseResult.landmarks.length > 0) {
        drawSkeleton(poseResult.landmarks[0])
        if (isRec) {
          const lm = poseResult.landmarks[0]
          kinematicFramesRef.current.push({
            t: now,
            nose: { x: lm[0].x, y: lm[0].y, z: lm[0].z },
            left_shoulder: { x: lm[11].x, y: lm[11].y, z: lm[11].z },
            right_shoulder: { x: lm[12].x, y: lm[12].y, z: lm[12].z },
            left_hip: { x: lm[23].x, y: lm[23].y, z: lm[23].z },
            right_hip: { x: lm[24].x, y: lm[24].y, z: lm[24].z }
          })
        }
      } else {
        const canvas = canvasRef.current
        if (canvas) {
           const ctx = canvas.getContext("2d")
           ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }

      if (faceResult.faceBlendshapes && faceResult.faceBlendshapes.length > 0) {
        const blendshapes = faceResult.faceBlendshapes[0].categories
        const leftBlink = blendshapes.find(b => b.categoryName === "eyeBlinkLeft")?.score ?? 0
        const rightBlink = blendshapes.find(b => b.categoryName === "eyeBlinkRight")?.score ?? 0
        // Average of both eyes; threshold 0.45 for blink detection
        const avgBlink = (leftBlink + rightBlink) / 2
        const isClosed = avgBlink > 0.45
        if (isClosed && !isEyeClosedRef.current) {
          isEyeClosedRef.current = true
        } else if (!isClosed && isEyeClosedRef.current) {
          isEyeClosedRef.current = false
          blinkCountRef.current += 1
          perQBlinkRef.current += 1
          setBlinkCount(blinkCountRef.current)
        }
      }

      if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
        const lm = faceResult.faceLandmarks[0]
        const eyeInner = lm[133]
        const eyeOuter = lm[33]
        const iris = lm[468]
        
        if (eyeInner && eyeOuter && iris) {
           const eyeWidth = Math.hypot(eyeOuter.x - eyeInner.x, eyeOuter.y - eyeInner.y)
           const irisDist = Math.hypot(iris.x - eyeInner.x, iris.y - eyeInner.y)
           const ratio = irisDist / eyeWidth
           
           const isAway = ratio < 0.3 || ratio > 0.7
           if (isAway) {
              gazeAwayFramesRef.current += 1
              if (gazeAwayFramesRef.current > 15 && !isGazeAwayRef.current) {
                 isGazeAwayRef.current = true
                 setGazeStatus("AWAY")
                 setGazeAwayCount(c => {
                   gazeAwayCountRef.current = c + 1
                   perQGazeRef.current += 1
                   return c + 1
                 })
              }
           } else {
              gazeAwayFramesRef.current = 0
              if (isGazeAwayRef.current) {
                 isGazeAwayRef.current = false
                 setGazeStatus("FOCUSED")
              }
           }
        }
      }
    } catch (e) { /* skip frame */ }
    animFrameRef.current = requestAnimationFrame(runDetection)
  }

  // ── Lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    initModels()
    const enumerateCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(d => d.kind === "videoinput")
        console.log("[Camera] Found devices:", cameras.map(c => c.label || c.deviceId))
        setVideoDevices(cameras)
        return cameras
      } catch (e) {
        console.warn("[Camera] Enumeration failed:", e)
        return []
      }
    }

    const loadCameras = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("[Camera] API not supported (requires HTTPS/localhost)")
        setCameraError(true)
        return
      }
      try {
        // Start the camera immediately. This requests permission and keeps the stream active.
        await startWebcamWithId(null)

        // Now enumerate devices (labels will be available since permission is granted)
        const cameras = await enumerateCameras()

        const activeTrack = streamRef.current?.getVideoTracks()[0]
        const activeId = activeTrack?.getSettings()?.deviceId

        if (activeId) {
          setSelectedCamera(activeId)
        } else if (cameras.length > 0 && cameras[0].deviceId) {
          setSelectedCamera(cameras[0].deviceId)
        }

        // ── PRIME MICROPHONE PERMISSION ─────────────────
        // Request mic access early so the browser prompt appears alongside camera.
        // We immediately stop the stream — we just want the permission grant.
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          micStream.getTracks().forEach(t => t.stop())
          setMicPermission("granted")
          console.log("[Mic] Permission pre-granted")
        } catch (micErr) {
          console.warn("[Mic] Permission denied or unavailable:", micErr.name)
          setMicPermission(micErr.name === "NotAllowedError" ? "denied" : "pending")
        }
      } catch (e) {
        console.warn("[Camera] Initialization failed:", e)
        setCameraError(true)
      }
    }
    loadCameras()

    // Listen for device changes (virtual cameras may register late)
    const onDeviceChange = () => {
      console.log("[Camera] Device change detected, re-enumerating...")
      enumerateCameras()
    }
    navigator.mediaDevices?.addEventListener("devicechange", onDeviceChange)

    const captureFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return
      const video = videoRef.current
      const oc = document.createElement("canvas")
      oc.width = video.videoWidth || 320
      oc.height = video.videoHeight || 240
      const ctx = oc.getContext("2d")
      ctx.drawImage(video, 0, 0, oc.width, oc.height)
      oc.toBlob(async (blob) => {
        if (!blob) return
        const fd = new FormData()
        fd.append("file", blob, "frame.jpg")
        try {
          const res = await axios.post("/api/detection/analyze_frame", fd)
          if (res.data && res.data.success) {
            detectedObjectsRef.current = res.data.detections || []
          }
        } catch (e) { }
      }, "image/jpeg", 0.7)
    }
    const detInterval = setInterval(captureFrame, 1500)

    timerRef.current = setInterval(() => {
      setElapsed(s => s + 1)
      setAnswerSec(s => s + 1)
    }, 1000)

    // ── SCREEN EXIT TRACKING ──────────────────────────
    const handleVisibilityChange = () => {
      if (document.hidden) {
        screenExitCountRef.current += 1
        setScreenExitCount(screenExitCountRef.current)
        screenExitLogRef.current.push({ t: Date.now(), questionIndex: qIndex, type: "tab" })
        console.log("[ScreenExit] Tab switch detected. Total:", screenExitCountRef.current)
      }
    }
    const handleWindowBlur = () => {
      // Only count if not already a tab switch (avoid double-count)
      if (!document.hidden) {
        screenExitCountRef.current += 1
        setScreenExitCount(screenExitCountRef.current)
        screenExitLogRef.current.push({ t: Date.now(), questionIndex: qIndex, type: "blur" })
        console.log("[ScreenExit] Window blur detected. Total:", screenExitCountRef.current)
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleWindowBlur)

    return () => {
      stopWebcam()
      clearInterval(timerRef.current)
      clearInterval(detInterval)
      navigator.mediaDevices?.removeEventListener("devicechange", onDeviceChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleWindowBlur)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (poseRef.current) { try { poseRef.current.close() } catch(e){} }
      if (faceRef.current) { try { faceRef.current.close() } catch(e){} }
      if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop()
      if (srRef.current) srRef.current.abort()
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop())
      cancelTTS()
    }
  }, [])

  // ── Speak opening on mount ─────────────────────────
  useEffect(() => {
    if (phase === "opening" && sessionData?.opening_statement) {
      const t = setTimeout(() => speakWithSub(sessionData.opening_statement, "architect"), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  // Restart webcam when selected camera changes (only for real deviceIds)
  useEffect(() => {
    if (selectedCamera && selectedCamera.length > 0) {
      const activeTrack = streamRef.current?.getVideoTracks()[0]
      if (activeTrack && activeTrack.getSettings().deviceId === selectedCamera) {
        return // Already using this camera, do not restart
      }
      startWebcamWithId(selectedCamera)
    }
  }, [selectedCamera])

  // ── Start emotion detection as soon as models are loaded & video is playing ──
  useEffect(() => {
    if (emotionModelsLoaded && videoRef.current && videoRef.current.readyState >= 2) {
      startEmotionDetection()
    } else if (emotionModelsLoaded) {
      // Video not ready yet — wait for it
      const vid = videoRef.current
      if (vid) {
        const onReady = () => startEmotionDetection()
        vid.addEventListener("loadeddata", onReady, { once: true })
        return () => vid.removeEventListener("loadeddata", onReady)
      }
    }
  }, [emotionModelsLoaded])

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error("Fullscreen failed:", e))
    } else {
      if (document.exitFullscreen) document.exitFullscreen()
    }
  }

  // ── Core webcam starter (all-in-one, robust) ─────────────────
  async function startWebcamWithId(deviceId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(true)
      return
    }

    // Stop any existing stream/loop first
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }

    let stream = null
    // Try with ideal constraints first (never fails due to 'exact')
    const tryConstraints = async (constraints) => {
      const s = await navigator.mediaDevices.getUserMedia(constraints)
      return s
    }

    try {
      const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 320 }, height: { ideal: 240 } }
        : { width: { ideal: 320 }, height: { ideal: 240 } }
      stream = await tryConstraints({ video: videoConstraints, audio: false })
    } catch (e1) {
      console.warn("[Camera] Ideal constraints failed, trying bare video:true", e1)
      try {
        stream = await tryConstraints({ video: true, audio: false })
      } catch (e2) {
        console.error("[Camera] All attempts failed:", e2)
        setCameraError(true)
        return
      }
    }

    streamRef.current = stream
    setCameraError(false)

    if (videoRef.current) {
      videoRef.current.srcObject = stream
      // Explicit play() for browsers that need it
      videoRef.current.play().catch(err => console.warn("[Camera] video.play() failed:", err))

      const onVideoReady = () => {
        // Start detection loop
        if (!animFrameRef.current) runDetection()
        // Start emotion detection if models are ready
        if (emotionModelsLoaded) startEmotionDetection()
      }

      if (videoRef.current.readyState >= 2) {
        onVideoReady()
      } else {
        videoRef.current.addEventListener("loadeddata", onVideoReady, { once: true })
      }
    }
  }

  // Legacy wrapper kept for any remaining calls
  async function startWebcam(deviceId = null) {
    return startWebcamWithId(deviceId)
  }

  function stopWebcam() {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
  }
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  // Keep transcriptRef in sync
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  // Polling fallback for live transcription if native SpeechRec is broken
  useEffect(() => {
    let interval;
    if (isRec && hasRecorded) {
      interval = setInterval(async () => {
        // If native SpeechRecognition is working, DO NOT poll.
        if (!speechRecBrokenRef.current) return;
        
        // Request chunk so we have data
        if (recRef.current && recRef.current.state === "recording") {
          recRef.current.requestData();
        }
        
        const chunks = chunksRef.current;
        if (!chunks || chunks.length === 0) return;
        
        const mimeType = mimeTypeRef.current || "audio/webm";
        const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 4000) return; // Wait until we have enough audio
        
        const fd = new FormData();
        fd.append("audio", blob, `recording.${extension}`);
        
        try {
          // Offline mode: skipping Whisper polling fallback
        } catch (e) { /* ignore silent polling errors */ }
      }, 3500); // Poll every 3.5s
    }
    return () => clearInterval(interval);
  }, [isRec, hasRecorded]);

  // Helper: check if transcript is a real user answer (not a placeholder)
  function isRealTranscript(t) {
    if (!t || !t.trim()) return false
    const lower = t.toLowerCase()
    if (lower.includes("recording audio") || lower.includes("live preview unavailable") || lower.includes("will transcribe on submit") || lower.includes("transcribing") || lower === "listening..." || lower.includes("(transcription failed)") || lower.includes("connecting to high-fidelity live transcriber")) return false
    return true
  }

  // ── Recording ──────────────────────────────────────
  async function startRec() {
    // Stop any previous audio stream that may be lingering
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop())
      audioStreamRef.current = null
    }
    if (recRef.current && recRef.current.state !== "inactive") {
      try { recRef.current.stop() } catch (e) {}
      recRef.current = null
    }
    if (srRef.current) {
      try { srRef.current.abort() } catch (e) {}
      srRef.current = null
    }

    try {
      // Use a SEPARATE audio stream — never overwrite the video streamRef
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      audioStreamRef.current = audioStream
      chunksRef.current = []

      // Find a supported mime type and store it
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
      let selectedMimeType = ""
      for (const t of mimeTypes) {
        if (MediaRecorder.isTypeSupported(t)) { selectedMimeType = t; break }
      }
      mimeTypeRef.current = selectedMimeType || "audio/webm"

      const mr = new MediaRecorder(audioStream, selectedMimeType ? { mimeType: selectedMimeType } : undefined)
      recRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(250)
      console.log("[REC] Started. MimeType:", mimeTypeRef.current, "AudioStream tracks:", audioStream.getTracks().length)

      // Reset state for new recording
      speechRecBrokenRef.current = false;
      setIsRec(true); setHasRecorded(true); setAnswerSec(0); setTranscript("")

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SR) {
        try {
          const sr = new SR(); srRef.current = sr
          sr.continuous = true; sr.interimResults = true; sr.lang = "en-US"
          sr.onresult = e => {
            let p = ""
            for (let i = 0; i < e.results.length; i++) p += e.results[i][0].transcript + " "
            setTranscript(p.trim() + " ...")
          }
          sr.onerror = (e) => {
            console.warn("[SpeechRec] error:", e.error)
            speechRecBrokenRef.current = true;
            if (!isRealTranscript(transcriptRef.current)) {
              setTranscript("[Connecting to high-fidelity live transcriber...]")
            }
          }
          sr.onend = () => {
            if (recRef.current && recRef.current.state === "recording") {
              try { sr.start() } catch (err) { console.warn("[SpeechRec] restart failed", err) }
            }
          }
          sr.start()
        } catch (e) {
          console.warn("[SpeechRec] start failed", e)
          speechRecBrokenRef.current = true;
          setTranscript("[Connecting to high-fidelity live transcriber...]")
        }
      } else {
        speechRecBrokenRef.current = true;
        setTranscript("[Connecting to high-fidelity live transcriber...]")
      }
    } catch (e) {
      console.error(e)
      alert("Microphone access is required. Please check your browser permissions and try again.")
    }
  }

  async function handleStopRec() {
    // Snapshot the live transcript BEFORE stopping (so the user sees their words immediately)
    const liveText = transcriptRef.current
    await stopRec()

    // Keep showing live transcript while Whisper refines it in the background
    if (isRealTranscript(liveText)) {
      setTranscript(liveText.replace(/ \.\.\.$/,"").trim())
    }

    // Run Whisper in background — only overwrite when it returns something better
    const wr = await transcribeWithWhisper()
    if (wr && wr.text) {
      setTranscript(wr.text)
      setFillerCount(wr.filler_word_count || 0)
    } else if (wr && wr.error) {
      // Whisper failed — keep whatever real text is already visible
      if (!isRealTranscript(transcriptRef.current)) setTranscript("")
    } else if (wr && wr.text === "") {
      // Transcribed silence — only clear if nothing real was typed/spoken
      if (!isRealTranscript(liveText)) setTranscript("")
    }
  }

  function stopRec() {
    return new Promise(resolve => {
      if (srRef.current) {
        srRef.current.onend = null
        srRef.current.abort()
        srRef.current = null
      }

      const stopAudio = () => {
        if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(t => t.stop()); audioStreamRef.current = null }
        setIsRec(false)
        console.log("[REC] Stopped. Total chunks:", chunksRef.current.length)
        resolve()
      }

      if (recRef.current && recRef.current.state === "recording") {
        // Request final data chunk BEFORE stopping to capture last audio segment
        recRef.current.requestData()
        recRef.current.onstop = stopAudio
        recRef.current.stop()
      } else if (recRef.current && recRef.current.state === "paused") {
        recRef.current.onstop = stopAudio
        recRef.current.stop()
      } else {
        stopAudio()
      }
    })
  }

  async function transcribeWithWhisper() {
    const chunks = chunksRef.current
    if (!chunks || chunks.length === 0) {
      console.warn("[Whisper] No audio chunks to transcribe")
      return null
    }
    const mimeType = mimeTypeRef.current || "audio/webm"
    const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm"
    const blob = new Blob(chunks, { type: mimeType })
    console.log("[Whisper] Sending", blob.size, "bytes,", chunks.length, "chunks, type:", mimeType)
    if (blob.size < 100) {
      console.warn("[Whisper] Audio blob too small, skipping")
      return null
    }
    const fd = new FormData()
    fd.append("audio", blob, `recording.${extension}`)
    try {
      setIsTranscribing(true)
      // Offline mode: no whisper fallback available.
      // We rely entirely on the native SpeechRecognition API transcript.
      setIsTranscribing(false)
      return { text: transcriptRef.current }
    } catch (e) {
      setIsTranscribing(false)
      return null
    }
  }

  // ── Submit ─────────────────────────────────────────
  async function submitAnswer(autoAdvance = false) {
    const hasAudioChunks = chunksRef.current.length > 0
    const hasRealText = isRealTranscript(transcriptRef.current)
    if (!hasRealText && !hasAudioChunks && !hasRecorded) {
      alert("Please record your answer first before submitting.")
      return
    }

    setLoading(true); setPhase("feedback")
    store.getState().setAllThinking()
    cancelTTS(); setSubtitle(null)

    // Await stop so final chunks are pushed (if user clicked submit while recording)
    if (isRec) await stopRec()

    // Use transcriptRef for the latest value (avoids stale closure)
    let latestTranscript = transcriptRef.current
    let currentServerFillers = fillerCount
    let currentAudioDuration = answerSec
    
    // If transcript is still a placeholder or empty, and we have chunks, wait for whisper if needed
    if (!isRealTranscript(latestTranscript) && chunksRef.current.length > 0) {
       const wr = await transcribeWithWhisper()
       if (wr && wr.text) {
         latestTranscript = wr.text
         currentServerFillers = wr.filler_word_count || 0
         currentAudioDuration = wr.duration || answerSec
         setTranscript(latestTranscript)
         setFillerCount(currentServerFillers)
       }
    }

    // Strip any placeholder text — use substring matching to avoid encoding issues
    let finalText = isRealTranscript(latestTranscript) 
      ? latestTranscript.replace(/ \.\.\.$/, "").replace(/ — transcribing\.\.\.$/, "").trim()
      : "(No response recorded)"
    
    setTranscript(finalText)

    setFullLog(p => p + `\nQ: ${currentQ.text}\nA: ${finalText}\n`)

    // Get emotion summary for this answer
    const emotionData = getEmotionSummary()

    // Count screen exits for this question
    const qScreenExits = screenExitLogRef.current.filter(e => e.questionIndex === qIndex).length

    // Get posture summary snapshot for this question
    const postureSummary = getPostureSummary()
    const perQPosture = postureSummary.per_question?.find(p => p.question_index === qIndex)

    // ── LOCAL KEYWORD EVALUATION (runs in BOTH modes) ─────────
    const idealAnswer = allQ[qIndex]?.ideal_answer || ""
    const expectedKeywords = allQ[qIndex]?.expected_keywords || []
    const localEval = evaluateAnswer(finalText, idealAnswer, expectedKeywords)

    // Build the snapshot that gets saved regardless of mode
    const snapshotBase = {
      questionIndex: qIndex,
      questionText: currentQ.text,
      candidateAnswer: finalText,
      idealAnswer,
      expectedKeywords,
      emotionSummary: { ...emotionData },
      dominantEmotion: emotionData?.dominant_emotion || "neutral",
      postureSnapshot: perQPosture || { avg_angle: sittingAngle, avg_score: livePosture, worst_status: postureStatus },
      gazeAwayCount: perQGazeRef.current,
      blinkCount: perQBlinkRef.current,
      screenExits: qScreenExits,
      answerDuration: currentAudioDuration,
      fillerCount: currentServerFillers,
      // Local evaluation results
      matchedKeywords: localEval.matchedKeywords,
      missingKeywords: localEval.missingKeywords,
      keywordMatchPct: localEval.keywordMatchPct,
      accuracy: localEval.accuracy,
      tip: localEval.tip,
    }

    // ── TRY BACKEND (live mode) OR USE LOCAL EVAL ─────────────
    let answerScore = localEval.score
    let feedbackData = null

    const isDemo = sessionData?.demo
    let backendSuccess = false

    if (!isDemo) {
      try {
        const res = await axios.post("/api/interview/answer", {
          session_id: sessionData.session_id, question_id: currentQ.id, question_text: currentQ.text,
          answer_text: finalText, blink_rate: blinkCount / Math.max(1, answerSec / 60), posture_score: livePosture, fidget_count: 0,
          filler_word_count: currentServerFillers, answer_duration_seconds: currentAudioDuration,
          gaze_away_count: gazeAwayCount,
          kinematic_frames: kinematicFramesRef.current,
          emotion_data: emotionData
        })
        kinematicFramesRef.current = []
        feedbackData = res.data
        answerScore = res.data.answer_score || localEval.score
        backendSuccess = true
      } catch {
        console.warn("[Submit] Backend call failed, using local evaluation")
      }
    }

    // Build feedback for UI display
    if (backendSuccess && feedbackData) {
      setFeedback(feedbackData)
      setScores(p => [...p, answerScore])
      setObsInterrupt(feedbackData.observer_interrupt)
      
      // Update allQ queue with adaptive difficulty questions
      if (feedbackData.updated_questions) {
        setAllQ(feedbackData.updated_questions)
        console.log("[Adaptive] Updated future questions:", feedbackData.updated_questions)
      }
    } else {
      // Use local evaluation for feedback display
      const localFeedback = {
        answer_score: answerScore,
        architect_feedback: {
          reaction: localEval.verdict === "CORRECT"
            ? "Solid answer. You covered the key concepts well."
            : localEval.verdict === "PARTIAL"
            ? `Partial answer. ${localEval.accuracy}`
            : finalText === "(No response recorded)"
            ? "No response was provided. Moving on."
            : `Weak answer. ${localEval.missing}`,
          verdict: localEval.verdict,
          score: answerScore,
          what_was_right: localEval.matchedKeywords.length > 0
            ? `You mentioned: ${localEval.matchedKeywords.join(", ")}`
            : "",
          what_was_wrong: localEval.missingKeywords.length > 0
            ? `Missing: ${localEval.missingKeywords.join(", ")}`
            : "",
        },
        manager_feedback: null,
        observer_interrupt: null,
      }
      setFeedback(localFeedback)
      setScores(p => [...p, answerScore])
      setObsInterrupt(null)
      feedbackData = localFeedback
    }

    // ── BUILD PER-QUESTION SNAPSHOT ──────────────────
    const snapshot = {
      ...snapshotBase,
      score: answerScore,
      verdict: localEval.verdict,
      feedback: {
        architectReaction: feedbackData?.architect_feedback?.reaction || "",
        verdict: feedbackData?.architect_feedback?.verdict || localEval.verdict,
        whatWasRight: feedbackData?.architect_feedback?.what_was_right || "",
        whatWasWrong: feedbackData?.architect_feedback?.what_was_wrong || "",
      },
    }
    questionSnapshotsRef.current.push(snapshot)

    // ── SAVE TO LOCALSTORAGE ────────────────────────
    saveQuestionResult(qIndex, snapshot)

    // Reset per-question counters
    perQBlinkRef.current = 0
    perQGazeRef.current = 0

    // Architect speaks reaction with subtitle
    if (feedbackData?.architect_feedback?.reaction) {
      await speakWithSub(feedbackData.architect_feedback.reaction, "architect")
    }
    // Observer interrupt
    if (feedbackData?.observer_interrupt) {
      await speakWithSub(feedbackData.observer_interrupt, "observer")
    }
    // Manager nods
    if (feedbackData?.manager_feedback?.reaction) {
      store.getState().triggerNod("manager")
      setSubtitle({ agent: "manager", text: feedbackData.manager_feedback.reaction })
      await new Promise(r => setTimeout(r, 2500))
      setSubtitle(null)
    }

    if (autoAdvance) {
      nextQ()
    }

    setLoading(false); store.getState().setAllIdle()
  }

  // ── 60-SECOND COUNTDOWN TIMER ────────────────────────
  function startCountdown() {
    stopCountdown()
    countdownValRef.current = QUESTION_TIME_LIMIT
    setCountdown(QUESTION_TIME_LIMIT)
    setTimerActive(true)
    setAutoAdvanceWarning(false)
    countdownRef.current = setInterval(() => {
      countdownValRef.current -= 1
      setCountdown(countdownValRef.current)
      if (countdownValRef.current <= 0) {
        stopCountdown()
        handleTimerExpired()
      }
    }, 1000)
  }

  function stopCountdown() {
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = null
    setTimerActive(false)
  }

  function handleTimerExpired() {
    setAutoAdvanceWarning(true)
    // Auto-stop recording if active
    if (recRef.current?.state === "recording") {
      handleStopRec()
    }
    // Auto-submit after a brief flash
    setTimeout(() => {
      setAutoAdvanceWarning(false)
      if (transcript.trim() || hasRecorded) {
        submitAnswer(true)
      } else {
        // No answer — force next question
        nextQ()
      }
    }, 1500)
  }

  async function nextQ() {
    const next = qIndex + 1
    if (next >= allQ.length) { endInterview(); return }
    setQIndex(next)
    setPostureQuestion(next)
    const q = { id: allQ[next].id, text: allQ[next].question, question_number: next + 1 }
    setCurrentQ(q); setTranscript(""); setFeedback(null); setObsInterrupt(null); setPhase("questioning"); setHasRecorded(false)
    setInterruptedThisQ(false)
    // Reset per-question counters for new question
    perQBlinkRef.current = 0
    perQGazeRef.current = 0
    await speakWithSub(q.text, "architect")
    startCountdown()
    await startRec()
  }

  async function requestMicPermission() {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStream.getTracks().forEach(t => t.stop())
      setMicPermission("granted")
      console.log("[Mic] Permission granted from explicit request")
      return true
    } catch (err) {
      console.error("[Mic] Request failed:", err)
      setMicPermission("denied")
      return false
    }
  }

  async function beginInterview() {
    if (micPermission !== "granted") {
      const granted = await requestMicPermission()
      if (!granted) {
        alert("Microphone permission is required to proceed with the interview. Please allow microphone access in your browser.")
        return
      }
    }
    // ── PERSIST SESSION TO LOCALSTORAGE ──
    clearSession()
    initSession(sessionData)
    cancelTTS(); setSubtitle(null); setPhase("questioning")
    if (currentQ?.text) await speakWithSub(currentQ.text, "architect")
    startCountdown()
    await startRec()
  }

  async function endInterview() {
    setPhase("ending"); setLoading(true); cancelTTS(); setSubtitle(null)
    stopCountdown()
    store.getState().setAllThinking()
    stopEmotionDetection()

    // Get final emotion summary for the entire session
    const finalEmotionSummary = getEmotionSummary()
    const postureSummary = getPostureSummary()

    // Collect biometric data for mentor mode
    const biometrics = {
      expressions: store.getState().expressionLog || [],
      posture: postureSummary,
      questionSnapshots: questionSnapshotsRef.current,
      screenExitLog: screenExitLogRef.current,
      totalScreenExits: screenExitCountRef.current,
      totalGazeAway: gazeAwayCountRef.current,
      // Include complete localStorage data for PDF generation
      localStorageData: getCompleteSessionData(),
    }

    // Demo mode — skip backend scorecard generation
    if (sessionData?.demo) {
      const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 5.0
      const snapshots = questionSnapshotsRef.current

      const demoScorecard = {
        session_id: sessionData.session_id,
        scores: { technical: avgScore, behavioral: 5.0, communication: 5.0, overall: avgScore },
        verdict: {
          hire_decision: avgScore >= 7 ? "HIRE" : avgScore >= 5 ? "BORDERLINE" : "NO HIRE",
          one_line_verdict: avgScore >= 7
            ? "Strong performance. Key concepts were covered well."
            : avgScore >= 5
            ? "Partial understanding demonstrated. Review missed concepts."
            : "Significant gaps detected. Focused study recommended.",
          architect_closing: `Keyword analysis: ${snapshots.filter(s => s.verdict === "CORRECT").length}/${snapshots.length} answers fully correct.`,
          observer_closing: "Kinematic data captured for review.",
          manager_closing: "Communication assessment based on local analysis.",
          top_strength: snapshots.filter(s => s.verdict === "CORRECT").length > 0
            ? `Strong answers on ${snapshots.filter(s => s.verdict === "CORRECT").length} question(s) with full keyword coverage.`
            : "",
          critical_weakness: snapshots.filter(s => s.verdict === "INCORRECT" || s.verdict === "NO_RESPONSE").length > 0
            ? `${snapshots.filter(s => s.verdict === "INCORRECT" || s.verdict === "NO_RESPONSE").length} question(s) need significant improvement.`
            : "",
          action_plan: [
            ...new Set(snapshots.filter(s => s.tip).map(s => s.tip))
          ].slice(0, 4),
        },
        questions_summary: allQ.map((q, i) => {
          const snap = snapshots.find(s => s.questionIndex === i) || {}
          return {
            question: q.question,
            answer: snap.candidateAnswer || "",
            score: snap.score || 0,
            ideal_answer: q.ideal_answer || "",
            expected_keywords: q.expected_keywords || [],
            matched_keywords: snap.matchedKeywords || [],
            missing_keywords: snap.missingKeywords || [],
            keyword_match_pct: snap.keywordMatchPct || 0,
            verdict: snap.verdict || "NO_RESPONSE",
            accuracy: snap.accuracy || "",
            tip: snap.tip || "",
            dominant_emotion: snap.dominantEmotion || snap.emotionSummary?.dominant_emotion || "neutral",
            emotion_stability: snap.emotionSummary?.stability_score || 100,
          }
        }),
        kinematic_analytics: null,
        emotion_analytics: finalEmotionSummary ? {
          session_dominant_emotion: finalEmotionSummary.dominant_emotion || "neutral",
          emotion_stability: finalEmotionSummary.stability_score || 100,
          emotion_composure_score: 7,
          emotion_distribution: finalEmotionSummary.emotion_distribution || {},
          emotion_changes: finalEmotionSummary.emotion_changes || 0,
          per_question_emotions: [],
        } : null,
      }

      // Save final results to localStorage
      saveSessionResults(demoScorecard.scores, demoScorecard.verdict)

      onComplete(demoScorecard, biometrics)
      return
    }

    try {
      const res = await axios.post("/api/scorecard/generate", {
        session_id: sessionData.session_id, avg_blink_rate: blinkCount / Math.max(1, elapsed / 60), avg_posture_score: livePosture,
        total_fidget_count: 0, total_filler_words: fillerCount, full_transcript: fullLog,
        gaze_away_count: gazeAwayCount, total_blinks: blinkCount,
        screen_exit_count: screenExitCountRef.current,
        emotion_summary: finalEmotionSummary
      })
      saveSessionResults(res.data.scores, res.data.verdict)
      onComplete(res.data, biometrics)
    } catch (err) {
      console.error("Scorecard generation failed:", err)
      const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 5.0
      onComplete({
        error: true,
        session_id: sessionData.session_id,
        scores: { technical: avgScore, behavioral: 5.0, communication: 5.0, overall: avgScore },
        verdict: {
          hire_decision: "BORDERLINE",
          one_line_verdict: "Evaluation encountered an error. Partial scores shown.",
          architect_closing: "System error during final evaluation.",
          observer_closing: "",
          manager_closing: "",
          top_strength: "",
          critical_weakness: "Evaluation could not be completed.",
          action_plan: ["Retry the interview session."],
        },
        questions_summary: [],
        kinematic_analytics: null
      }, biometrics)
    }
  }

  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—"

  // ── ENDING ─────────────────────────────────────────
  if (phase === "ending") return (
    <div className="iv-root">
      <BoardroomScene />
      <div className="iv-overlay">
        <div className="iv-ending">
          <div className="ending-icon acid glow-acid display">⚡</div>
          <h2 className="display acid" style={{ fontSize: "2.8rem", letterSpacing: "0.1em" }}>PANEL DELIBERATING</h2>
          <p className="mono dim" style={{ letterSpacing: "0.15em", fontSize: "0.75rem" }}>COMPILING MULTI-AGENT EVALUATION . . .</p>
          <div className="ending-bar"><div className="ending-bar-fill" /></div>
        </div>
      </div>
    </div>
  )

  // ── MAIN RENDER ────────────────────────────────────
  return (
    <div className="iv-root">
      <BoardroomScene />

      <div className="iv-overlay">
        {/* ── HEADER ──────────────────────── */}
        <header className="iv-header">
          <div className="iv-header-left">
            <span className="chip acid">LIVE</span>
            <span className="mono dim" style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}>SESSION #{sessionData?.session_id}</span>
            <button className="btn btn-ghost" style={{ padding: "2px 6px", fontSize: "0.6rem", marginLeft: "10px" }} onClick={toggleFullscreen}>
              {isFullscreen ? "↙ EXIT FULLSCREEN" : "↗ FULLSCREEN"}
            </button>
          </div>
          <div className="iv-title">
            <h2 className="display" style={{ fontSize: "1.2rem", letterSpacing: "0.1em" }}>SENTINEL<span className="acid">AI</span> — BOARDROOM</h2>
            <span className="mono dim" style={{ fontSize: "0.55rem", letterSpacing: "0.08em" }}>
              {sessionData?.topic?.replace("_", " ").toUpperCase()} · {sessionData?.difficulty?.toUpperCase()}
            </span>
          </div>
          <div className="iv-timer">
            <span className="mono dim" style={{ fontSize: "0.5rem", letterSpacing: "0.12em" }}>MADE BY LIKITH</span>
            <span className="display acid" style={{ fontSize: "1.6rem" }}>{fmt(elapsed)}</span>
          </div>

          {/* ── 60s COUNTDOWN TIMER ── */}
          {phase === "questioning" && timerActive && (
            <div className={`countdown-container ${countdown <= 10 ? "danger" : ""}`} style={{ position: "absolute", right: 200, top: 5 }}>
              <div className="countdown-ring">
                <svg viewBox="0 0 52 52">
                  <circle className="ring-bg" cx="26" cy="26" r="22" />
                  <circle
                    className="ring-fg"
                    cx="26" cy="26" r="22"
                    stroke={countdown <= 10 ? "var(--blood)" : countdown <= 20 ? "var(--amber)" : "var(--acid)"}
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - countdown / QUESTION_TIME_LIMIT)}`}
                  />
                </svg>
                <span className="countdown-time" style={{ color: countdown <= 10 ? "var(--blood)" : countdown <= 20 ? "var(--amber)" : "var(--acid)" }}>
                  {countdown}
                </span>
              </div>
              <span className="countdown-label">TIME LEFT</span>
            </div>
          )}
        </header>

        {/* ── AUTO-ADVANCE WARNING ── */}
        {autoAdvanceWarning && (
          <div className="auto-advance-warning">
            <span className="display blood" style={{ fontSize: "1.2rem", letterSpacing: "0.1em" }}>⏰ TIME'S UP</span>
            <p className="mono dim" style={{ fontSize: "0.65rem", marginTop: "6px", letterSpacing: "0.1em" }}>AUTO-ADVANCING...</p>
          </div>
        )}

        {/* ── SPEECH SUBTITLE CLOUD ────────── */}
        {subtitle && (
          <div className="speech-subtitle anim-up" style={{ "--sub-color": AGENT_META[subtitle.agent]?.color || "var(--ice)" }}>
            <div className="sub-header">
              <span className="sub-icon">{AGENT_META[subtitle.agent]?.icon}</span>
              <span className="sub-name">{AGENT_META[subtitle.agent]?.label}</span>
              <span className="sub-speaking-dot" />
            </div>
            <p className="sub-text">"{subtitle.text}"</p>
          </div>
        )}

        {/* ── LIVE USER SUBTITLE ───────────── */}
        {!subtitle && isRec && isRealTranscript(transcript) && (
          <div className="speech-subtitle anim-up" style={{ "--sub-color": "var(--mint)", top: "60%" }}>
            <div className="sub-header">
              <span className="sub-icon">🎤</span>
              <span className="sub-name">CANDIDATE (YOU)</span>
              <span className="sub-speaking-dot" style={{ animation: "speakPulse 0.5s infinite", background: "var(--mint)", boxShadow: "0 0 8px var(--mint)" }} />
            </div>
            <p className="sub-text" style={{ color: "var(--ice)", fontSize: "1.05rem" }}>"{transcript}"</p>
          </div>
        )}

        {/* ── LEFT SIDEBAR ─────────────────── */}
        <div className="iv-left-sidebar">
          <div className="stress-hud-toggle-container" style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
            <button 
              className={`btn btn-ghost ${showStressHud ? "active" : ""}`} 
              style={{ 
                flex: 1, 
                fontSize: "0.55rem", 
                padding: "4px 8px", 
                border: "1px solid rgba(255,255,255,0.06)", 
                fontFamily: "var(--f-mono)",
                letterSpacing: "0.08em",
                background: showStressHud ? "rgba(0, 255, 157, 0.08)" : "transparent",
                color: showStressHud ? "var(--mint)" : "var(--t3)",
                borderColor: showStressHud ? "rgba(0, 255, 157, 0.25)" : "rgba(255,255,255,0.06)"
              }}
              onClick={() => setShowStressHud(!showStressHud)}
            >
              {showStressHud ? "● BIOMETRIC HUD ACTIVE" : "○ BIOMETRIC HUD HIDDEN"}
            </button>
          </div>
          <div className="pip-video-container">
            <video ref={videoRef} autoPlay muted playsInline width={320} height={240} className="pip-feed" />
            <canvas ref={canvasRef} className="pip-skeleton-canvas" />
            <div className="pip-corner tl" /><div className="pip-corner tr" />
            <div className="pip-corner bl" /><div className="pip-corner br" />
            <div className="pip-badge">
              <span className="status-dot online" />
              <span className="mono" style={{ fontSize: "0.5rem", color: "var(--mint)", letterSpacing: "0.08em" }}>CANDIDATE</span>
            </div>
            {/* Camera error overlay */}
            {cameraError && (
              <div className="cam-error-overlay">
                <span style={{ fontSize: "1.5rem" }}>📷</span>
                <span className="mono" style={{ fontSize: "0.55rem", color: "var(--blood)", textAlign: "center", letterSpacing: "0.08em" }}>CAMERA DENIED</span>
                <button className="btn btn-ghost" style={{ fontSize: "0.5rem", padding: "3px 8px", marginTop: "4px" }}
                  onClick={() => startWebcamWithId(selectedCamera || null)}>RETRY</button>
              </div>
            )}
            {/* Emotion Badge Overlay */}
            {!cameraError && dominantEmotion && emotionConfidence > 0.3 && (
              <div className="emotion-badge-overlay" style={{ "--emo-color": EMOTION_COLORS[dominantEmotion] || "#8b95a5" }}>
                <span className="emotion-badge-icon">{EMOTION_ICONS[dominantEmotion]}</span>
                <span className="emotion-badge-label">{dominantEmotion.toUpperCase()}</span>
                <span className="emotion-badge-conf">{(emotionConfidence * 100).toFixed(0)}%</span>
              </div>
            )}
            {/* Stress HUD Overlay */}
            {showStressHud && (
              <div className="stress-hud-overlay" style={{ borderColor: `hsl(${120 - stressLevel * 1.2}, 90%, 50%)` }}>
                <div className="stress-hud-bar-container">
                  <div 
                    className="stress-hud-bar-fill" 
                    style={{ 
                      height: `${stressLevel}%`,
                      background: `linear-gradient(to top, hsl(120, 85%, 45%), hsl(${Math.max(0, 120 - stressLevel * 1.2)}, 85%, 45%))` 
                    }}
                  />
                </div>
                <div className="stress-hud-text" style={{ color: `hsl(${120 - stressLevel * 1.2}, 90%, 50%)` }}>
                  <span className="stress-hud-val">{stressLevel}%</span>
                  <span className="stress-hud-lbl">STRESS LEVEL</span>
                </div>
                {/* Micro-insights overlay */}
                <div className="stress-hud-details">
                  <div className="hud-detail-row">
                    <span>EYE:</span> <span className={gazeStatus === "AWAY" ? "blood" : "mint"}>{gazeStatus}</span>
                  </div>
                  <div className="hud-detail-row">
                    <span>EMO:</span> <span style={{ color: EMOTION_COLORS[dominantEmotion] || "var(--ice)" }}>{dominantEmotion.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Posture/Metrics HUD */}
          <div className="pip-posture-hud">
            <div className="posture-metric">
              <span className="posture-label">ANGLE</span>
              <span className={`posture-val ${sittingAngle < 8 ? "mint" : sittingAngle < 18 ? "amber" : "blood"}`}>{sittingAngle}°</span>
            </div>
            <div className="posture-metric">
              <span className="posture-label">POSTURE</span>
              <span className={`posture-val ${postureStatus === "GOOD" ? "mint" : postureStatus === "FAIR" ? "amber" : "blood"}`}>{postureStatus}</span>
            </div>
            <div className="posture-metric">
              <span className="posture-label">BLINKS</span>
              <span className="posture-val acid">{blinkCount}</span>
            </div>
            <div className="posture-metric">
              <span className="posture-label">GAZE</span>
              <span className={`posture-val ${gazeStatus === "AWAY" ? "blood gaze-pulse" : gazeAwayCount === 0 ? "mint" : "amber"}`}>{gazeAwayCount} {gazeStatus === "AWAY" ? "⚠" : ""}</span>
            </div>
            <div className="posture-metric">
              <span className="posture-label">MIC</span>
              <span className={`posture-val ${micPermission === "granted" ? "mint" : micPermission === "denied" ? "blood" : "amber"}`}>
                {micPermission === "granted" ? "● ON" : micPermission === "denied" ? "✗ OFF" : "○ ..."}
              </span>
            </div>
            <div className="posture-metric">
              <span className="posture-label">TAB EXITS</span>
              <span className={`posture-val ${screenExitCount === 0 ? "mint" : screenExitCount < 3 ? "amber" : "blood"}`}>{screenExitCount}</span>
            </div>
          </div>
          {/* ── Emotion Spectrum HUD ──── */}
          <div className="emotion-spectrum-hud">
            <div className="emotion-hud-header">
              <span className="posture-label">EMOTION AI</span>
              <span className="posture-label" style={{ color: emotionModelsLoaded ? "var(--mint)" : "var(--amber)" }}>
                {emotionModelsLoaded ? "● ACTIVE" : "○ LOADING"}
              </span>
            </div>
            <div className="emotion-bars-grid">
              {["happy", "neutral", "sad", "angry", "surprised", "fearful", "disgusted"].map(emo => {
                const score = expressions[emo] || 0
                return (
                  <div key={emo} className="emotion-bar-row">
                    <span className="emotion-bar-icon">{EMOTION_ICONS[emo]}</span>
                    <div className="emotion-bar-track">
                      <div
                        className="emotion-bar-fill"
                        style={{
                          width: `${Math.min(score * 100, 100)}%`,
                          background: EMOTION_COLORS[emo],
                          boxShadow: score > 0.3 ? `0 0 8px ${EMOTION_COLORS[emo]}50` : "none",
                        }}
                      />
                    </div>
                    <span className="emotion-bar-pct" style={{ color: score > 0.3 ? EMOTION_COLORS[emo] : "var(--t3)" }}>
                      {(score * 100).toFixed(0)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Metrics inside sidebar */}
          <div className="iv-metrics-inline">
            {[
              { label: "SCORE", val: avgScore, cls: "acid" },
              { label: "FILLERS", val: fillerCount, cls: fillerCount < 5 ? "mint" : "blood" },
              { label: "BLINKS", val: blinkCount, cls: blinkCount < 30 ? "ice" : "amber" },
              { label: "GAZE ⚠", val: gazeAwayCount, cls: gazeAwayCount < 5 ? "mint" : "blood" },
              { label: "EMOTION", val: `${EMOTION_ICONS[dominantEmotion] || "😐"} ${dominantEmotion.toUpperCase()}`, cls: dominantEmotion === "happy" ? "mint" : dominantEmotion === "angry" || dominantEmotion === "fearful" ? "blood" : "ice" },
              { label: "PROGRESS", val: `${qIndex + 1}/${allQ.length}`, cls: "ice" },
            ].map(m => (
              <div key={m.label} className="metric-mini">
                <span className="metric-mini-label">{m.label}</span>
                <span className={`metric-mini-val ${m.cls}`}>{m.val}</span>
              </div>
            ))}
            <div className="q-dots-mini">
              {allQ.map((_, i) => <div key={i} className={`q-dot-mini ${i < qIndex ? "done" : i === qIndex ? "current" : ""}`} />)}
            </div>
          </div>

          {videoDevices.length >= 1 && (
            <select
              className="pip-camera-select"
              value={selectedCamera}
              onChange={e => setSelectedCamera(e.target.value)}
            >
              {videoDevices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── AGENT STATUS ────────────────── */}

        <div className="iv-agents-panel">
          {["architect", "observer", "manager"].map(key => {
            const meta = AGENT_META[key]
            const st = agentStates[key]
            return (
              <div key={key} className={`agent-status-card ${st !== "idle" ? "active" : ""}`} style={{ "--ac": meta.color }}>
                <span className="agent-status-icon">{meta.icon}</span>
                <div className="agent-status-info">
                  <span style={{ fontSize: "0.55rem", fontWeight: 600, color: meta.color, letterSpacing: "0.08em" }}>{meta.label}</span>
                </div>
                <span className="agent-state-badge mono" style={{ color: meta.color }}>
                  {st === "talking" ? "SPEAKING" : st === "thinking" ? "THINKING" : st === "nodding" ? "NODDING" : "●"}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── OPENING ─────────────────────── */}
        {phase === "opening" && (
          <div className="iv-center-card anim-up">
            <span className="chip ice" style={{ marginBottom: "10px" }}>⚡ THE ARCHITECT — OPENING</span>
            <blockquote className="opening-quote">
              "{sessionData?.opening_statement || "We begin immediately. Answer precisely."}"
            </blockquote>

            {/* ── EQUIPMENT & PERMISSION CHECK ── */}
            <div className="equipment-check-panel">
              <div className="equipment-check-title mono">EQUIPMENT & PERMISSION STATUS</div>
              <div className="equipment-check-row">
                <span className="mono" style={{ color: "var(--t2)" }}>📷 CAMERA FEED:</span>
                <span className={`status-badge mono ${cameraError ? "offline" : "online"}`}>
                  {cameraError ? "✗ DENIED" : "✓ ONLINE"}
                </span>
              </div>
              <div className="equipment-check-row">
                <span className="mono" style={{ color: "var(--t2)" }}>🎙 MICROPHONE:</span>
                <span className={`status-badge mono ${micPermission === "granted" ? "online" : micPermission === "denied" ? "offline" : "checking"}`}>
                  {micPermission === "granted" ? "✓ GRANTED" : micPermission === "denied" ? "✗ DENIED" : "○ PENDING"}
                </span>
              </div>

              {micPermission !== "granted" && (
                <div className="mic-warning-box">
                  <span className="mono" style={{ fontSize: "0.6rem" }}>
                    {micPermission === "denied"
                      ? "❌ Microphone access was denied. Please allow microphone permissions in your browser's site settings to proceed."
                      : "⚠️ Microphone permission is required to analyze your voice telemetry and transcribe your responses."}
                  </span>
                  <button className="btn btn-ghost mic-grant-btn" onClick={requestMicPermission}>
                    🎙 REQUEST MIC PERMISSION
                  </button>
                </div>
              )}
            </div>

            <button
              className="btn btn-acid"
              style={{ marginTop: "16px", width: "100%", fontSize: "0.95rem", letterSpacing: "0.1em" }}
              onClick={beginInterview}
              disabled={micPermission !== "granted"}
            >
              {micPermission === "granted" ? "I'M READY — BEGIN →" : "🔒 AWAITING MICROPHONE PERMISSION"}
            </button>
          </div>
        )}

        {/* ── QUESTION DISPLAY ────────────── */}
        {(phase === "questioning" || phase === "feedback") && currentQ && (
          <div className="iv-question-bar">
            <div className="q-bar-head">
              <span className="chip ice" style={{ padding: "2px 8px", fontSize: "0.5rem" }}>⚡ Q{currentQ.question_number || qIndex + 1}/{allQ.length}</span>
            </div>
            <p className="q-bar-text">{currentQ.text}</p>
          </div>
        )}

        {/* ── BOTTOM CONTROLS ─────────────── */}
        <div className="iv-bottom-bar">
          {phase === "feedback" && (
            <div className="fb-strip">
              {loading ? (
                <div className="fb-loading">
                  <div className="spinner" style={{ width: "18px", height: "18px", borderColor: "rgba(200,255,0,0.2)", borderTopColor: "var(--acid)" }} />
                  <span className="mono dim" style={{ fontSize: "0.65rem", letterSpacing: "0.1em" }}>PANEL EVALUATING...</span>
                </div>
              ) : (
                <>
                  {feedback?.architect_feedback && (
                    <div className="fb-inline">
                      <div className="fb-inline-head">
                        <span className="chip ice" style={{ fontSize: "0.45rem", padding: "1px 5px" }}>⚡ ARCHITECT</span>
                        <span className={`chip ${getVC(feedback.architect_feedback.verdict)}`} style={{ fontSize: "0.45rem", padding: "1px 5px" }}>{feedback.architect_feedback.verdict}</span>
                        <span className="display" style={{ fontSize: "1.5rem", color: "var(--acid)", marginLeft: "auto" }}>{feedback.architect_feedback.score?.toFixed(1)}</span>
                      </div>
                      <p className="fb-inline-text">"{feedback.architect_feedback.reaction}"</p>
                      {feedback.architect_feedback.what_was_wrong && <p className="fb-note-inline blood">✗ {feedback.architect_feedback.what_was_wrong}</p>}
                      {feedback.architect_feedback.what_was_right && <p className="fb-note-inline mint">✓ {feedback.architect_feedback.what_was_right}</p>}
                    </div>
                  )}
                  {feedback?.manager_feedback && (
                    <div className="fb-inline">
                      <div className="fb-inline-head">
                        <span className="chip amber" style={{ fontSize: "0.45rem", padding: "1px 5px" }}>▣ MANAGER</span>
                        <span className={`chip ${getVC(feedback.manager_feedback.clarity)}`} style={{ fontSize: "0.45rem", padding: "1px 5px" }}>{feedback.manager_feedback.clarity}</span>
                        <span className="display" style={{ fontSize: "1.5rem", color: "var(--amber)", marginLeft: "auto" }}>{feedback.manager_feedback.score?.toFixed(1)}</span>
                      </div>
                      <p className="fb-inline-text">"{feedback.manager_feedback.reaction}"</p>
                    </div>
                  )}
                  {obsInterrupt && (
                    <div className="fb-inline" style={{ borderLeft: "2px solid #a855f7" }}>
                      <span className="chip" style={{ color: "#a855f7", borderColor: "rgba(168,85,247,0.3)", fontSize: "0.45rem", padding: "1px 5px" }}>◉ OBSERVER</span>
                      <p className="fb-inline-text" style={{ color: "#c084fc" }}>"{obsInterrupt}"</p>
                    </div>
                  )}
                  <div className="fb-actions-strip">
                    {qIndex + 1 < allQ.length
                      ? <button className="btn btn-acid" style={{ flex: 1, fontSize: "0.85rem" }} onClick={nextQ}>NEXT QUESTION →</button>
                      : <button className="btn btn-blood" style={{ flex: 1, fontSize: "0.85rem" }} onClick={endInterview}>END — GET VERDICT</button>}
                  </div>
                </>
              )}
            </div>
          )}

          {phase === "questioning" && (
            <div className="rec-strip">
              <div className="rec-strip-head">
                <span className="mono" style={{ fontSize: "0.55rem", color: "var(--t3)", letterSpacing: "0.1em" }}>YOUR RESPONSE</span>
                {isRec && (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span className="rec-pulse" />
                    <span className="mono" style={{ fontSize: "0.5rem", color: "var(--blood)", letterSpacing: "0.06em" }}>REC · {fmt(answerSec)}</span>
                  </span>
                )}
              </div>
              <div className="transcript-container">
                <div className="transcript-badge-row">
                  <span className="mono dim" style={{ fontSize: "0.55rem", letterSpacing: "0.1em" }}>YOUR ANSWER</span>
                  {isRec && <span className="live-subtitle-badge">LIVE SUBTITLES</span>}
                  {isTranscribing && <span className="live-subtitle-badge" style={{ color: "var(--ice)", borderColor: "var(--ice)" }}>AI REFINING IN BG</span>}
                </div>
                <textarea
                  className="transcript-mini"
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  onFocus={() => { if (isRec) handleStopRec() }}
                  placeholder={isRec ? "Speak now... (Live subtitles enabled)" : "Press REC to speak or just type your answer here"}
                  disabled={loading}
                />
                {isRec && <span className="cursor-blink">█</span>}
              </div>
              <div className="rec-controls">
                {!isRec
                  ? <button className="btn btn-ghost" style={{ flex: 1, fontSize: "0.8rem" }} onClick={startRec}>● REC</button>
                  : <button className="btn btn-blood" style={{ flex: 1, fontSize: "0.8rem" }} onClick={handleStopRec}>■ STOP</button>}
                <button className="btn btn-acid" style={{ flex: 2, fontSize: "0.8rem" }} onClick={() => submitAnswer(false)}
                  disabled={loading || isTranscribing || (!hasRecorded && !isRec && transcript.trim().length === 0)}>
                  {loading ? "EVALUATING..." : isTranscribing ? "TRANSCRIBING..." : "SUBMIT →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getVC(v) {
  if (!v) return ""
  const u = v.toUpperCase()
  if (["CORRECT", "IMPRESSIVE", "EXCELLENT", "GOOD"].some(x => u.includes(x))) return "acid"
  if (["PARTIAL", "AVERAGE", "ACCEPTABLE"].some(x => u.includes(x))) return "amber"
  return "blood"
}

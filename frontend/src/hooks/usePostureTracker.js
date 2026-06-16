/**
 * ═══════════════════════════════════════════════════════════
 *  SENTINEL AI — POSTURE TRACKER HOOK
 *  Continuous pose detection for body angle and posture
 *  stability telemetry throughout the interview session.
 * ═══════════════════════════════════════════════════════════
 */
import { useRef, useState, useCallback } from "react"

/**
 * usePostureTracker — Tracks user's sitting angle, posture score,
 * and generates continuous telemetry data mapped to timestamps & questions.
 *
 * Uses shoulder-hip midpoint angle as the primary posture metric.
 * Generates a telemetry timeline for post-interview mentor analysis.
 */
export default function usePostureTracker() {
  const [sittingAngle, setSittingAngle] = useState(0)
  const [postureStatus, setPostureStatus] = useState("—")
  const [livePosture, setLivePosture] = useState(70)

  // Throttle refs to avoid re-render flooding
  const lastAngleRef = useRef(0)
  const lastUpdateRef = useRef(0)

  // Telemetry timeline — continuous log of posture data
  const telemetryRef = useRef([])
  const currentQuestionRef = useRef(0)

  /**
   * Set the current question index for telemetry mapping.
   */
  const setCurrentQuestion = useCallback((qIndex) => {
    currentQuestionRef.current = qIndex
  }, [])

  /**
   * Process pose landmarks and update posture metrics.
   * Called from the detection loop with MediaPipe pose results.
   *
   * @param {Object} pts - Pre-processed landmark points (mirrored for canvas)
   *   Expected keys: pts[11] (left shoulder), pts[12] (right shoulder),
   *                   pts[23] (left hip), pts[24] (right hip)
   */
  const processPosture = useCallback((pts) => {
    if (!pts[11] || !pts[12] || !pts[23] || !pts[24]) return

    const shoulderMid = {
      x: (pts[11].x + pts[12].x) / 2,
      y: (pts[11].y + pts[12].y) / 2,
    }
    const hipMid = {
      x: (pts[23].x + pts[24].x) / 2,
      y: (pts[23].y + pts[24].y) / 2,
    }

    const dx = shoulderMid.x - hipMid.x
    const dy = shoulderMid.y - hipMid.y
    const angle = Math.abs(Math.atan2(dx, -dy) * (180 / Math.PI))
    const rounded = Math.round(angle)

    const nowMs = performance.now()

    // Only update state if angle changed significantly OR every 500ms
    if (
      Math.abs(rounded - lastAngleRef.current) > 3 ||
      nowMs - lastUpdateRef.current > 500
    ) {
      lastAngleRef.current = rounded
      lastUpdateRef.current = nowMs

      setSittingAngle(rounded)
      const score = Math.max(0, 100 - rounded * 4)
      setLivePosture(Math.round(score))

      let status = "POOR"
      if (rounded < 8) status = "GOOD"
      else if (rounded < 18) status = "FAIR"
      setPostureStatus(status)

      // Log telemetry entry
      telemetryRef.current.push({
        t: Date.now(),
        angle: rounded,
        score: Math.round(score),
        status,
        questionIndex: currentQuestionRef.current,
        shoulderMid: { ...shoulderMid },
        hipMid: { ...hipMid },
      })
    }
  }, [])

  /**
   * Get posture summary analytics for the entire session.
   * Used by the Mentor Mode for post-interview analysis.
   */
  const getPostureSummary = useCallback(() => {
    const timeline = telemetryRef.current
    if (timeline.length === 0) {
      return {
        avg_angle: 0,
        max_angle: 0,
        min_angle: 0,
        avg_score: 100,
        status_distribution: { GOOD: 100, FAIR: 0, POOR: 0 },
        stability_score: 100,
        per_question: [],
        total_readings: 0,
        timeline: [],
      }
    }

    const angles = timeline.map((t) => t.angle)
    const scores = timeline.map((t) => t.score)
    const avgAngle = angles.reduce((a, b) => a + b, 0) / angles.length
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

    // Status distribution
    const statusCounts = { GOOD: 0, FAIR: 0, POOR: 0 }
    timeline.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    })
    const total = timeline.length
    const statusDist = {
      GOOD: parseFloat(((statusCounts.GOOD / total) * 100).toFixed(1)),
      FAIR: parseFloat(((statusCounts.FAIR / total) * 100).toFixed(1)),
      POOR: parseFloat(((statusCounts.POOR / total) * 100).toFixed(1)),
    }

    // Calculate stability (low variance = high stability)
    const variance =
      angles.reduce((sum, a) => sum + Math.pow(a - avgAngle, 2), 0) /
      angles.length
    const stability = Math.max(0, 100 - Math.sqrt(variance) * 5)

    // Per-question breakdown
    const questionMap = {}
    timeline.forEach((t) => {
      const qi = t.questionIndex
      if (!questionMap[qi]) questionMap[qi] = { angles: [], scores: [], statuses: [] }
      questionMap[qi].angles.push(t.angle)
      questionMap[qi].scores.push(t.score)
      questionMap[qi].statuses.push(t.status)
    })

    const perQuestion = Object.entries(questionMap).map(([qi, data]) => ({
      question_index: parseInt(qi),
      avg_angle: parseFloat(
        (data.angles.reduce((a, b) => a + b, 0) / data.angles.length).toFixed(1)
      ),
      avg_score: parseFloat(
        (data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1)
      ),
      worst_status: data.statuses.includes("POOR")
        ? "POOR"
        : data.statuses.includes("FAIR")
        ? "FAIR"
        : "GOOD",
    }))

    return {
      avg_angle: parseFloat(avgAngle.toFixed(1)),
      max_angle: Math.max(...angles),
      min_angle: Math.min(...angles),
      avg_score: parseFloat(avgScore.toFixed(1)),
      status_distribution: statusDist,
      stability_score: parseFloat(stability.toFixed(1)),
      per_question: perQuestion,
      total_readings: total,
      timeline: timeline.slice(-200), // Last 200 entries for charting
    }
  }, [])

  /**
   * Reset all telemetry data.
   */
  const reset = useCallback(() => {
    telemetryRef.current = []
    lastAngleRef.current = 0
    lastUpdateRef.current = 0
    currentQuestionRef.current = 0
    setSittingAngle(0)
    setPostureStatus("—")
    setLivePosture(70)
  }, [])

  return {
    sittingAngle,
    postureStatus,
    livePosture,
    processPosture,
    setCurrentQuestion,
    getPostureSummary,
    telemetryRef,
    reset,
  }
}

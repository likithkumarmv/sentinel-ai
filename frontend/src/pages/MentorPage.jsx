/**
 * ═══════════════════════════════════════════════════════════
 *  SENTINEL AI — MENTOR MODE V2 (Post-Interview AI Coach)
 *
 *  After the interview, calls the backend LLM to generate
 *  empathetic, per-question coaching with:
 *    - Your answer vs. correct answer comparison
 *    - Emotion detected vs. ideal emotion
 *    - Posture & body language observations
 *    - Screen exit / tab switch warnings
 *    - Specific improvement tips per question
 *    - TTS narration of key insights
 * ═══════════════════════════════════════════════════════════
 */
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import axios from "axios"
import useTTS from "../hooks/useTTS"
import useInterviewStore from "../stores/interviewStore"
import "./MentorPage.css"

const EMOTION_ICONS = {
  neutral: "😐", happy: "😄", sad: "😢", angry: "😠",
  fearful: "😨", disgusted: "🤢", surprised: "😲",
}

const EMOTION_COLORS = {
  neutral: "#8b95a5", happy: "#00ff9d", sad: "#4a9eff",
  angry: "#ff1a3c", fearful: "#a855f7", disgusted: "#ff6b00",
  surprised: "#c8ff00",
}

const VERDICT_STYLES = {
  CORRECT: { color: "var(--mint)", icon: "✓", bg: "rgba(0,255,157,0.06)" },
  PARTIAL: { color: "var(--amber)", icon: "◐", bg: "rgba(255,170,0,0.06)" },
  INCORRECT: { color: "var(--blood)", icon: "✗", bg: "rgba(255,26,60,0.06)" },
  NO_RESPONSE: { color: "var(--t3)", icon: "—", bg: "rgba(255,255,255,0.02)" },
}

export default function MentorPage({ scorecardData, biometricData, sessionData, onRetry }) {
  const [stage, setStage] = useState(0) // 0=loading, 1=ready
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentInsight, setCurrentInsight] = useState("")
  const [mentorData, setMentorData] = useState(null)
  const [mentorError, setMentorError] = useState(null)
  const [expandedQ, setExpandedQ] = useState(null)

  const { speak, cancel: cancelTTS } = useTTS()
  const stageRef = useRef(0)
  const hasFetched = useRef(false)

  const emotionAnalytics = scorecardData?.emotion_analytics || {}
  const questionSnapshots = biometricData?.questionSnapshots || []
  const postureSummary = biometricData?.posture || {}
  const totalScreenExits = biometricData?.totalScreenExits || 0
  const totalGazeAway = biometricData?.totalGazeAway || 0

  // ── Fetch mentor feedback from backend LLM ──────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    async function fetchMentorFeedback() {
      try {
        const payload = {
          session_id: String(scorecardData?.session_id || ""),
          scores: scorecardData?.scores || {},
          emotion_analytics: emotionAnalytics,
          posture_summary: postureSummary,
          questions_summary: scorecardData?.questions_summary || [],
          verdict: scorecardData?.verdict || {},
          question_snapshots: questionSnapshots.map(s => ({
            questionIndex: s.questionIndex,
            questionText: s.questionText,
            candidateAnswer: s.candidateAnswer,
            idealAnswer: s.idealAnswer,
            score: s.score,
            emotionSummary: s.emotionSummary || {},
            postureSnapshot: s.postureSnapshot || {},
            gazeAwayCount: s.gazeAwayCount || 0,
            blinkCount: s.blinkCount || 0,
            screenExits: s.screenExits || 0,
            answerDuration: s.answerDuration || 30,
            fillerCount: s.fillerCount || 0,
            feedback: s.feedback || {},
          })),
          total_screen_exits: totalScreenExits,
          total_gaze_away: totalGazeAway,
        }

        const res = await axios.post("http://localhost:8000/api/mentor/feedback", payload, { timeout: 60000 })
        setMentorData(res.data)
        setStage(1)
      } catch (err) {
        console.error("[Mentor] LLM feedback failed:", err)
        setMentorError("Could not generate mentor feedback. The AI may be busy — try again.")
        setStage(1)
      }
    }
    fetchMentorFeedback()
  }, [])

  // ── TTS narration of key insights ───────────────────
  useEffect(() => {
    if (!mentorData || stage < 1) return

    async function narrate() {
      setIsSpeaking(true)

      // Greeting
      if (mentorData.greeting) {
        setCurrentInsight(mentorData.greeting)
        await speak(mentorData.greeting, "mentor")
        await new Promise(r => setTimeout(r, 600))
      }

      // Overall impression
      if (mentorData.overall_impression) {
        setCurrentInsight(mentorData.overall_impression)
        await speak(mentorData.overall_impression, "mentor")
        await new Promise(r => setTimeout(r, 600))
      }

      // Highlight 2-3 per-question reviews (not all — keep it concise)
      const reviews = mentorData.per_question_review || []
      const highlighted = reviews.filter(r =>
        r.answer_verdict === "INCORRECT" || r.answer_verdict === "NO_RESPONSE" ||
        (r.emotion_observation && r.emotion_observation.length > 20) ||
        (r.screen_exit_note && r.screen_exit_note.length > 10)
      ).slice(0, 3)

      for (const review of highlighted) {
        if (stageRef.current === -1) break
        const text = `Question ${review.question_number}: ${review.improvement_tip || review.emotion_observation || ""}`
        setCurrentInsight(text)
        await speak(text, "mentor")
        await new Promise(r => setTimeout(r, 500))
      }

      // Encouragement
      if (mentorData.encouragement && stageRef.current !== -1) {
        setCurrentInsight(mentorData.encouragement)
        await speak(mentorData.encouragement, "mentor")
        await new Promise(r => setTimeout(r, 500))
      }

      setIsSpeaking(false)
      setCurrentInsight("")
    }

    narrate()
    return () => {
      stageRef.current = -1
      cancelTTS()
    }
  }, [mentorData, stage])

  function handleSkip() {
    stageRef.current = -1
    cancelTTS()
    setIsSpeaking(false)
    setCurrentInsight("")
  }

  // ── Render ──────────────────────────────────────────
  return (
    <div className="mentor-root">
      <div className="scanline" />

      {/* ── HEADER ── */}
      <header className="mentor-header">
        <div>
          <span className="chip" style={{ color: "#a855f7", borderColor: "rgba(168,85,247,0.3)" }}>AI MENTOR MODE</span>
          <h2 className="display" style={{ fontSize: "1.3rem", letterSpacing: "0.08em", marginTop: "4px" }}>
            PERFORMANCE <span style={{ color: "#a855f7" }}>REVIEW</span>
          </h2>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isSpeaking && (
            <button className="btn btn-ghost" onClick={handleSkip} style={{ fontSize: "0.65rem", padding: "6px 14px" }}>
              SKIP NARRATION →
            </button>
          )}
          <button className="btn btn-ghost" onClick={onRetry} style={{ fontSize: "0.65rem", padding: "6px 14px" }}>
            ← NEW SESSION
          </button>
        </div>
      </header>

      {/* ── MENTOR SPEAKING INDICATOR ── */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            className="mentor-speaking-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mentor-speaking-dot" />
            <span className="mono" style={{ fontSize: "0.55rem", color: "#a855f7", letterSpacing: "0.1em" }}>
              MENTOR SPEAKING
            </span>
            <div className="mentor-wave">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LOADING STATE ── */}
      {stage === 0 && (
        <div className="mentor-loading">
          <div className="mentor-orb">
            <div className="orb-ring r1" />
            <div className="orb-ring r2" />
            <span className="display" style={{ fontSize: "2rem", color: "#a855f7" }}>◉</span>
          </div>
          <p className="mono" style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--t3)" }}>
            AI MENTOR ANALYZING YOUR INTERVIEW...
          </p>
          <p className="mono" style={{ fontSize: "0.5rem", letterSpacing: "0.15em", color: "var(--t4)", marginTop: "8px" }}>
            Reviewing {questionSnapshots.length} answers, emotions, posture & screen presence
          </p>
        </div>
      )}

      {/* ── ERROR STATE ── */}
      {stage >= 1 && mentorError && (
        <div className="mentor-main" style={{ textAlign: "center", paddingTop: "60px" }}>
          <span style={{ fontSize: "3rem" }}>⚠️</span>
          <p className="mono" style={{ color: "var(--blood)", fontSize: "0.8rem", marginTop: "12px" }}>{mentorError}</p>
          <button className="btn btn-acid" onClick={onRetry} style={{ marginTop: "20px" }}>TRY AGAIN</button>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {stage >= 1 && mentorData && (
        <main className="mentor-main">
          {/* Live subtitle */}
          {currentInsight && (
            <motion.div
              className="mentor-subtitle"
              key={currentInsight.slice(0, 40)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="mentor-subtitle-text">"{currentInsight}"</p>
            </motion.div>
          )}

          {/* ── GREETING & OVERALL ── */}
          <motion.div className="mentor-insight-card summary"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="insight-header">
              <span className="insight-icon">👋</span>
              <span className="insight-title">MENTOR'S GREETING</span>
            </div>
            <p className="insight-body">{mentorData.greeting}</p>
            {mentorData.overall_impression && (
              <p className="insight-body" style={{ marginTop: "10px", color: "var(--ice)", fontStyle: "italic" }}>
                {mentorData.overall_impression}
              </p>
            )}
          </motion.div>

          {/* ── SCREEN PRESENCE ALERT ── */}
          {(totalScreenExits > 0 || totalGazeAway > 5) && (
            <motion.div className="mentor-insight-card posture_overview"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
              <div className="insight-header">
                <span className="insight-icon">📱</span>
                <span className="insight-title">SCREEN PRESENCE ALERT</span>
                <span className="insight-score display" style={{ color: totalScreenExits > 3 ? "var(--blood)" : "var(--amber)" }}>
                  {totalScreenExits} exits
                </span>
              </div>
              <div className="insight-stats">
                <div className="insight-stat"><span className="stat-label">TAB SWITCHES</span><span className="stat-value" style={{ color: totalScreenExits > 0 ? "var(--blood)" : "var(--mint)" }}>{totalScreenExits}</span></div>
                <div className="insight-stat"><span className="stat-label">GAZE AWAY</span><span className="stat-value" style={{ color: totalGazeAway > 5 ? "var(--amber)" : "var(--mint)" }}>{totalGazeAway}</span></div>
              </div>
              {mentorData.screen_presence_note && (
                <div className="insight-recommendation">
                  <span className="rec-label">AI OBSERVATION</span>
                  <p className="rec-text">{mentorData.screen_presence_note}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── PER-QUESTION REVIEW CARDS ── */}
          <div className="mentor-section-title">
            <span className="chip" style={{ color: "var(--ice)", borderColor: "rgba(0,255,255,0.2)" }}>
              QUESTION-BY-QUESTION REVIEW
            </span>
          </div>

          <div className="mentor-insights-grid">
            {(mentorData.per_question_review || []).map((review, i) => {
              const vs = VERDICT_STYLES[review.answer_verdict] || VERDICT_STYLES.PARTIAL
              const snap = questionSnapshots[i] || {}
              const emotion = snap.emotionSummary?.dominant_emotion || "neutral"
              const isExpanded = expandedQ === i

              return (
                <motion.div
                  key={i}
                  className={`mentor-q-card ${isExpanded ? "expanded" : ""}`}
                  style={{ "--verdict-color": vs.color, background: vs.bg }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  onClick={() => setExpandedQ(isExpanded ? null : i)}
                >
                  {/* Card header */}
                  <div className="q-card-header">
                    <span className="q-card-num">Q{review.question_number || i + 1}</span>
                    <span className="q-card-verdict" style={{ color: vs.color, borderColor: vs.color + "40" }}>
                      {vs.icon} {review.answer_verdict}
                    </span>
                    <span className="q-card-score display" style={{ color: vs.color }}>
                      {(snap.score || 5).toFixed(1)}
                    </span>
                    {snap.screenExits > 0 && (
                      <span className="q-card-badge blood">📱 {snap.screenExits} exit{snap.screenExits > 1 ? "s" : ""}</span>
                    )}
                    <span className="q-card-emotion" style={{ color: EMOTION_COLORS[emotion] }}>
                      {EMOTION_ICONS[emotion]} {emotion}
                    </span>
                    <span className="q-card-expand">{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {/* Question text */}
                  <p className="q-card-question">{review.question_text || snap.questionText}</p>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="q-card-details">
                      {/* Answer comparison */}
                      <div className="answer-comparison">
                        <div className="answer-col yours">
                          <span className="answer-label">YOUR ANSWER</span>
                          <p className="answer-text">{snap.candidateAnswer || review.your_answer_summary || "(No response)"}</p>
                        </div>
                        <div className="answer-divider">VS</div>
                        <div className="answer-col ideal">
                          <span className="answer-label" style={{ color: "var(--mint)" }}>CORRECT ANSWER</span>
                          <p className="answer-text" style={{ color: "var(--t2)" }}>
                            {snap.idealAnswer || review.correct_answer_summary || "(Not available)"}
                          </p>
                        </div>
                      </div>

                      {/* Behavioral observations */}
                      <div className="q-observations">
                        {review.emotion_observation && (
                          <div className="q-obs-item">
                            <span className="q-obs-icon">{EMOTION_ICONS[emotion]}</span>
                            <div>
                              <span className="q-obs-label">EMOTION</span>
                              <p className="q-obs-text">{review.emotion_observation}</p>
                            </div>
                          </div>
                        )}
                        {review.posture_observation && (
                          <div className="q-obs-item">
                            <span className="q-obs-icon">🧘</span>
                            <div>
                              <span className="q-obs-label">POSTURE</span>
                              <p className="q-obs-text">{review.posture_observation}</p>
                            </div>
                          </div>
                        )}
                        {review.screen_exit_note && (
                          <div className="q-obs-item">
                            <span className="q-obs-icon">📱</span>
                            <div>
                              <span className="q-obs-label">SCREEN PRESENCE</span>
                              <p className="q-obs-text">{review.screen_exit_note}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Improvement tip */}
                      {review.improvement_tip && (
                        <div className="insight-recommendation">
                          <span className="rec-label">💡 IMPROVEMENT TIP</span>
                          <p className="rec-text">{review.improvement_tip}</p>
                        </div>
                      )}

                      {/* Stats bar */}
                      <div className="q-stats-bar">
                        <div className="q-stat"><span className="q-stat-label">BLINKS</span><span className="q-stat-val">{snap.blinkCount || 0}</span></div>
                        <div className="q-stat"><span className="q-stat-label">GAZE AWAY</span><span className="q-stat-val">{snap.gazeAwayCount || 0}</span></div>
                        <div className="q-stat"><span className="q-stat-label">FILLERS</span><span className="q-stat-val">{snap.fillerCount || 0}</span></div>
                        <div className="q-stat"><span className="q-stat-label">DURATION</span><span className="q-stat-val">{snap.answerDuration || 0}s</span></div>
                        <div className="q-stat"><span className="q-stat-label">POSTURE</span><span className="q-stat-val">{snap.postureSnapshot?.avg_angle || 0}°</span></div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* ── COACHING SECTIONS ── */}
          <div className="mentor-coaching-grid">
            {mentorData.emotional_coaching && (
              <motion.div className="mentor-coaching-card"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <span className="coaching-icon">🧠</span>
                <span className="coaching-title">EMOTIONAL INTELLIGENCE</span>
                <p className="coaching-body">{mentorData.emotional_coaching}</p>
              </motion.div>
            )}
            {mentorData.body_language_coaching && (
              <motion.div className="mentor-coaching-card"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <span className="coaching-icon">🧘</span>
                <span className="coaching-title">BODY LANGUAGE</span>
                <p className="coaching-body">{mentorData.body_language_coaching}</p>
              </motion.div>
            )}
            {mentorData.technical_coaching && (
              <motion.div className="mentor-coaching-card"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <span className="coaching-icon">⚡</span>
                <span className="coaching-title">TECHNICAL KNOWLEDGE</span>
                <p className="coaching-body">{mentorData.technical_coaching}</p>
              </motion.div>
            )}
          </div>

          {/* ── PRIORITY ACTIONS ── */}
          {mentorData.priority_actions && mentorData.priority_actions.length > 0 && (
            <motion.div className="mentor-insight-card summary" style={{ marginTop: "16px" }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div className="insight-header">
                <span className="insight-icon">🎯</span>
                <span className="insight-title">TOP 3 PRIORITY ACTIONS</span>
              </div>
              <div className="priority-actions-list">
                {mentorData.priority_actions.map((action, i) => (
                  <div key={i} className="priority-action-item">
                    <span className="priority-num display acid">{String(i + 1).padStart(2, "0")}</span>
                    <p className="priority-text">{action}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ENCOURAGEMENT ── */}
          {mentorData.encouragement && (
            <motion.div className="mentor-encouragement"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <span className="encouragement-icon">💪</span>
              <p className="encouragement-text">"{mentorData.encouragement}"</p>
            </motion.div>
          )}

          {/* ── EMOTION DISTRIBUTION CHART ── */}
          {emotionAnalytics.emotion_distribution && (
            <motion.div
              className="mentor-emotion-chart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
            >
              <span className="chip" style={{ color: "#a855f7", borderColor: "rgba(168,85,247,0.3)", marginBottom: "12px" }}>
                SESSION EMOTION SPECTRUM
              </span>
              <div className="emotion-dist-bars">
                {["happy", "neutral", "sad", "angry", "surprised", "fearful", "disgusted"].map((emo) => {
                  const pct = emotionAnalytics.emotion_distribution[emo] || 0
                  return (
                    <div key={emo} className="emotion-dist-row">
                      <span className="emo-dist-icon">{EMOTION_ICONS[emo]}</span>
                      <span className="emo-dist-name mono">{emo.toUpperCase()}</span>
                      <div className="emo-dist-track">
                        <motion.div
                          className="emo-dist-fill"
                          style={{
                            background: EMOTION_COLORS[emo],
                            boxShadow: pct > 20 ? `0 0 10px ${EMOTION_COLORS[emo]}40` : "none",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                        />
                      </div>
                      <span className="emo-dist-pct display" style={{ color: pct > 20 ? EMOTION_COLORS[emo] : "var(--t3)" }}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── FOOTER ACTIONS ── */}
          <div className="mentor-footer">
            <button className="btn btn-acid" onClick={onRetry} style={{ fontSize: "0.9rem", padding: "14px 40px" }}>
              ATTEMPT AGAIN →
            </button>
          </div>
        </main>
      )}
    </div>
  )
}

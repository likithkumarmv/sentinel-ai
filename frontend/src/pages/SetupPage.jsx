import { useState, useEffect } from "react"
import axios from "axios"
import { getMaxQuestions } from "../data/questions"
import useInterviewStore from "../stores/interviewStore"
import "./SetupPage.css"

const DIFFICULTIES = [
  { value:"intern",  label:"01 — INTERN",           sub:"Guided and Friendly",         color:"var(--mint)",  threat:"LOW" },
  { value:"junior",  label:"02 — JUNIOR",            sub:"Moderate Pressure",          color:"var(--ice)",   threat:"MODERATE" },
  { value:"mid",     label:"03 — MID-LEVEL",         sub:"Challenging. Defend your answers.",color:"var(--amber)", threat:"HIGH" },
  { value:"senior",  label:"04 — SENIOR ENGINEER",   sub:"Hostile. Expect interruptions.",   color:"var(--blood)", threat:"CRITICAL" },
  { value:"lead",    label:"05 — TECH LEAD",         sub:"Brutal. Most candidates fail.",color:"#ff0055",    threat:"EXTREME" },
]

const TOPICS = [
  { value:"python",       label:"PYTHON",       icon:"⬡", desc:"OOP · Algorithms · Memory · Decorators" },
  { value:"c_programming",label:"C LANGUAGE",   icon:"⬢", desc:"Pointers · Memory · Systems · Undefined Behavior" },
]

export default function SetupPage({ onStart }) {
  const [name, setName]           = useState("")
  const [topic, setTopic]         = useState("python")
  const [diff, setDiff]           = useState("intern")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [tick, setTick]           = useState(0)
  const [booted, setBooted]       = useState(false)
  const [loadStage, setLoadStage] = useState(0) // 0-3 for animated loading stages

  // ── NEW: Demo mode & question count ─────────────────
  const demoMode = true; // Forced offline mode
  const [questionCount, setQuestionCount] = useState(5)

  // ── NEW Track 3: Offline inference & personalities ──
  const localInference = false;
  const [personalityStyle, setPersonalityStyle] = useState("Standard Brutal")

  const storeSetDemoMode = useInterviewStore(s => s.setDemoMode)
  const storeSetQuestionCount = useInterviewStore(s => s.setQuestionCount)

  // Max available questions for current topic+difficulty
  const maxQ = getMaxQuestions(topic, diff)

  // Boot sequence effect
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 600)
    return () => clearTimeout(t)
  }, [])

  // Pre-check backend connectivity removed for complete offline mode.

  // Clock tick for the live clock display
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Loading stage animation
  useEffect(() => {
    if (!loading) { setLoadStage(0); return }
    const stages = [0, 1, 2, 3]
    let i = 0
    const t = setInterval(() => {
      i = Math.min(i + 1, stages.length - 1)
      setLoadStage(stages[i])
    }, 800)
    return () => clearInterval(t)
  }, [loading])

  // Clamp question count when topic/difficulty changes
  useEffect(() => {
    const newMax = getMaxQuestions(topic, diff)
    let newCount = questionCount
    if (newCount > newMax) newCount = newMax
    if (newCount < 2) newCount = 2
    if (newCount !== questionCount) setQuestionCount(newCount)
  }, [topic, diff, questionCount])

  const now = new Date()
  const timeStr = now.toTimeString().slice(0, 8)
  const dateStr = now.toLocaleDateString("en-GB").replace(/\//g, ".")

  const selectedDiff  = DIFFICULTIES.find(d => d.value === diff)
  const selectedTopic = TOPICS.find(t => t.value === topic)

  const LOAD_STAGES = [
    "CONNECTING TO PANEL",
    "BRIEFING AGENTS",
    "GENERATING QUESTIONS",
    "ENTERING BOARDROOM"
  ]

  async function handleStart() {
    setLoading(true); setError(null)

    // Persist config to store
    storeSetDemoMode(demoMode)
    storeSetQuestionCount(questionCount)

    if (demoMode) {
      // ── DEMO MODE: Skip backend, use local question bank ──
      const { getQuestions } = await import("../data/questions")
      const questions = getQuestions(topic, diff, questionCount)
      const demoData = {
        success: true,
        session_id: `demo_${Date.now()}`,
        user_name: name || "DEMO_USER",
        topic,
        difficulty: diff,
        opening_statement: `Welcome to Demo Mode. You have ${questionCount} questions on ${topic.replace("_", " ")}. Timer is active. Let's begin.`,
        first_question: {
          id: questions[0].id,
          text: questions[0].question,
          asked_by: "architect",
          question_number: 1,
        },
        total_questions: questions.length,
        all_questions: questions,
        demo: true,
        question_count: questionCount,
      }
      setTimeout(() => {
        setLoading(false)
        onStart(demoData)
      }, 1200) // Brief loading animation
      return
    }

    try {
      const res = await axios.post("http://localhost:8000/api/interview/start", {
        user_name: name || "ANONYMOUS",
        topic, difficulty: diff,
        question_count: questionCount,
        local_inference: localInference,
        personality_style: personalityStyle
      }, { timeout: 60000 })
      onStart(res.data)
    } catch(e) {
      if (e.code === "ECONNABORTED") {
        setError("REQUEST TIMED OUT — Check if Ollama is running.")
      } else {
        setError(e.response?.data?.detail || "BACKEND OFFLINE — Run the command: python main.py")
      }
      setLoading(false)
    }
  }

  return (
    <div className={`setup-root ${booted ? "booted" : ""}`}>
      <div className="scanline" />

      {/* ── TOP STATUS BAR ── */}
      <div className="status-bar">
        <span className="mono dim" style={{fontSize:"0.65rem",letterSpacing:"0.15em"}}>SENTINEL//AI v2.0.0</span>
        <div className="status-center">
          <span className="status-dot online" />
          <span className="mono" style={{fontSize:"0.65rem",color: "var(--mint)",letterSpacing:"0.12em"}}>
            OFFLINE MODE ACTIVE
          </span>
        </div>
        <span className="mono dim" style={{fontSize:"0.65rem",letterSpacing:"0.1em"}}>{dateStr} · {timeStr}</span>
      </div>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg-grid" />

        <div className="hero-left" style={{animationDelay:"0.1s"}}>
          <span className="chip acid" style={{marginBottom:"20px"}}>MULTI-AGENT INTERVIEW SYSTEM</span>

          <h1 className="hero-title anim-flicker">
            SENTINEL
            <br />
            <span className="acid glow-acid">AI</span>
          </h1>

          <p className="hero-tagline mono">
            HIGH-STAKES VIRTUAL BOARDROOM<br/>
            <span className="dim">BRUTAL · UNFILTERED · PRECISE</span><br/>
            <span className="dim" style={{ marginTop: "10px", display: "inline-block", color: "var(--mint)" }}>MADE BY LIKITH</span>
          </p>

          {/* Three agents preview */}
          <div className="agents-strip">
            {[
              {icon:"⚡", name:"THE ARCHITECT", role:"Technical Griller",    color:"var(--ice)"},
              {icon:"◉",  name:"THE OBSERVER",  role:"Kinematic Analyst",   color:"#a855f7"},
              {icon:"▣",  name:"THE MANAGER",   role:"Communication Judge",  color:"var(--amber)"},
            ].map((a, i) => (
              <div key={a.name} className="agent-strip-card" style={{"--ac": a.color, animationDelay:`${0.3 + i*0.1}s`}}>
                <span className="agent-strip-icon">{a.icon}</span>
                <div>
                  <div className="mono" style={{fontSize:"0.7rem", fontWeight:600, color: a.color, letterSpacing:"0.1em"}}>{a.name}</div>
                  <div className="mono dim" style={{fontSize:"0.6rem", letterSpacing:"0.1em"}}>{a.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONFIG PANEL ── */}
        <div className="config-panel bracket-card anim-up" style={{animationDelay:"0.2s"}}>
          <div className="bc-bl" /><div className="bc-br" />

          <div className="panel-head">
            <span className="chip acid">INITIALIZE SESSION</span>
            <div className="panel-live">
              <span className="status-dot online" />
              <span className="mono" style={{fontSize:"0.6rem", color:"var(--mint)"}}>PANEL READY</span>
            </div>
          </div>

          {/* ── ROW 1: CANDIDATE ID ── */}
          <div className="inline-fields-row">
            {/* Candidate ID */}
            <div className="field-group" style={{width: "100%"}}>
              <label className="field-label mono">CANDIDATE ID</label>
              <input
                className="field"
                placeholder="Name or blank"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          <span className="mono" style={{fontSize:"0.52rem", color:"var(--mint)", letterSpacing:"0.08em", marginTop:"-8px", display:"block"}}>
            OFFLINE MODE ENABLED: No backend required. All evaluation is local.
          </span>

          {/* ── ROW 2: INTERVIEW DOMAIN ── */}
          <div className="inline-fields-row">
            {/* Interview Domain (Topic) */}
            <div className="field-group" style={{width: "100%"}}>
              <label className="field-label mono">INTERVIEW DOMAIN</label>
              <div className="topic-grid">
                {TOPICS.map(t => (
                  <button
                    key={t.value}
                    className={`topic-btn ${topic===t.value?"active":""}`}
                    onClick={() => setTopic(t.value)}
                    type="button"
                  >
                    <span className="topic-name display">{t.label.replace(" LANGUAGE", " LANG")}</span>
                    <span className="topic-desc mono">{t.value === "python" ? "OOP/Memory" : "Pointers/Sys"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── ROW 3: BOARDROOM PERSONALITY ── */}
          <div className="field-group">
            <label className="field-label mono">BOARDROOM PERSONALITY</label>
            <div className="personality-grid">
              {[
                {
                  value: "Standard Brutal",
                  label: "BRUTAL",
                  desc: "Cold, analytical, zero patience.",
                  icon: "💀",
                  color: "var(--blood)",
                  bg: "rgba(239, 68, 68, 0.06)"
                },
                {
                  value: "Soft & Encouraging",
                  label: "COACHING",
                  desc: "Empathetic, warm, mentoring.",
                  icon: "🌱",
                  color: "var(--mint)",
                  bg: "var(--acid-trace)"
                },
                {
                  value: "Hyper-Technical Deep",
                  label: "HYPER-CS",
                  desc: "Pedantic focus on low-level performance.",
                  icon: "🧠",
                  color: "var(--ice)",
                  bg: "rgba(0, 243, 255, 0.06)"
                }
              ].map(p => (
                <button
                  key={p.value}
                  className={`personality-card ${personalityStyle === p.value ? "active" : ""}`}
                  style={{ "--pc": p.color, "--pb": p.bg }}
                  onClick={() => setPersonalityStyle(p.value)}
                  type="button"
                  title={p.desc}
                >
                  <div className="personality-header">
                    <span className="personality-icon">{p.icon}</span>
                    <span className="personality-title display">{p.label}</span>
                  </div>
                  <span className="personality-desc mono">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── ROW 4: PRESSURE LEVEL ── */}
          <div className="field-group">
            <label className="field-label mono">PRESSURE LEVEL</label>
            <div className="diff-list">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  className={`diff-btn ${diff===d.value?"active":""}`}
                  style={{"--dc": d.color}}
                  onClick={() => setDiff(d.value)}
                  type="button"
                >
                  <span className="diff-bullet" />
                  <span className="diff-label display">{d.value.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── ROW 5: QUESTION COUNT SELECTOR ── */}
          <div className="field-group">
            <div className="qcount-header-row">
              <label className="field-label mono">QUESTION COUNT</label>
              <div className="qcount-display-inline">
                <span className="display acid qcount-value-inline">{String(questionCount).padStart(2, "0")}</span>
                <span className="mono dim qcount-avail">/ {String(maxQ).padStart(2, "0")} AVAILABLE</span>
              </div>
            </div>
            <div className="qcount-container">
              <input
                type="range"
                className="qcount-slider"
                min={2}
                max={Math.max(2, maxQ)}
                value={questionCount}
                onChange={e => setQuestionCount(parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* ── ROW 6: SCI-FI THREAT READOUT & DIFFICULTY DESCRIPTION ── */}
          <div className="threat-readout-container">
            <div className="threat-readout">
              <span className="mono dim" style={{fontSize:"0.6rem"}}>THREAT LEVEL</span>
              <span className="mono" style={{fontSize:"0.6rem", color: selectedDiff?.color, letterSpacing:"0.12em", fontWeight: 600}}>{selectedDiff?.threat}</span>
              <div className="bar-track" style={{flex:1, margin:"0 10px"}}>
                <div className="bar-fill" style={{
                  width: `${["intern","junior","mid","senior","lead"].indexOf(diff)*25}%`,
                  background: selectedDiff?.color
                }} />
              </div>
              <span className="mono dim" style={{fontSize:"0.6rem"}}>{selectedTopic?.label.replace(" LANGUAGE", " LANG")}</span>
            </div>
            <div className="diff-desc-readout mono">
              <span className="desc-arrow" style={{color: selectedDiff?.color}}>▶</span>
              <span className="desc-title" style={{color: selectedDiff?.color, marginLeft:"4px"}}>{selectedDiff?.label}: </span>
              <span className="desc-sub">{selectedDiff?.sub}</span>
            </div>
          </div>

          {error && (
            <div className="error-box">
              <span className="chip blood">ERROR</span>
              <span className="mono" style={{fontSize:"0.8rem", color:"var(--blood)"}}>{error}</span>
            </div>
          )}

          <button
            className="btn btn-acid start-btn"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-row">
                <span className="spinner" />
                {LOAD_STAGES[loadStage]}
              </span>
            ) : "ENTER THE BOARDROOM"}
          </button>

          <p className="warn-text mono">
            ⚠ ZERO SUGAR-COATING. UNFILTERED EVALUATION AHEAD.
          </p>
        </div>
      </section>

      {/* ── BOTTOM METRICS BAR ── */}
      <div className="metrics-bar">
        {[
          {label:"AI AGENTS",   value:"03"},
          {label:"DIFFICULTY",  value: diff.toUpperCase()},
          {label:"QUESTIONS",   value: String(questionCount).padStart(2, "0")},
          {label:"TIME/Q",      value:"60s"},
          {label:"DOMAIN",      value: topic==="python"?"PYTHON":"C LANG"},
        ].map(m => (
          <div key={m.label} className="metric-item">
            <span className="mono dim" style={{fontSize:"0.6rem", letterSpacing:"0.15em"}}>{m.label}</span>
            <span className="display acid" style={{fontSize:"1.4rem"}}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

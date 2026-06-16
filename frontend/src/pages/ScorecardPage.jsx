import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { jsPDF } from "jspdf"
import axios from "axios"
import { generateSessionTips } from "../utils/answerEvaluator"
import { getCompleteSessionData } from "../utils/interviewStorage"
import "./ScorecardPage.css"

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

const HIRE_MAP = {
  "STRONG HIRE": { color: "var(--mint)", bg: "rgba(0,255,157,0.06)", glow: "0 0 60px rgba(0,255,157,0.3)" },
  "HIRE":        { color: "var(--acid)", bg: "rgba(200,255,0,0.05)", glow: "0 0 60px rgba(200,255,0,0.2)" },
  "BORDERLINE":  { color: "var(--amber)", bg: "rgba(255,170,0,0.05)", glow: "0 0 60px rgba(255,170,0,0.2)" },
  "NO HIRE":     { color: "var(--blood)", bg: "rgba(255,26,60,0.06)", glow: "0 0 60px rgba(255,26,60,0.2)" },
  "DEFINITE NO": { color: "#ff0055", bg: "rgba(255,0,85,0.08)", glow: "0 0 60px rgba(255,0,85,0.3)" },
}

function generatePDF(data, voiceEval = null, biometricData = null, mentorFeedback = null) {
  if (!data || !data.scores || !data.verdict) {
    alert("Cannot generate PDF — evaluation data is incomplete.")
    return
  }
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const W = 210, M = 18
  let y = 20

  const questionSnapshots = biometricData?.questionSnapshots || []
  const totalScreenExits = biometricData?.totalScreenExits || data?.kinematic_analytics?.screen_exit_count || 0
  const totalGazeAway = biometricData?.totalGazeAway || data?.kinematic_analytics?.gaze_away_count || 0

  // ── Helper: Add Page Header ────────────────────────
  const addHeader = (title) => {
    doc.setFillColor(10, 15, 28); doc.rect(0, 0, W, 25, "F")
    doc.setTextColor(200, 255, 0); doc.setFontSize(14); doc.setFont("helvetica", "bold")
    doc.text("SENTINEL AI", M, 12)
    doc.setTextColor(140, 150, 170); doc.setFontSize(8); doc.setFont("helvetica", "normal")
    doc.text(title, M, 18)
    doc.text(`Session ID: ${data.session_id || "N/A"}`, W - M, 18, { align: "right" })
    doc.setDrawColor(30, 40, 60); doc.line(M, 22, W - M, 22)
    return 35
  }

  // ── PAGE 1: EXECUTIVE SUMMARY ──────────────────────
  doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F")
  
  // Title Section
  doc.setTextColor(200, 255, 0); doc.setFontSize(28); doc.setFont("helvetica", "bold")
  doc.text("JOB-LEVEL EVALUATION", M, 40)
  doc.setFontSize(10); doc.setTextColor(140, 150, 170); doc.setFont("helvetica", "normal")
  doc.text("High-Fidelity Multi-Agent Behavioral & Technical Analysis", M, 48)
  doc.text(`Generated: ${new Date().toLocaleString()}`, M, 53)

  const decision = data?.verdict?.hire_decision || "BORDERLINE"
  const overall = data?.scores?.overall || 0
  
  // Decision Card
  y = 65
  doc.setFillColor(15, 20, 35); doc.rect(M, y, W - M * 2, 40, "F")
  doc.setDrawColor(200, 255, 0); doc.setLineWidth(0.5); doc.rect(M, y, W - M * 2, 40, "S")
  
  doc.setTextColor(200, 255, 0); doc.setFontSize(12); doc.text("OFFICIAL PANEL VERDICT", M + 8, y + 12)
  doc.setFontSize(32); doc.text(decision, M + 8, y + 28)
  
  doc.setFontSize(42); doc.text(`${overall.toFixed(1)}`, W - M - 25, y + 28, { align: "right" })
  doc.setFontSize(12); doc.setTextColor(100, 110, 130); doc.text("/ 10", W - M - 12, y + 28, { align: "right" })
  y += 50

  // One-liner
  if (data?.verdict?.one_line_verdict) {
    doc.setTextColor(220, 220, 230); doc.setFontSize(11); doc.setFont("helvetica", "italic")
    const lines = doc.splitTextToSize(`"${data.verdict.one_line_verdict}"`, W - M * 2 - 10)
    doc.text(lines, M + 5, y); y += lines.length * 6 + 10
  }

  // Score Breakdown
  doc.setTextColor(200, 255, 0); doc.setFontSize(14); doc.setFont("helvetica", "bold")
  doc.text("CORE COMPETENCY SCORES", M, y); y += 10
  
  const cats = [
    { label: "Technical Proficiency (The Architect)", score: data?.scores?.technical || 0, color: [0, 255, 157], weight: "50%" },
    { label: "Kinematic Presence (The Observer)", score: data?.scores?.behavioral || 0, color: [168, 85, 247], weight: "25%" },
    { label: "Communication Strategy (The Manager)", score: data?.scores?.communication || 0, color: [255, 170, 0], weight: "25%" },
  ]
  
  cats.forEach(c => {
    doc.setFillColor(20, 25, 45); doc.rect(M, y, W - M * 2, 18, "F")
    doc.setTextColor(200, 200, 210); doc.setFontSize(9); doc.setFont("helvetica", "bold")
    doc.text(c.label.toUpperCase(), M + 5, y + 7)
    doc.setTextColor(c.color[0], c.color[1], c.color[2]); doc.setFontSize(14)
    doc.text(`${c.score.toFixed(1)}`, W - M - 5, y + 10, { align: "right" })
    
    // Bar
    doc.setFillColor(30, 35, 55); doc.rect(M + 5, y + 11, W - M * 2 - 25, 3, "F")
    doc.setFillColor(c.color[0], c.color[1], c.color[2]); doc.rect(M + 5, y + 11, (W - M * 2 - 25) * (c.score / 10), 3, "F")
    y += 22
  })

  // ── PAGE 2: EMOTION & BIOMETRICS ───────────────────
  doc.addPage(); y = 20
  doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F")
  y = addHeader("EMOTIONAL INTELLIGENCE & KINEMATIC STRESS ANALYSIS")

  if (data?.emotion_analytics) {
    const ea = data.emotion_analytics
    doc.setTextColor(200, 255, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold")
    doc.text("EMOTION SPECTRUM REPORT", M, y); y += 10
    
    // Stats Grid
    const eStats = [
      { l: "Dominant", v: (ea.session_dominant_emotion || "neutral").toUpperCase() },
      { l: "Stability", v: `${(ea.emotion_stability || 0).toFixed(1)}%` },
      { l: "Composure", v: `${(ea.emotion_composure_score || 0).toFixed(1)}/10` },
      { l: "Volatility", v: ea.emotion_changes > 10 ? "HIGH" : "STABLE" }
    ]
    
    doc.setFillColor(15, 20, 35); doc.rect(M, y, W - M * 2, 20, "F")
    eStats.forEach((s, i) => {
      const x = M + 8 + (i * ((W - M * 2) / 4))
      doc.setTextColor(140, 150, 170); doc.setFontSize(7); doc.text(s.l.toUpperCase(), x, y + 7)
      doc.setTextColor(200, 255, 0); doc.setFontSize(11); doc.text(s.v, x, y + 14)
    })
    y += 30

    // Emotion Distribution
    const dist = ea.emotion_distribution || {}
    const emos = ["happy", "neutral", "sad", "angry", "surprised", "fearful", "disgusted"]
    const eCols = { happy: [0,255,157], neutral:[139,149,165], sad:[74,158,255], angry:[255,26,60], surprised:[200,255,0], fearful:[168,85,247], disgusted:[255,107,0] }
    
    doc.setTextColor(140, 150, 170); doc.setFontSize(9); doc.text("SESSION EMOTION DISTRIBUTION", M, y); y += 8
    emos.forEach(e => {
      const p = dist[e] || 0
      const bw = W - M * 2 - 50
      doc.setTextColor(200, 200, 210); doc.setFontSize(8); doc.text(e.toUpperCase(), M, y + 4)
      doc.setFillColor(20, 25, 45); doc.rect(M + 30, y, bw, 6, "F")
      const rgb = eCols[e] || [200,255,0]
      doc.setFillColor(rgb[0], rgb[1], rgb[2]); doc.rect(M + 30, y, bw * (p / 100), 6, "F")
      doc.setTextColor(rgb[0], rgb[1], rgb[2]); doc.text(`${p.toFixed(1)}%`, M + 35 + bw, y + 4)
      y += 10
    })
    y += 10
  }

  if (data?.kinematic_analytics) {
    const ka = data.kinematic_analytics
    doc.setTextColor(200, 255, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold")
    doc.text("BIOMECHANICAL STRESS METRICS", M, y); y += 10
    
    const kStats = [
      { l: "Avg Blink Rate", v: `${ka.avg_blink_rate?.toFixed(1) || 0} /min` },
      { l: "Peak Angular Vel", v: `${ka.peak_angular_velocity || 0} deg/s` },
      { l: "Total Stress Spikes", v: `${ka.total_stress_spikes || 0}` },
      { l: "Flexion Time", v: `${ka.total_flexion_seconds?.toFixed(1) || 0}s` }
    ]
    
    doc.setFillColor(15, 20, 35); doc.rect(M, y, W - M * 2, 20, "F")
    kStats.forEach((s, i) => {
      const x = M + 8 + (i * ((W - M * 2) / 4))
      doc.setTextColor(140, 150, 170); doc.setFontSize(7); doc.text(s.l.toUpperCase(), x, y + 7)
      doc.setTextColor(200, 255, 0); doc.setFontSize(11); doc.text(s.v, x, y + 14)
    })
    y += 35
    
    doc.setTextColor(140, 150, 170); doc.setFontSize(9); doc.setFont("helvetica", "italic")
    const analysis = ka.total_stress_spikes > 10 
      ? "Significant kinematic stress detected. Candidate shows high biomechanical reactivity during technical questioning."
      : "Baseline kinematic stability within normal parameters. Minimal stress-induced movement observed.";
    const alines = doc.splitTextToSize(analysis, W - M * 2)
    doc.text(alines, M, y); y += alines.length * 5 + 15
  }

  // ── PAGE 3: QUESTION BREAKDOWN ─────────────────────
  doc.addPage(); y = 20
  doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F")
  y = addHeader("DETAILED QUESTION-BY-QUESTION ANALYSIS")

  // Merge snapshots with questions_summary for richer data
  const mergedQuestions = (data?.questions_summary || []).map((q, i) => {
    const snap = questionSnapshots[i] || {}
    return {
      question: snap.questionText || q.question || "",
      answer: snap.candidateAnswer || q.answer || "",
      ideal_answer: snap.idealAnswer || q.ideal_answer || "",
      score: snap.score || q.score || 0,
      dominant_emotion: snap.emotionSummary?.dominant_emotion || q.dominant_emotion || "neutral",
      emotion_stability: snap.emotionSummary?.stability_score || q.emotion_stability || 100,
      screenExits: snap.screenExits || 0,
      gazeAwayCount: snap.gazeAwayCount || 0,
      blinkCount: snap.blinkCount || 0,
      postureAngle: snap.postureSnapshot?.avg_angle || 0,
      postureStatus: snap.postureSnapshot?.worst_status || "GOOD",
      fillerCount: snap.fillerCount || 0,
      answerDuration: snap.answerDuration || 0,
      // Keyword analysis fields
      expected_keywords: snap.expectedKeywords || q.expected_keywords || [],
      matched_keywords: snap.matchedKeywords || q.matched_keywords || [],
      missing_keywords: snap.missingKeywords || q.missing_keywords || [],
      keyword_match_pct: snap.keywordMatchPct || q.keyword_match_pct || 0,
      verdict: snap.verdict || q.verdict || "",
      accuracy: snap.accuracy || q.accuracy || "",
      tip: snap.tip || q.tip || "",
    }
  })

  if (mergedQuestions.length) {
    mergedQuestions.forEach((q, i) => {
      if (y > 215) { doc.addPage(); doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F"); y = addHeader("DETAILED QUESTION-BY-QUESTION ANALYSIS") }
      
      const sc = q.score || 0
      doc.setFillColor(15, 20, 35); doc.rect(M, y, W - M * 2, 10, "F")
      doc.setTextColor(140, 150, 170); doc.setFontSize(9); doc.setFont("helvetica", "bold")
      doc.text(`QUESTION ${i + 1}`, M + 4, y + 7)
      // Verdict badge
      const vrd = q.verdict || ""
      if (vrd) {
        const vColor = vrd === "CORRECT" ? [0,255,157] : vrd === "PARTIAL" ? [255,170,0] : [255,60,80]
        doc.setTextColor(vColor[0], vColor[1], vColor[2]); doc.setFontSize(7)
        doc.text(vrd, W/2, y + 7, { align: "center" })
      }
      doc.setTextColor(sc >= 7 ? 0 : sc >= 5 ? 255 : 255, sc >= 7 ? 255 : sc >= 5 ? 170 : 60, sc >= 7 ? 157 : sc >= 5 ? 0 : 80)
      doc.setFontSize(9)
      doc.text(`SCORE: ${sc.toFixed(1)}/10`, W - M - 4, y + 7, { align: "right" })
      
      // Behavioral badges row
      doc.setTextColor(120, 130, 150); doc.setFontSize(6.5)
      const badges = `EMOTION: ${q.dominant_emotion.toUpperCase()}  |  KEYWORDS: ${q.keyword_match_pct}%  |  EXITS: ${q.screenExits}  |  GAZE: ${q.gazeAwayCount}  |  POSTURE: ${q.postureAngle}\u00B0 ${q.postureStatus}  |  FILLERS: ${q.fillerCount}`
      doc.text(badges, M + 4, y + 14)
      y += 19
      
      doc.setTextColor(230, 230, 240); doc.setFontSize(9); doc.setFont("helvetica", "bold")
      const qText = doc.splitTextToSize(q.question, W - M * 2 - 10)
      doc.text(qText, M + 5, y); y += qText.length * 5 + 3
      
      // YOUR ANSWER
      doc.setTextColor(255, 170, 0); doc.setFontSize(7); doc.setFont("helvetica", "bold")
      doc.text("YOUR ANSWER:", M + 8, y); y += 5
      doc.setTextColor(160, 170, 190); doc.setFontSize(8); doc.setFont("helvetica", "normal")
      const aText = doc.splitTextToSize(q.answer || "(No response recorded)", W - M * 2 - 15)
      doc.text(aText, M + 8, y); y += aText.length * 4.5 + 4
      
      // CORRECT/IDEAL ANSWER
      if (q.ideal_answer) {
        doc.setFillColor(10, 30, 20); doc.rect(M + 8, y, W - M * 2 - 16, 2, "F")
        y += 5
        doc.setTextColor(0, 255, 157); doc.setFontSize(7); doc.setFont("helvetica", "bold")
        doc.text("CORRECT / IDEAL ANSWER:", M + 10, y); y += 4
        doc.setTextColor(140, 180, 160); doc.setFontSize(7.5); doc.setFont("helvetica", "normal")
        const iText = doc.splitTextToSize(q.ideal_answer, W - M * 2 - 25)
        doc.text(iText, M + 12, y); y += iText.length * 3.8 + 4
      } else {
        y += 3
      }

      // KEYWORD ANALYSIS
      if (q.expected_keywords && q.expected_keywords.length > 0) {
        if (y > 240) { doc.addPage(); doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F"); y = addHeader("DETAILED QUESTION-BY-QUESTION ANALYSIS") }
        doc.setTextColor(200, 255, 0); doc.setFontSize(6.5); doc.setFont("helvetica", "bold")
        doc.text(`KEYWORD MATCH (${q.keyword_match_pct}%):`, M + 10, y); y += 4
        // Show matched keywords with checkmark
        const matched = (q.matched_keywords || []).map(k => `[OK] ${k}`)
        const missing = (q.missing_keywords || []).map(k => `[X] ${k}`)
        if (matched.length > 0) {
          doc.setTextColor(0, 200, 120); doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
          const mText = doc.splitTextToSize(matched.join("  |  "), W - M * 2 - 30)
          doc.text(mText, M + 12, y); y += mText.length * 3.5 + 1
        }
        if (missing.length > 0) {
          doc.setTextColor(255, 80, 100); doc.setFontSize(6.5); doc.setFont("helvetica", "normal")
          const xText = doc.splitTextToSize(missing.join("  |  "), W - M * 2 - 30)
          doc.text(xText, M + 12, y); y += xText.length * 3.5 + 1
        }
        y += 2
      }

      // IMPROVEMENT TIP
      if (q.tip) {
        doc.setTextColor(168, 85, 247); doc.setFontSize(6.5); doc.setFont("helvetica", "italic")
        const tipText = doc.splitTextToSize(`TIP: ${q.tip}`, W - M * 2 - 25)
        doc.text(tipText, M + 10, y); y += tipText.length * 3.5 + 3
      }
      y += 4
    })
  }

  // ── PAGE 4: IMPROVEMENT PLAN ───────────────────────
  doc.addPage(); y = 20
  doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F")
  y = addHeader("IMPROVEMENT STRATEGY & ACTION PLAN")

  const v = data?.verdict || {}
  
  if (v.top_strength || v.critical_weakness) {
    doc.setTextColor(200, 255, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold")
    doc.text("KEY QUALITATIVE FINDINGS", M, y); y += 10
    
    if (v.top_strength) {
      doc.setFillColor(0, 255, 157, 0.1); doc.rect(M, y, W - M * 2, 18, "F")
      doc.setTextColor(0, 255, 157); doc.setFontSize(9); doc.text("PRIMARY DIFFERENTIATOR", M + 5, y + 7)
      doc.setTextColor(200, 210, 200); doc.setFontSize(9); doc.setFont("helvetica", "normal")
      const st = doc.splitTextToSize(v.top_strength, W - M * 2 - 15)
      doc.text(st, M + 5, y + 13); y += Math.max(25, st.length * 5 + 15)
    }
    
    if (v.critical_weakness) {
      doc.setFillColor(255, 60, 80, 0.1); doc.rect(M, y, W - M * 2, 18, "F")
      doc.setTextColor(255, 60, 80); doc.setFontSize(9); doc.text("CRITICAL EVALUATION GAP", M + 5, y + 7)
      doc.setTextColor(220, 200, 200); doc.setFontSize(9); doc.setFont("helvetica", "normal")
      const wk = doc.splitTextToSize(v.critical_weakness, W - M * 2 - 15)
      doc.text(wk, M + 5, y + 13); y += Math.max(25, wk.length * 5 + 15)
    }
  }

  if (v.action_plan) {
    doc.setTextColor(200, 255, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold")
    doc.text("PERSONALIZED DEVELOPMENT ROADMAP", M, y); y += 10
    
    const plan = Array.isArray(v.action_plan) ? v.action_plan : [v.action_plan]
    plan.forEach((step, idx) => {
      doc.setFillColor(25, 30, 50); doc.rect(M, y, W - M * 2, 20, "F")
      doc.setTextColor(200, 255, 0); doc.setFontSize(14); doc.text(`${idx + 1}`, M + 6, y + 12)
      doc.setTextColor(200, 210, 230); doc.setFontSize(9); doc.setFont("helvetica", "normal")
      const slines = doc.splitTextToSize(step, W - M * 2 - 25)
      doc.text(slines, M + 15, y + 8)
      y += 25
    })
  }

  // ── PAGE 5: SCREEN PRESENCE & FOCUS ────────────────
  if (totalScreenExits > 0 || totalGazeAway > 3) {
    // Add to current page if room, otherwise new page
    if (y > 240) { doc.addPage(); doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F"); y = addHeader("SCREEN PRESENCE ANALYSIS") }
    
    doc.setTextColor(200, 255, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold")
    doc.text("SCREEN PRESENCE & FOCUS ANALYSIS", M, y); y += 10

    doc.setFillColor(15, 20, 35); doc.rect(M, y, W - M * 2, 20, "F")
    const focusRating = totalScreenExits === 0 && totalGazeAway < 5 ? "EXCELLENT" : totalScreenExits < 3 ? "FAIR" : "POOR"
    const spItems = [
      { l: "Tab Switches", v: `${totalScreenExits}`, bad: totalScreenExits > 2 },
      { l: "Gaze-Away", v: `${totalGazeAway}`, bad: totalGazeAway > 10 },
      { l: "Focus Rating", v: focusRating, bad: focusRating === "POOR" },
    ]
    spItems.forEach((s, i) => {
      const x = M + 8 + (i * ((W - M * 2) / 3))
      doc.setTextColor(140, 150, 170); doc.setFontSize(7); doc.text(s.l.toUpperCase(), x, y + 7)
      doc.setTextColor(s.bad ? 255 : 200, s.bad ? 60 : 255, s.bad ? 80 : 0); doc.setFontSize(11)
      doc.text(s.v, x, y + 14)
    })
    y += 30
  }

  // ── PAGE 6: AI MENTOR INSIGHTS ─────────────────────
  if (mentorFeedback) {
    doc.addPage(); y = 20
    doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F")
    y = addHeader("AI MENTOR COACHING INSIGHTS")
    
    doc.setTextColor(168, 85, 247); doc.setFontSize(12); doc.setFont("helvetica", "bold")
    doc.text("PERSONALIZED MENTOR FEEDBACK", M, y); y += 12
    
    if (mentorFeedback.overall_impression) {
      doc.setTextColor(200, 210, 230); doc.setFontSize(9); doc.setFont("helvetica", "italic")
      const impLines = doc.splitTextToSize(`"${mentorFeedback.overall_impression}"`, W - M * 2 - 10)
      doc.text(impLines, M + 5, y); y += impLines.length * 5 + 10
    }

    const coachingSections = [
      { title: "EMOTIONAL INTELLIGENCE", text: mentorFeedback.emotional_coaching, color: [168, 85, 247] },
      { title: "BODY LANGUAGE", text: mentorFeedback.body_language_coaching, color: [0, 255, 157] },
      { title: "TECHNICAL KNOWLEDGE", text: mentorFeedback.technical_coaching, color: [200, 255, 0] },
      { title: "SCREEN PRESENCE", text: mentorFeedback.screen_presence_note, color: [255, 170, 0] },
    ]

    coachingSections.forEach(s => {
      if (!s.text || y > 260) return
      doc.setTextColor(s.color[0], s.color[1], s.color[2]); doc.setFontSize(9); doc.setFont("helvetica", "bold")
      doc.text(s.title, M + 5, y); y += 6
      doc.setTextColor(200, 200, 210); doc.setFontSize(8); doc.setFont("helvetica", "normal")
      const lines = doc.splitTextToSize(s.text, W - M * 2 - 15)
      doc.text(lines, M + 8, y); y += lines.length * 4.5 + 10
    })

    if (mentorFeedback.priority_actions && y < 250) {
      doc.setTextColor(200, 255, 0); doc.setFontSize(10); doc.setFont("helvetica", "bold")
      doc.text("TOP PRIORITY ACTIONS", M, y); y += 10
      mentorFeedback.priority_actions.forEach((action, idx) => {
        doc.setFillColor(25, 30, 50); doc.rect(M, y, W - M * 2, 16, "F")
        doc.setTextColor(200, 255, 0); doc.setFontSize(12); doc.text(`${idx + 1}`, M + 6, y + 10)
        doc.setTextColor(200, 210, 230); doc.setFontSize(8); doc.setFont("helvetica", "normal")
        const al = doc.splitTextToSize(action, W - M * 2 - 25)
        doc.text(al, M + 15, y + 7); y += 20
      })
    }

    if (mentorFeedback.encouragement && y < 270) {
      y += 5
      doc.setFillColor(20, 15, 35); doc.rect(M, y, W - M * 2, 20, "F")
      doc.setDrawColor(168, 85, 247); doc.setLineWidth(0.3); doc.rect(M, y, W - M * 2, 20, "S")
      doc.setTextColor(192, 132, 252); doc.setFontSize(9); doc.setFont("helvetica", "italic")
      const encLines = doc.splitTextToSize(`"${mentorFeedback.encouragement}"`, W - M * 2 - 15)
      doc.text(encLines, M + 5, y + 8)
    }
  }

  // ── PAGE 7: VOICE ANSWER EVALUATION ──────────────────
  if (voiceEval) {
    doc.addPage(); y = 20
    doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F")
    y = addHeader("VOICE ANSWER EVALUATION")
    
    doc.setTextColor(200, 255, 0); doc.setFontSize(12); doc.setFont("helvetica", "bold")
    doc.text("LATEST ANSWER ANALYSIS", M, y); y += 10
    
    const details = [
      { l: "Verdict", v: voiceEval.verdict },
      { l: "Score", v: `${voiceEval.score} / 10` },
      { l: "Accuracy", v: voiceEval.accuracy },
      { l: "Missing", v: voiceEval.missing },
      { l: "Tip", v: voiceEval.tip }
    ]
    
    details.forEach(d => {
      doc.setFillColor(15, 20, 35); doc.rect(M, y, W - M * 2, 22, "F")
      doc.setTextColor(0, 255, 157); doc.setFontSize(9); doc.setFont("helvetica", "bold")
      doc.text(d.l.toUpperCase(), M + 5, y + 7)
      
      doc.setTextColor(200, 210, 230); doc.setFontSize(9); doc.setFont("helvetica", "normal")
      const lines = doc.splitTextToSize(d.v || "N/A", W - M * 2 - 10)
      doc.text(lines, M + 5, y + 13)
      y += lines.length * 4.5 + 16
    })
  }

  // ── PAGE: NEXT INTERVIEW TIPS ────────────────────────
  const sessionTips = generateSessionTips(mergedQuestions.map(q => ({
    score: q.score,
    verdict: q.verdict,
    matchedKeywords: q.matched_keywords,
    missingKeywords: q.missing_keywords,
    fillerCount: q.fillerCount,
    answerDuration: q.answerDuration,
    dominantEmotion: q.dominant_emotion,
    postureSnapshot: { avg_angle: q.postureAngle },
    screenExits: q.screenExits,
    gazeAwayCount: q.gazeAwayCount,
    tip: q.tip,
  })))

  doc.addPage(); y = 20
  doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F")
  y = addHeader("NEXT INTERVIEW — PREPARATION GUIDE")

  // Stats summary bar
  doc.setFillColor(15, 20, 35); doc.rect(M, y, W - M * 2, 22, "F")
  const tipStats = [
    { l: "AVG SCORE", v: `${sessionTips.avgScore}/10` },
    { l: "CORRECT", v: `${sessionTips.correctCount}/${sessionTips.totalQuestions}` },
    { l: "NEED WORK", v: `${sessionTips.incorrectCount}` },
    { l: "EMOTION", v: (sessionTips.dominantEmotion || "neutral").toUpperCase() },
  ]
  tipStats.forEach((s, i) => {
    const x = M + 8 + (i * ((W - M * 2) / 4))
    doc.setTextColor(140, 150, 170); doc.setFontSize(7); doc.text(s.l, x, y + 7)
    doc.setTextColor(200, 255, 0); doc.setFontSize(11); doc.text(s.v, x, y + 16)
  })
  y += 30

  // Strengths
  if (sessionTips.strengths.length > 0) {
    doc.setTextColor(0, 255, 157); doc.setFontSize(10); doc.setFont("helvetica", "bold")
    doc.text("YOUR STRENGTHS", M, y); y += 8
    sessionTips.strengths.forEach(s => {
      doc.setFillColor(10, 30, 20); doc.rect(M + 2, y, W - M * 2 - 4, 12, "F")
      doc.setTextColor(140, 210, 170); doc.setFontSize(8); doc.setFont("helvetica", "normal")
      const sl = doc.splitTextToSize(s, W - M * 2 - 20)
      doc.text(sl, M + 8, y + 5); y += sl.length * 4.5 + 6
    })
    y += 5
  }

  // Weaknesses
  if (sessionTips.weaknesses.length > 0) {
    doc.setTextColor(255, 60, 80); doc.setFontSize(10); doc.setFont("helvetica", "bold")
    doc.text("AREAS TO IMPROVE", M, y); y += 8
    sessionTips.weaknesses.forEach(s => {
      doc.setFillColor(30, 15, 20); doc.rect(M + 2, y, W - M * 2 - 4, 12, "F")
      doc.setTextColor(220, 160, 160); doc.setFontSize(8); doc.setFont("helvetica", "normal")
      const sl = doc.splitTextToSize(s, W - M * 2 - 20)
      doc.text(sl, M + 8, y + 5); y += sl.length * 4.5 + 6
    })
    y += 5
  }

  // Tips
  doc.setTextColor(200, 255, 0); doc.setFontSize(10); doc.setFont("helvetica", "bold")
  doc.text("ACTIONABLE TIPS FOR NEXT TIME", M, y); y += 8
  sessionTips.overallTips.forEach((tip, idx) => {
    if (y > 260) { doc.addPage(); doc.setFillColor(5, 10, 20); doc.rect(0, 0, W, 297, "F"); y = addHeader("NEXT INTERVIEW — PREPARATION GUIDE") }
    doc.setFillColor(25, 30, 50); doc.rect(M, y, W - M * 2, 16, "F")
    doc.setTextColor(200, 255, 0); doc.setFontSize(12); doc.text(`${idx + 1}`, M + 6, y + 10)
    doc.setTextColor(200, 210, 230); doc.setFontSize(8); doc.setFont("helvetica", "normal")
    const tl = doc.splitTextToSize(tip, W - M * 2 - 25)
    doc.text(tl, M + 15, y + 6); y += Math.max(18, tl.length * 4.5 + 8)
  })
  y += 8

  // Emotion, Posture, Focus advice
  const adviceSections = [
    { title: "EMOTIONAL INTELLIGENCE", text: sessionTips.emotionAdvice, color: [168, 85, 247] },
    { title: "POSTURE & BODY LANGUAGE", text: sessionTips.postureAdvice, color: [0, 255, 157] },
    { title: "FOCUS & SCREEN PRESENCE", text: sessionTips.focusAdvice, color: [255, 170, 0] },
  ]
  adviceSections.forEach(a => {
    if (!a.text || y > 265) return
    doc.setTextColor(a.color[0], a.color[1], a.color[2]); doc.setFontSize(8); doc.setFont("helvetica", "bold")
    doc.text(a.title, M + 5, y); y += 5
    doc.setTextColor(200, 200, 210); doc.setFontSize(7.5); doc.setFont("helvetica", "normal")
    const al = doc.splitTextToSize(a.text, W - M * 2 - 15)
    doc.text(al, M + 8, y); y += al.length * 4 + 8
  })

  // ── FOOTER ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setTextColor(80, 90, 110); doc.setFontSize(7); doc.setFont("helvetica", "normal")
    doc.text(`SENTINEL AI — CONFIDENTIAL EVALUATION REPORT — PAGE ${i} OF ${pageCount}`, W / 2, 288, { align: "center" })
    doc.text("Proprietary Kinematic Stress Engine v2.0.0", W / 2, 292, { align: "center" })
  }

  doc.save(`SentinelAI_Evaluation_${data.session_id || "Report"}.pdf`)
}


export default function ScorecardPage({ data, onRetry, onMentor, biometricData, isPublicReadOnly = false }) {
  const [stage, setStage] = useState(0)
  const [counted, setCounted] = useState(0)
  const [typed, setTyped] = useState("")
  const [voiceEval, setVoiceEval] = useState(null)
  const [voiceEvalLoading, setVoiceEvalLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Fetch Session History for comparative benchmark
  useEffect(() => {
    // Offline mode: skip backend history fetch
    setHistoryLoading(false)
  }, [isPublicReadOnly])

  function handleShare() {
    const shareUrl = `${window.location.origin}/?session_id=${data.session_id}&public=true`
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
      .catch(err => {
        console.error("Failed to copy public share URL:", err)
      })
  }

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 2200)
    const t2 = setTimeout(() => setStage(2), 3800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const finalScore = data?.scores?.overall || 0
  const decision = data?.verdict?.hire_decision || "BORDERLINE"
  const style = HIRE_MAP[decision] || HIRE_MAP["BORDERLINE"]

  useEffect(() => {
    if (stage < 1) return
    let s = 0; const step = finalScore / 50
    const iv = setInterval(() => { s += step; if (s >= finalScore) { setCounted(finalScore); clearInterval(iv) } else setCounted(parseFloat(s.toFixed(1))) }, 25)
    return () => clearInterval(iv)
  }, [stage, finalScore])

  useEffect(() => {
    if (stage < 1) return
    const text = data?.verdict?.one_line_verdict || ""; let i = 0
    const iv = setInterval(() => { setTyped(text.slice(0, i + 1)); i++; if (i >= text.length) clearInterval(iv) }, 28)
    return () => clearInterval(iv)
  }, [stage, data])

  // Fetch Voice Evaluation
  useEffect(() => {
    if (stage < 1) return;
    const questions = data?.questions_summary || [];
    if (questions.length > 0 && !voiceEval) {
      const q = questions[questions.length - 1]; // Evaluate the final question
      setVoiceEval({
        verdict: q.verdict || "NO_RESPONSE",
        score: q.score || 0,
        accuracy: q.accuracy || "Answer evaluated locally.",
        missing: (q.missing_keywords && q.missing_keywords.length > 0) ? `Missing concepts: ${q.missing_keywords.join(", ")}` : "None",
        tip: q.tip || "Keep practicing."
      });
    }
  }, [stage, data, voiceEval]);

  if (!data) return (
    <div className="sc-root"><div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "20px" }}>
      <p className="mono dim" style={{ letterSpacing: "0.15em" }}>NO DATA</p>
      <button className="btn btn-ghost" onClick={onRetry}>← RETURN</button>
    </div></div>
  )

  const verdict = data.verdict || {}, scores = data.scores || {}

  return (
    <div className="sc-root">
      <div className="scanline" />
      <header className="sc-header">
        <div>
          <span className="chip acid">{isPublicReadOnly ? "PUBLIC SHARE REPORT" : "EVALUATION COMPLETE"}</span>
          <h2 className="display" style={{ fontSize: "1.4rem", letterSpacing: "0.08em", marginTop: "2px" }}>FINAL SCORECARD</h2>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {data?.error && <span className="chip blood" style={{ fontSize: "0.55rem" }}>PARTIAL DATA</span>}
          {!isPublicReadOnly && (
            <>
              <button className="btn btn-acid" onClick={() => generatePDF(data, voiceEval, biometricData)} style={{ fontSize: "0.7rem", padding: "8px 16px" }}>⬇ DOWNLOAD PDF</button>
              <button className="btn btn-ghost" onClick={onRetry} style={{ fontSize: "0.7rem", padding: "8px 16px" }}>← NEW SESSION</button>
            </>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {stage === 0 && (
          <motion.div key="reveal" className="sc-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <p className="mono" style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "var(--t3)" }}>PANEL DELIVERING VERDICT</p>
            <div className="reveal-orb">
              <div className="orb-ring r1" /><div className="orb-ring r2" /><div className="orb-ring r3" />
              <span className="display acid" style={{ fontSize: "2.2rem", position: "relative", zIndex: 2 }}>⚡</span>
            </div>
            <div className="reveal-bar"><div className="reveal-bar-fill" /></div>
          </motion.div>
        )}

        {stage >= 1 && (
          <motion.main key="content" className="sc-main" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>

            <motion.div className="verdict-hero" style={{ background: style.bg, borderColor: style.color, boxShadow: style.glow }}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15 }}>
              <div className="vh-left">
                <span className="mono dim" style={{ fontSize: "0.55rem", letterSpacing: "0.2em" }}>PANEL DECISION</span>
                <h1 className="display verdict-decision" style={{ color: style.color }}>{decision}</h1>
                {typed && <p className="verdict-oneliner mono">"{typed}<span className="cursor-blink">█</span>"</p>}
              </div>
              <div className="vh-right">
                <span className="display vh-score" style={{ color: style.color }}>{counted.toFixed(1)}</span>
                <span className="mono dim" style={{ fontSize: "0.65rem" }}>/10</span>
              </div>
            </motion.div>

            {stage >= 2 && (<>
              <div className="score-cards">
                {[
                  { l: "TECHNICAL", a: "The Architect", i: "⚡", s: scores.technical || 0, c: "var(--ice)", w: "50%" },
                  { l: "KINEMATICS", a: "The Observer", i: "◉", s: scores.behavioral || 0, c: "#a855f7", w: "25%" },
                  { l: "COMMUNICATION", a: "The Manager", i: "▣", s: scores.communication || 0, c: "var(--amber)", w: "25%" },
                ].map((sc, i) => (
                  <motion.div key={sc.l} className="sc-card" style={{ "--scc": sc.c }}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: i * 0.1 }}>
                    <div className="sc-card-top">
                      <span style={{ fontSize: "1.1rem" }}>{sc.i}</span>
                      <div><div className="mono" style={{ fontSize: "0.55rem", letterSpacing: "0.1em", color: sc.c }}>{sc.l}</div>
                        <div className="mono dim" style={{ fontSize: "0.45rem" }}>{sc.a}</div></div>
                      <span className="mono dim" style={{ fontSize: "0.5rem", marginLeft: "auto" }}>{sc.w}</span>
                    </div>
                    <div className="display" style={{ fontSize: "2.8rem", color: sc.c, lineHeight: 1, margin: "2px 0", textShadow: `0 0 25px ${sc.c}40` }}>{sc.s.toFixed(1)}</div>
                    <div className="bar-track">
                      <motion.div className="bar-fill" style={{ background: sc.c }}
                        initial={{ width: 0 }} animate={{ width: `${sc.s * 10}%` }} transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                  </motion.div>
                ))}
              </div>

              {data.kinematic_analytics && (
                <div className="bracket-card" style={{ padding: "16px", marginBottom: "16px" }}>
                  <div className="bc-bl" /><div className="bc-br" />
                  <span className="chip" style={{ marginBottom: "10px", borderColor: "rgba(200,255,0,0.3)", color: "var(--acid)" }}>KINEMATIC BASELINE</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "10px" }}>
                    {[
                      { l: "FLEXION (S)", v: `${(data.kinematic_analytics.total_flexion_seconds || 0).toFixed(1)}s` },
                      { l: "STRESS SPIKES", v: `${data.kinematic_analytics.total_stress_spikes || 0}` },
                      { l: "PEAK VEL", v: `${data.kinematic_analytics.peak_angular_velocity || 0} d/s` },
                      { l: "FATIGUE", v: data.kinematic_analytics.biomechanical_fatigue ? "DETECTED" : "NORMAL", c: data.kinematic_analytics.biomechanical_fatigue ? "var(--blood)" : "" },
                      { l: "BLINK RATE", v: `${(data.kinematic_analytics.avg_blink_rate || 0).toFixed(1)}/m` }
                    ].map(st => (
                      <div key={st.l} style={{ background: "rgba(0,0,0,0.4)", padding: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="mono dim" style={{ fontSize: "0.5rem", letterSpacing: "0.08em" }}>{st.l}</div>
                        <div className="display" style={{ fontSize: "1.2rem", marginTop: "2px", color: st.c || "var(--ice)" }}>{st.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── VOICE EVALUATION ANALYTICS ────────────── */}
              <motion.div className="bracket-card" style={{ padding: "16px", marginBottom: "16px", position: "relative" }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
                <div className="bc-bl" /><div className="bc-br" />
                <span className="chip" style={{ marginBottom: "10px", borderColor: "rgba(0,255,157,0.3)", color: "var(--mint)" }}>VOICE ANSWER EVALUATION</span>
                
                {voiceEval && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <div style={{ background: "rgba(0,255,157,0.1)", border: "1px solid var(--mint)", padding: "10px", textAlign: "center", minWidth: "100px" }}>
                        <div className="mono dim" style={{ fontSize: "0.5rem" }}>VERDICT</div>
                        <div className="display" style={{ fontSize: "1.2rem", color: "var(--mint)" }}>{voiceEval.verdict}</div>
                      </div>
                      <div style={{ background: "rgba(0,255,157,0.1)", border: "1px solid var(--mint)", padding: "10px", textAlign: "center", minWidth: "100px" }}>
                        <div className="mono dim" style={{ fontSize: "0.5rem" }}>SCORE</div>
                        <div className="display" style={{ fontSize: "1.2rem", color: "var(--mint)" }}>{voiceEval.score} <span style={{ fontSize: "0.8rem", color: "var(--t3)" }}>/ 10</span></div>
                      </div>
                    </div>
                    
                    <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", padding: "12px" }}>
                      <div className="mono acid" style={{ fontSize: "0.6rem", marginBottom: "4px" }}>ACCURACY</div>
                      <div className="mono" style={{ fontSize: "0.8rem", color: "var(--ice)", lineHeight: "1.4" }}>{voiceEval.accuracy}</div>
                    </div>
                    
                    <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", padding: "12px" }}>
                      <div className="mono blood" style={{ fontSize: "0.6rem", marginBottom: "4px" }}>MISSING</div>
                      <div className="mono" style={{ fontSize: "0.8rem", color: "var(--ice)", lineHeight: "1.4" }}>{voiceEval.missing}</div>
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)", padding: "12px" }}>
                      <div className="mono amber" style={{ fontSize: "0.6rem", marginBottom: "4px" }}>TIP</div>
                      <div className="mono" style={{ fontSize: "0.8rem", color: "var(--ice)", lineHeight: "1.4" }}>{voiceEval.tip}</div>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* ── EMOTION ANALYTICS ────────────── */}
              {data.emotion_analytics && (
                <motion.div className="bracket-card emotion-analytics-card"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <div className="bc-bl" /><div className="bc-br" />
                  <span className="chip" style={{ marginBottom: "10px", borderColor: "rgba(168,85,247,0.3)", color: "#a855f7" }}>EMOTION INTELLIGENCE ANALYSIS</span>
                  
                  {/* Top-level emotion stats */}
                  <div className="emotion-stats-grid">
                    <div className="emotion-stat-card emotion-dominant">
                      <div className="mono dim" style={{ fontSize: "0.5rem", letterSpacing: "0.08em" }}>DOMINANT EMOTION</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                        <span style={{ fontSize: "1.8rem" }}>{EMOTION_ICONS[data.emotion_analytics.session_dominant_emotion] || "😐"}</span>
                        <span className="display" style={{ fontSize: "1.4rem", color: EMOTION_COLORS[data.emotion_analytics.session_dominant_emotion] || "#8b95a5" }}>
                          {(data.emotion_analytics.session_dominant_emotion || "neutral").toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="emotion-stat-card">
                      <div className="mono dim" style={{ fontSize: "0.5rem", letterSpacing: "0.08em" }}>STABILITY</div>
                      <div className="display" style={{ fontSize: "1.5rem", marginTop: "4px", color: data.emotion_analytics.emotion_stability >= 70 ? "var(--mint)" : data.emotion_analytics.emotion_stability >= 40 ? "var(--amber)" : "var(--blood)" }}>
                        {(data.emotion_analytics.emotion_stability || 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="emotion-stat-card">
                      <div className="mono dim" style={{ fontSize: "0.5rem", letterSpacing: "0.08em" }}>COMPOSURE</div>
                      <div className="display" style={{ fontSize: "1.5rem", marginTop: "4px", color: data.emotion_analytics.emotion_composure_score >= 7 ? "var(--mint)" : data.emotion_analytics.emotion_composure_score >= 4 ? "var(--amber)" : "var(--blood)" }}>
                        {(data.emotion_analytics.emotion_composure_score || 10).toFixed(1)}/10
                      </div>
                    </div>
                    <div className="emotion-stat-card">
                      <div className="mono dim" style={{ fontSize: "0.5rem", letterSpacing: "0.08em" }}>MOOD SHIFTS</div>
                      <div className="display" style={{ fontSize: "1.5rem", marginTop: "4px", color: data.emotion_analytics.emotion_changes <= 5 ? "var(--mint)" : data.emotion_analytics.emotion_changes <= 15 ? "var(--amber)" : "var(--blood)" }}>
                        {data.emotion_analytics.emotion_changes || 0}
                      </div>
                    </div>
                  </div>

                  {/* Emotion Distribution Bars */}
                  {data.emotion_analytics.emotion_distribution && Object.keys(data.emotion_analytics.emotion_distribution).length > 0 && (
                    <div className="emotion-dist-section">
                      <div className="mono dim" style={{ fontSize: "0.5rem", letterSpacing: "0.1em", marginBottom: "8px" }}>EMOTION DISTRIBUTION</div>
                      {["happy", "neutral", "sad", "angry", "surprised", "fearful", "disgusted"].map(emo => {
                        const pct = data.emotion_analytics.emotion_distribution[emo] || 0
                        return (
                          <div key={emo} className="sc-emotion-bar-row">
                            <span className="sc-emotion-icon">{EMOTION_ICONS[emo]}</span>
                            <span className="sc-emotion-name mono">{emo.toUpperCase()}</span>
                            <div className="sc-emotion-bar-track">
                              <motion.div
                                className="sc-emotion-bar-fill"
                                style={{ background: EMOTION_COLORS[emo], boxShadow: pct > 20 ? `0 0 10px ${EMOTION_COLORS[emo]}40` : "none" }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(pct, 100)}%` }}
                                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                              />
                            </div>
                            <span className="sc-emotion-pct display" style={{ color: pct > 20 ? EMOTION_COLORS[emo] : "var(--t3)" }}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── SHARE LINK GENERATOR CARD ── */}
              {!isPublicReadOnly && (
                <motion.div className="bracket-card share-card" style={{ padding: "16px", marginBottom: "16px" }}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}>
                  <div className="bc-bl" /><div className="bc-br" />
                  <span className="chip acid" style={{ marginBottom: "10px" }}>SHARE REPORT WITH NETWORK</span>
                  <div className="share-row">
                    <p className="mono dim share-desc" style={{ fontSize: "0.65rem", lineHeight: "1.4" }}>
                      Generate a secure, public shareable report link. No registration or authentication is required for viewers.
                    </p>
                    <button className="btn btn-acid share-btn" onClick={handleShare} style={{ display: "flex", gap: "8px", alignItems: "center", minWidth: "150px", justifyContent: "center" }}>
                      {copied ? "✓ LINK COPIED" : "🔗 COPY SHARE LINK"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── HISTORICAL PROGRESSION BENCHMARK ── */}
              {!isPublicReadOnly && history.length > 0 && (
                <motion.div className="bracket-card history-benchmark-card" style={{ padding: "16px", marginBottom: "16px" }}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}>
                  <div className="bc-bl" /><div className="bc-br" />
                  <span className="chip" style={{ marginBottom: "12px", borderColor: "rgba(200,255,0,0.3)", color: "var(--acid)" }}>
                    HISTORICAL BENCHMARK PROGRESSION
                  </span>
                  
                  <div className="history-grid-container">
                    <p className="mono dim" style={{ fontSize: "0.6rem", marginBottom: "12px", letterSpacing: "0.08em" }}>
                      COMPARING RECENT COMPLETED SESSIONS (LATEST FIRST)
                    </p>
                    
                    <div className="history-table-wrapper">
                      <table className="history-table mono">
                        <thead>
                          <tr>
                            <th>DATE</th>
                            <th>TOPIC</th>
                            <th>OVERALL</th>
                            <th>TECH</th>
                            <th>COMM</th>
                            <th>POSTURE</th>
                            <th>BLINK</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((s) => {
                            const isCurrent = s.id === data.session_id
                            return (
                              <tr key={s.id} className={isCurrent ? "current-session-row" : ""}>
                                <td className="date-cell">{s.started_at ? new Date(s.started_at).toLocaleDateString("en-GB").slice(0, 5) : "N/A"}</td>
                                <td className="topic-cell">{s.topic === "python" ? "PYTHON" : "C LANG"}</td>
                                <td className="score-cell highlight" style={{ color: sColor(s.overall_score) }}>
                                  {s.overall_score ? s.overall_score.toFixed(1) : "0.0"}
                                </td>
                                <td className="score-cell">{s.accuracy_score ? s.accuracy_score.toFixed(1) : "0.0"}</td>
                                <td className="score-cell">{s.communication_score ? s.communication_score.toFixed(1) : "0.0"}</td>
                                <td className="score-cell">{s.posture_score ? s.posture_score.toFixed(1) : "0.0"}</td>
                                <td className="score-cell">{s.blink_rate_score ? s.blink_rate_score.toFixed(1) : "0.0"}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="closings">
                <span className="chip" style={{ marginBottom: "8px" }}>INDIVIDUAL VERDICTS</span>
                {[
                  { a: "THE ARCHITECT", i: "⚡", c: "var(--ice)", t: verdict.architect_closing },
                  { a: "THE OBSERVER", i: "◉", c: "#a855f7", t: verdict.observer_closing },
                  { a: "THE MANAGER", i: "▣", c: "var(--amber)", t: verdict.manager_closing },
                ].filter(c => c.t).map((c, i) => (
                  <motion.div key={c.a} className="closing-card" style={{ "--cc": c.c }}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 + i * 0.12 }}>
                    <div className="closing-head"><span style={{ fontSize: "0.9rem" }}>{c.i}</span>
                      <span className="mono" style={{ fontSize: "0.55rem", letterSpacing: "0.1em", color: c.c }}>{c.a}</span></div>
                    <p className="closing-text">"{c.t}"</p>
                  </motion.div>
                ))}
              </div>

              {(verdict.top_strength || verdict.critical_weakness) && (
                <div className="sw-row">
                  {verdict.top_strength && <motion.div className="sw-card strength" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}>
                    <span className="chip" style={{ color: "var(--mint)", borderColor: "rgba(0,255,157,0.3)", marginBottom: "6px" }}>TOP STRENGTH</span>
                    <p className="sw-text">{verdict.top_strength}</p></motion.div>}
                  {verdict.critical_weakness && <motion.div className="sw-card weakness" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }}>
                    <span className="chip" style={{ color: "var(--blood)", borderColor: "rgba(255,26,60,0.3)", marginBottom: "6px" }}>CRITICAL WEAKNESS</span>
                    <p className="sw-text">{verdict.critical_weakness}</p></motion.div>}
                </div>
              )}

              {verdict.action_plan && (
                <div className="action-plan bracket-card"><div className="bc-bl" /><div className="bc-br" />
                  <span className="chip acid" style={{ marginBottom: "10px" }}>IMPROVEMENT ACTION PLAN</span>
                  <div className="action-list">
                    {(Array.isArray(verdict.action_plan) ? verdict.action_plan : [verdict.action_plan]).map((it, i) => (
                      <motion.div key={i} className="action-item" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.7 + i * 0.08 }}>
                        <span className="display acid" style={{ fontSize: "1.4rem", minWidth: "24px" }}>{String(i + 1).padStart(2, "0")}</span>
                        <p className="action-text">{it}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {data.questions_summary?.length > 0 && (
                <div className="q-breakdown bracket-card"><div className="bc-bl" /><div className="bc-br" />
                  <span className="chip" style={{ marginBottom: "8px" }}>QUESTION BREAKDOWN</span>
                  {data.questions_summary.map((q, i) => (
                    <div key={i} className="qb-item"><div className="qb-head">
                      <span className="mono dim" style={{ fontSize: "0.55rem", letterSpacing: "0.1em" }}>Q{i + 1}</span>
                      <span className="display" style={{ fontSize: "1.1rem", color: sColor(q.score) }}>{(q.score || 0).toFixed(1)}</span>
                      {q.verdict && (
                        <span className="mono" style={{
                          fontSize: "0.45rem", letterSpacing: "0.08em", padding: "2px 6px",
                          border: `1px solid ${q.verdict === "CORRECT" ? "var(--mint)" : q.verdict === "PARTIAL" ? "var(--amber)" : "var(--blood)"}`,
                          color: q.verdict === "CORRECT" ? "var(--mint)" : q.verdict === "PARTIAL" ? "var(--amber)" : "var(--blood)",
                        }}>{q.verdict}</span>
                      )}
                      {q.keyword_match_pct > 0 && (
                        <span className="mono" style={{ fontSize: "0.45rem", color: "var(--acid)", letterSpacing: "0.06em" }}>KW:{q.keyword_match_pct}%</span>
                      )}
                      {q.dominant_emotion && q.dominant_emotion !== "neutral" && (
                        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "0.8rem" }}>{EMOTION_ICONS[q.dominant_emotion] || "😐"}</span>
                          <span className="mono" style={{ fontSize: "0.45rem", color: EMOTION_COLORS[q.dominant_emotion] || "#8b95a5", letterSpacing: "0.06em" }}>{q.dominant_emotion.toUpperCase()}</span>
                        </span>
                      )}
                    </div><p className="qb-q">{q.question}</p>
                    {q.answer && <p className="qb-a mono">↳ {q.answer.slice(0, 140)}{q.answer.length > 140 ? "…" : ""}</p>}
                    {q.ideal_answer && (
                      <div style={{ marginTop: "4px", padding: "6px 8px", background: "rgba(0,255,157,0.03)", borderLeft: "2px solid var(--mint)" }}>
                        <span className="mono" style={{ fontSize: "0.5rem", color: "var(--mint)", letterSpacing: "0.1em" }}>IDEAL ANSWER</span>
                        <p className="mono" style={{ fontSize: "0.65rem", color: "var(--t2)", marginTop: "2px", lineHeight: 1.5 }}>{q.ideal_answer.slice(0, 200)}{q.ideal_answer.length > 200 ? "…" : ""}</p>
                      </div>
                    )}
                    {/* Keyword pills */}
                    {(q.matched_keywords?.length > 0 || q.missing_keywords?.length > 0) && (
                      <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "3px" }}>
                        {(q.matched_keywords || []).map(k => (
                          <span key={k} className="mono" style={{ fontSize: "0.45rem", padding: "1px 5px", background: "rgba(0,255,157,0.1)", border: "1px solid rgba(0,255,157,0.3)", color: "var(--mint)" }}>✓ {k}</span>
                        ))}
                        {(q.missing_keywords || []).map(k => (
                          <span key={k} className="mono" style={{ fontSize: "0.45rem", padding: "1px 5px", background: "rgba(255,60,80,0.08)", border: "1px solid rgba(255,60,80,0.25)", color: "var(--blood)" }}>✗ {k}</span>
                        ))}
                      </div>
                    )}
                    {q.tip && (
                      <p className="mono" style={{ fontSize: "0.55rem", color: "#a855f7", marginTop: "4px", fontStyle: "italic", lineHeight: 1.4 }}>💡 {q.tip}</p>
                    )}
                  </div>
                  ))}
                </div>
              )}

              {isPublicReadOnly ? (
                <div className="public-watermark-footer" style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "30px" }}>
                  <span className="display neon-text" style={{ fontSize: "1rem", letterSpacing: "0.15em", color: "var(--acid)", textShadow: "0 0 10px rgba(200,255,0,0.3)" }}>
                    SENTINEL AI VERDICT REPORT
                  </span>
                  <span className="mono dim" style={{ fontSize: "0.6rem", letterSpacing: "0.1em", marginTop: "6px" }}>
                    CONFIDENTIAL SECURE REPORT · PRIVACY VERIFIED BY OFF-LINE COMPLIANCE
                  </span>
                </div>
              ) : (
                <div className="sc-footer">
                  <button className="btn btn-acid" style={{ fontSize: "0.95rem", letterSpacing: "0.1em", padding: "14px 40px" }} onClick={() => generatePDF(data, voiceEval, biometricData)}>
                    ⬇ DOWNLOAD FULL PDF REPORT
                  </button>
                  <button className="btn" style={{ fontSize: "0.85rem", padding: "12px 32px", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.4)", color: "#a855f7", letterSpacing: "0.1em", cursor: "pointer" }} onClick={onMentor}>
                    ◉ ENTER MENTOR MODE
                  </button>
                  <button className="btn btn-ghost" style={{ fontSize: "0.85rem", padding: "12px 32px" }} onClick={onRetry}>ATTEMPT AGAIN →</button>
                </div>
              )}
            </>)}
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}

function sColor(s) { if (!s) return "var(--t3)"; if (s >= 7) return "var(--mint)"; if (s >= 5) return "var(--amber)"; return "var(--blood)" }

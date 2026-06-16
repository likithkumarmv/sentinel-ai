/**
 * ═══════════════════════════════════════════════════════════
 *  SENTINEL AI — Interview Session Storage (localStorage)
 *
 *  Persists the complete interview session (questions, answers,
 *  keywords, emotions, posture, etc.) to localStorage so the
 *  data survives page freezes, tab crashes, and can be used
 *  for offline PDF generation.
 * ═══════════════════════════════════════════════════════════
 */

const STORAGE_KEY = "sentinelai_interview_session"

/**
 * Initialize a new session in localStorage.
 * Called when the interview begins.
 */
export function initSession(sessionData) {
  const session = {
    sessionId: sessionData.session_id || `session_${Date.now()}`,
    userName: sessionData.user_name || "ANONYMOUS",
    topic: sessionData.topic || "python",
    difficulty: sessionData.difficulty || "intern",
    totalQuestions: sessionData.total_questions || sessionData.all_questions?.length || 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    allQuestions: (sessionData.all_questions || []).map(q => ({
      id: q.id,
      question: q.question,
      ideal_answer: q.ideal_answer || "",
      expected_keywords: q.expected_keywords || [],
      difficulty: q.difficulty || 1,
    })),
    questionResults: [],
    overallScores: null,
    verdict: null,
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    console.log("[Storage] Session initialized:", session.sessionId)
  } catch (e) {
    console.warn("[Storage] Failed to save session:", e)
  }

  return session
}

/**
 * Save the result for a single question.
 * Called after each question is answered/submitted.
 */
export function saveQuestionResult(questionIndex, result) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      console.warn("[Storage] No session found to save question result")
      return
    }
    const session = JSON.parse(raw)

    const questionData = {
      questionIndex,
      questionText: result.questionText || "",
      idealAnswer: result.idealAnswer || "",
      expectedKeywords: result.expectedKeywords || [],
      candidateAnswer: result.candidateAnswer || "",
      answerDuration: result.answerDuration || 0,
      fillerCount: result.fillerCount || 0,
      // Evaluation results
      score: result.score || 0,
      verdict: result.verdict || "NO_RESPONSE",
      matchedKeywords: result.matchedKeywords || [],
      missingKeywords: result.missingKeywords || [],
      keywordMatchPct: result.keywordMatchPct || 0,
      accuracy: result.accuracy || "",
      tip: result.tip || "",
      // Biometric data
      emotionSummary: result.emotionSummary || {},
      dominantEmotion: result.dominantEmotion || "neutral",
      postureSnapshot: result.postureSnapshot || {},
      gazeAwayCount: result.gazeAwayCount || 0,
      blinkCount: result.blinkCount || 0,
      screenExits: result.screenExits || 0,
      // Agent feedback (if available from backend)
      feedback: result.feedback || {},
      timestamp: new Date().toISOString(),
    }

    // Replace if already exists at this index, otherwise push
    const existingIdx = session.questionResults.findIndex(
      r => r.questionIndex === questionIndex
    )
    if (existingIdx >= 0) {
      session.questionResults[existingIdx] = questionData
    } else {
      session.questionResults.push(questionData)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    console.log(`[Storage] Question ${questionIndex + 1} saved. Total: ${session.questionResults.length}`)
  } catch (e) {
    console.warn("[Storage] Failed to save question result:", e)
  }
}

/**
 * Save overall session results (scores, verdict).
 * Called when the interview ends.
 */
export function saveSessionResults(scores, verdict) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const session = JSON.parse(raw)
    session.overallScores = scores
    session.verdict = verdict
    session.completedAt = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    console.log("[Storage] Session results saved")
  } catch (e) {
    console.warn("[Storage] Failed to save session results:", e)
  }
}

/**
 * Load the current session from localStorage.
 * Returns null if no session exists.
 */
export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    console.warn("[Storage] Failed to load session:", e)
    return null
  }
}

/**
 * Clear the current session from localStorage.
 * Called when starting a new session.
 */
export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log("[Storage] Session cleared")
  } catch (e) {
    console.warn("[Storage] Failed to clear session:", e)
  }
}

/**
 * Get all question results for PDF generation.
 * Merges stored question metadata with results.
 */
export function getCompleteSessionData() {
  const session = loadSession()
  if (!session) return null

  return {
    sessionId: session.sessionId,
    userName: session.userName,
    topic: session.topic,
    difficulty: session.difficulty,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    totalQuestions: session.totalQuestions,
    questions: session.allQuestions.map((q, i) => {
      const result = session.questionResults.find(r => r.questionIndex === i) || {}
      return {
        ...q,
        questionIndex: i,
        candidateAnswer: result.candidateAnswer || "(No response)",
        score: result.score || 0,
        verdict: result.verdict || "NO_RESPONSE",
        matchedKeywords: result.matchedKeywords || [],
        missingKeywords: result.missingKeywords || [],
        keywordMatchPct: result.keywordMatchPct || 0,
        accuracy: result.accuracy || "",
        tip: result.tip || "",
        answerDuration: result.answerDuration || 0,
        fillerCount: result.fillerCount || 0,
        dominantEmotion: result.dominantEmotion || "neutral",
        emotionSummary: result.emotionSummary || {},
        postureSnapshot: result.postureSnapshot || {},
        gazeAwayCount: result.gazeAwayCount || 0,
        blinkCount: result.blinkCount || 0,
        screenExits: result.screenExits || 0,
        feedback: result.feedback || {},
      }
    }),
    overallScores: session.overallScores,
    verdict: session.verdict,
  }
}

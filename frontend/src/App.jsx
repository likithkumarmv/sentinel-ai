import { useState, useEffect } from "react"
import axios from "axios"
import SetupPage from "./pages/SetupPage"
import InterviewPage from "./pages/InterviewPage"
import ScorecardPage from "./pages/ScorecardPage"
import MentorPage from "./pages/MentorPage"
import "./styles/global.css"

/**
 * App — Root component with page-level routing.
 *
 * Flow: setup → interview → scorecard → mentor → (retry → setup)
 *
 * Biometric data (expressions, posture telemetry) is collected during
 * the interview and passed through to the mentor for analysis.
 */
function App() {
  const [currentPage, setCurrentPage] = useState("setup")
  const [sessionData, setSessionData] = useState(null)
  const [scorecardData, setScorecardData] = useState(null)
  const [biometricData, setBiometricData] = useState(null)
  const [isPublicReadOnly, setIsPublicReadOnly] = useState(false)

  // ── Deep Linking Public Interceptor ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isPublic = params.get("public") === "true"
    const sessionId = params.get("session_id")

    if (isPublic && sessionId && sessionId !== "<id>" && !isNaN(Number(sessionId))) {
      axios.get(`http://localhost:8000/api/scorecard/public/${sessionId}`)
        .then((res) => {
          setScorecardData(res.data)
          setIsPublicReadOnly(true)
          setCurrentPage("scorecard")
        })
        .catch((err) => {
          console.error("Failed to load public scorecard report:", err)
        })
    }
  }, [])

  function goToInterview(data) {
    setSessionData(data)
    setIsPublicReadOnly(false)
    setCurrentPage("interview")
  }

  function goToScorecard(data, biometrics) {
    setScorecardData(data)
    setBiometricData(biometrics || null)
    setIsPublicReadOnly(false)
    setCurrentPage("scorecard")
  }

  function goToMentor() {
    setCurrentPage("mentor")
  }

  function resetToSetup() {
    setSessionData(null)
    setScorecardData(null)
    setBiometricData(null)
    setIsPublicReadOnly(false)
    // Clear URL parameters elegantly
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    setCurrentPage("setup")
  }

  return (
    <div>
      {currentPage === "setup" && <SetupPage onStart={goToInterview} />}
      {currentPage === "interview" && (
        <InterviewPage
          sessionData={sessionData}
          onComplete={goToScorecard}
        />
      )}
      {currentPage === "scorecard" && (
        <ScorecardPage
          data={scorecardData}
          onRetry={resetToSetup}
          onMentor={goToMentor}
          biometricData={biometricData}
          isPublicReadOnly={isPublicReadOnly}
        />
      )}
      {currentPage === "mentor" && (
        <MentorPage
          scorecardData={scorecardData}
          biometricData={biometricData}
          sessionData={sessionData}
          onRetry={resetToSetup}
        />
      )}
    </div>
  )
}
export default App

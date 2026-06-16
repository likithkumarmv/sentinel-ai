/**
 * ═══════════════════════════════════════════════════════════
 *  SENTINEL AI — Local Answer Evaluator
 *
 *  Fully offline evaluation engine that:
 *  1. Checks if expected keywords are present in the answer
 *  2. Computes similarity to ideal answer
 *  3. Determines a verdict (CORRECT / PARTIAL / INCORRECT / NO_RESPONSE)
 *  4. Generates improvement tips
 *  5. No backend or LLM dependency
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Normalize text for comparison — lowercase, remove punctuation, trim.
 */
function normalize(text) {
  if (!text) return ""
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_*()]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Check if a keyword/phrase is present in the text.
 * Handles multi-word keywords and common variations.
 */
function keywordPresent(text, keyword) {
  const normalText = normalize(text)
  const normalKw = normalize(keyword)

  // Direct substring match
  if (normalText.includes(normalKw)) return true

  // Split multi-word keywords and check if all words are present
  const kwWords = normalKw.split(/\s+/)
  if (kwWords.length > 1) {
    return kwWords.every(word => normalText.includes(word))
  }

  // Check common variations
  const variations = {
    "mutable": ["mutable", "mutability", "can be changed", "changeable", "modifiable"],
    "immutable": ["immutable", "immutability", "cannot be changed", "unchangeable", "not changeable"],
    "hashable": ["hashable", "hash", "hashing", "dictionary key"],
    "key-value": ["key-value", "key value", "keys and values", "mapping"],
    "hash table": ["hash table", "hashtable", "hash map", "hashmap"],
    "tuple": ["tuple", "tuples"],
    "dictionary": ["dictionary", "dict", "dictionaries"],
    "unpacking": ["unpacking", "unpack", "spread", "destructure"],
    "variable arguments": ["variable arguments", "var args", "variable number", "arbitrary arguments"],
    "single element": ["single element", "one element", "adds one", "single item"],
    "iterable": ["iterable", "iterates", "iterate", "iteration"],
    "in-place": ["in-place", "in place", "modifies the list", "modifies original"],
    "compiler": ["compiler", "compiles", "compilation", "gcc", "clang"],
    "machine code": ["machine code", "binary", "executable", "native code", "object code"],
    "source code": ["source code", "source file", "code file"],
    "linker": ["linker", "linking", "link phase", "link stage"],
    "memory address": ["memory address", "address", "pointer to", "points to"],
    "dereference": ["dereference", "dereferencing", "access value", "*operator"],
    "reference": ["reference", "address-of", "&operator", "ref"],
    "heap": ["heap", "heap memory", "dynamic memory", "free store"],
    "dynamic memory": ["dynamic memory", "malloc", "calloc", "heap allocation", "runtime allocation"],
    "initialization": ["initialization", "initialize", "initialise", "zeroed", "zero-initialized"],
    "memory leak": ["memory leak", "leak", "not freed", "dangling"],
    "pointer arithmetic": ["pointer arithmetic", "pointer math", "arr+i", "arr[i]"],
    "base address": ["base address", "first element", "start address"],
    "contiguous": ["contiguous", "continuous", "sequential", "adjacent"],
    "local variables": ["local variables", "local vars", "stack variables", "automatic variables"],
    "dynamic allocation": ["dynamic allocation", "malloc", "calloc", "heap"],
    "LIFO": ["lifo", "last in first out", "stack"],
    "scope": ["scope", "lifetime", "block scope", "function scope"],
    "callback": ["callback", "call back", "function pointer", "handler"],
    "function address": ["function address", "address of function", "function pointer"],
    "typedef": ["typedef", "type definition", "type alias"],
    "compiler optimization": ["compiler optimization", "optimize", "optimisation", "volatile"],
    "hardware register": ["hardware register", "register", "mmio", "memory mapped"],
    "interrupt": ["interrupt", "isr", "interrupt service routine", "signal handler"],
    "mutex": ["mutex", "mutual exclusion", "lock", "locking"],
    "atomic": ["atomic", "atomicity", "cas", "compare and swap"],
    "free list": ["free list", "freelist", "free block"],
    "lock-free": ["lock-free", "lockfree", "non-blocking"],
    "thread safety": ["thread safety", "thread safe", "threadsafe", "concurrency"],
    "I/O bound": ["io bound", "i/o bound", "io-bound", "input output"],
    "multiprocessing": ["multiprocessing", "multi processing", "process pool"],
    "wrapper": ["wrapper", "wraps", "wrapping", "inner function"],
    "closure": ["closure", "enclosed", "enclosing scope", "lexical scope"],
    "higher-order function": ["higher-order", "higher order", "takes function", "returns function"],
    "functools": ["functools", "functools.wraps", "@wraps"],
    "lazy evaluation": ["lazy evaluation", "lazy", "on demand", "deferred"],
    "iterator": ["iterator", "iteration", "iter", "__iter__", "__next__"],
    "yield": ["yield", "generator", "yielding"],
    "reference counting": ["reference counting", "ref count", "refcount", "reference count"],
    "cyclic garbage collector": ["cyclic garbage", "cycle detector", "gc module", "circular reference"],
    "dunder": ["dunder", "double underscore", "magic method", "special method"],
    "human readable": ["human readable", "user friendly", "display", "str()"],
    "unambiguous": ["unambiguous", "developer", "debugging", "repr()", "eval()"],
    "metaclass": ["metaclass", "meta class", "type()", "metatype"],
    "__new__": ["__new__", "new method", "creation", "constructor"],
    "descriptor": ["descriptor", "__get__", "__set__", "protocol"],
    "MRO": ["mro", "method resolution order", "c3 linearization"],
    "idempotency": ["idempotency", "idempotent", "exactly once", "at most once"],
    "worker": ["worker", "consumer", "processor", "task runner"],
    "broker": ["broker", "message queue", "queue", "redis"],
    "acknowledgment": ["acknowledgment", "ack", "acknowledge", "confirm"],
    "integer": ["integer", "int", "whole number"],
    "floating point": ["floating point", "float", "decimal", "precision"],
    "character": ["character", "char", "single character", "ascii"],
    "bytes": ["bytes", "byte", "memory size", "sizeof"],
    "memory": ["memory", "ram", "stored in memory", "memory location"],
    "data type": ["data type", "datatype", "type"],
    "identifier": ["identifier", "variable name", "name"],
    "garbage value": ["garbage value", "undefined value", "random value", "uninitialized"],
    "printf": ["printf", "print", "output", "stdout"],
    "stdio.h": ["stdio.h", "stdio", "standard io", "standard input output"],
    "main": ["main", "main function", "entry point", "int main"],
    "return": ["return", "return value", "return 0"],
    "header": ["header", "header file", "#include", "include"],
    "condition": ["condition", "conditional", "test", "boolean expression"],
    "execute": ["execute", "execution", "runs", "performs"],
    "at least once": ["at least once", "minimum once", "executes once", "guaranteed execution"],
    "entry controlled": ["entry controlled", "pre-test", "check first", "before execution"],
    "struct": ["struct", "structure", "data structure"],
    "union": ["union", "shared memory"],
    "member": ["member", "field", "attribute"],
    "alignment": ["alignment", "padding", "memory alignment"],
    "assignment": ["assignment", "assign", "set value"],
    "comparison": ["comparison", "compare", "equality check"],
    "equality": ["equality", "equal", "same value", "identical"],
    "operator": ["operator", "operation"],
  }

  // Check known variations
  const lowerKw = normalKw
  for (const [key, vars] of Object.entries(variations)) {
    if (normalize(key) === lowerKw || vars.some(v => normalize(v) === lowerKw)) {
      return vars.some(v => normalText.includes(normalize(v)))
    }
  }

  return false
}

/**
 * Compute a rough word overlap ratio between candidate answer and ideal answer.
 */
function computeContentOverlap(candidateAnswer, idealAnswer) {
  if (!candidateAnswer || !idealAnswer) return 0

  const candidateWords = new Set(normalize(candidateAnswer).split(/\s+/).filter(w => w.length > 2))
  const idealWords = new Set(normalize(idealAnswer).split(/\s+/).filter(w => w.length > 2))

  if (idealWords.size === 0) return 0

  let matches = 0
  for (const word of idealWords) {
    if (candidateWords.has(word)) matches++
  }

  return matches / idealWords.size
}

/**
 * Generate a contextual improvement tip based on what was missed.
 */
function generateTip(questionText, missingKeywords, matchedKeywords, verdict) {
  if (verdict === "CORRECT") {
    return "Excellent answer! You covered all the key concepts. Keep this level of thoroughness."
  }

  if (verdict === "NO_RESPONSE") {
    return "You didn't provide a response. Practice speaking your thoughts aloud — even a partial answer scores points in real interviews."
  }

  if (missingKeywords.length === 0) {
    return "Good attempt! Try to be more precise and structured in your explanation."
  }

  const missing = missingKeywords.slice(0, 3).map(k => `"${k}"`).join(", ")
  const extra = missingKeywords.length > 3 ? ` and ${missingKeywords.length - 3} more` : ""

  if (verdict === "INCORRECT") {
    return `Your answer missed the core concepts. Focus on understanding: ${missing}${extra}. Study the ideal answer and try to explain it in your own words.`
  }

  // PARTIAL
  if (matchedKeywords.length > 0) {
    const matched = matchedKeywords.slice(0, 2).map(k => `"${k}"`).join(", ")
    return `Good start — you mentioned ${matched}. To improve, also cover: ${missing}${extra}. This will make your answer complete.`
  }

  return `Next time, make sure to mention: ${missing}${extra}. These are the key concepts interviewers look for.`
}

/**
 * Main evaluation function.
 *
 * @param {string} candidateAnswer — The user's spoken/typed answer
 * @param {string} idealAnswer — The correct/ideal answer from question bank
 * @param {string[]} expectedKeywords — Keywords the answer should contain
 * @returns {Object} Evaluation result
 */
export function evaluateAnswer(candidateAnswer, idealAnswer, expectedKeywords = []) {
  // Handle no response
  if (!candidateAnswer || !candidateAnswer.trim() || candidateAnswer === "(No response recorded)") {
    return {
      score: 0,
      verdict: "NO_RESPONSE",
      matchedKeywords: [],
      missingKeywords: expectedKeywords,
      keywordMatchPct: 0,
      contentOverlap: 0,
      accuracy: "No response was provided.",
      missing: expectedKeywords.length > 0
        ? `All expected keywords: ${expectedKeywords.join(", ")}`
        : "Complete answer expected.",
      tip: generateTip("", expectedKeywords, [], "NO_RESPONSE"),
    }
  }

  // Keyword matching
  const matchedKeywords = []
  const missingKeywords = []

  for (const kw of expectedKeywords) {
    if (keywordPresent(candidateAnswer, kw)) {
      matchedKeywords.push(kw)
    } else {
      missingKeywords.push(kw)
    }
  }

  const keywordMatchPct = expectedKeywords.length > 0
    ? (matchedKeywords.length / expectedKeywords.length) * 100
    : 0

  // Content overlap with ideal answer
  const contentOverlap = computeContentOverlap(candidateAnswer, idealAnswer)

  // Compute score (0-10)
  // 60% keyword match weight, 40% content overlap weight
  const keywordScore = (keywordMatchPct / 100) * 10
  const overlapScore = contentOverlap * 10
  let rawScore = keywordScore * 0.6 + overlapScore * 0.4

  // Bonus for covering more than expected
  const wordCount = candidateAnswer.split(/\s+/).length
  if (wordCount > 30 && rawScore > 3) rawScore = Math.min(10, rawScore + 0.5)
  if (wordCount > 60 && rawScore > 5) rawScore = Math.min(10, rawScore + 0.5)

  // Penalty for very short answers
  if (wordCount < 5 && rawScore > 2) rawScore *= 0.6

  const score = Math.round(rawScore * 10) / 10 // Round to 1 decimal

  // Determine verdict
  let verdict
  if (score >= 7) verdict = "CORRECT"
  else if (score >= 4) verdict = "PARTIAL"
  else verdict = "INCORRECT"

  // Build accuracy description
  let accuracy
  if (verdict === "CORRECT") {
    accuracy = `You covered ${matchedKeywords.length}/${expectedKeywords.length} key concepts. Strong answer with good technical depth.`
  } else if (verdict === "PARTIAL") {
    accuracy = `You covered ${matchedKeywords.length}/${expectedKeywords.length} key concepts. The answer was on the right track but missed some important details.`
  } else {
    accuracy = `You only covered ${matchedKeywords.length}/${expectedKeywords.length} key concepts. The answer needs significant improvement.`
  }

  // Missing description
  const missing = missingKeywords.length > 0
    ? `Missing concepts: ${missingKeywords.join(", ")}`
    : "All key concepts covered!"

  // Generate improvement tip
  const tip = generateTip("", missingKeywords, matchedKeywords, verdict)

  return {
    score,
    verdict,
    matchedKeywords,
    missingKeywords,
    keywordMatchPct: Math.round(keywordMatchPct),
    contentOverlap: Math.round(contentOverlap * 100),
    accuracy,
    missing,
    tip,
  }
}

/**
 * Generate overall session tips based on all question results.
 *
 * @param {Array} questionResults — Array of per-question evaluation results
 * @returns {Object} Session-level tips and analysis
 */
export function generateSessionTips(questionResults) {
  if (!questionResults || questionResults.length === 0) {
    return {
      overallTips: ["Complete an interview to receive personalized tips."],
      strengths: [],
      weaknesses: [],
      emotionAdvice: "",
      postureAdvice: "",
      focusAdvice: "",
    }
  }

  const tips = []
  const strengths = []
  const weaknesses = []

  // Analyze answer quality
  const scores = questionResults.map(r => r.score || 0)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
  const correctCount = questionResults.filter(r => r.verdict === "CORRECT").length
  const incorrectCount = questionResults.filter(r => r.verdict === "INCORRECT" || r.verdict === "NO_RESPONSE").length
  const totalQ = questionResults.length

  if (avgScore >= 7) {
    strengths.push("Strong technical knowledge — you demonstrated solid understanding of core concepts.")
  } else if (avgScore >= 4) {
    tips.push("Your technical knowledge is developing. Focus on understanding the fundamentals more deeply rather than memorizing surface-level details.")
  } else {
    tips.push("Significant gaps in technical knowledge. Dedicate time to studying the core concepts for each topic area.")
  }

  if (correctCount >= totalQ * 0.7) {
    strengths.push(`You answered ${correctCount}/${totalQ} questions correctly — strong hit rate!`)
  }

  if (incorrectCount >= totalQ * 0.5) {
    weaknesses.push(`${incorrectCount}/${totalQ} answers were incorrect or missing. Practice answering questions under time pressure.`)
  }

  // Analyze commonly missed keywords
  const allMissing = questionResults.flatMap(r => r.missingKeywords || [])
  const missingFreq = {}
  for (const kw of allMissing) {
    missingFreq[kw] = (missingFreq[kw] || 0) + 1
  }
  const topMissed = Object.entries(missingFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kw]) => kw)

  if (topMissed.length > 0) {
    tips.push(`Key concepts you frequently missed: ${topMissed.map(k => `"${k}"`).join(", ")}. Focus your study on these areas.`)
  }

  // Analyze filler words
  const totalFillers = questionResults.reduce((sum, r) => sum + (r.fillerCount || 0), 0)
  if (totalFillers > totalQ * 3) {
    tips.push(`You used ${totalFillers} filler words across the session. Practice speaking more deliberately — pause instead of saying "um" or "like".`)
  } else if (totalFillers <= totalQ) {
    strengths.push("Minimal filler words — your speech was clear and deliberate.")
  }

  // Analyze answer duration
  const avgDuration = questionResults.reduce((sum, r) => sum + (r.answerDuration || 0), 0) / totalQ
  if (avgDuration < 10) {
    tips.push("Your answers were very brief (average under 10 seconds). Aim for 30-45 seconds per answer to demonstrate depth.")
  } else if (avgDuration > 50) {
    tips.push("Some answers were quite long. Practice being more concise — cover key points within 30-45 seconds.")
  }

  // Emotion analysis
  const emotions = questionResults.map(r => r.dominantEmotion || "neutral")
  const emotionCounts = {}
  for (const e of emotions) emotionCounts[e] = (emotionCounts[e] || 0) + 1
  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral"

  let emotionAdvice = ""
  if (dominantEmotion === "fearful" || dominantEmotion === "sad") {
    emotionAdvice = "Your facial expressions showed nervousness/anxiety. Practice deep breathing before interviews. Remember — the interviewer wants you to succeed."
  } else if (dominantEmotion === "angry" || dominantEmotion === "disgusted") {
    emotionAdvice = "Your expressions appeared tense or frustrated at times. Try to maintain a calm, engaged demeanor even when questions are challenging."
  } else if (dominantEmotion === "happy") {
    emotionAdvice = "Great composure! Your positive expressions project confidence and engagement."
    strengths.push("Positive emotional composure throughout the interview.")
  } else if (dominantEmotion === "neutral") {
    emotionAdvice = "Your expression was mostly neutral. Try to show more engagement — a slight smile and nodding shows active listening."
  }

  // Posture analysis
  const avgPostureAngle = questionResults.reduce((sum, r) => sum + (r.postureSnapshot?.avg_angle || 0), 0) / totalQ
  let postureAdvice = ""
  if (avgPostureAngle > 18) {
    postureAdvice = "Your posture showed significant leaning (average " + Math.round(avgPostureAngle) + "°). Sit upright with shoulders back — good posture projects confidence."
    weaknesses.push("Posture needs improvement — too much leaning detected.")
  } else if (avgPostureAngle > 10) {
    postureAdvice = "Posture was fair but could improve. Try to maintain a straight back throughout the interview."
  } else {
    postureAdvice = "Excellent posture! You maintained a professional, upright position."
    strengths.push("Excellent posture maintained throughout.")
  }

  // Focus / screen presence
  const totalExits = questionResults.reduce((sum, r) => sum + (r.screenExits || 0), 0)
  const totalGaze = questionResults.reduce((sum, r) => sum + (r.gazeAwayCount || 0), 0)
  let focusAdvice = ""
  if (totalExits > 3) {
    focusAdvice = `You switched tabs ${totalExits} times during the interview. In a real interview, this would be a major red flag. Stay focused on the screen.`
    weaknesses.push(`${totalExits} tab switches detected — shows lack of focus.`)
  } else if (totalGaze > totalQ * 3) {
    focusAdvice = "You looked away from the screen frequently. Practice maintaining eye contact with the camera."
  } else {
    focusAdvice = "Good screen presence — you maintained focus throughout."
    strengths.push("Strong screen presence and focus.")
  }

  // Ensure we have at least one tip
  if (tips.length === 0) {
    tips.push("Keep practicing! Consistency is key to interview success.")
  }

  return {
    overallTips: tips,
    strengths,
    weaknesses,
    emotionAdvice,
    postureAdvice,
    focusAdvice,
    avgScore: Math.round(avgScore * 10) / 10,
    dominantEmotion,
    correctCount,
    incorrectCount,
    totalQuestions: totalQ,
  }
}

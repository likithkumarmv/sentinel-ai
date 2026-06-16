import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import useInterviewStore from "../stores/interviewStore"

/* ── Agent configs ────────────────────────────────────── */
const AGENTS = {
  architect: {
    position: [0, 0, -1.6],
    rotationY: 0,
    color: "#3b82f6",
    skinTone: "#f5d0b5",
    suitColor: "#2a2d34",
    shirtColor: "#ffffff",
    hairColor: "#1a1410",
    scale: 1.0,
  },
  observer: {
    position: [-2.0, 0, -1.9],
    rotationY: 0.25,
    color: "#8b5cf6",
    skinTone: "#d4a373",
    suitColor: "#1e293b",
    shirtColor: "#f8fafc",
    hairColor: "#0a0804",
    scale: 1.0,
  },
  manager: {
    position: [2.0, 0, -1.9],
    rotationY: -0.25,
    color: "#f59e0b",
    skinTone: "#8d5524",
    suitColor: "#171717",
    shirtColor: "#ffffff",
    hairColor: "#2a1a0a",
    scale: 1.0,
  },
}

/* ── Single Interviewer ───────────────────────────────── */
function Interviewer({ agent }) {
  const cfg = AGENTS[agent]
  const headRef = useRef()
  const bodyRef = useRef()
  const jawRef = useRef()
  const lEyeRef = useRef()
  const rEyeRef = useRef()
  const lEyeLidRef = useRef()
  const rEyeLidRef = useRef()
  const activeIndicatorRef = useRef()

  const agentState = useInterviewStore(s => s.agentStates[agent])
  const isActive = useInterviewStore(s => s.activeAgent === agent)

  const targets = useRef({
    headRX: 0, headRY: 0, headRZ: 0,
    bodyRX: 0, jawRX: 0, glowI: 0.3,
  })

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const tgt = targets.current
    const spd = 5

    switch (agentState) {
      case "talking":
        tgt.headRX = Math.sin(t * 2.2) * 0.05
        tgt.headRY = Math.sin(t * 1.5) * 0.08
        tgt.headRZ = Math.sin(t * 1.1) * 0.025
        tgt.bodyRX = -0.04
        tgt.jawRX = Math.abs(Math.sin(t * 7)) * 0.14
        tgt.glowI = 1.8
        break
      case "thinking":
        tgt.headRX = -0.08
        tgt.headRY = 0.15
        tgt.headRZ = 0.05
        tgt.bodyRX = 0.06
        tgt.jawRX = 0
        tgt.glowI = 0.6
        break
      case "nodding":
        tgt.headRX = Math.sin(t * 5.5) * 0.18
        tgt.headRY = 0
        tgt.headRZ = 0
        tgt.bodyRX = -0.03
        tgt.jawRX = 0
        tgt.glowI = 1.2
        break
      case "distracted":
        tgt.headRX = 0.18
        tgt.headRY = agent === "observer" ? -0.42 : 0.42
        tgt.headRZ = -0.04
        tgt.bodyRX = 0.04
        tgt.jawRX = 0
        tgt.glowI = 0.15
        break
      case "whispering":
        tgt.headRX = 0.04
        tgt.headRY = agent === "observer" ? 0.72 : -0.72
        tgt.headRZ = 0
        tgt.bodyRX = -0.02
        tgt.jawRX = Math.abs(Math.sin(t * 8)) * 0.035
        tgt.glowI = 0.35
        break
      default:
        tgt.headRX = Math.sin(t * 0.5 + agent.length) * 0.012
        tgt.headRY = Math.sin(t * 0.35) * 0.02
        tgt.headRZ = Math.sin(t * 0.28) * 0.006
        tgt.bodyRX = 0
        tgt.jawRX = 0
        tgt.glowI = isActive ? 0.9 : 0.3
    }

    if (headRef.current) {
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, tgt.headRX, delta * spd)
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, tgt.headRY, delta * spd)
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, tgt.headRZ, delta * spd)
    }
    if (bodyRef.current) {
      const breathe = Math.sin(t * 1.3 + agent.length * 2) * 0.004
      bodyRef.current.scale.y = 1 + breathe
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, tgt.bodyRX, delta * spd)
    }
    if (jawRef.current) {
      jawRef.current.rotation.x = THREE.MathUtils.lerp(jawRef.current.rotation.x, tgt.jawRX, delta * 10)
    }
    // Natural blink animation
    if (lEyeLidRef.current && rEyeLidRef.current) {
      const blinkCycle = Math.sin(t * 0.4 + agent.length * 3)
      const blink = blinkCycle > 0.97 ? (blinkCycle - 0.97) / 0.03 : 0
      lEyeLidRef.current.scale.y = THREE.MathUtils.lerp(lEyeLidRef.current.scale.y, blink > 0 ? 1 : 0.05, delta * 30)
      rEyeLidRef.current.scale.y = THREE.MathUtils.lerp(rEyeLidRef.current.scale.y, blink > 0 ? 1 : 0.05, delta * 30)
    }
    if (activeIndicatorRef.current) {
      const opTarget = isActive ? 0.7 : 0
      activeIndicatorRef.current.material.opacity = THREE.MathUtils.lerp(
        activeIndicatorRef.current.material.opacity, opTarget, delta * 4
      )
    }
  })

  const skin = useMemo(() => ({ color: cfg.skinTone, roughness: 0.72, metalness: 0.02 }), [cfg.skinTone])
  const suit = useMemo(() => ({ color: cfg.suitColor, roughness: 0.78, metalness: 0.1 }), [cfg.suitColor])
  const shirt = useMemo(() => ({ color: cfg.shirtColor, roughness: 0.85, metalness: 0.02 }), [cfg.shirtColor])

  // Seated position: legs bent, torso slightly forward-tilted
  // Seat height ~0.45 (chair seat). Body above chair.
  return (
    <group position={cfg.position} rotation={[0, cfg.rotationY, 0]} scale={cfg.scale || 1}>

      {/* ── ACTIVE SPEAKING INDICATOR — ring on floor ── */}
      <mesh ref={activeIndicatorRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.5, 32]} />
        <meshStandardMaterial
          color={cfg.color}
          emissive={cfg.color}
          emissiveIntensity={0.8}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Agent spotlight from above ─────────────── */}
      <pointLight
        position={[0, 3.5, 0.5]}
        intensity={isActive ? 1.2 : 0.6}
        color="#fffaf0"
        distance={6}
      />

      {/* ═══════ SEATED BODY ═══════ */}

      {/* ── UPPER LEGS (thighs, going down-forward from hips) ── */}
      <group position={[0, 0.45, 0.18]}>
        {/* Left thigh */}
        <mesh position={[-0.12, -0.12, 0.05]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.38, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        {/* Right thigh */}
        <mesh position={[0.12, -0.12, 0.05]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.38, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        {/* Left lower leg (shin, going down) */}
        <mesh position={[-0.12, -0.38, 0.22]} rotation={[-0.4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.38, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        {/* Right lower leg */}
        <mesh position={[0.12, -0.38, 0.22]} rotation={[-0.4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.38, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        {/* Left shoe */}
        <mesh position={[-0.12, -0.55, 0.08]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.065, 0.22]} />
          <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* Right shoe */}
        <mesh position={[0.12, -0.55, 0.08]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.065, 0.22]} />
          <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.2} />
        </mesh>
      </group>

      {/* ── TORSO GROUP ─────────────────────────────── */}
      <group ref={bodyRef} position={[0, 0.68, 0]}>

        {/* Suit jacket — torso */}
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.6, 0.28]} />
          <meshStandardMaterial {...suit} />
        </mesh>

        {/* Shirt / collar V visible */}
        <mesh position={[0, 0.25, 0.13]}>
          <boxGeometry args={[0.16, 0.1, 0.06]} />
          <meshStandardMaterial {...shirt} />
        </mesh>

        {/* Lapels — left and right */}
        <mesh position={[-0.07, 0.18, 0.143]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[0.08, 0.14, 0.02]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        <mesh position={[0.07, 0.18, 0.143]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.08, 0.14, 0.02]} />
          <meshStandardMaterial {...suit} />
        </mesh>

        {/* Shoulders — broader */}
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[0.72, 0.1, 0.3]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        {/* Shoulder caps */}
        <mesh position={[-0.33, 0.24, 0]} castShadow>
          <sphereGeometry args={[0.085, 10, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        <mesh position={[0.33, 0.24, 0]} castShadow>
          <sphereGeometry args={[0.085, 10, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>

        {/* ── LEFT ARM ──── */}
        <group>
          {/* Upper arm */}
          <mesh position={[-0.4, 0.04, 0.05]} rotation={[0.3, 0, 0.15]} castShadow>
            <cylinderGeometry args={[0.052, 0.046, 0.35, 8]} />
            <meshStandardMaterial {...suit} />
          </mesh>
          {/* Forearm — resting on table */}
          <mesh position={[-0.38, -0.18, 0.2]} rotation={[1.0, 0, 0.1]} castShadow>
            <cylinderGeometry args={[0.044, 0.038, 0.34, 8]} />
            <meshStandardMaterial {...suit} />
          </mesh>
          {/* Cuff */}
          <mesh position={[-0.35, -0.2, 0.37]} rotation={[1.0, 0, 0.1]}>
            <cylinderGeometry args={[0.042, 0.042, 0.04, 8]} />
            <meshStandardMaterial {...shirt} />
          </mesh>
          {/* Hand */}
          <mesh position={[-0.33, -0.22, 0.42]} castShadow>
            <sphereGeometry args={[0.038, 8, 6]} />
            <meshStandardMaterial {...skin} />
          </mesh>
        </group>

        {/* ── RIGHT ARM ──── */}
        <group>
          <mesh position={[0.4, 0.04, 0.05]} rotation={[0.3, 0, -0.15]} castShadow>
            <cylinderGeometry args={[0.052, 0.046, 0.35, 8]} />
            <meshStandardMaterial {...suit} />
          </mesh>
          <mesh position={[0.38, -0.18, 0.2]} rotation={[1.0, 0, -0.1]} castShadow>
            <cylinderGeometry args={[0.044, 0.038, 0.34, 8]} />
            <meshStandardMaterial {...suit} />
          </mesh>
          {/* Cuff */}
          <mesh position={[0.35, -0.2, 0.37]} rotation={[1.0, 0, -0.1]}>
            <cylinderGeometry args={[0.042, 0.042, 0.04, 8]} />
            <meshStandardMaterial {...shirt} />
          </mesh>
          <mesh position={[0.33, -0.22, 0.42]} castShadow>
            <sphereGeometry args={[0.038, 8, 6]} />
            <meshStandardMaterial {...skin} />
          </mesh>
        </group>

        {/* ── Tie ──── */}
        <mesh position={[0, 0.08, 0.152]} castShadow>
          <boxGeometry args={[0.055, 0.32, 0.02]} />
          <meshStandardMaterial color={cfg.color} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* Tie knot */}
        <mesh position={[0, 0.25, 0.148]}>
          <boxGeometry args={[0.06, 0.045, 0.03]} />
          <meshStandardMaterial color={cfg.color} roughness={0.5} metalness={0.2} />
        </mesh>

        {/* Suit button */}
        <mesh position={[0, -0.04, 0.143]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshStandardMaterial color="#aaaaaa" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* ── NECK ──────────────────────────────────── */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.11, 10]} />
        <meshStandardMaterial {...skin} />
      </mesh>

      {/* ── HEAD GROUP ────────────────────────────── */}
      <group ref={headRef} position={[0, 1.24, 0]}>
        {/* Cranium — slightly oval */}
        <mesh castShadow scale={[1, 1.12, 0.95]}>
          <sphereGeometry args={[0.148, 20, 18]} />
          <meshStandardMaterial {...skin} />
        </mesh>

        {/* Cheekbones */}
        <mesh position={[-0.1, -0.03, 0.08]} scale={[1, 0.6, 0.7]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0.1, -0.03, 0.08]} scale={[1, 0.6, 0.7]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial {...skin} />
        </mesh>

        {/* Hair (dark cap on top of head) */}
        <mesh position={[0, 0.055, -0.015]} castShadow scale={[1, 1, 0.96]}>
          <sphereGeometry args={[0.152, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
          <meshStandardMaterial color={cfg.hairColor} roughness={0.95} metalness={0} />
        </mesh>
        {/* Side hair */}
        <mesh position={[-0.12, 0.01, 0]} rotation={[0, -0.2, 0.2]}>
          <boxGeometry args={[0.02, 0.1, 0.1]} />
          <meshStandardMaterial color={cfg.hairColor} roughness={0.95} metalness={0} />
        </mesh>
        <mesh position={[0.12, 0.01, 0]} rotation={[0, 0.2, -0.2]}>
          <boxGeometry args={[0.02, 0.1, 0.1]} />
          <meshStandardMaterial color={cfg.hairColor} roughness={0.95} metalness={0} />
        </mesh>

        {/* Forehead / brow ridge */}
        <mesh position={[0, 0.03, 0.118]}>
          <boxGeometry args={[0.19, 0.022, 0.045]} />
          <meshStandardMaterial {...skin} />
        </mesh>

        {/* Eyebrows */}
        <mesh position={[-0.055, 0.048, 0.132]}>
          <boxGeometry args={[0.058, 0.01, 0.012]} />
          <meshStandardMaterial color={cfg.hairColor} roughness={0.9} metalness={0} />
        </mesh>
        <mesh position={[0.055, 0.048, 0.132]}>
          <boxGeometry args={[0.058, 0.01, 0.012]} />
          <meshStandardMaterial color={cfg.hairColor} roughness={0.9} metalness={0} />
        </mesh>

        {/* Nose bridge */}
        <mesh position={[0, -0.015, 0.147]}>
          <boxGeometry args={[0.028, 0.055, 0.028]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        {/* Nose tip */}
        <mesh position={[0, -0.04, 0.16]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial {...skin} />
        </mesh>

        {/* ── EYES — Sockets, irises, whites, pupils ── */}
        {/* Eye white sclera — left */}
        <mesh position={[-0.053, 0.01, 0.128]}>
          <sphereGeometry args={[0.027, 10, 10]} />
          <meshStandardMaterial color="#f5f5f0" roughness={0.1} metalness={0} />
        </mesh>
        {/* Eye white sclera — right */}
        <mesh position={[0.053, 0.01, 0.128]}>
          <sphereGeometry args={[0.027, 10, 10]} />
          <meshStandardMaterial color="#f5f5f0" roughness={0.1} metalness={0} />
        </mesh>
        {/* Iris — left */}
        <mesh ref={lEyeRef} position={[-0.053, 0.01, 0.143]}>
          <sphereGeometry args={[0.016, 10, 10]} />
          <meshStandardMaterial color="#3a2810" roughness={0.05} />
        </mesh>
        {/* Iris — right */}
        <mesh ref={rEyeRef} position={[0.053, 0.01, 0.143]}>
          <sphereGeometry args={[0.016, 10, 10]} />
          <meshStandardMaterial color="#3a2810" roughness={0.05} />
        </mesh>
        {/* Pupils */}
        <mesh position={[-0.053, 0.01, 0.15]}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshStandardMaterial color="#050505" roughness={0} />
        </mesh>
        <mesh position={[0.053, 0.01, 0.15]}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshStandardMaterial color="#050505" roughness={0} />
        </mesh>
        {/* Eye shine */}
        <mesh position={[-0.046, 0.016, 0.154]}>
          <sphereGeometry args={[0.004, 6, 6]} />
          <meshStandardMaterial color="#ffffff" roughness={0} emissive="#ffffff" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.046, 0.016, 0.154]}>
          <sphereGeometry args={[0.004, 6, 6]} />
          <meshStandardMaterial color="#ffffff" roughness={0} emissive="#ffffff" emissiveIntensity={0.8} />
        </mesh>
        {/* Upper eyelids (blink) */}
        <mesh ref={lEyeLidRef} position={[-0.053, 0.015, 0.145]} scale={[1, 0.05, 1]}>
          <sphereGeometry args={[0.028, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh ref={rEyeLidRef} position={[0.053, 0.015, 0.145]} scale={[1, 0.05, 1]}>
          <sphereGeometry args={[0.028, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial {...skin} />
        </mesh>

        {/* ── Mouth ─── */}
        <mesh position={[0, -0.068, 0.142]}>
          <boxGeometry args={[0.065, 0.012, 0.01]} />
          <meshStandardMaterial color="#7a3525" roughness={0.7} metalness={0} />
        </mesh>

        {/* ── JAW (moves when talking) ─────────── */}
        <group ref={jawRef} position={[0, -0.095, 0.055]}>
          <mesh>
            <boxGeometry args={[0.09, 0.032, 0.065]} />
            <meshStandardMaterial {...skin} />
          </mesh>
        </group>

        {/* Ears */}
        <mesh position={[-0.148, 0, 0]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0.148, 0, 0]}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshStandardMaterial {...skin} />
        </mesh>
      </group>

    </group>
  )
}

/* ═══════════════════════════════════════════════════════ */
export default function InterviewerAvatars() {
  return (
    <group>
      <Interviewer agent="architect" />
      <Interviewer agent="observer" />
      <Interviewer agent="manager" />
    </group>
  )
}

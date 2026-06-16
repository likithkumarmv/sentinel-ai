import React, { useRef, useMemo, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"
import * as THREE from "three"

/* 
  STANDALONE 3D INTERVIEW ROOM COMPONENT
  This file contains the complete code for the boardroom environment, 
  lighting, post-processing, and interactive interviewer avatars.
  
  Dependencies:
  - three
  - @react-three/fiber
  - @react-three/drei (optional, but recommended for better controls)
  - @react-three/postprocessing
*/

// ── CONSTANTS & THEMES ──────────────────────────────────────────────────

const DARK_WALL = { color: "#ffffff", roughness: 0.9, metalness: 0.05 }
const FLOOR_MAT = { color: "#d9d5c1", roughness: 0.95, metalness: 0.0 }
const PANEL_MAT = { color: "#f0f2f5", roughness: 0.8, metalness: 0.1 }
const TRIM_MAT  = { color: "#a0a0a0", roughness: 0.5, metalness: 0.5 }
const GLASS_MAT = { color: "#ffffff", transparent: true, opacity: 0.2, roughness: 0.01, metalness: 0.95, side: THREE.DoubleSide }
const CHAIR_MAT = { color: "#2e2e2e", roughness: 0.8, metalness: 0.1 }
const SCREEN_MAT = { color: "#111", roughness: 0.2, metalness: 0.5 }
const TABLE_MAT = { color: "#8B5A2B", roughness: 0.6, metalness: 0.1 }
const TABLE_LEG_MAT = { color: "#dddddd", roughness: 0.4, metalness: 0.8 }

const AGENT_CONFIGS = {
  architect: {
    position: [0, 0, -1.6],
    rotationY: 0,
    color: "#3b82f6",
    skinTone: "#f5d0b5",
    suitColor: "#2a2d34",
    shirtColor: "#ffffff",
    hairColor: "#1a1410",
  },
  observer: {
    position: [-2.0, 0, -1.9],
    rotationY: 0.25,
    color: "#8b5cf6",
    skinTone: "#d4a373",
    suitColor: "#1e293b",
    shirtColor: "#f8fafc",
    hairColor: "#0a0804",
  },
  manager: {
    position: [2.0, 0, -1.9],
    rotationY: -0.25,
    color: "#f59e0b",
    skinTone: "#8d5524",
    suitColor: "#171717",
    shirtColor: "#ffffff",
    hairColor: "#2a1a0a",
  },
}

// ── SUB-COMPONENTS: ENVIRONMENT ─────────────────────────────────────────

function Chair({ position, rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      <mesh position={[0, 0.85, -0.22]} castShadow>
        <boxGeometry args={[0.48, 0.75, 0.05]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      <mesh position={[0, 1.28, -0.22]} castShadow>
        <boxGeometry args={[0.32, 0.12, 0.06]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      <mesh position={[-0.28, 0.62, -0.05]} castShadow>
        <boxGeometry args={[0.04, 0.04, 0.35]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      <mesh position={[0.28, 0.62, -0.05]} castShadow>
        <boxGeometry args={[0.04, 0.04, 0.35]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#0a0e16" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.02, 5]} />
        <meshStandardMaterial color="#0a0e16" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

function CeilingLight({ position, width = 2, depth = 0.4 }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width, 0.03, depth]} />
        <meshStandardMaterial color="#060a12" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[width - 0.1, 0.005, depth - 0.05]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.0} />
      </mesh>
      <pointLight position={[0, -0.3, 0]} intensity={0.5} color="#ffffff" distance={8} />
    </group>
  )
}

function WallPanel({ position, width, height, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <boxGeometry args={[width, height, 0.08]} />
        <meshStandardMaterial {...PANEL_MAT} />
      </mesh>
      <mesh position={[0, height * 0.3, 0.045]}>
        <boxGeometry args={[width - 0.1, 0.008, 0.005]} />
        <meshStandardMaterial {...TRIM_MAT} />
      </mesh>
    </group>
  )
}

function BoardroomEnvironment() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial {...FLOOR_MAT} />
      </mesh>
      <gridHelper args={[24, 40, "#0d1520", "#0a1018"]} position={[0, 0.001, 0]} />

      {/* Ceiling */}
      <mesh position={[0, 5.5, -2]} receiveShadow>
        <boxGeometry args={[24, 0.15, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0.0} />
      </mesh>
      <CeilingLight position={[-2, 5.4, -1]} width={3} depth={0.3} />
      <CeilingLight position={[2, 5.4, -1]} width={3} depth={0.3} />
      <CeilingLight position={[0, 5.4, 1.5]} width={4} depth={0.3} />

      {/* Back Wall */}
      <mesh position={[0, 2.75, -6]} receiveShadow>
        <boxGeometry args={[24, 5.5, 0.15]} />
        <meshStandardMaterial {...DARK_WALL} />
      </mesh>
      <WallPanel position={[-4, 2.5, -5.9]} width={2.5} height={3.2} />
      <WallPanel position={[0, 2.5, -5.9]} width={3} height={3.2} />
      <WallPanel position={[4, 2.5, -5.9]} width={2.5} height={3.2} />

      <mesh position={[-1.5, 3.2, -5.82]}>
        <boxGeometry args={[3, 1.8, 0.04]} />
        <meshStandardMaterial {...SCREEN_MAT} />
      </mesh>
      <mesh position={[-1.5, 3.2, -5.80]}>
        <boxGeometry args={[3.06, 1.86, 0.01]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[2, 3.2, -5.82]}>
        <boxGeometry args={[2.5, 1.8, 0.02]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.1} metalness={0.1} />
      </mesh>

      {/* Side Walls */}
      <mesh position={[-10, 2.75, -2]} receiveShadow>
        <boxGeometry args={[0.15, 5.5, 20]} />
        <meshStandardMaterial {...DARK_WALL} />
      </mesh>
      <mesh position={[10, 2.75, -2]} receiveShadow>
        <boxGeometry args={[0.15, 5.5, 20]} />
        <meshStandardMaterial {...DARK_WALL} />
      </mesh>

      {/* Table */}
      <group position={[0, 0.88, -0.8]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 0.08, 2.5]} />
          <meshStandardMaterial {...TABLE_MAT} />
        </mesh>
        <mesh position={[0, -0.44, -2]} castShadow>
          <boxGeometry args={[0.1, 0.8, 1.2]} />
          <meshStandardMaterial {...TABLE_LEG_MAT} />
        </mesh>
        <mesh position={[2, -0.44, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 1.2]} />
          <meshStandardMaterial {...TABLE_LEG_MAT} />
        </mesh>
        <mesh position={[-2, -0.44, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 1.2]} />
          <meshStandardMaterial {...TABLE_LEG_MAT} />
        </mesh>
      </group>

      {/* Chairs */}
      <Chair position={[0, 0, -2.1]} rotationY={0} />
      <Chair position={[-2.0, 0, -2.3]} rotationY={0.3} />
      <Chair position={[2.0, 0, -2.3]} rotationY={-0.3} />
    </group>
  )
}

// ── SUB-COMPONENTS: INTERVIEWERS ────────────────────────────────────────

function Interviewer({ agentId, agentState = "idle", isActive = false }) {
  const cfg = AGENT_CONFIGS[agentId]
  const headRef = useRef()
  const bodyRef = useRef()
  const jawRef = useRef()
  const lEyeRef = useRef()
  const rEyeRef = useRef()
  const lEyeLidRef = useRef()
  const rEyeLidRef = useRef()
  const activeIndicatorRef = useRef()

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
      default:
        tgt.headRX = Math.sin(t * 0.5 + agentId.length) * 0.012
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
      const breathe = Math.sin(t * 1.3 + agentId.length * 2) * 0.004
      bodyRef.current.scale.y = 1 + breathe
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, tgt.bodyRX, delta * spd)
    }
    if (jawRef.current) {
      jawRef.current.rotation.x = THREE.MathUtils.lerp(jawRef.current.rotation.x, tgt.jawRX, delta * 10)
    }
    if (lEyeLidRef.current && rEyeLidRef.current) {
      const blinkCycle = Math.sin(t * 0.4 + agentId.length * 3)
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

  return (
    <group position={cfg.position} rotation={[0, cfg.rotationY, 0]}>
      {/* Active Indicator */}
      <mesh ref={activeIndicatorRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.5, 32]} />
        <meshStandardMaterial color={cfg.color} emissive={cfg.color} emissiveIntensity={0.8} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Agent spotlight */}
      <pointLight position={[0, 3.5, 0.5]} intensity={isActive ? 1.2 : 0.6} color="#fffaf0" distance={6} />

      {/* Detailed Body */}
      <group position={[0, 0.45, 0.18]}>
        {/* Legs */}
        <mesh position={[-0.12, -0.12, 0.05]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.38, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        <mesh position={[0.12, -0.12, 0.05]} rotation={[0.5, 0, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.38, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        <mesh position={[-0.12, -0.38, 0.22]} rotation={[-0.4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.38, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        <mesh position={[0.12, -0.38, 0.22]} rotation={[-0.4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.38, 8]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        {/* Shoes */}
        <mesh position={[-0.12, -0.55, 0.08]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.065, 0.22]} />
          <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0.12, -0.55, 0.08]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.065, 0.22]} />
          <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.2} />
        </mesh>
      </group>

      {/* Torso */}
      <group ref={bodyRef} position={[0, 0.68, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.6, 0.28]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        <mesh position={[0, 0.25, 0.13]}>
          <boxGeometry args={[0.16, 0.1, 0.06]} />
          <meshStandardMaterial {...shirt} />
        </mesh>
        {/* Lapels */}
        <mesh position={[-0.07, 0.18, 0.143]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[0.08, 0.14, 0.02]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        <mesh position={[0.07, 0.18, 0.143]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.08, 0.14, 0.02]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        {/* Shoulders */}
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[0.72, 0.1, 0.3]} />
          <meshStandardMaterial {...suit} />
        </mesh>
        {/* Arms */}
        <group>
          <mesh position={[-0.4, 0.04, 0.05]} rotation={[0.3, 0, 0.15]} castShadow>
            <cylinderGeometry args={[0.052, 0.046, 0.35, 8]} />
            <meshStandardMaterial {...suit} />
          </mesh>
          <mesh position={[-0.38, -0.18, 0.2]} rotation={[1.0, 0, 0.1]} castShadow>
            <cylinderGeometry args={[0.044, 0.038, 0.34, 8]} />
            <meshStandardMaterial {...suit} />
          </mesh>
          <mesh position={[-0.33, -0.22, 0.42]} castShadow>
            <sphereGeometry args={[0.038, 8, 6]} />
            <meshStandardMaterial {...skin} />
          </mesh>
        </group>
        <group>
          <mesh position={[0.4, 0.04, 0.05]} rotation={[0.3, 0, -0.15]} castShadow>
            <cylinderGeometry args={[0.052, 0.046, 0.35, 8]} />
            <meshStandardMaterial {...suit} />
          </mesh>
          <mesh position={[0.38, -0.18, 0.2]} rotation={[1.0, 0, -0.1]} castShadow>
            <cylinderGeometry args={[0.044, 0.038, 0.34, 8]} />
            <meshStandardMaterial {...suit} />
          </mesh>
          <mesh position={[0.33, -0.22, 0.42]} castShadow>
            <sphereGeometry args={[0.038, 8, 6]} />
            <meshStandardMaterial {...skin} />
          </mesh>
        </group>
        {/* Tie */}
        <mesh position={[0, 0.08, 0.152]} castShadow>
          <boxGeometry args={[0.055, 0.32, 0.02]} />
          <meshStandardMaterial color={cfg.color} roughness={0.55} metalness={0.15} />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.11, 10]} />
        <meshStandardMaterial {...skin} />
      </mesh>

      {/* Head */}
      <group ref={headRef} position={[0, 1.24, 0]}>
        <mesh castShadow scale={[1, 1.12, 0.95]}>
          <sphereGeometry args={[0.148, 20, 18]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0, 0.055, -0.015]} castShadow scale={[1, 1, 0.96]}>
          <sphereGeometry args={[0.152, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
          <meshStandardMaterial color={cfg.hairColor} roughness={0.95} metalness={0} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.04, 0.16]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        {/* Eyes Detailed */}
        <mesh position={[-0.053, 0.01, 0.128]}>
          <sphereGeometry args={[0.027, 10, 10]} />
          <meshStandardMaterial color="#f5f5f0" />
        </mesh>
        <mesh position={[0.053, 0.01, 0.128]}>
          <sphereGeometry args={[0.027, 10, 10]} />
          <meshStandardMaterial color="#f5f5f0" />
        </mesh>
        {/* Irises */}
        <mesh ref={lEyeRef} position={[-0.053, 0.01, 0.143]}>
          <sphereGeometry args={[0.016, 10, 10]} />
          <meshStandardMaterial color="#3a2810" />
        </mesh>
        <mesh ref={rEyeRef} position={[0.053, 0.01, 0.143]}>
          <sphereGeometry args={[0.016, 10, 10]} />
          <meshStandardMaterial color="#3a2810" />
        </mesh>
        {/* Lids */}
        <mesh ref={lEyeLidRef} position={[-0.053, 0.015, 0.145]} scale={[1, 0.05, 1]}>
          <sphereGeometry args={[0.028, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh ref={rEyeLidRef} position={[0.053, 0.015, 0.145]} scale={[1, 0.05, 1]}>
          <sphereGeometry args={[0.028, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        {/* Jaw */}
        <group ref={jawRef} position={[0, -0.095, 0.055]}>
          <mesh>
            <boxGeometry args={[0.09, 0.032, 0.065]} />
            <meshStandardMaterial {...skin} />
          </mesh>
        </group>
      </group>
    </group>
  )
}


// ── MAIN EXPORT: INTERVIEW ROOM ─────────────────────────────────────────

/**
 * StandaloneInterviewRoom
 * @param {Object} agentStates - Map of agent IDs to their current state ('idle', 'talking', 'thinking', 'nodding')
 * @param {string} activeAgent - The ID of the currently active agent
 */
export default function StandaloneInterviewRoom({ 
  agentStates = { architect: "idle", observer: "idle", manager: "idle" },
  activeAgent = "architect" 
}) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#000" }}>
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 5.2], fov: 60, near: 0.1, far: 80 }}
        gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.2 }}
        dpr={[1, 1.5]}
      >
        <fog attach="fog" args={["#f0f4f8", 5, 40]} />

        {/* Lighting */}
        <ambientLight intensity={1.2} color="#ffffff" />
        <directionalLight
          position={[8, 5, 2]}
          intensity={2.5}
          color="#fffaee"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-5, 4, 6]} intensity={1.2} color="#e6f0fa" />
        <pointLight position={[-3.5, 3.2, -3.5]} intensity={1.0} distance={10} />
        <pointLight position={[3.5, 3.2, -3.5]} intensity={1.0} distance={10} />

        {/* Scene Content */}
        <BoardroomEnvironment />
        
        <group>
          {Object.keys(AGENT_CONFIGS).map(id => (
            <Interviewer 
              key={id} 
              agentId={id} 
              agentState={agentStates[id] || "idle"} 
              isActive={activeAgent === id} 
            />
          ))}
        </group>

        {/* Post Processing */}
        <EffectComposer>
          <Bloom intensity={0.6} luminanceThreshold={0.5} luminanceSmoothing={0.8} mipmapBlur />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

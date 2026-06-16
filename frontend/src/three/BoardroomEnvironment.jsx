import { useMemo } from "react"
import * as THREE from "three"

/* ── Material presets ─────────────────────────────────── */
const DARK_WALL = { color: "#ffffff", roughness: 0.9, metalness: 0.05 }
const FLOOR_MAT = { color: "#d9d5c1", roughness: 0.95, metalness: 0.0 } // Beige carpet
const PANEL_MAT = { color: "#f0f2f5", roughness: 0.8, metalness: 0.1 }
const TRIM_MAT  = { color: "#a0a0a0", roughness: 0.5, metalness: 0.5 } // Aluminum trim
const GLASS_MAT = { color: "#ffffff", transparent: true, opacity: 0.2, roughness: 0.01, metalness: 0.95, side: THREE.DoubleSide }
const CHAIR_MAT = { color: "#2e2e2e", roughness: 0.8, metalness: 0.1 } // Dark grey fabric chairs
const SCREEN_MAT = { color: "#111", roughness: 0.2, metalness: 0.5 }
const TABLE_MAT = { color: "#8B5A2B", roughness: 0.6, metalness: 0.1 } // Wood table
const TABLE_LEG_MAT = { color: "#dddddd", roughness: 0.4, metalness: 0.8 } // Aluminum legs

/* ── Chair (executive high-back silhouette) ──────────── */
function Chair({ position, rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.85, -0.22]} castShadow>
        <boxGeometry args={[0.48, 0.75, 0.05]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      {/* Headrest */}
      <mesh position={[0, 1.28, -0.22]} castShadow>
        <boxGeometry args={[0.32, 0.12, 0.06]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      {/* Armrests */}
      <mesh position={[-0.28, 0.62, -0.05]} castShadow>
        <boxGeometry args={[0.04, 0.04, 0.35]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      <mesh position={[0.28, 0.62, -0.05]} castShadow>
        <boxGeometry args={[0.04, 0.04, 0.35]} />
        <meshStandardMaterial {...CHAIR_MAT} />
      </mesh>
      {/* Base pedestal */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#0a0e16" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Base star */}
      <mesh position={[0, 0.03, 0]} rotation={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.02, 5]} />
        <meshStandardMaterial color="#0a0e16" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

/* ── Ceiling light panel ──────────────────────────────── */
function CeilingLight({ position, width = 2, depth = 0.4 }) {
  return (
    <group position={position}>
      {/* Recessed housing */}
      <mesh>
        <boxGeometry args={[width, 0.03, depth]} />
        <meshStandardMaterial color="#060a12" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Light strip */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[width - 0.1, 0.005, depth - 0.05]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={1.0}
        />
      </mesh>
      <pointLight position={[0, -0.3, 0]} intensity={0.5} color="#ffffff" distance={8} />
    </group>
  )
}

/* ── Wall panel with trim ─────────────────────────────── */
function WallPanel({ position, width, height, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow>
        <boxGeometry args={[width, height, 0.08]} />
        <meshStandardMaterial {...PANEL_MAT} />
      </mesh>
      {/* Horizontal trim line */}
      <mesh position={[0, height * 0.3, 0.045]}>
        <boxGeometry args={[width - 0.1, 0.008, 0.005]} />
        <meshStandardMaterial {...TRIM_MAT} />
      </mesh>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════ */
export default function BoardroomEnvironment() {
  return (
    <group>

      {/* ── FLOOR ─────────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial {...FLOOR_MAT} />
      </mesh>
      {/* Floor grid — very subtle */}
      <gridHelper args={[24, 40, "#0d1520", "#0a1018"]} position={[0, 0.001, 0]} />

      {/* ── CEILING ───────────────────────────────── */}
      <mesh position={[0, 5.5, -2]} receiveShadow>
        <boxGeometry args={[24, 0.15, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0.0} />
      </mesh>

      {/* Ceiling light strips */}
      <CeilingLight position={[-2, 5.4, -1]} width={3} depth={0.3} />
      <CeilingLight position={[2, 5.4, -1]} width={3} depth={0.3} />
      <CeilingLight position={[0, 5.4, 1.5]} width={4} depth={0.3} />

      {/* ── BACK WALL ─────────────────────────────── */}
      <mesh position={[0, 2.75, -6]} receiveShadow>
        <boxGeometry args={[24, 5.5, 0.15]} />
        <meshStandardMaterial {...DARK_WALL} />
      </mesh>

      {/* Back wall panels */}
      <WallPanel position={[-4, 2.5, -5.9]} width={2.5} height={3.2} />
      <WallPanel position={[0, 2.5, -5.9]} width={3} height={3.2} />
      <WallPanel position={[4, 2.5, -5.9]} width={2.5} height={3.2} />

      {/* ── Large presentation screen (back wall center) */}
      <mesh position={[-1.5, 3.2, -5.82]}>
        <boxGeometry args={[3, 1.8, 0.04]} />
        <meshStandardMaterial {...SCREEN_MAT} />
      </mesh>
      {/* Screen border glow */}
      <mesh position={[-1.5, 3.2, -5.80]}>
        <boxGeometry args={[3.06, 1.86, 0.01]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      {/* Screen content glow */}
      <pointLight position={[-1.5, 3.2, -5.5]} intensity={0.3} color="#ffffff" distance={4} />

      {/* ── Whiteboard (back wall right) */}
      <mesh position={[2, 3.2, -5.82]}>
        <boxGeometry args={[2.5, 1.8, 0.02]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.1} metalness={0.1} />
      </mesh>

      {/* ── SIDE WALLS ────────────────────────────── */}
      {/* Left wall */}
      <mesh position={[-10, 2.75, -2]} receiveShadow>
        <boxGeometry args={[0.15, 5.5, 20]} />
        <meshStandardMaterial {...DARK_WALL} />
      </mesh>
      {/* Right wall */}
      <mesh position={[10, 2.75, -2]} receiveShadow>
        <boxGeometry args={[0.15, 5.5, 20]} />
        <meshStandardMaterial {...DARK_WALL} />
      </mesh>

      {/* Side wall glass panels (windows into void) */}
      <mesh position={[-9.9, 3, -2]}>
        <boxGeometry args={[0.02, 2.5, 6]} />
        <meshPhysicalMaterial {...GLASS_MAT} />
      </mesh>
      <mesh position={[9.9, 3, -2]}>
        <boxGeometry args={[0.02, 2.5, 6]} />
        <meshPhysicalMaterial {...GLASS_MAT} />
      </mesh>

      {/* ── TABLE — massive executive slab ─────────── */}
      <group position={[0, 0.88, -0.8]}>
        {/* Main table top */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 0.08, 2.5]} />
          <meshStandardMaterial {...TABLE_MAT} />
        </mesh>
        {/* Table edge trim */}
        <mesh position={[0, -0.042, 0]}>
          <boxGeometry args={[6.04, 0.005, 2.54]} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
        {/* Table support legs — two angular slabs */}
        <mesh position={[-2, -0.44, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 1.2]} />
          <meshStandardMaterial {...TABLE_LEG_MAT} />
        </mesh>
        <mesh position={[2, -0.44, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 1.2]} />
          <meshStandardMaterial {...TABLE_LEG_MAT} />
        </mesh>
      </group>

      {/* ── CHAIRS — three for interviewers ───────── */}
      <Chair position={[0, 0, -2.1]} rotationY={0} />
      <Chair position={[-2.0, 0, -2.3]} rotationY={0.3} />
      <Chair position={[2.0, 0, -2.3]} rotationY={-0.3} />

      {/* Candidate chair (user side) — removed so it doesn't block the view */}

      {/* ── DECORATIVE ELEMENTS ───────────────────── */}
      {/* Vertical accent strips on walls */}
      {[-6, -3, 3, 6].map((x, i) => (
        <mesh key={`va${i}`} position={[x, 2.75, -5.88]}>
          <boxGeometry args={[0.02, 4.5, 0.02]} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}

      {/* Floor baseboard */}
      <mesh position={[0, 0.05, -5.9]}>
        <boxGeometry args={[20, 0.1, 0.02]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.7} />
      </mesh>
    </group>
  )
}

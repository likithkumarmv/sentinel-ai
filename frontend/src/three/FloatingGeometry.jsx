import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// ── Floating Monolith Fragment ────────────────────────
function Monolith({ position, rotation, scale, speed = 1, amplitude = 0.3 }) {
  const ref = useRef()
  const offset = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset
    ref.current.position.y = position[1] + Math.sin(t * 0.6) * amplitude
    ref.current.rotation.x += 0.001 * speed
    ref.current.rotation.z += 0.0008 * speed
  })

  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={scale} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#080810"
        roughness={0.92}
        metalness={0.08}
        envMapIntensity={0.3}
      />
    </mesh>
  )
}

// ── Glass Panel ──────────────────────────────────────
function GlassPanel({ position, rotation, scale, speed = 0.7 }) {
  const ref = useRef()
  const offset = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset
    ref.current.position.y = position[1] + Math.sin(t * 0.5) * 0.15
    ref.current.rotation.y += 0.002
  })

  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshPhysicalMaterial
        color="#0a1525"
        transparent
        opacity={0.15}
        roughness={0.05}
        metalness={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Dust Particles ───────────────────────────────────
function DustParticles({ count = 80 }) {
  const ref = useRef()

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 20
      arr[i * 3 + 1] = Math.random() * 8
      arr[i * 3 + 2] = (Math.random() - 0.5) * 16
    }
    return arr
  }, [count])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pos = ref.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.001
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#c8ff00"
        transparent
        opacity={0.25}
        sizeAttenuation
      />
    </points>
  )
}

// ── Main Export ───────────────────────────────────────
export default function FloatingGeometry() {
  return <group />
}

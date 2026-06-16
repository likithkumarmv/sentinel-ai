import { Canvas } from "@react-three/fiber"
import BoardroomEnvironment from "./BoardroomEnvironment"
import FloatingGeometry from "./FloatingGeometry"
import InterviewerAvatars from "./InterviewerAvatar"

export default function BoardroomScene() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, width: "100%", height: "100%" }}>
      <Canvas
        shadows
        camera={{
          position: [0, 1.5, 5.2],
          fov: 60,
          near: 0.1,
          far: 80,
        }}
        gl={{
          antialias: false,
          toneMapping: 3,
          toneMappingExposure: 1.2,
          powerPreference: "high-performance"
        }}
        dpr={[1, 1]}
      >
        <color attach="background" args={["#f0f4f8"]} />
        <fog attach="fog" args={["#f0f4f8", 5, 40]} />

        {/* ── Ambient — bright daytime ──── */}
        <ambientLight intensity={1.2} color="#ffffff" />

        {/* ── Key light — sunlight coming through window ────── */}
        <directionalLight
          position={[8, 5, 2]}
          intensity={2.5}
          color="#fffaee"
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-near={0.5}
          shadow-camera-far={30}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0005}
        />

        {/* ── Fill light from opposite side ────────── */}
        <directionalLight
          position={[-5, 4, 6]}
          intensity={1.2}
          color="#e6f0fa"
        />

        {/* ── Soft rim lights to separate subjects ──────────── */}
        <pointLight position={[-3.5, 3.2, -3.5]} intensity={1.0} color="#ffffff" distance={10} />
        <pointLight position={[0, 3.5, -4.5]} intensity={1.0} color="#ffffff" distance={10} />
        <pointLight position={[3.5, 3.2, -3.5]} intensity={1.0} color="#ffffff" distance={10} />

        {/* ── Additional ceiling fill ────────────────── */}
        <pointLight position={[0, 5, 0]} intensity={0.5} color="#ffffff" distance={15} />

        {/* ── Scene ──────────────────────────────── */}
        <BoardroomEnvironment />
        <InterviewerAvatars />
        <FloatingGeometry />
      </Canvas>
    </div>
  )
}

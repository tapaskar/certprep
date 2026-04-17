"use client";

import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  Line,
  Stars,
  Float,
  Edges,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import {
  awsServices,
  defaultArchitectureEdges,
  type AwsService,
  type Shape3D,
} from "@/lib/aws-services-data";

// ── Geometry per category — semantically distinct ─────────────────
function ServiceGeometry({ shape }: { shape: Shape3D }) {
  switch (shape) {
    case "box":
      return <boxGeometry args={[0.55, 0.55, 0.55]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.32, 0.32, 0.55, 32]} />;
    case "octahedron":
      return <octahedronGeometry args={[0.42, 0]} />;
    case "torus":
      return <torusGeometry args={[0.32, 0.13, 16, 32]} />;
    case "icosahedron":
      return <icosahedronGeometry args={[0.4, 0]} />;
    case "cone":
      return <coneGeometry args={[0.35, 0.6, 16]} />;
    default:
      return <sphereGeometry args={[0.35, 32, 32]} />;
  }
}

interface ServiceNodeProps {
  service: AwsService;
  onClick: (s: AwsService) => void;
  selected: boolean;
}

function ServiceNode({ service, onClick, selected }: ServiceNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += selected ? 0.012 : 0.004;
    }
    if (haloRef.current && selected) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.18;
      haloRef.current.scale.set(pulse, pulse, pulse);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  return (
    <Float
      speed={1.2}
      rotationIntensity={0.15}
      floatIntensity={0.25}
      position={service.position}
    >
      <group>
        {/* Halo when selected */}
        {selected && (
          <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.6, 0.78, 48]} />
            <meshBasicMaterial
              color={service.color}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        )}

        {/* Main mesh with distinct geometry per category */}
        <group ref={groupRef}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onClick(service);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
            castShadow
            receiveShadow
          >
            <ServiceGeometry shape={service.shape3d} />
            <meshPhysicalMaterial
              color={service.color}
              metalness={0.7}
              roughness={0.18}
              clearcoat={1}
              clearcoatRoughness={0.08}
              emissive={service.color}
              emissiveIntensity={selected ? 0.5 : 0.18}
              envMapIntensity={1.5}
            />
            <Edges color="white" threshold={15} scale={1.001}>
              <lineBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.25}
                toneMapped={false}
              />
            </Edges>
          </mesh>

          {/* Inner glowing core */}
          <mesh scale={0.65}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshBasicMaterial
              color={service.color}
              transparent
              opacity={0.4}
              toneMapped={false}
            />
          </mesh>
        </group>

        {/* Floating label card */}
        <Html
          position={[0, -0.85, 0]}
          center
          distanceFactor={9}
          occlude={false}
          style={{
            pointerEvents: "none",
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "white",
              background: "rgba(15, 23, 42, 0.85)",
              border: `1px solid ${service.color}`,
              padding: "3px 10px",
              borderRadius: "6px",
              whiteSpace: "nowrap",
              boxShadow: `0 0 12px ${service.color}66`,
              backdropFilter: "blur(4px)",
            }}
          >
            <span style={{ marginRight: 4 }}>{service.emoji}</span>
            {service.shortName}
          </div>
        </Html>
      </group>
    </Float>
  );
}

interface ParticleFlowProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  speed: number;
  offset: number;
}

function ParticleFlow({ start, end, color, speed, offset }: ParticleFlowProps) {
  const ref = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = (state.clock.elapsedTime * speed + offset) % 1;
    if (ref.current) {
      ref.current.position.x = start[0] + (end[0] - start[0]) * t;
      ref.current.position.y = start[1] + (end[1] - start[1]) * t;
      ref.current.position.z = start[2] + (end[2] - start[2]) * t;
    }
    if (trailRef.current) {
      const trailT = Math.max(0, t - 0.06);
      trailRef.current.position.x = start[0] + (end[0] - start[0]) * trailT;
      trailRef.current.position.y = start[1] + (end[1] - start[1]) * trailT;
      trailRef.current.position.z = start[2] + (end[2] - start[2]) * trailT;
    }
  });

  return (
    <>
      {/* Trail */}
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          toneMapped={false}
        />
      </mesh>
      {/* Head */}
      <mesh ref={ref}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </>
  );
}

interface NetworkSceneProps {
  selectedId: string | null;
  onSelect: (s: AwsService | null) => void;
}

export function NetworkScene({ selectedId, onSelect }: NetworkSceneProps) {
  const edges = useMemo(() => {
    return defaultArchitectureEdges
      .map(([fromId, toId, weight]) => {
        const from = awsServices.find((s) => s.id === fromId);
        const to = awsServices.find((s) => s.id === toId);
        if (!from || !to) return null;
        return { from, to, weight };
      })
      .filter(
        (e): e is { from: AwsService; to: AwsService; weight: number } =>
          e !== null
      );
  }, []);

  return (
    <Canvas
      camera={{ position: [9, 6, 9], fov: 50 }}
      onPointerMissed={() => onSelect(null)}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{
        background:
          "radial-gradient(ellipse at center, #1e2a4a 0%, #0a0e27 50%, #050818 100%)",
      }}
    >
      <Suspense fallback={null}>
        {/* Lighting setup — key + fill + rim */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[10, 12, 8]}
          intensity={1.4}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight
          position={[-8, 4, -8]}
          intensity={0.7}
          color="#4080ff"
          distance={25}
        />
        <pointLight
          position={[8, -4, 8]}
          intensity={0.5}
          color="#ff8040"
          distance={25}
        />
        {/* Top accent for rim lighting */}
        <spotLight
          position={[0, 15, 0]}
          intensity={0.8}
          color="#ffffff"
          angle={0.6}
          penumbra={0.7}
          distance={30}
        />

        {/* HDR environment for realistic reflections on metallic services */}
        <Environment preset="city" />

        {/* Background stars */}
        <Stars
          radius={80}
          depth={40}
          count={2000}
          factor={3}
          fade
          speed={0.2}
        />

        {/* Subtle ground plane to ground the scene visually */}
        <ContactShadows
          position={[0, -4, 0]}
          opacity={0.5}
          scale={30}
          blur={3}
          far={8}
          color="#000000"
        />

        {/* Connection edges with glow */}
        {edges.map(({ from, to }, i) => (
          <Line
            key={`edge-${i}`}
            points={[from.position, to.position]}
            color="#60a5fa"
            lineWidth={1.2}
            transparent
            opacity={0.35}
          />
        ))}

        {/* Particle flows along each edge */}
        {edges.map(({ from, to, weight }, i) =>
          Array.from({ length: Math.max(1, Math.floor(weight / 1.5)) }).map(
            (_, j) => (
              <ParticleFlow
                key={`flow-${i}-${j}`}
                start={from.position}
                end={to.position}
                color={from.color}
                speed={0.18 + j * 0.05}
                offset={(i * 0.13 + j * 0.27) % 1}
              />
            )
          )
        )}

        {/* Service nodes */}
        {awsServices.map((service) => (
          <ServiceNode
            key={service.id}
            service={service}
            onClick={(s) => onSelect(s)}
            selected={selectedId === service.id}
          />
        ))}

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={6}
          maxDistance={28}
          autoRotate
          autoRotateSpeed={0.4}
          enableDamping
          dampingFactor={0.05}
        />
      </Suspense>
    </Canvas>
  );
}

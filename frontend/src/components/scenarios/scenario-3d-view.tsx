"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  Line,
  Float,
  Edges,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import { useRef, Suspense } from "react";
import * as THREE from "three";
import { getService } from "@/lib/aws-services-data";
import type { Scenario } from "@/lib/scenarios-data";
import type { Shape3D } from "@/lib/aws-services-data";

function NodeGeometry({ shape }: { shape: Shape3D }) {
  switch (shape) {
    case "box":
      return <boxGeometry args={[0.5, 0.5, 0.5]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.28, 0.28, 0.5, 32]} />;
    case "octahedron":
      return <octahedronGeometry args={[0.38, 0]} />;
    case "torus":
      return <torusGeometry args={[0.28, 0.11, 16, 32]} />;
    case "icosahedron":
      return <icosahedronGeometry args={[0.36, 0]} />;
    case "cone":
      return <coneGeometry args={[0.32, 0.55, 16]} />;
    default:
      return <sphereGeometry args={[0.3, 32, 32]} />;
  }
}

function Node({
  position,
  color,
  shape,
  emoji,
  label,
}: {
  position: [number, number, number];
  color: string;
  shape: Shape3D;
  emoji: string;
  label: string;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.005;
  });

  return (
    <Float
      speed={1.4}
      rotationIntensity={0.2}
      floatIntensity={0.3}
      position={position}
    >
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <NodeGeometry shape={shape} />
          <meshPhysicalMaterial
            color={color}
            metalness={0.7}
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
            emissive={color}
            emissiveIntensity={0.2}
            envMapIntensity={1.4}
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
      </group>

      <Html
        position={[0, -0.7, 0]}
        center
        distanceFactor={7}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "white",
            background: "rgba(15, 23, 42, 0.85)",
            border: `1px solid ${color}`,
            padding: "2px 7px",
            borderRadius: "5px",
            whiteSpace: "nowrap",
            boxShadow: `0 0 10px ${color}66`,
            backdropFilter: "blur(4px)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span style={{ marginRight: 3 }}>{emoji}</span>
          {label}
        </div>
      </Html>
    </Float>
  );
}

function Flow({
  start,
  end,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = useRef(Math.random());
  useFrame((state) => {
    if (ref.current) {
      const t = (state.clock.elapsedTime * 0.35 + offset.current) % 1;
      ref.current.position.x = start[0] + (end[0] - start[0]) * t;
      ref.current.position.y = start[1] + (end[1] - start[1]) * t;
      ref.current.position.z = start[2] + (end[2] - start[2]) * t;
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

export function Scenario3DView({ scenario }: { scenario: Scenario }) {
  const nodes = scenario.architecture.nodes.map((n, i) => {
    const svc = getService(n.serviceId);
    return {
      ...n,
      key: `${n.serviceId}-${i}`,
      color: svc?.color || "#666",
      shape: svc?.shape3d || "box",
      emoji: svc?.emoji || "●",
      label: n.label || svc?.shortName || n.serviceId,
    };
  });

  const edges = scenario.architecture.edges
    .map((e) => {
      const fromNode = nodes.find((n) => n.serviceId === e.from);
      const toNode = nodes.find((n) => n.serviceId === e.to);
      if (!fromNode || !toNode) return null;
      return { from: fromNode, to: toNode };
    })
    .filter(<T,>(x: T | null): x is T => x !== null);

  return (
    <Canvas
      camera={{ position: [0, 1, 11], fov: 52 }}
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{
        background:
          "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 60%, #050816 100%)",
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 10]} intensity={1.2} castShadow />
        <pointLight
          position={[-5, -5, -5]}
          intensity={0.5}
          color="#4080ff"
          distance={20}
        />
        <pointLight
          position={[5, 5, 5]}
          intensity={0.4}
          color="#ff8040"
          distance={20}
        />

        <Environment preset="city" />

        <ContactShadows
          position={[0, -3, 0]}
          opacity={0.4}
          scale={20}
          blur={3}
          far={6}
          color="#000000"
        />

        {edges.map((e, i) => (
          <Line
            key={`edge-${i}`}
            points={[e.from.position, e.to.position]}
            color="#60a5fa"
            lineWidth={1.4}
            transparent
            opacity={0.45}
          />
        ))}

        {edges.map((e, i) => (
          <Flow
            key={`flow-${i}`}
            start={e.from.position}
            end={e.to.position}
            color={e.from.color}
          />
        ))}

        {nodes.map((n) => (
          <Node
            key={n.key}
            position={n.position}
            color={n.color}
            shape={n.shape}
            emoji={n.emoji}
            label={n.label}
          />
        ))}

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={20}
          autoRotate
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.05}
        />
      </Suspense>
    </Canvas>
  );
}

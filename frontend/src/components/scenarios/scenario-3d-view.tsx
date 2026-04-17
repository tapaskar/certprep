"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { getService } from "@/lib/aws-services-data";
import type { Scenario } from "@/lib/scenarios-data";

function Node({
  position,
  color,
  emoji,
  label,
}: {
  position: [number, number, number];
  color: string;
  emoji: string;
  label: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.04;
      meshRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <Html
        position={[0, -0.55, 0]}
        center
        distanceFactor={6}
        style={{
          pointerEvents: "none",
          fontFamily: "system-ui",
          fontSize: "11px",
          fontWeight: 600,
          color: "white",
          background: "rgba(0,0,0,0.7)",
          padding: "2px 6px",
          borderRadius: "3px",
          whiteSpace: "nowrap",
        }}
      >
        {emoji} {label}
      </Html>
    </group>
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
      const t = ((state.clock.elapsedTime * 0.3 + offset.current) % 1);
      ref.current.position.x = start[0] + (end[0] - start[0]) * t;
      ref.current.position.y = start[1] + (end[1] - start[1]) * t;
      ref.current.position.z = start[2] + (end[2] - start[2]) * t;
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={color} />
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
      emoji: svc?.emoji || "●",
      label: n.label || svc?.shortName || n.serviceId,
    };
  });

  const edges = scenario.architecture.edges
    .map((e) => {
      // Find first matching node instance for from and to
      const fromNode = nodes.find((n) => n.serviceId === e.from);
      const toNode = nodes.find((n) => n.serviceId === e.to);
      if (!fromNode || !toNode) return null;
      return { from: fromNode, to: toNode };
    })
    .filter(<T,>(x: T | null): x is T => x !== null);

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 55 }}
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.4} color="#4080ff" />

      {edges.map((e, i) => (
        <Line
          key={`edge-${i}`}
          points={[e.from.position, e.to.position]}
          color="#60a5fa"
          lineWidth={1}
          transparent
          opacity={0.4}
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
        autoRotateSpeed={0.4}
      />
    </Canvas>
  );
}

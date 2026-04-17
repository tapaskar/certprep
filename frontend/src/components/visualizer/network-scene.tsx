"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line, Stars } from "@react-three/drei";
import * as THREE from "three";
import {
  awsServices,
  defaultArchitectureEdges,
  type AwsService,
} from "@/lib/aws-services-data";

interface ServiceNodeProps {
  service: AwsService;
  onClick: (s: AwsService) => void;
  selected: boolean;
}

function ServiceNode({ service, onClick, selected }: ServiceNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y =
        service.position[1] +
        Math.sin(state.clock.elapsedTime + service.position[0]) * 0.05;
      meshRef.current.rotation.y += 0.002;
    }
    if (glowRef.current && selected) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      glowRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group position={service.position}>
      {/* Glow ring when selected */}
      {selected && (
        <mesh ref={glowRef}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial
            color={service.color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <mesh
        ref={meshRef}
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
      >
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color={service.color}
          emissive={service.color}
          emissiveIntensity={selected ? 0.8 : 0.3}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <Html
        position={[0, -0.6, 0]}
        center
        distanceFactor={8}
        style={{
          pointerEvents: "none",
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          fontWeight: 600,
          color: "white",
          background: "rgba(0,0,0,0.6)",
          padding: "2px 8px",
          borderRadius: "4px",
          whiteSpace: "nowrap",
        }}
      >
        {service.shortName}
      </Html>
    </group>
  );
}

interface ParticleFlowProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  speed: number;
}

function ParticleFlow({ start, end, color, speed }: ParticleFlowProps) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = useRef(Math.random());

  useFrame((state) => {
    if (ref.current) {
      const t = ((state.clock.elapsedTime * speed + offset.current) % 1);
      ref.current.position.x = start[0] + (end[0] - start[0]) * t;
      ref.current.position.y = start[1] + (end[1] - start[1]) * t;
      ref.current.position.z = start[2] + (end[2] - start[2]) * t;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
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
      .filter((e): e is { from: AwsService; to: AwsService; weight: number } => e !== null);
  }, []);

  return (
    <Canvas
      camera={{ position: [8, 5, 8], fov: 55 }}
      onPointerMissed={() => onSelect(null)}
      style={{ background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3d 100%)" }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4080ff" />
      <Stars radius={50} depth={30} count={800} factor={2} fade speed={0.3} />

      {/* Edges — connection lines */}
      {edges.map(({ from, to }, i) => (
        <Line
          key={`edge-${i}`}
          points={[from.position, to.position]}
          color="#3b82f6"
          lineWidth={1}
          transparent
          opacity={0.3}
        />
      ))}

      {/* Particle flows along each edge */}
      {edges.map(({ from, to, weight }, i) => (
        <group key={`flow-${i}`}>
          {Array.from({ length: Math.max(1, Math.floor(weight / 2)) }).map((_, j) => (
            <ParticleFlow
              key={j}
              start={from.position}
              end={to.position}
              color={from.color}
              speed={0.15 + j * 0.08}
            />
          ))}
        </group>
      ))}

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
        minDistance={5}
        maxDistance={30}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </Canvas>
  );
}

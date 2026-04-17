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
import { getService, type IconKey, type Shape3D } from "@/lib/aws-services-data";
import { ServiceIcon } from "@/lib/service-icons";
import type { Scenario } from "@/lib/scenarios-data";

function NodeGeometry({ shape }: { shape: Shape3D }) {
  switch (shape) {
    case "box":
      return <boxGeometry args={[0.65, 0.65, 0.65]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.36, 0.36, 0.65, 32]} />;
    case "octahedron":
      return <octahedronGeometry args={[0.5, 0]} />;
    case "torus":
      return <torusGeometry args={[0.36, 0.14, 16, 32]} />;
    case "icosahedron":
      return <icosahedronGeometry args={[0.46, 0]} />;
    case "cone":
      return <coneGeometry args={[0.4, 0.7, 16]} />;
    default:
      return <sphereGeometry args={[0.4, 32, 32]} />;
  }
}

function Node({
  position,
  color,
  shape,
  iconKey,
  label,
}: {
  position: [number, number, number];
  color: string;
  shape: Shape3D;
  iconKey: IconKey;
  label: string;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.005;
  });

  return (
    <Float
      speed={1.4}
      rotationIntensity={0.15}
      floatIntensity={0.35}
      position={position}
    >
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <NodeGeometry shape={shape} />
          <meshPhysicalMaterial
            color={color}
            metalness={0.85}
            roughness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.05}
            emissive={color}
            emissiveIntensity={0.25}
            envMapIntensity={1.6}
          />
          <Edges color="white" threshold={15} scale={1.001}>
            <lineBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.35}
              toneMapped={false}
            />
          </Edges>
        </mesh>
      </group>

      {/* Lucide icon billboard — primary identifier */}
      <Html
        position={[0, 0, 0]}
        center
        distanceFactor={5}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 9,
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            boxShadow: `0 0 18px ${color}aa, inset 0 1px 0 rgba(255,255,255,0.4)`,
            border: `2px solid ${color}`,
            color: "white",
          }}
        >
          <ServiceIcon
            iconKey={iconKey}
            className="h-5 w-5"
            strokeWidth={2.5}
          />
        </div>
      </Html>

      <Html
        position={[0, -0.85, 0]}
        center
        distanceFactor={7}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "white",
            background: "rgba(15, 23, 42, 0.88)",
            border: `1px solid ${color}`,
            padding: "2px 7px",
            borderRadius: "5px",
            whiteSpace: "nowrap",
            boxShadow: `0 0 10px ${color}55`,
            backdropFilter: "blur(4px)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
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
  const nodes = scenario.architecture.nodes.map((n) => {
    const svc = getService(n.serviceId);
    return {
      ...n,
      key: n.id,
      color: svc?.color || "#666",
      shape: (svc?.shape3d || "box") as Shape3D,
      iconKey: (svc?.icon || "Server") as IconKey,
      label: n.label || svc?.shortName || n.serviceId,
    };
  });

  // Build a lookup so duplicate services connect correctly via unique node IDs
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const edges = scenario.architecture.edges
    .map((e) => {
      const fromNode = nodeById.get(e.from);
      const toNode = nodeById.get(e.to);
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
        <ambientLight intensity={0.45} />
        <directionalLight position={[10, 10, 10]} intensity={1.3} castShadow />
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
            iconKey={n.iconKey}
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

"use client";

import { useEffect, useState } from "react";

/**
 * Animated SVG showing logical data flow through a cloud architecture.
 *
 * Why SVG + native SMIL animations and not three.js / Lottie / Framer:
 *   - Pure SVG ships zero JS for the animation itself — `<animateMotion>`
 *     and `<animate>` are GPU-rasterised by the browser. The whole
 *     animation loop runs at 60fps on a phone with no main-thread work.
 *   - Total component bundle is ~5KB vs ~600KB for three.js.
 *   - Crisp at any resolution. No WebGL fallback paths. Renders in
 *     screenshot tools, OG image generators, server-side prerender —
 *     three.js can't.
 *
 * Conceptually the diagram is a real-ish AWS request lifecycle:
 *
 *     User → CloudFront → Route 53 → ALB → (Cognito | ECS) → Lambda
 *                                                ├→ RDS
 *                                                ├→ DynamoDB
 *                                                └→ S3
 *                                          Lambda → SQS → SNS
 *
 * Packets (small glowing dots) travel each edge on a 3-second loop, with
 * staggered begin times so the screen always has motion on multiple
 * paths. A caption underneath rotates every 3s through 5 phases that
 * narrate which "slice" of the architecture is currently active — turns
 * decoration into a teaching moment.
 */

interface Component {
  id: string;
  label: string;
  short: string;
  x: number;
  y: number;
  color: string;
}

// Coordinate system: 1200 × 540 viewBox.
// Boxes are 80×44, positioned by their top-left corner.
const components: Component[] = [
  { id: "user",       label: "User",       short: "USER", x: 30,   y: 248, color: "#94a3b8" },
  { id: "cloudfront", label: "CloudFront", short: "CDN",  x: 200,  y: 160, color: "#f59e0b" },
  { id: "route53",    label: "Route 53",   short: "DNS",  x: 390,  y: 80,  color: "#3b82f6" },
  { id: "alb",        label: "ALB",        short: "ALB",  x: 460,  y: 248, color: "#8b5cf6" },
  { id: "cognito",    label: "Cognito",    short: "AUTH", x: 640,  y: 80,  color: "#ec4899" },
  { id: "ecs",        label: "ECS",        short: "ECS",  x: 640,  y: 248, color: "#10b981" },
  { id: "lambda",     label: "Lambda",     short: "λ",    x: 820,  y: 248, color: "#a855f7" },
  { id: "rds",        label: "RDS",        short: "RDS",  x: 460,  y: 410, color: "#3b82f6" },
  { id: "dynamo",     label: "DynamoDB",   short: "DDB",  x: 640,  y: 410, color: "#1e40af" },
  { id: "s3",         label: "S3",         short: "S3",   x: 820,  y: 410, color: "#22c55e" },
  { id: "sqs",        label: "SQS",        short: "SQS",  x: 1000, y: 340, color: "#f97316" },
  { id: "sns",        label: "SNS",        short: "SNS",  x: 1080, y: 200, color: "#ef4444" },
];

interface Edge {
  from: string;
  to: string;
  /** Stagger offset (s) so packets on different edges don't all fire together */
  beginAt: number;
}

const edges: Edge[] = [
  { from: "user",       to: "cloudfront", beginAt: 0.0 },
  { from: "cloudfront", to: "route53",    beginAt: 0.3 },
  { from: "route53",    to: "alb",        beginAt: 0.7 },
  { from: "alb",        to: "cognito",    beginAt: 1.1 },
  { from: "alb",        to: "ecs",        beginAt: 1.3 },
  { from: "ecs",        to: "lambda",     beginAt: 1.7 },
  { from: "ecs",        to: "rds",        beginAt: 1.9 },
  { from: "ecs",        to: "dynamo",     beginAt: 2.1 },
  { from: "lambda",     to: "s3",         beginAt: 2.3 },
  { from: "lambda",     to: "sqs",        beginAt: 2.5 },
  { from: "sqs",        to: "sns",        beginAt: 2.8 },
];

const captions = [
  "User request hits the CDN edge",
  "Routed through DNS and load balancer",
  "Compute layer authenticates and serves",
  "Reads and writes hit the data layer",
  "Async work queues and fans out via messaging",
];

// Each box is 80×44, centered at (x+40, y+22).
const boxCenter = (c: Component): [number, number] => [c.x + 40, c.y + 22];

/**
 * Build a curved Bezier path from one component box to another.
 * Slight perpendicular curvature makes the network feel organic instead
 * of grid-snapped. Curvature scales with distance so short links are
 * nearly straight (no awkward loops on a 100px hop).
 */
function buildPath(from: Component, to: Component): string {
  const [x1, y1] = boxCenter(from);
  const [x2, y2] = boxCenter(to);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const curve = Math.min(36, dist * 0.15);
  // Perpendicular offset for the control point
  const px = -dy / dist;
  const py = dx / dist;
  const mx = (x1 + x2) / 2 + px * curve;
  const my = (y1 + y2) / 2 + py * curve;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

export function ArchitectureFlowSvg() {
  // Caption rotator — one phase every 3s. Mounting state on `key` so the
  // CSS fade-in animation re-fires for each new caption.
  const [captionIdx, setCaptionIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCaptionIdx((i) => (i + 1) % captions.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const compById = Object.fromEntries(components.map((c) => [c.id, c]));

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#0a0e27] via-[#0f1535] to-[#050818]">
      <svg
        viewBox="0 0 1200 540"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Animated AWS architecture diagram showing data flow between services"
      >
        <defs>
          {/* Faint grid background — anchors the diagram visually */}
          <pattern
            id="arch-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#1e2a4a"
              strokeWidth="0.5"
              opacity="0.5"
            />
          </pattern>
          {/* Glow filter for packets and component halos */}
          <filter id="arch-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Strong glow for the packets specifically */}
          <filter id="packet-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <rect width="1200" height="540" fill="url(#arch-grid)" />

        {/* Layer labels (left margin) */}
        <text
          x="16"
          y="100"
          fill="#475569"
          fontSize="9"
          fontWeight="700"
          letterSpacing="2"
          fontFamily="ui-monospace, monospace"
        >
          EDGE
        </text>
        <text
          x="16"
          y="270"
          fill="#475569"
          fontSize="9"
          fontWeight="700"
          letterSpacing="2"
          fontFamily="ui-monospace, monospace"
        >
          COMPUTE
        </text>
        <text
          x="16"
          y="430"
          fill="#475569"
          fontSize="9"
          fontWeight="700"
          letterSpacing="2"
          fontFamily="ui-monospace, monospace"
        >
          DATA
        </text>

        {/* Edges + animated packets */}
        {edges.map((edge, i) => {
          const from = compById[edge.from];
          const to = compById[edge.to];
          if (!from || !to) return null;
          const d = buildPath(from, to);
          const pathId = `arch-path-${i}`;
          return (
            <g key={`edge-${i}`}>
              {/* Faint background path — always visible */}
              <path
                id={pathId}
                d={d}
                stroke="#60a5fa"
                strokeWidth="1.2"
                fill="none"
                opacity="0.25"
              />
              {/* Animated packet — small glowing circle traveling the path.
                  3s cycle, opacity fades in/out at the ends so packets
                  don't look like they pop on/off at the endpoints. */}
              <circle r="4" fill={from.color} filter="url(#packet-glow)">
                <animateMotion
                  dur="3s"
                  repeatCount="indefinite"
                  begin={`${edge.beginAt}s`}
                  rotate="auto"
                >
                  <mpath href={`#${pathId}`} />
                </animateMotion>
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.1;0.85;1"
                  dur="3s"
                  repeatCount="indefinite"
                  begin={`${edge.beginAt}s`}
                />
              </circle>
              {/* Solid core dot for crispness over the glow */}
              <circle r="2" fill="white">
                <animateMotion
                  dur="3s"
                  repeatCount="indefinite"
                  begin={`${edge.beginAt}s`}
                >
                  <mpath href={`#${pathId}`} />
                </animateMotion>
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.1;0.85;1"
                  dur="3s"
                  repeatCount="indefinite"
                  begin={`${edge.beginAt}s`}
                />
              </circle>
            </g>
          );
        })}

        {/* Component boxes */}
        {components.map((c) => (
          <g key={c.id}>
            {/* Soft halo behind the box */}
            <rect
              x={c.x - 6}
              y={c.y - 6}
              width="92"
              height="56"
              rx="11"
              fill={c.color}
              opacity="0.15"
              filter="url(#arch-glow)"
            />
            {/* Main box */}
            <rect
              x={c.x}
              y={c.y}
              width="80"
              height="44"
              rx="8"
              fill={c.color}
              stroke="white"
              strokeOpacity="0.25"
              strokeWidth="1"
            />
            {/* Subtle highlight strip on top — gives the box dimensionality */}
            <rect
              x={c.x + 1}
              y={c.y + 1}
              width="78"
              height="14"
              rx="7"
              fill="white"
              fillOpacity="0.18"
              pointerEvents="none"
            />
            {/* Service short name (bold, inside box) */}
            <text
              x={c.x + 40}
              y={c.y + 27}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={c.short.length > 4 ? 11 : 13}
              fontWeight="800"
              fill="white"
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
              letterSpacing="0.5"
            >
              {c.short}
            </text>
            {/* Service full label below */}
            <text
              x={c.x + 40}
              y={c.y + 60}
              textAnchor="middle"
              fontSize="10"
              fill="#cbd5e1"
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
            >
              {c.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Caption pill — overlaid bottom-center. Re-keys on each phase
          change so the CSS fade-in fires every rotation. */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 max-w-[90%]">
        <div
          key={captionIdx}
          className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-4 py-2 text-xs sm:text-sm font-medium text-white border border-white/10 shadow-lg animate-[fadeInUp_500ms_ease]"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shrink-0">
            <span className="block h-full w-full rounded-full bg-emerald-400 animate-ping" />
          </span>
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">
            {captions[captionIdx]}
          </span>
        </div>
      </div>

      {/* Tiny scoped keyframes — Tailwind doesn't ship a fadeInUp by default */}
      <style jsx>{`
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";

/**
 * Animated SVG showing logical data flow through a cloud architecture.
 *
 * Two interactive layers on top of the base animation:
 *
 *   1. Provider toggle (controlled by parent) — same topology, same
 *      colors, just relabels every box. CloudFront → Front Door →
 *      Cloud CDN, S3 → Blob → Cloud Storage, etc. The point: an
 *      architecture is a mental model, the names are vendor lock-in.
 *
 *   2. Click-to-learn — clicking a box opens a popover with a 1-line
 *      description, 2 facts, and a "Practice questions on X →" link
 *      to the relevant exam page for the active provider. Turns the
 *      decoration into a content surface that captures intent.
 *
 * Why SVG + native SMIL animations and not three.js / Lottie / Framer:
 *   - Pure SVG ships zero JS for the animation itself — `<animateMotion>`
 *     and `<animate>` are GPU-rasterised by the browser.
 *   - Total component bundle is ~6KB.
 *   - 60fps on phones, no main-thread animation work.
 *   - Crisp at any resolution. Renders in screenshot/OG-image tools.
 */

export type Provider = "aws" | "azure" | "gcp";

interface ProviderName {
  short: string;
  label: string;
}

interface Component {
  id: string;
  x: number;
  y: number;
  color: string;
  category: "edge" | "compute" | "data" | "messaging" | "auth";
  /** Per-provider naming. Same box, just relabeled. */
  providers: Record<Provider, ProviderName>;
  /** One-line description shown in the click popover. */
  description: string;
  /** Two short facts shown as bullets in the click popover. */
  facts: [string, string];
}

// ────────────────────────────────────────────────────────────────────
// Components
// ────────────────────────────────────────────────────────────────────
//
// Coordinate system: 1200 × 540 viewBox. Boxes are 80×44, positioned
// by their top-left corner.
//
// Names sourced from each cloud's own product catalog. When in doubt
// I picked the closest functional analogue, not the closest marketing
// name (e.g. SQS ↔ Service Bus, even though Azure also has Storage
// Queue — Service Bus is the better architecture-level match).

const components: Component[] = [
  {
    id: "user",
    x: 30,
    y: 248,
    color: "#94a3b8",
    category: "edge",
    providers: {
      aws: { short: "USER", label: "User" },
      azure: { short: "USER", label: "User" },
      gcp: { short: "USER", label: "User" },
    },
    description: "An incoming HTTP request from a real client.",
    facts: [
      "Could be a browser, mobile app, IoT device, or another service",
      "Latency from here is what end-users actually experience",
    ],
  },
  {
    id: "cloudfront",
    x: 200,
    y: 160,
    color: "#f59e0b",
    category: "edge",
    providers: {
      aws: { short: "CDN", label: "CloudFront" },
      azure: { short: "CDN", label: "Front Door" },
      gcp: { short: "CDN", label: "Cloud CDN" },
    },
    description: "Global content-delivery network — caches close to users.",
    facts: [
      "Serves cached responses from 400+ edge locations worldwide",
      "Reduces origin load by 70-95% for typical static content",
    ],
  },
  {
    id: "route53",
    x: 390,
    y: 80,
    color: "#3b82f6",
    category: "edge",
    providers: {
      aws: { short: "DNS", label: "Route 53" },
      azure: { short: "DNS", label: "Azure DNS" },
      gcp: { short: "DNS", label: "Cloud DNS" },
    },
    description: "Authoritative DNS — turns domain names into IPs.",
    facts: [
      "Health checks can route around failed regions automatically",
      "Latency-based routing sends users to the closest healthy origin",
    ],
  },
  {
    id: "alb",
    x: 460,
    y: 248,
    color: "#8b5cf6",
    category: "edge",
    providers: {
      aws: { short: "ALB", label: "ALB" },
      azure: { short: "AGW", label: "App Gateway" },
      gcp: { short: "LB", label: "Cloud Load Balancing" },
    },
    description: "Layer-7 load balancer — distributes traffic across compute.",
    facts: [
      "Routes by hostname, path, headers, or query string",
      "Terminates TLS so backends don't have to manage certificates",
    ],
  },
  {
    id: "cognito",
    x: 640,
    y: 80,
    color: "#ec4899",
    category: "auth",
    providers: {
      aws: { short: "AUTH", label: "Cognito" },
      azure: { short: "AUTH", label: "Entra ID" },
      gcp: { short: "AUTH", label: "Identity Platform" },
    },
    description: "Managed identity, sign-up/sign-in, and federation.",
    facts: [
      "Issues JWTs the rest of your stack can verify without a roundtrip",
      "Supports social, SAML, and OIDC providers out of the box",
    ],
  },
  {
    id: "ecs",
    x: 640,
    y: 248,
    color: "#10b981",
    category: "compute",
    providers: {
      aws: { short: "ECS", label: "ECS / Fargate" },
      azure: { short: "ACA", label: "Container Apps" },
      gcp: { short: "RUN", label: "Cloud Run" },
    },
    description: "Managed container compute — long-running services.",
    facts: [
      "Scales horizontally based on CPU, memory, or custom metrics",
      "Fargate / Container Apps / Cloud Run are all serverless container runners",
    ],
  },
  {
    id: "lambda",
    x: 820,
    y: 248,
    color: "#a855f7",
    category: "compute",
    providers: {
      aws: { short: "λ", label: "Lambda" },
      azure: { short: "FN", label: "Functions" },
      gcp: { short: "FN", label: "Cloud Functions" },
    },
    description: "Event-driven serverless functions — scale to zero.",
    facts: [
      "Cold-start latency 100-300ms for typical Node/Python runtimes",
      "Pay only for execution time billed to the millisecond",
    ],
  },
  {
    id: "rds",
    x: 460,
    y: 410,
    color: "#3b82f6",
    category: "data",
    providers: {
      aws: { short: "RDS", label: "RDS" },
      azure: { short: "SQL", label: "Azure SQL" },
      gcp: { short: "SQL", label: "Cloud SQL" },
    },
    description: "Managed relational database — Postgres, MySQL, etc.",
    facts: [
      "Multi-AZ / zone-redundant replicas give automatic failover",
      "Backups, patching, and version upgrades are managed for you",
    ],
  },
  {
    id: "dynamo",
    x: 640,
    y: 410,
    color: "#1e40af",
    category: "data",
    providers: {
      aws: { short: "DDB", label: "DynamoDB" },
      azure: { short: "COSMOS", label: "Cosmos DB" },
      gcp: { short: "FS", label: "Firestore" },
    },
    description: "Managed NoSQL / key-value at any scale.",
    facts: [
      "Single-digit-ms reads at any throughput level",
      "On-demand billing — no capacity planning required",
    ],
  },
  {
    id: "s3",
    x: 820,
    y: 410,
    color: "#22c55e",
    category: "data",
    providers: {
      aws: { short: "S3", label: "S3" },
      azure: { short: "BLOB", label: "Blob Storage" },
      gcp: { short: "GCS", label: "Cloud Storage" },
    },
    description: "Durable object storage — files, backups, static sites.",
    facts: [
      "11 nines (99.999999999%) of durability across multiple AZs",
      "Tiered storage classes — hot/cool/archive — pay for what you access",
    ],
  },
  {
    id: "sqs",
    x: 1000,
    y: 340,
    color: "#f97316",
    category: "messaging",
    providers: {
      aws: { short: "SQS", label: "SQS" },
      azure: { short: "SB", label: "Service Bus" },
      gcp: { short: "PSUB", label: "Pub/Sub" },
    },
    description: "Durable message queue — decouples producers from consumers.",
    facts: [
      "At-least-once delivery — handlers must be idempotent",
      "Visibility timeouts let consumers safely retry on failure",
    ],
  },
  {
    id: "sns",
    x: 1080,
    y: 200,
    color: "#ef4444",
    category: "messaging",
    providers: {
      aws: { short: "SNS", label: "SNS" },
      azure: { short: "EVT", label: "Event Grid" },
      gcp: { short: "EVT", label: "Eventarc" },
    },
    description: "Pub/sub fan-out — one event, many subscribers.",
    facts: [
      "Push delivery to HTTP, email, SMS, or other queues",
      "Filter policies let subscribers opt into specific event types",
    ],
  },
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

/** Where the click-to-learn CTA points, per provider. Picked the
 *  flagship associate-level cert for each cloud. */
const providerExamId: Record<Provider, string> = {
  aws: "aws-saa-c03",
  azure: "azure-az104",
  gcp: "gcp-ace",
};

const providerLabel: Record<Provider, string> = {
  aws: "AWS Solutions Architect (SAA-C03)",
  azure: "Azure Administrator (AZ-104)",
  gcp: "GCP Associate Cloud Engineer",
};

const boxCenter = (c: Component): [number, number] => [c.x + 40, c.y + 22];

/** Curved Bezier path between two box centers, with curvature scaling
 *  by distance — short hops are nearly straight. */
function buildPath(from: Component, to: Component): string {
  const [x1, y1] = boxCenter(from);
  const [x2, y2] = boxCenter(to);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const curve = Math.min(36, dist * 0.15);
  const px = -dy / dist;
  const py = dx / dist;
  const mx = (x1 + x2) / 2 + px * curve;
  const my = (y1 + y2) / 2 + py * curve;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

interface Props {
  provider: Provider;
}

export function ArchitectureFlowSvg({ provider }: Props) {
  const [captionIdx, setCaptionIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Caption rotator — one phase every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setCaptionIdx((i) => (i + 1) % captions.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Dismiss popover on Esc + on outside click
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    const onClick = (e: MouseEvent) => {
      const node = containerRef.current;
      if (!node) return;
      // Allow clicks inside the SVG (which trigger box selection) and
      // inside the popover itself; everything else closes.
      const target = e.target as HTMLElement;
      if (!node.contains(target)) setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [selectedId]);

  const compById = Object.fromEntries(components.map((c) => [c.id, c]));
  const selected = selectedId ? compById[selectedId] : null;

  // Where to render the popover relative to the container (percent
  // coords against the 1200×540 viewBox).
  let popoverLeftPct = 0;
  let popoverTopPct = 0;
  let popoverPlaceAbove = false;
  if (selected) {
    const [cx, cy] = boxCenter(selected);
    popoverLeftPct = (cx / 1200) * 100;
    popoverTopPct = (cy / 540) * 100;
    // Place popover above the box if the box sits in the lower half,
    // below it if in the upper half. Keeps it from disappearing off
    // the canvas.
    popoverPlaceAbove = cy > 270;
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#0a0e27] via-[#0f1535] to-[#050818]"
    >
      <svg
        viewBox="0 0 1200 540"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Animated cloud architecture diagram showing data flow between services"
      >
        <defs>
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
          <filter id="arch-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="packet-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <rect width="1200" height="540" fill="url(#arch-grid)" />

        {/* Tier labels */}
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
              <path
                id={pathId}
                d={d}
                stroke="#60a5fa"
                strokeWidth="1.2"
                fill="none"
                opacity="0.25"
              />
              <circle r="4" fill={from.color} filter="url(#packet-glow)">
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
        {components.map((c) => {
          const names = c.providers[provider];
          const isSelected = selectedId === c.id;
          return (
            <g
              key={c.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(isSelected ? null : c.id);
              }}
              style={{ cursor: c.id === "user" ? "default" : "pointer" }}
            >
              {/* Hit area — slightly larger than the box for easier tapping */}
              <rect
                x={c.x - 8}
                y={c.y - 8}
                width="96"
                height="60"
                rx="12"
                fill="transparent"
              />
              {/* Halo (brighter when selected) */}
              <rect
                x={c.x - 6}
                y={c.y - 6}
                width="92"
                height="56"
                rx="11"
                fill={c.color}
                opacity={isSelected ? 0.4 : 0.15}
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
                strokeOpacity={isSelected ? 0.9 : 0.25}
                strokeWidth={isSelected ? 2 : 1}
              />
              {/* Top highlight strip */}
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
              <text
                x={c.x + 40}
                y={c.y + 27}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={names.short.length > 4 ? 10 : 13}
                fontWeight="800"
                fill="white"
                fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                letterSpacing="0.5"
                pointerEvents="none"
              >
                {names.short}
              </text>
              <text
                x={c.x + 40}
                y={c.y + 60}
                textAnchor="middle"
                fontSize="10"
                fill="#cbd5e1"
                fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                pointerEvents="none"
              >
                {names.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Caption pill — hides when popover is open so they don't overlap */}
      {!selected && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 max-w-[90%]">
          <div
            key={captionIdx}
            className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-4 py-2 text-xs sm:text-sm font-medium text-white border border-white/10 shadow-lg animate-[archFadeInUp_500ms_ease]"
          >
            <span className="relative inline-flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              {captions[captionIdx]}
            </span>
          </div>
        </div>
      )}

      {/* Click-to-learn popover */}
      {selected && (
        <div
          className="pointer-events-auto absolute z-20 -translate-x-1/2 animate-[archFadeInUp_180ms_ease]"
          style={{
            left: `${popoverLeftPct}%`,
            top: `${popoverTopPct}%`,
            transform: popoverPlaceAbove
              ? "translate(-50%, calc(-100% - 36px))"
              : "translate(-50%, 36px)",
          }}
        >
          <div className="relative w-[260px] sm:w-[320px] rounded-xl border border-white/10 bg-stone-900/95 backdrop-blur-md p-4 text-white shadow-2xl">
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-2 right-2 rounded-md p-1 text-stone-400 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: `${selected.color}22`,
                color: selected.color,
                border: `1px solid ${selected.color}55`,
              }}
            >
              {selected.category}
            </div>
            <h4 className="mt-2 text-sm font-bold">
              {selected.providers[provider].label}
            </h4>
            <p className="mt-1 text-xs text-stone-300 leading-relaxed">
              {selected.description}
            </p>
            <ul className="mt-2 space-y-1">
              {selected.facts.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-[11px] text-stone-400 leading-relaxed"
                >
                  <span
                    className="mt-1 inline-block h-1 w-1 rounded-full shrink-0"
                    style={{ background: selected.color }}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {selected.id !== "user" && (
              <Link
                href={`/exams/${providerExamId[provider]}?utm_source=arch_flow&svc=${selected.id}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-stone-900 transition-colors"
              >
                Practice questions on {providerLabel[provider]}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {/* Pointer arrow toward the box */}
            <div
              className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-stone-900 border-white/10"
              style={{
                [popoverPlaceAbove ? "bottom" : "top"]: "-6px",
                borderRightWidth: popoverPlaceAbove ? "1px" : "0",
                borderBottomWidth: popoverPlaceAbove ? "1px" : "0",
                borderLeftWidth: popoverPlaceAbove ? "0" : "1px",
                borderTopWidth: popoverPlaceAbove ? "0" : "1px",
                borderStyle: "solid",
              }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes archFadeInUp {
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

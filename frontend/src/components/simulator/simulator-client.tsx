"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Zap as ZapIcon,
  Activity,
  Shield as ShieldIcon,
  Trash2,
  RotateCcw,
  Download,
  Link as LinkIcon,
  MousePointer2,
} from "lucide-react";
import {
  awsServices,
  type AwsService,
  type ServiceCategory,
} from "@/lib/aws-services-data";
import { ServiceIcon } from "@/lib/service-icons";

interface PlacedService {
  instanceId: string;
  serviceId: string;
  x: number; // % of canvas width
  y: number;
}

interface Connection {
  id: string;
  from: string; // instanceId
  to: string;
  label?: string;
}

const categoryOrder: ServiceCategory[] = [
  "compute",
  "storage",
  "database",
  "network",
  "messaging",
  "security",
  "analytics",
  "cdn",
];

const categoryLabels: Record<ServiceCategory, string> = {
  compute: "Compute",
  storage: "Storage",
  database: "Database",
  network: "Network",
  messaging: "Messaging",
  security: "Security",
  analytics: "Analytics",
  ml: "ML",
  cdn: "CDN",
};

const presets: Array<{
  name: string;
  description: string;
  services: string[];
  // Optional: connection definitions (by index in services array)
  connections?: Array<[number, number]>;
}> = [
  {
    name: "3-Tier Web App",
    description: "Classic web app with LB, app servers, and DB",
    services: ["route53", "cloudfront", "alb", "ec2", "rds", "elasticache"],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [3, 5],
    ],
  },
  {
    name: "Serverless API",
    description: "Fully serverless with API Gateway + Lambda",
    services: ["apigateway", "lambda", "dynamodb", "s3", "cloudfront"],
    connections: [
      [4, 0],
      [0, 1],
      [1, 2],
      [1, 3],
    ],
  },
  {
    name: "Microservices",
    description: "Containerized services on Fargate",
    services: ["alb", "fargate", "aurora", "eventbridge", "sqs", "lambda"],
    connections: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [4, 5],
    ],
  },
  {
    name: "Data Pipeline",
    description: "Streaming ingest → processing → warehouse",
    services: ["kinesis", "lambda", "s3", "redshift"],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  {
    name: "Static Website",
    description: "Cheap, fast static site with global CDN",
    services: ["s3", "cloudfront", "route53", "waf"],
    connections: [
      [2, 1],
      [3, 1],
      [1, 0],
    ],
  },
];

export function SimulatorClient() {
  const [placed, setPlaced] = useState<PlacedService[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"select" | "connect">("select");
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, AwsService[]> = {};
    for (const s of awsServices) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    return grouped;
  }, []);

  const metrics = useMemo(() => {
    const services = placed
      .map((p) => awsServices.find((s) => s.id === p.serviceId))
      .filter((s): s is AwsService => !!s);

    if (services.length === 0) {
      return { cost: 0, latency: 0, reliability: 100, security: 100, count: 0 };
    }

    const cost = services.reduce((sum, s) => sum + s.costPerMonth, 0);
    const latency = services.reduce((sum, s) => sum + s.latencyMs, 0);
    const reliability =
      services.reduce((acc, s) => acc * (s.reliability / 100), 1) * 100;
    const security =
      services.reduce((sum, s) => sum + s.securityLevel, 0) / services.length;

    return {
      cost: Math.round(cost),
      latency: Math.round(latency),
      reliability: Math.round(reliability * 100) / 100,
      security: Math.round(security),
      count: services.length,
    };
  }, [placed]);

  // Drag from palette → drop on canvas
  const handlePaletteDragStart = (e: React.DragEvent, serviceId: string) => {
    e.dataTransfer.setData("type", "palette");
    e.dataTransfer.setData("serviceId", serviceId);
    e.dataTransfer.effectAllowed = "copy";
  };

  // Drag a placed node
  const handleNodeDragStart = (e: React.DragEvent, instanceId: string) => {
    if (mode === "connect") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("type", "node");
    e.dataTransfer.setData("instanceId", instanceId);
    setDraggingId(instanceId);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(8, Math.min(92, y));

    const type = e.dataTransfer.getData("type");

    if (type === "node") {
      const instanceId = e.dataTransfer.getData("instanceId");
      setPlaced((prev) =>
        prev.map((p) =>
          p.instanceId === instanceId ? { ...p, x: clampedX, y: clampedY } : p
        )
      );
      setDraggingId(null);
    } else {
      const serviceId = e.dataTransfer.getData("serviceId");
      if (!serviceId) return;
      setPlaced((prev) => [
        ...prev,
        {
          instanceId: `${serviceId}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          serviceId,
          x: clampedX,
          y: clampedY,
        },
      ]);
    }
  };

  const handleNodeClick = (instanceId: string) => {
    if (mode === "connect") {
      if (!connectFrom) {
        setConnectFrom(instanceId);
      } else if (connectFrom !== instanceId) {
        // Don't add duplicate connection
        const exists = connections.some(
          (c) =>
            (c.from === connectFrom && c.to === instanceId) ||
            (c.from === instanceId && c.to === connectFrom)
        );
        if (!exists) {
          setConnections((prev) => [
            ...prev,
            {
              id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              from: connectFrom,
              to: instanceId,
            },
          ]);
        }
        setConnectFrom(null);
      } else {
        setConnectFrom(null);
      }
    } else {
      setSelectedInstance(instanceId);
    }
  };

  const handleRemove = (instanceId: string) => {
    setPlaced((prev) => prev.filter((p) => p.instanceId !== instanceId));
    setConnections((prev) =>
      prev.filter((c) => c.from !== instanceId && c.to !== instanceId)
    );
    if (selectedInstance === instanceId) setSelectedInstance(null);
  };

  const handleRemoveConnection = (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSwap = (instanceId: string, newServiceId: string) => {
    setPlaced((prev) =>
      prev.map((p) =>
        p.instanceId === instanceId ? { ...p, serviceId: newServiceId } : p
      )
    );
  };

  const loadPreset = (preset: (typeof presets)[number]) => {
    const newPlaced: PlacedService[] = preset.services.map((sid, i) => ({
      instanceId: `${sid}-${Date.now()}-${i}`,
      serviceId: sid,
      x: 18 + (i % 4) * 22,
      y: 20 + Math.floor(i / 4) * 30,
    }));
    setPlaced(newPlaced);
    if (preset.connections) {
      const newConns: Connection[] = preset.connections.map(([a, b], i) => ({
        id: `conn-${Date.now()}-${i}`,
        from: newPlaced[a].instanceId,
        to: newPlaced[b].instanceId,
      }));
      setConnections(newConns);
    } else {
      setConnections([]);
    }
    setSelectedInstance(null);
    setMode("select");
    setConnectFrom(null);
  };

  const clearAll = () => {
    setPlaced([]);
    setConnections([]);
    setSelectedInstance(null);
    setConnectFrom(null);
  };

  const exportJson = () => {
    const data = {
      services: placed.map((p) => {
        const s = awsServices.find((x) => x.id === p.serviceId);
        return { id: p.serviceId, name: s?.name, x: p.x, y: p.y };
      }),
      connections: connections.map((c) => {
        const fromP = placed.find((p) => p.instanceId === c.from);
        const toP = placed.find((p) => p.instanceId === c.to);
        return {
          from: fromP?.serviceId,
          to: toP?.serviceId,
          label: c.label,
        };
      }),
      metrics,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architecture.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const selected = placed.find((p) => p.instanceId === selectedInstance);
  const selectedService = selected
    ? awsServices.find((s) => s.id === selected.serviceId)
    : null;

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      {/* Top Nav */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b bg-white shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <h1 className="text-base sm:text-lg font-bold text-stone-900">
          ⚡ AWS Architecture Simulator
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportJson}
            disabled={placed.length === 0}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 disabled:opacity-40"
          >
            <Download className="h-3 w-3" /> Export
          </button>
          <button
            onClick={clearAll}
            disabled={placed.length === 0}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Mode Toolbar */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-2 border-b bg-stone-50 shrink-0">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          Mode:
        </span>
        <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
          <button
            onClick={() => {
              setMode("select");
              setConnectFrom(null);
            }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
              mode === "select"
                ? "bg-amber-500 text-white"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <MousePointer2 className="h-3 w-3" />
            Select &amp; Drag
          </button>
          <button
            onClick={() => {
              setMode("connect");
              setSelectedInstance(null);
            }}
            disabled={placed.length < 2}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 ${
              mode === "connect"
                ? "bg-blue-500 text-white"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <LinkIcon className="h-3 w-3" />
            Connect Nodes
          </button>
        </div>
        {mode === "connect" && (
          <span className="text-xs text-blue-700 font-medium">
            {connectFrom
              ? "→ Click second node to connect"
              : "Click first node to start"}
          </span>
        )}
        <span className="ml-auto text-xs text-stone-500">
          {placed.length} {placed.length === 1 ? "node" : "nodes"} ·{" "}
          {connections.length}{" "}
          {connections.length === 1 ? "connection" : "connections"}
        </span>
      </div>

      {/* Main 3-pane layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Service Palette */}
        <aside className="w-56 sm:w-64 shrink-0 border-r bg-white overflow-y-auto p-3">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 px-1">
            Service Palette
          </div>
          <div className="text-[11px] text-stone-400 mb-3 px-1">
            Drag a service onto the canvas →
          </div>
          {categoryOrder.map((cat) => {
            const services = servicesByCategory[cat];
            if (!services?.length) return null;
            return (
              <div key={cat} className="mb-3">
                <div className="text-[11px] font-bold text-stone-700 mb-1 px-1 uppercase tracking-wider">
                  {categoryLabels[cat]}
                </div>
                <div className="space-y-1">
                  {services.map((s) => (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={(e) => handlePaletteDragStart(e, s.id)}
                      className="group cursor-grab active:cursor-grabbing flex items-center gap-2 px-2 py-1.5 rounded-md border border-stone-200 hover:border-amber-400 hover:bg-amber-50 transition-colors text-xs"
                      style={{ borderLeftWidth: 3, borderLeftColor: s.color }}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                        style={{ background: s.color }}
                      >
                        <ServiceIcon iconKey={s.icon} className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-stone-900 truncate">
                          {s.shortName}
                        </div>
                        <div className="text-[10px] text-stone-500 truncate">
                          ${s.costPerMonth}/mo
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </aside>

        {/* Center: Canvas */}
        <main
          ref={canvasRef}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = draggingId ? "move" : "copy";
          }}
          onDrop={handleCanvasDrop}
          onClick={() => {
            if (mode === "select") setSelectedInstance(null);
          }}
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle, #d6d3d1 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "#fafaf9",
          }}
        >
          {placed.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6 pointer-events-none">
              <div className="max-w-md pointer-events-auto">
                <div className="text-5xl mb-4">🎨</div>
                <h2 className="text-xl font-bold text-stone-700 mb-2">
                  Build Your AWS Architecture
                </h2>
                <p className="text-sm text-stone-500 mb-6">
                  Drag services from the left palette. Then switch to
                  &quot;Connect Nodes&quot; mode to draw connections between
                  them.
                </p>
                <div className="text-xs font-semibold text-stone-600 mb-2">
                  Or start from a preset:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => loadPreset(p)}
                      className="text-left rounded-lg border-2 border-stone-200 hover:border-amber-400 hover:bg-amber-50 px-3 py-2 transition-colors"
                    >
                      <div className="text-sm font-bold text-stone-900">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {p.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* SVG layer for connection lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                  </marker>
                </defs>
                {connections.map((conn) => {
                  const from = placed.find((p) => p.instanceId === conn.from);
                  const to = placed.find((p) => p.instanceId === conn.to);
                  if (!from || !to) return null;
                  return (
                    <g key={conn.id} className="pointer-events-auto">
                      <line
                        x1={`${from.x}%`}
                        y1={`${from.y}%`}
                        x2={`${to.x}%`}
                        y2={`${to.y}%`}
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeDasharray="5 4"
                        markerEnd="url(#arrow)"
                        opacity="0.7"
                      />
                      {/* Click target — wider invisible line for hit testing */}
                      <line
                        x1={`${from.x}%`}
                        y1={`${from.y}%`}
                        x2={`${to.x}%`}
                        y2={`${to.y}%`}
                        stroke="transparent"
                        strokeWidth="14"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveConnection(conn.id);
                        }}
                      >
                        <title>Click to delete connection</title>
                      </line>
                    </g>
                  );
                })}

                {/* Pending connection from connect mode */}
                {mode === "connect" && connectFrom && (
                  <PendingConnection
                    from={placed.find((p) => p.instanceId === connectFrom)!}
                  />
                )}
              </svg>

              {/* Nodes */}
              {placed.map((p) => {
                const s = awsServices.find((x) => x.id === p.serviceId);
                if (!s) return null;
                const isSelected = selectedInstance === p.instanceId;
                const isConnectFrom = connectFrom === p.instanceId;
                return (
                  <div
                    key={p.instanceId}
                    draggable={mode === "select"}
                    onDragStart={(e) => handleNodeDragStart(e, p.instanceId)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeClick(p.instanceId);
                    }}
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                      mode === "select" ? "cursor-move" : "cursor-pointer"
                    } group`}
                  >
                    {/* Card */}
                    <div
                      className={`relative bg-white rounded-xl border-2 shadow-md hover:shadow-xl transition-all px-3 py-2 min-w-[110px] text-center ${
                        isSelected
                          ? "ring-4 ring-amber-300 scale-110"
                          : isConnectFrom
                          ? "ring-4 ring-blue-300 scale-110"
                          : ""
                      }`}
                      style={{
                        borderColor: s.color,
                      }}
                    >
                      <div
                        className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
                        }}
                      >
                        <ServiceIcon iconKey={s.icon} className="h-6 w-6" />
                      </div>
                      <div className="text-xs font-bold text-stone-900 leading-tight">
                        {s.shortName}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        ${s.costPerMonth}/mo
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </main>

        {/* Right: Impact Panel */}
        <aside className="hidden md:flex flex-col w-72 lg:w-80 shrink-0 border-l bg-white overflow-y-auto">
          <div className="p-4 border-b">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Architecture Impact
            </div>

            <div className="space-y-3">
              <MetricCard
                icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
                label="Monthly Cost"
                value={`$${metrics.cost}`}
                hint={`${metrics.count} service${metrics.count === 1 ? "" : "s"}`}
                tone="emerald"
              />
              <MetricCard
                icon={<ZapIcon className="h-4 w-4 text-amber-600" />}
                label="End-to-end Latency"
                value={`~${metrics.latency}ms`}
                hint="Sum of service latencies"
                tone="amber"
              />
              <MetricCard
                icon={<Activity className="h-4 w-4 text-blue-600" />}
                label="System Reliability"
                value={`${metrics.reliability}%`}
                hint="Compounded across services"
                tone="blue"
              />
              <MetricCard
                icon={<ShieldIcon className="h-4 w-4 text-rose-600" />}
                label="Security Score"
                value={`${metrics.security}/100`}
                hint="Avg. across services"
                tone="rose"
              />
            </div>
          </div>

          {/* Selected service detail */}
          {selectedService && selected && (
            <div className="p-4 border-b bg-stone-50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: selectedService.color }}
                  >
                    <ServiceIcon
                      iconKey={selectedService.icon}
                      className="h-4 w-4"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider">
                      Selected
                    </div>
                    <div className="text-sm font-bold text-stone-900">
                      {selectedService.name}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(selected.instanceId)}
                  className="text-stone-400 hover:text-rose-600"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-stone-600 mb-3">
                {selectedService.description}
              </p>

              {selectedService.alternatives &&
                selectedService.alternatives.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-stone-700 mb-1.5">
                      ⇄ Swap with:
                    </div>
                    <div className="space-y-1">
                      {selectedService.alternatives.map((altId) => {
                        const alt = awsServices.find((s) => s.id === altId);
                        if (!alt) return null;
                        const costDelta =
                          alt.costPerMonth - selectedService.costPerMonth;
                        const latencyDelta =
                          alt.latencyMs - selectedService.latencyMs;
                        return (
                          <button
                            key={altId}
                            onClick={() => handleSwap(selected.instanceId, altId)}
                            className="w-full text-left rounded-md border border-stone-200 hover:border-amber-400 hover:bg-white px-2 py-1.5 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-900">
                                <ServiceIcon
                                  iconKey={alt.icon}
                                  className="h-3 w-3"
                                />
                                {alt.shortName}
                              </div>
                              <div className="text-[10px] flex gap-1.5">
                                <span
                                  className={
                                    costDelta < 0
                                      ? "text-emerald-600"
                                      : "text-rose-600"
                                  }
                                >
                                  {costDelta >= 0 ? "+" : ""}${costDelta}
                                </span>
                                <span
                                  className={
                                    latencyDelta < 0
                                      ? "text-emerald-600"
                                      : "text-rose-600"
                                  }
                                >
                                  {latencyDelta >= 0 ? "+" : ""}
                                  {latencyDelta}ms
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Connections list */}
          {connections.length > 0 && (
            <div className="p-4 border-b">
              <div className="text-[11px] font-semibold text-stone-500 uppercase mb-2">
                Connections ({connections.length})
              </div>
              <div className="space-y-1">
                {connections.map((c) => {
                  const from = placed.find((p) => p.instanceId === c.from);
                  const to = placed.find((p) => p.instanceId === c.to);
                  const fromS = from
                    ? awsServices.find((s) => s.id === from.serviceId)
                    : null;
                  const toS = to
                    ? awsServices.find((s) => s.id === to.serviceId)
                    : null;
                  if (!fromS || !toS) return null;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-xs px-2 py-1 rounded-md hover:bg-stone-100"
                    >
                      <span className="flex items-center gap-1 text-stone-700 min-w-0">
                        <ServiceIcon iconKey={fromS.icon} className="h-3 w-3 shrink-0" />
                        <span className="truncate">{fromS.shortName}</span>
                        <span className="text-stone-400">→</span>
                        <ServiceIcon iconKey={toS.icon} className="h-3 w-3 shrink-0" />
                        <span className="truncate">{toS.shortName}</span>
                      </span>
                      <button
                        onClick={() => handleRemoveConnection(c.id)}
                        className="text-stone-400 hover:text-rose-600 shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Component list */}
          {placed.length > 0 && (
            <div className="p-4 flex-1">
              <div className="text-[11px] font-semibold text-stone-500 uppercase mb-2">
                Components ({placed.length})
              </div>
              <div className="space-y-1">
                {placed.map((p) => {
                  const s = awsServices.find((x) => x.id === p.serviceId);
                  if (!s) return null;
                  return (
                    <button
                      key={p.instanceId}
                      onClick={() => {
                        setMode("select");
                        setSelectedInstance(p.instanceId);
                      }}
                      className={`w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-md ${
                        selectedInstance === p.instanceId
                          ? "bg-amber-100 text-amber-900"
                          : "hover:bg-stone-100 text-stone-700"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <ServiceIcon iconKey={s.icon} className="h-3 w-3" />
                        <span>{s.shortName}</span>
                      </span>
                      <span className="text-[10px] text-stone-400">
                        ${s.costPerMonth}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile metrics bar */}
      <div className="md:hidden border-t bg-white px-3 py-2 grid grid-cols-4 gap-2 text-center text-xs shrink-0">
        <div>
          <div className="text-stone-500 text-[10px]">$/mo</div>
          <div className="font-bold text-emerald-700">${metrics.cost}</div>
        </div>
        <div>
          <div className="text-stone-500 text-[10px]">Latency</div>
          <div className="font-bold text-amber-700">{metrics.latency}ms</div>
        </div>
        <div>
          <div className="text-stone-500 text-[10px]">Reliab.</div>
          <div className="font-bold text-blue-700">{metrics.reliability}%</div>
        </div>
        <div>
          <div className="text-stone-500 text-[10px]">Security</div>
          <div className="font-bold text-rose-700">{metrics.security}</div>
        </div>
      </div>
    </div>
  );
}

// Animated dashed line from a node to the cursor while in connect mode
function PendingConnection({ from }: { from: PlacedService }) {
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const canvasEl = document.querySelector(
        "main[class*='flex-1']"
      ) as HTMLElement | null;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      setCursor({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  if (!cursor) return null;
  return (
    <line
      x1={`${from.x}%`}
      y1={`${from.y}%`}
      x2={`${cursor.x}%`}
      y2={`${cursor.y}%`}
      stroke="#3b82f6"
      strokeWidth="2"
      strokeDasharray="6 4"
      opacity="0.6"
    />
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "amber" | "blue" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-50 border-emerald-100",
    amber: "bg-amber-50 border-amber-100",
    blue: "bg-blue-50 border-blue-100",
    rose: "bg-rose-50 border-rose-100",
  };
  return (
    <div className={`rounded-lg border ${tones[tone]} p-3`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-stone-700">{label}</span>
      </div>
      <div className="text-xl font-bold text-stone-900">{value}</div>
      <div className="text-[10px] text-stone-500">{hint}</div>
    </div>
  );
}

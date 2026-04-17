"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Zap,
  Activity,
  Shield,
  Trash2,
  RotateCcw,
  Download,
  X,
  Plus,
} from "lucide-react";
import {
  awsServices,
  type AwsService,
  type ServiceCategory,
} from "@/lib/aws-services-data";

interface PlacedService {
  instanceId: string;
  serviceId: string;
  x: number;
  y: number;
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
  compute: "🖥️ Compute",
  storage: "💾 Storage",
  database: "🗄️ Database",
  network: "🌐 Network",
  messaging: "📬 Messaging",
  security: "🔐 Security",
  analytics: "📊 Analytics",
  ml: "🤖 ML",
  cdn: "🌍 CDN",
};

const presets: Array<{ name: string; description: string; services: string[] }> = [
  {
    name: "3-Tier Web App",
    description: "Classic web application with LB, app servers, and DB",
    services: ["route53", "cloudfront", "alb", "ec2", "rds", "elasticache"],
  },
  {
    name: "Serverless API",
    description: "Fully serverless backend with API Gateway + Lambda",
    services: ["apigateway", "lambda", "dynamodb", "s3", "cloudfront"],
  },
  {
    name: "Microservices",
    description: "Containerized microservices on Fargate with EventBridge",
    services: ["alb", "fargate", "aurora", "eventbridge", "sqs", "lambda"],
  },
  {
    name: "Data Pipeline",
    description: "Streaming ingest → processing → analytics warehouse",
    services: ["kinesis", "lambda", "s3", "redshift"],
  },
  {
    name: "Static Website",
    description: "Cheap, fast static site with global CDN",
    services: ["s3", "cloudfront", "route53", "waf"],
  },
];

export function SimulatorClient() {
  const [placed, setPlaced] = useState<PlacedService[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, AwsService[]> = {};
    for (const s of awsServices) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    return grouped;
  }, []);

  // Calculate totals
  const metrics = useMemo(() => {
    const services = placed
      .map((p) => awsServices.find((s) => s.id === p.serviceId))
      .filter((s): s is AwsService => !!s);

    if (services.length === 0) {
      return { cost: 0, latency: 0, reliability: 100, security: 100, count: 0 };
    }

    const cost = services.reduce((sum, s) => sum + s.costPerMonth, 0);
    const latency = services.reduce((sum, s) => sum + s.latencyMs, 0);
    // Reliability multiplies (system fails if ANY component fails)
    const reliability = services.reduce(
      (acc, s) => acc * (s.reliability / 100),
      1
    ) * 100;
    // Security is the average (weakest link is concerning but not deterministic)
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

  const handleDragStart = (e: React.DragEvent, serviceId: string) => {
    e.dataTransfer.setData("serviceId", serviceId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const serviceId = e.dataTransfer.getData("serviceId");
    if (!serviceId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPlaced((prev) => [
      ...prev,
      {
        instanceId: `${serviceId}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        serviceId,
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
      },
    ]);
  };

  const handlePlacedDragStart = (instanceId: string) => {
    setDraggingId(instanceId);
  };

  const handlePlacedDragEnd = (e: React.DragEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPlaced((prev) =>
      prev.map((p) =>
        p.instanceId === draggingId
          ? { ...p, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) }
          : p
      )
    );
    setDraggingId(null);
  };

  const handleRemove = (instanceId: string) => {
    setPlaced((prev) => prev.filter((p) => p.instanceId !== instanceId));
    if (selectedInstance === instanceId) setSelectedInstance(null);
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
      x: 15 + (i % 4) * 20,
      y: 15 + Math.floor(i / 4) * 25,
    }));
    setPlaced(newPlaced);
    setSelectedInstance(null);
  };

  const clearAll = () => {
    setPlaced([]);
    setSelectedInstance(null);
  };

  const exportJson = () => {
    const data = {
      services: placed.map((p) => {
        const s = awsServices.find((x) => x.id === p.serviceId);
        return { id: p.serviceId, name: s?.name, x: p.x, y: p.y };
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
          <span className="hidden sm:inline">Back to Home</span>
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
                <div className="text-[11px] font-semibold text-stone-700 mb-1 px-1">
                  {categoryLabels[cat]}
                </div>
                <div className="space-y-1">
                  {services.map((s) => (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, s.id)}
                      className="group cursor-grab active:cursor-grabbing flex items-center gap-2 px-2 py-1.5 rounded-md border border-stone-200 hover:border-amber-400 hover:bg-amber-50 transition-colors text-xs"
                      style={{ borderLeftWidth: 3, borderLeftColor: s.color }}
                    >
                      <span className="text-base shrink-0">{s.emoji}</span>
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
          onDrop={draggingId ? handlePlacedDragEnd : handleDrop}
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle, #d6d3d1 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: "#fafaf9",
          }}
        >
          {placed.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6">
              <div className="max-w-md">
                <div className="text-5xl mb-4">🎨</div>
                <h2 className="text-xl font-bold text-stone-700 mb-2">
                  Build Your AWS Architecture
                </h2>
                <p className="text-sm text-stone-500 mb-6">
                  Drag services from the left palette onto this canvas. See
                  live cost, latency, reliability, and security impact on the
                  right.
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
              {placed.map((p) => {
                const s = awsServices.find((x) => x.id === p.serviceId);
                if (!s) return null;
                return (
                  <div
                    key={p.instanceId}
                    draggable
                    onDragStart={() => handlePlacedDragStart(p.instanceId)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInstance(p.instanceId);
                    }}
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      borderColor: s.color,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move bg-white rounded-xl border-2 shadow-md hover:shadow-lg transition-all px-3 py-2 min-w-[100px] text-center ${
                      selectedInstance === p.instanceId
                        ? "ring-4 ring-amber-300 scale-110"
                        : ""
                    }`}
                  >
                    <div className="text-2xl mb-0.5">{s.emoji}</div>
                    <div className="text-xs font-bold text-stone-900 leading-tight">
                      {s.shortName}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      ${s.costPerMonth}/mo
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
                icon={<Zap className="h-4 w-4 text-amber-600" />}
                label="End-to-end Latency"
                value={`~${metrics.latency}ms`}
                hint="Sum of all service latencies"
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
                icon={<Shield className="h-4 w-4 text-rose-600" />}
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
                <div>
                  <div className="text-xs text-stone-500 uppercase tracking-wider">
                    Selected
                  </div>
                  <div className="text-sm font-bold text-stone-900 flex items-center gap-1">
                    {selectedService.emoji} {selectedService.name}
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
                        const costDelta = alt.costPerMonth - selectedService.costPerMonth;
                        const latencyDelta = alt.latencyMs - selectedService.latencyMs;
                        return (
                          <button
                            key={altId}
                            onClick={() => handleSwap(selected.instanceId, altId)}
                            className="w-full text-left rounded-md border border-stone-200 hover:border-amber-400 hover:bg-white px-2 py-1.5 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-xs text-stone-900">
                                {alt.emoji} {alt.shortName}
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
                      onClick={() => setSelectedInstance(p.instanceId)}
                      className={`w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-md ${
                        selectedInstance === p.instanceId
                          ? "bg-amber-100 text-amber-900"
                          : "hover:bg-stone-100 text-stone-700"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{s.emoji}</span>
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

"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts";
interface DomainScoreItem {
  domain_id: string;
  domain_name: string;
  score: number;
}

interface ReadinessRadarProps {
  domainScores: DomainScoreItem[];
}

export function ReadinessRadar({ domainScores }: ReadinessRadarProps) {
  const data = domainScores.map((d) => ({
    domain: d.domain_name,
    score: Math.round(d.score),
  }));

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
      <h2 className="text-xs font-medium uppercase tracking-widest text-stone-500">
        Domain Readiness
      </h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e7e5e4" />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ fill: "#78716c", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#a8a29e", fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name="Readiness"
              dataKey="score"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.3}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#78716c" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { getCertBadge } from "@/lib/cert-badges";

const providerTheme: Record<
  string,
  { primary: string; secondary: string; mark: string }
> = {
  aws:     { primary: "#FF9900", secondary: "#232F3E", mark: "AWS" },
  azure:   { primary: "#0078D4", secondary: "#243A5E", mark: "Az" },
  gcp:     { primary: "#34A853", secondary: "#1A73E8", mark: "GCP" },
  comptia: { primary: "#C8202F", secondary: "#1B1B1B", mark: "CompTIA" },
  nvidia:  { primary: "#76B900", secondary: "#1A1A1A", mark: "NVIDIA" },
};

interface CertBadgeProps {
  code: string | null | undefined;
  provider: string;
  /** Pixel size; renders square. */
  size?: number;
  className?: string;
  /** If false, never use external image — always use the generated badge. */
  allowExternal?: boolean;
}

/**
 * Renders an official certification badge image when available, otherwise a
 * polished provider-themed generated SVG shield.
 */
export function CertBadge({
  code,
  provider,
  size = 56,
  className = "",
  allowExternal = true,
}: CertBadgeProps) {
  const badge = allowExternal ? getCertBadge(code) : null;
  const [errored, setErrored] = useState(false);

  // Try the official badge image first
  if (badge && !errored) {
    return (
      <img
        src={badge.url}
        alt={`${code ?? "Certification"} badge`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setErrored(true)}
        className={`shrink-0 select-none ${className}`}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }

  // Generated fallback — provider-themed shield with cert code
  return (
    <GeneratedBadge
      code={code ?? "?"}
      provider={provider}
      size={size}
      className={className}
    />
  );
}

function GeneratedBadge({
  code,
  provider,
  size,
  className = "",
}: {
  code: string;
  provider: string;
  size: number;
  className?: string;
}) {
  const theme =
    providerTheme[provider.toLowerCase()] ?? providerTheme.aws;

  // Truncate long codes so they fit
  const display = code.length > 9 ? code.slice(0, 9) : code;
  const fontSize = display.length <= 5 ? 16 : display.length <= 7 ? 13 : 11;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${code} certification badge`}
      className={`shrink-0 select-none drop-shadow-md ${className}`}
    >
      <defs>
        <linearGradient id={`g-${code}-${provider}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.primary} />
          <stop
            offset="100%"
            stopColor={theme.secondary}
            stopOpacity="0.95"
          />
        </linearGradient>
        <linearGradient
          id={`g-shine-${code}-${provider}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="50%" stopColor="white" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Hexagon shield shape */}
      <polygon
        points="50,4 90,26 90,74 50,96 10,74 10,26"
        fill={`url(#g-${code}-${provider})`}
        stroke="white"
        strokeWidth="2"
      />
      {/* Inner ring */}
      <polygon
        points="50,12 82,30 82,70 50,88 18,70 18,30"
        fill="none"
        stroke="white"
        strokeWidth="0.8"
        strokeOpacity="0.4"
      />
      {/* Top shine */}
      <polygon
        points="50,4 90,26 90,40 10,40 10,26"
        fill={`url(#g-shine-${code}-${provider})`}
      />

      {/* Provider mark */}
      <text
        x="50"
        y="38"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="10"
        fontWeight="700"
        fill="white"
        opacity="0.9"
        style={{ letterSpacing: "0.5px" }}
      >
        {theme.mark}
      </text>

      {/* Cert code */}
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize={fontSize}
        fontWeight="800"
        fill="white"
        style={{ letterSpacing: "0.5px" }}
      >
        {display}
      </text>

      {/* Bottom decoration */}
      <line
        x1="30"
        y1="78"
        x2="70"
        y2="78"
        stroke="white"
        strokeWidth="0.8"
        strokeOpacity="0.5"
      />
      <text
        x="50"
        y="86"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="6"
        fontWeight="600"
        fill="white"
        opacity="0.85"
        style={{ letterSpacing: "0.8px" }}
      >
        CERTIFIED
      </text>
    </svg>
  );
}

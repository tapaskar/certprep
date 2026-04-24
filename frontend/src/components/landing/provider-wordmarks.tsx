/**
 * Provider wordmarks — typeset SVG wordmarks for AWS, Microsoft Azure,
 * Google Cloud, CompTIA, and NVIDIA. Used in the trust strip on the
 * landing page so visitors instantly see which certifications we cover.
 *
 * These are simple typographic wordmarks in each company's brand colors —
 * not pixel-for-pixel copies of their logos. They convey association
 * without misappropriating registered marks.
 */

interface WordmarkProps {
  className?: string;
  monochrome?: boolean;
}

const baseClass = "h-7 w-auto select-none";

export function AWSWordmark({ className = "", monochrome = false }: WordmarkProps) {
  const color = monochrome ? "#78716c" : "#232F3E";
  const accent = monochrome ? "#78716c" : "#FF9900";
  return (
    <svg
      viewBox="0 0 80 32"
      className={`${baseClass} ${className}`}
      role="img"
      aria-label="AWS"
    >
      <text
        x="0"
        y="20"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="20"
        fontWeight="800"
        fill={color}
        letterSpacing="-1"
      >
        aws
      </text>
      {/* Smile arc — a hint, not the literal AWS smile */}
      <path
        d="M 4 26 Q 25 32 46 26"
        fill="none"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AzureWordmark({ className = "", monochrome = false }: WordmarkProps) {
  const color = monochrome ? "#78716c" : "#0078D4";
  return (
    <svg
      viewBox="0 0 130 32"
      className={`${baseClass} ${className}`}
      role="img"
      aria-label="Microsoft Azure"
    >
      {/* Stylised chevron-A mark */}
      <polygon
        points="3,26 18,4 30,26 24,26 18,15 14,26"
        fill={color}
      />
      <text
        x="36"
        y="22"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="14"
        fontWeight="600"
        fill={color}
        letterSpacing="-0.3"
      >
        Microsoft Azure
      </text>
    </svg>
  );
}

export function GoogleCloudWordmark({ className = "", monochrome = false }: WordmarkProps) {
  if (monochrome) {
    return (
      <svg
        viewBox="0 0 150 32"
        className={`${baseClass} ${className}`}
        role="img"
        aria-label="Google Cloud"
      >
        <text
          x="0"
          y="22"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="18"
          fontWeight="600"
          fill="#78716c"
          letterSpacing="-0.5"
        >
          Google Cloud
        </text>
      </svg>
    );
  }
  // Coloured: each letter of "Google" in the classic palette
  const letters = [
    { ch: "G", color: "#4285F4" },
    { ch: "o", color: "#EA4335" },
    { ch: "o", color: "#FBBC05" },
    { ch: "g", color: "#4285F4" },
    { ch: "l", color: "#34A853" },
    { ch: "e", color: "#EA4335" },
  ];
  return (
    <svg
      viewBox="0 0 160 32"
      className={`${baseClass} ${className}`}
      role="img"
      aria-label="Google Cloud"
    >
      {letters.map((l, i) => (
        <text
          key={i}
          x={i * 13}
          y="22"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="18"
          fontWeight="700"
          fill={l.color}
          letterSpacing="-0.5"
        >
          {l.ch}
        </text>
      ))}
      <text
        x="84"
        y="22"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="18"
        fontWeight="500"
        fill="#5F6368"
        letterSpacing="-0.3"
      >
        Cloud
      </text>
    </svg>
  );
}

export function CompTIAWordmark({ className = "", monochrome = false }: WordmarkProps) {
  const color = monochrome ? "#78716c" : "#C8202F";
  return (
    <svg
      viewBox="0 0 100 32"
      className={`${baseClass} ${className}`}
      role="img"
      aria-label="CompTIA"
    >
      <text
        x="0"
        y="22"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="20"
        fontWeight="800"
        fill={color}
        letterSpacing="-1"
      >
        CompTIA
      </text>
      <circle cx="92" cy="10" r="3" fill={color} />
    </svg>
  );
}

export function NvidiaWordmark({ className = "", monochrome = false }: WordmarkProps) {
  const color = monochrome ? "#78716c" : "#76B900";
  return (
    <svg
      viewBox="0 0 100 32"
      className={`${baseClass} ${className}`}
      role="img"
      aria-label="NVIDIA"
    >
      <text
        x="0"
        y="22"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="18"
        fontWeight="800"
        fill={color}
        letterSpacing="0.5"
      >
        NVIDIA.
      </text>
    </svg>
  );
}

export function RedHatWordmark({ className = "", monochrome = false }: WordmarkProps) {
  const color = monochrome ? "#78716c" : "#EE0000";
  return (
    <svg
      viewBox="0 0 110 32"
      className={`${baseClass} ${className}`}
      role="img"
      aria-label="Red Hat"
    >
      {/* Hat silhouette */}
      <path
        d="M 4 22 Q 4 16 14 14 Q 24 12 28 18 L 28 22 Z"
        fill={color}
      />
      <rect x="2" y="22" width="28" height="2.5" fill={color} />
      <text
        x="36"
        y="22"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="16"
        fontWeight="800"
        fill={color}
      >
        Red Hat
      </text>
    </svg>
  );
}

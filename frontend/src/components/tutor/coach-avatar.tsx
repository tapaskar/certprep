"use client";

/**
 * Coach Avatar — "Sage"
 *
 * The visual persona for the AI tutor. Designed in Anthropic's warm
 * minimalist palette (clay/cream/charcoal) — NOT a generic graduation
 * cap, NOT a stock photo. A real character with calm watchful eyes
 * that subtly react to chat state:
 *
 *   • idle      — open eyes, gentle blink every ~6s
 *   • thinking  — eyes look up + soft sparkle pulse on the temple
 *   • speaking  — slight head bob (handled by parent's animate class)
 *
 * Pure SVG — no images to load, scales to any size, themeable.
 *
 * Designed to read at every size from 24px (chat bubble) to 96px
 * (welcome screen). Critical features (eyes, body silhouette) stay
 * legible even at FAB size.
 */

import { cn } from "@/lib/utils";

export type CoachAvatarState = "idle" | "thinking" | "speaking";

interface CoachAvatarProps {
  size?: number;
  state?: CoachAvatarState;
  className?: string;
  /** Show a soft glow ring around the avatar */
  glow?: boolean;
}

export function CoachAvatar({
  size = 40,
  state = "idle",
  className,
  glow = false,
}: CoachAvatarProps) {
  const isThinking = state === "thinking";

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        glow && "drop-shadow-[0_0_12px_rgba(218,119,86,0.45)]",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "overflow-visible",
          state === "speaking" && "animate-coach-bob",
        )}
      >
        <defs>
          {/* Body gradient — Anthropic clay → warm amber */}
          <radialGradient id="sage-body" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#E89A78" />
            <stop offset="60%" stopColor="#DA7756" />
            <stop offset="100%" stopColor="#B85A3D" />
          </radialGradient>

          {/* Face panel */}
          <radialGradient id="sage-face" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#FBF3E5" />
            <stop offset="100%" stopColor="#F2E2C9" />
          </radialGradient>

          {/* Subtle inner shadow for face depth */}
          <filter id="sage-inner" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
        </defs>

        {/* Body — round, soft shoulders peeking up */}
        <ellipse cx="32" cy="58" rx="22" ry="6" fill="#B85A3D" opacity="0.25" />

        {/* Head — warm clay rounded square */}
        <path
          d="M 14 26
             C 14 16, 22 10, 32 10
             C 42 10, 50 16, 50 26
             L 50 38
             C 50 46, 43 52, 32 52
             C 21 52, 14 46, 14 38
             Z"
          fill="url(#sage-body)"
        />

        {/* Tiny ear-like nubs — gives character */}
        <circle cx="14" cy="22" r="3" fill="#B85A3D" />
        <circle cx="50" cy="22" r="3" fill="#B85A3D" />

        {/* Face panel — cream */}
        <ellipse
          cx="32"
          cy="32"
          rx="14"
          ry="13"
          fill="url(#sage-face)"
          filter="url(#sage-inner)"
        />

        {/* Eyes — calm, watchful */}
        <g className={isThinking ? "animate-coach-look-up" : ""}>
          {/* Eye whites */}
          <ellipse cx="26" cy="32" rx="3.2" ry="3.6" fill="#FFFFFF" />
          <ellipse cx="38" cy="32" rx="3.2" ry="3.6" fill="#FFFFFF" />
          {/* Pupils */}
          <circle cx="26" cy="32.5" r="1.9" fill="#2A1F1A" />
          <circle cx="38" cy="32.5" r="1.9" fill="#2A1F1A" />
          {/* Highlights — alive, not creepy */}
          <circle cx="26.7" cy="31.5" r="0.7" fill="#FFFFFF" />
          <circle cx="38.7" cy="31.5" r="0.7" fill="#FFFFFF" />
        </g>

        {/* Blink overlay — covers eyes when animating */}
        <g className="animate-coach-blink origin-center">
          <rect x="22" y="32" width="20" height="0" fill="url(#sage-face)" />
        </g>

        {/* Mouth — gentle, faint smile (a soft arc) */}
        <path
          d="M 28 41 Q 32 43.5 36 41"
          stroke="#7A4A2E"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />

        {/* Cheek warmth */}
        <circle cx="22" cy="38" r="2" fill="#E89A78" opacity="0.35" />
        <circle cx="42" cy="38" r="2" fill="#E89A78" opacity="0.35" />

        {/* Thinking sparkle — only when state="thinking" */}
        {isThinking && (
          <g className="animate-coach-think">
            <path
              d="M 50 14 L 51 17 L 54 18 L 51 19 L 50 22 L 49 19 L 46 18 L 49 17 Z"
              fill="#F5C97B"
            />
            <circle cx="56" cy="22" r="1" fill="#F5C97B" opacity="0.7" />
            <circle cx="53" cy="26" r="0.7" fill="#F5C97B" opacity="0.5" />
          </g>
        )}
      </svg>
    </div>
  );
}

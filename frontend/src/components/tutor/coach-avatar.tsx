"use client";

/**
 * Coach Avatar — "Sage"
 *
 * The visual persona for the AI tutor: a friendly, approachable HUMAN
 * tutor (not an animal, not an abstract creature). Designed in
 * Anthropic's warm-clay/cream palette with stylized but recognizably
 * human features — round glasses, calm eyes, warm sweater. Reads as
 * "trusted teacher" at a glance.
 *
 * Three reactive states:
 *   • idle      — open eyes, gentle blink every ~6s
 *   • thinking  — eyes drift up, soft sparkle on the temple
 *   • speaking  — slight head bob (parent applies the class)
 *
 * Pure SVG — no images to load, scales from 24px (chat bubble) to
 * 96px (welcome screen) without pixelation.
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
          {/* Skin gradient — warm tan, slightly lifted on the cheeks */}
          <radialGradient id="sage-skin" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#F2C9A1" />
            <stop offset="70%" stopColor="#E5A878" />
            <stop offset="100%" stopColor="#C68859" />
          </radialGradient>

          {/* Hair — warm dark brown */}
          <linearGradient id="sage-hair" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3C2418" />
            <stop offset="100%" stopColor="#2A1810" />
          </linearGradient>

          {/* Sweater — warm clay turtleneck */}
          <linearGradient id="sage-sweater" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#DA7756" />
            <stop offset="100%" stopColor="#B85A3D" />
          </linearGradient>

          {/* Subtle highlight on the face */}
          <radialGradient id="sage-cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F2A382" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#F2A382" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ─── Sweater / shoulders (peeks up from below) ─── */}
        <path
          d="M 6 64
             C 6 52, 14 46, 22 46
             L 42 46
             C 50 46, 58 52, 58 64
             Z"
          fill="url(#sage-sweater)"
        />
        {/* Turtleneck collar */}
        <path
          d="M 22 46
             C 22 49, 26 51, 32 51
             C 38 51, 42 49, 42 46
             L 42 43
             L 22 43 Z"
          fill="#9C4A30"
        />
        {/* Collar highlight */}
        <path
          d="M 24 46 C 24 47.5, 28 48.5, 32 48.5 C 36 48.5, 40 47.5, 40 46"
          stroke="#7A3520"
          strokeWidth="0.6"
          fill="none"
          opacity="0.6"
        />

        {/* ─── Neck ─── */}
        <path
          d="M 27 40 L 27 46 L 37 46 L 37 40 Z"
          fill="url(#sage-skin)"
        />
        {/* Neck shadow under the chin */}
        <ellipse cx="32" cy="42" rx="6" ry="1.5" fill="#A86E45" opacity="0.4" />

        {/* ─── Head shape — a soft rounded oval, not a ball ─── */}
        <path
          d="M 18 28
             C 18 19, 24 13, 32 13
             C 40 13, 46 19, 46 28
             L 46 35
             C 46 41, 40 44, 32 44
             C 24 44, 18 41, 18 35
             Z"
          fill="url(#sage-skin)"
        />

        {/* ─── Hair — short, swept, modern undercut feel ─── */}
        {/* Top hair */}
        <path
          d="M 18 26
             C 18 17, 24 11, 32 11
             C 40 11, 46 17, 46 26
             L 46 22
             C 44 19, 40 17, 32 17
             C 26 17, 22 18, 19 22
             Z"
          fill="url(#sage-hair)"
        />
        {/* Side fade — left */}
        <path d="M 18 26 L 18 32 C 18 30, 19 28, 19 26 Z" fill="url(#sage-hair)" />
        {/* Side fade — right */}
        <path d="M 46 26 L 46 32 C 46 30, 45 28, 45 26 Z" fill="url(#sage-hair)" />
        {/* Front fringe — gentle wisp */}
        <path
          d="M 22 19 Q 28 14, 36 17 Q 32 19, 25 21 Z"
          fill="url(#sage-hair)"
          opacity="0.95"
        />

        {/* ─── Cheek warmth ─── */}
        <ellipse cx="22" cy="34" rx="3" ry="2" fill="url(#sage-cheek)" />
        <ellipse cx="42" cy="34" rx="3" ry="2" fill="url(#sage-cheek)" />

        {/* ─── Glasses — round, thin, modern intellectual ─── */}
        {/* Left lens */}
        <circle
          cx="25"
          cy="29"
          r="4.5"
          fill="rgba(255,255,255,0.18)"
          stroke="#2A1810"
          strokeWidth="1.1"
        />
        {/* Right lens */}
        <circle
          cx="39"
          cy="29"
          r="4.5"
          fill="rgba(255,255,255,0.18)"
          stroke="#2A1810"
          strokeWidth="1.1"
        />
        {/* Bridge */}
        <line
          x1="29.5"
          y1="29"
          x2="34.5"
          y2="29"
          stroke="#2A1810"
          strokeWidth="1.1"
        />
        {/* Tiny lens highlight (catches the eye, not creepy) */}
        <path
          d="M 22 27 Q 23 26, 24 27"
          stroke="#FFFFFF"
          strokeWidth="0.8"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M 36 27 Q 37 26, 38 27"
          stroke="#FFFFFF"
          strokeWidth="0.8"
          fill="none"
          opacity="0.7"
        />

        {/* ─── Eyes (behind glasses) ─── */}
        <g className={isThinking ? "animate-coach-look-up" : ""}>
          {/* Iris */}
          <circle cx="25" cy="29.5" r="1.6" fill="#3C2418" />
          <circle cx="39" cy="29.5" r="1.6" fill="#3C2418" />
          {/* Pupil highlight */}
          <circle cx="25.5" cy="29" r="0.5" fill="#FFFFFF" />
          <circle cx="39.5" cy="29" r="0.5" fill="#FFFFFF" />
        </g>

        {/* ─── Blink overlay ─── */}
        <g className="animate-coach-blink">
          <ellipse cx="25" cy="29.5" rx="3.8" ry="0" fill="url(#sage-skin)" />
          <ellipse cx="39" cy="29.5" rx="3.8" ry="0" fill="url(#sage-skin)" />
        </g>

        {/* ─── Nose — minimal hint, just two soft shadows ─── */}
        <path
          d="M 31 33 Q 32 35, 33 33"
          stroke="#A86E45"
          strokeWidth="0.6"
          fill="none"
          opacity="0.55"
          strokeLinecap="round"
        />

        {/* ─── Mouth — gentle warm closed-mouth smile ─── */}
        <path
          d="M 28 38.5 Q 32 40.5, 36 38.5"
          stroke="#7A3A20"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
        {/* Lower lip highlight */}
        <path
          d="M 30 39.5 Q 32 40.4, 34 39.5"
          stroke="#C9785A"
          strokeWidth="0.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />

        {/* ─── Thinking sparkle (only when state === "thinking") ─── */}
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

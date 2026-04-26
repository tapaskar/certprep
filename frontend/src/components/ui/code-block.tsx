"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CodeBlock — fenced-code-block renderer with one-click copy.
 *
 * Shipped as a single component so the path runner, tutor chat, and
 * any future markdown rendering surface get the same UX:
 *
 *   • Black-on-white-ish dark block (matches existing styling).
 *   • Copy button pinned top-right; flips to ✓ Copied for 1.5s.
 *   • Falls back to a hidden textarea + execCommand if the
 *     navigator.clipboard API is unavailable (older browsers,
 *     non-HTTPS contexts).
 *
 * Optional props let callers tweak: language label, "dark" inversion
 * (when used in a dark container), and inline-vs-block layout.
 */
export interface CodeBlockProps {
  code: string;
  language?: string;
  /** Inverts to a light theme when used inside an already-dark surface */
  light?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  light = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for non-HTTPS / older browsers — uses a hidden textarea
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Permission denied or no clipboard at all — fail silently.
      // The text is already visible and selectable, so the user can
      // copy it manually.
    }
  };

  return (
    <div className={cn("relative group my-2", className)}>
      {/* Optional language label, top-left */}
      {language && (
        <div
          className={cn(
            "absolute top-0 left-0 px-2 py-0.5 rounded-tl-md rounded-br-md text-[10px] font-mono font-bold uppercase tracking-wider",
            light
              ? "bg-stone-200 text-stone-600"
              : "bg-stone-700 text-stone-300",
          )}
        >
          {language}
        </div>
      )}

      {/* Copy button — visible always (mobile + accessibility); brighter on hover */}
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy to clipboard"}
        aria-label={copied ? "Copied" : "Copy code to clipboard"}
        className={cn(
          "absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all",
          // Subtle by default, prominent on hover/focus
          light
            ? "bg-white/70 text-stone-600 hover:bg-white hover:text-stone-900 ring-1 ring-stone-200"
            : "bg-stone-700/70 text-stone-300 hover:bg-stone-700 hover:text-white ring-1 ring-stone-600/40",
          copied && (light ? "bg-emerald-100 text-emerald-700 ring-emerald-300" : "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40"),
        )}
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            <span>Copy</span>
          </>
        )}
      </button>

      <pre
        className={cn(
          "rounded-md p-3 pr-16 overflow-x-auto text-xs font-mono",
          light
            ? "bg-stone-100 text-stone-900 border border-stone-200"
            : "bg-stone-900 text-stone-100",
          language && "pt-6", // make room for the language label
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

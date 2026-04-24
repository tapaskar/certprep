"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Send,
  Sparkles,
  GraduationCap,
  RotateCcw,
  Loader2,
  Crown,
  Lightbulb,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export interface TutorChatProps {
  conceptId?: string;
  conceptName?: string;
  examId?: string;
  pathId?: string;
  pathTitle?: string;
  stepId?: string;
  stepTitle?: string;
  className?: string;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_SUGGESTIONS = [
  "Quiz me on a hard topic",
  "Explain a concept I'm weak on",
  "What's the trickiest exam pattern I should expect?",
];

const FOCUSED_SUGGESTIONS = [
  "Explain this concept like I'm new",
  "Give me a real-world example",
  "Quiz me on this — start easy",
  "What's the most common exam trap here?",
];

const PATH_STEP_SUGGESTIONS = [
  "Walk me through this step",
  "I'm stuck — what should I do?",
  "Give me a concrete example for this step",
  "Quiz me before I mark it complete",
];

export function TutorChat({
  conceptId,
  conceptName,
  examId,
  pathId,
  pathTitle,
  stepId,
  stepTitle,
  className = "",
}: TutorChatProps) {
  const userName = useAuthStore((s) => s.user?.display_name);
  const userPlan = useAuthStore((s) => s.user?.plan ?? "free");

  // Scope decides which conversation is loaded.
  const scope = pathId
    ? `path:${pathId}`
    : examId
    ? `exam:${examId}`
    : "global";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{
    used: number;
    limit: number | null;
    remaining: number | null;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const greeting = useCallback((): string => {
    const first = userName?.split(" ")[0] || "there";
    if (pathId && stepTitle) {
      return `Hi ${first} 👋 I'm Coach. Let's work through **${stepTitle}** together. Want me to walk through it, or do you have a question?`;
    }
    if (pathId && pathTitle) {
      return `Hi ${first} 👋 Welcome to the **${pathTitle}** path. I'll guide you step by step. Want to start, or jump to a topic?`;
    }
    if (conceptName) {
      return `Hi ${first} 👋 I'm Coach — your tutor for **${conceptName}**. I can explain it, quiz you, or answer specific questions. Where would you like to start?`;
    }
    return `Hi ${first} 👋 I'm Coach — your 1-on-1 cert exam tutor. I remember our past chats and know your study progress. What's giving you trouble today?`;
  }, [userName, pathId, pathTitle, stepTitle, conceptName]);

  // Load history + quota on mount / scope change
  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    Promise.all([
      api.getTutorHistory(scope).catch(() => ({ messages: [] })),
      api.getTutorQuota().catch(() => null),
    ]).then(([hist, q]) => {
      if (cancelled) return;
      const histMsgs = (hist.messages ?? []).map((m, i) => ({
        id: i,
        role: m.role,
        content: m.content,
      }));
      if (histMsgs.length === 0) {
        setMessages([{ id: 0, role: "assistant", content: greeting() }]);
      } else {
        setMessages(histMsgs);
      }
      if (q)
        setQuota({
          used: q.used_today,
          limit: q.daily_limit,
          remaining: q.remaining,
        });
      setLoadingHistory(false);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, greeting]);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const send = async (text?: string, reset = false) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: messages.length,
      role: "user",
      content: message,
    };
    if (reset) {
      setMessages([userMsg]);
    } else {
      setMessages((prev) => [...prev, userMsg]);
    }
    setSending(true);

    try {
      const reply = await api.tutorChat({
        message,
        ...(conceptId ? { concept_id: conceptId } : {}),
        ...(examId ? { exam_id: examId } : {}),
        ...(pathId ? { path_id: pathId } : {}),
        ...(stepId ? { step_id: stepId } : {}),
        ...(reset ? { reset: true } : {}),
      });
      setMessages((prev) => [
        ...prev,
        { id: prev.length, role: "assistant", content: reply.content },
      ]);
      setQuota({
        used: reply.used_today,
        limit: reply.daily_limit,
        remaining: reply.remaining,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.replace(/^API \d+:\s*/, "")
          : "Coach is unavailable right now. Try again shortly.";
      setError(msg);
      // Roll back
      setMessages((prev) => prev.slice(0, -1));
      setInput(message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = async () => {
    try {
      await api.clearTutorHistory(scope);
    } catch {
      // ignore
    }
    setMessages([{ id: 0, role: "assistant", content: greeting() }]);
    setError(null);
    setInput("");
  };

  const suggestions = stepId
    ? PATH_STEP_SUGGESTIONS
    : conceptId
    ? FOCUSED_SUGGESTIONS
    : DEFAULT_SUGGESTIONS;
  const showSuggestions = messages.length <= 1 && !sending && !loadingHistory;
  const limitReached = quota?.limit != null && (quota.remaining ?? 0) === 0;
  const isFreeTier = userPlan === "free";

  // Subtitle reflects current scope
  const subtitle = stepTitle
    ? `Step: ${stepTitle}`
    : pathTitle
    ? `Path: ${pathTitle}`
    : conceptName
    ? `Focus: ${conceptName}`
    : "Your 1-on-1 cert tutor";

  return (
    <div
      className={`flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-200 bg-gradient-to-r from-violet-50 to-amber-50/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-amber-500 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-stone-900">Coach</span>
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                Remembers you
              </span>
            </div>
            <div className="text-[11px] text-stone-500 truncate">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {quota && (
            <span className="text-[10px] text-stone-500">
              {quota.limit == null
                ? "Unlimited"
                : `${quota.remaining ?? 0}/${quota.limit} today`}
            </span>
          )}
          <button
            onClick={reset}
            disabled={sending}
            title="Clear this conversation"
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-stone-50/40"
        style={{ minHeight: 0 }}
      >
        {loadingHistory && (
          <div className="flex items-center gap-2 text-sm text-stone-500 px-3 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading our past conversation...
          </div>
        )}
        {!loadingHistory &&
          messages.map((m) => <Bubble key={m.id} message={m} />)}
        {sending && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-stone-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Coach is thinking...
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {showSuggestions && (
          <div className="pt-2">
            <div className="flex items-center gap-1 mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              <Lightbulb className="h-3 w-3" /> Try one of these
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={sending || limitReached}
                  className="text-xs px-3 py-1.5 rounded-full border border-stone-300 bg-white text-stone-700 hover:border-amber-400 hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 bg-white p-3">
        {limitReached ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-amber-900">
                Daily tutor limit reached
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                You&apos;ve used {quota?.used} messages today.{" "}
                {isFreeTier && "Pro members get unlimited 1-on-1 coaching."}
              </div>
            </div>
            {isFreeTier && (
              <Link
                href="/pricing"
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 py-1.5 text-xs font-bold"
              >
                <Crown className="h-3 w-3" /> Upgrade
              </Link>
            )}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                stepTitle
                  ? `Ask Coach about "${stepTitle}"...`
                  : pathTitle
                  ? `Ask Coach about ${pathTitle}...`
                  : conceptName
                  ? `Ask Coach about ${conceptName}...`
                  : "Ask Coach anything about your exam..."
              }
              disabled={sending || loadingHistory}
              className="flex-1 resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:bg-stone-50 max-h-32"
              style={{ minHeight: 38 }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || sending || loadingHistory}
              className="shrink-0 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white p-2 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 transition-all"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="mt-1.5 text-[10px] text-stone-400 flex items-center justify-between">
          <span>Enter to send · Shift+Enter for newline</span>
          {isFreeTier && quota?.limit != null && (
            <span>
              {quota.remaining} of {quota.limit} free today
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isCoach = message.role === "assistant";
  return (
    <div
      className={`flex ${isCoach ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
          isCoach
            ? "bg-white border border-stone-200 text-stone-800 shadow-sm"
            : "bg-stone-900 text-white"
        }`}
      >
        {isCoach && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1">
            Coach
          </div>
        )}
        <RichText text={message.content} dark={!isCoach} />
      </div>
    </div>
  );
}

/**
 * Tiny markdown-ish renderer for **bold**, `code`, ```code blocks```,
 * paragraphs, and bullet lists. Avoids pulling in a full markdown library.
 */
function RichText({ text, dark }: { text: string; dark: boolean }) {
  const codeColor = dark ? "bg-stone-700" : "bg-stone-100 text-stone-900";
  const blockBg = dark ? "bg-stone-800" : "bg-stone-100";

  const renderInline = (str: string, key: number) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const tokens = str.split(regex);
    tokens.forEach((tok, i) => {
      if (!tok) return;
      if (tok.startsWith("**") && tok.endsWith("**")) {
        parts.push(
          <strong key={`b-${key}-${i}`} className="font-bold">
            {tok.slice(2, -2)}
          </strong>
        );
      } else if (tok.startsWith("`") && tok.endsWith("`")) {
        parts.push(
          <code
            key={`c-${key}-${i}`}
            className={`rounded px-1 py-0.5 text-[0.85em] font-mono ${codeColor}`}
          >
            {tok.slice(1, -1)}
          </code>
        );
      } else {
        parts.push(<span key={`s-${key}-${i}`}>{tok}</span>);
      }
    });
    return parts;
  };

  // Split out code fences first
  const sections: Array<{ kind: "code" | "text"; content: string }> = [];
  const fenceRegex = /```(?:[\w-]*)\n?([\s\S]*?)```/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = fenceRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      sections.push({ kind: "text", content: text.slice(lastIdx, m.index) });
    }
    sections.push({ kind: "code", content: m[1] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    sections.push({ kind: "text", content: text.slice(lastIdx) });
  }

  const blocks: React.ReactNode[] = [];

  sections.forEach((section, sIdx) => {
    if (section.kind === "code") {
      blocks.push(
        <pre
          key={`code-${sIdx}`}
          className={`rounded-md p-2.5 overflow-x-auto text-[12px] font-mono ${blockBg} ${dark ? "text-stone-100" : "text-stone-900"} my-1.5`}
        >
          <code>{section.content}</code>
        </pre>
      );
      return;
    }

    const lines = section.content.split("\n");
    let listBuffer: string[] = [];
    let listKey = 0;

    const flushList = () => {
      if (listBuffer.length === 0) return;
      blocks.push(
        <ul
          key={`ul-${sIdx}-${listKey++}`}
          className="list-disc ml-5 my-1 space-y-0.5 text-sm leading-relaxed"
        >
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item, i)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    };

    lines.forEach((line, i) => {
      const stripped = line.trim();
      if (/^[-*]\s+/.test(stripped)) {
        listBuffer.push(stripped.replace(/^[-*]\s+/, ""));
      } else {
        flushList();
        if (stripped) {
          blocks.push(
            <p
              key={`p-${sIdx}-${i}`}
              className="text-sm leading-relaxed"
            >
              {renderInline(stripped, i)}
            </p>
          );
        }
      }
    });
    flushList();
  });

  return <div className="space-y-1.5">{blocks}</div>;
}

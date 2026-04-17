"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Volume2, Gauge } from "lucide-react";

interface AudioTutorProps {
  title: string;
  sections: Array<{ heading: string; body: string }>;
}

type PlayState = "idle" | "playing" | "paused";

export function AudioTutor({ title, sections }: AudioTutorProps) {
  const [state, setState] = useState<PlayState>("idle");
  const [rate, setRate] = useState(1);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    // Build the play queue
    const parts: string[] = [title];
    for (const s of sections) {
      parts.push(s.heading + ".");
      parts.push(s.body);
    }
    queueRef.current = parts;

    // Cleanup on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [title, sections]);

  const playNext = (idx: number) => {
    if (idx >= queueRef.current.length) {
      setState("idle");
      setCurrentIdx(0);
      return;
    }
    const u = new SpeechSynthesisUtterance(queueRef.current[idx]);
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    // Try to pick a pleasant voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Natural"))
    );
    if (preferred) u.voice = preferred;

    u.onend = () => {
      setCurrentIdx(idx + 1);
      playNext(idx + 1);
    };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const handlePlay = () => {
    if (state === "paused") {
      window.speechSynthesis.resume();
      setState("playing");
      return;
    }
    window.speechSynthesis.cancel();
    setState("playing");
    playNext(currentIdx);
  };

  const handlePause = () => {
    window.speechSynthesis.pause();
    setState("paused");
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setState("idle");
    setCurrentIdx(0);
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (state === "playing") {
      // Restart to apply new rate
      window.speechSynthesis.cancel();
      playNext(currentIdx);
    }
  };

  if (!supported) {
    return null;
  }

  const progress =
    queueRef.current.length > 0
      ? Math.min(100, (currentIdx / queueRef.current.length) * 100)
      : 0;

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white">
          <Volume2 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-stone-900">Audio Tutor</div>
          <div className="text-[11px] text-stone-500">
            Listen while commuting — uses your device&apos;s text-to-speech
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {state === "playing" ? (
          <button
            onClick={handlePause}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-bold hover:bg-violet-700"
          >
            <Pause className="h-4 w-4" />
            Pause
          </button>
        ) : (
          <button
            onClick={handlePlay}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-bold hover:bg-violet-700"
          >
            <Play className="h-4 w-4" />
            {state === "paused" ? "Resume" : "Play"}
          </button>
        )}
        {state !== "idle" && (
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 rounded-lg bg-white border border-stone-300 text-stone-700 px-3 py-2 text-sm font-semibold hover:border-stone-500"
          >
            <Square className="h-3 w-3" />
            Stop
          </button>
        )}

        <div className="ml-auto flex items-center gap-1 text-xs text-stone-600">
          <Gauge className="h-3 w-3" />
          <select
            value={rate}
            onChange={(e) => handleRateChange(Number(e.target.value))}
            className="rounded border border-stone-300 bg-white px-1.5 py-1 text-xs font-medium"
          >
            <option value={0.75}>0.75×</option>
            <option value={1}>1×</option>
            <option value={1.25}>1.25×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
        </div>
      </div>

      {state !== "idle" && (
        <div className="h-1 w-full rounded-full bg-violet-200 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

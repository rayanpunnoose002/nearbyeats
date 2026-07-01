"use client";

import { useMemo } from "react";

export type MascotMood = "idle" | "thinking" | "waving" | "celebrating";

interface MascotProps {
  mood: MascotMood;
}

const CONFETTI_COLORS = ["#fb923c", "#ec4899", "#38bdf8", "#34d399", "#facc15", "#c084fc"];

export default function Mascot({ mood }: MascotProps) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = ((360 / 14) * i * Math.PI) / 180;
        const distance = 38 + (i % 3) * 10;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: (i % 4) * 40,
        };
      }),
    [],
  );

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8">
      <div className="relative h-20 w-20">
        {mood === "celebrating" &&
          confetti.map((c, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                backgroundColor: c.color,
                "--dx": `${c.dx}px`,
                "--dy": `${c.dy}px`,
                animationDelay: `${c.delay}ms`,
              } as React.CSSProperties}
            />
          ))}

        {mood === "thinking" && (
          <div className="thought-bubble glass absolute -top-7 right-1 rounded-full px-2 py-1 text-xs">
            🤔
          </div>
        )}

        <svg
          viewBox="0 0 100 100"
          className={`relative h-20 w-20 drop-shadow-lg ${
            mood === "idle"
              ? "mascot-idle"
              : mood === "thinking"
              ? "mascot-thinking"
              : mood === "waving"
              ? "mascot-waving"
              : "mascot-celebrating"
          }`}
        >
          <defs>
            <linearGradient id="mascot-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent-from)" />
              <stop offset="100%" stopColor="var(--accent-to)" />
            </linearGradient>
          </defs>

          {/* body */}
          <circle cx="50" cy="55" r="32" fill="url(#mascot-body)" />

          {/* chef hat */}
          <g className={mood === "celebrating" ? "mascot-hat-bounce" : ""}>
            <rect x="36" y="14" width="28" height="14" rx="6" fill="white" />
            <circle cx="38" cy="16" r="8" fill="white" />
            <circle cx="50" cy="11" r="9" fill="white" />
            <circle cx="62" cy="16" r="8" fill="white" />
          </g>

          {/* eyes */}
          <g>
            <circle cx="40" cy="52" r="4" fill="white" />
            <circle cx="60" cy="52" r="4" fill="white" />
            <circle cx="40" cy="52" r="2" fill="#171717" />
            <circle cx="60" cy="52" r="2" fill="#171717" />
          </g>

          {/* mouth */}
          {mood === "celebrating" || mood === "waving" ? (
            <path d="M40 64 Q50 74 60 64" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M42 64 Q50 68 58 64" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
          )}

          {/* waving arm */}
          <g className={mood === "waving" || mood === "celebrating" ? "mascot-arm-wave" : ""} style={{ transformOrigin: "78px 58px" }}>
            <circle cx="78" cy="58" r="7" fill="url(#mascot-body)" />
          </g>
          <circle cx="22" cy="58" r="7" fill="url(#mascot-body)" />
        </svg>
      </div>
    </div>
  );
}

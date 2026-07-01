"use client";

import { useEffect, useState } from "react";

type Phase = "in" | "hold" | "out";

function SplashMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="sp-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-from)" />
          <stop offset="100%" stopColor="var(--accent-to)" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="55" r="32" fill="url(#sp-grad)" />
      <rect x="36" y="14" width="28" height="14" rx="6" fill="white" />
      <circle cx="38" cy="16" r="8" fill="white" />
      <circle cx="50" cy="11" r="9" fill="white" />
      <circle cx="62" cy="16" r="8" fill="white" />
      <circle cx="40" cy="52" r="4" fill="white" />
      <circle cx="60" cy="52" r="4" fill="white" />
      <circle cx="40" cy="52" r="2" fill="#171717" />
      <circle cx="60" cy="52" r="2" fill="#171717" />
      <path d="M40 64 Q50 74 60 64" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
      <g className="mascot-arm-wave" style={{ transformOrigin: "78px 58px" }}>
        <circle cx="78" cy="58" r="7" fill="url(#sp-grad)" />
      </g>
      <circle cx="22" cy="58" r="7" fill="url(#sp-grad)" />
    </svg>
  );
}

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  // null = not yet checked (SSR safe), true = show, false = skip
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>("in");

  // Check sessionStorage only after client mount
  useEffect(() => {
    const key = "nearbyeats-splash-v1";
    if (sessionStorage.getItem(key)) {
      setShouldShow(false);
      onDone();
    } else {
      sessionStorage.setItem(key, "1");
      setShouldShow(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run animation sequence once we know we should show
  useEffect(() => {
    if (!shouldShow) return;
    const t1 = setTimeout(() => setPhase("hold"), 500);
    const t2 = setTimeout(() => setPhase("out"),  2400);
    const t3 = setTimeout(() => onDone(),          3100);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [shouldShow, onDone]);

  if (!shouldShow) return null;

  const leaving = phase === "out";

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5
        transition-opacity duration-700 ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{
        background: "linear-gradient(135deg, #ffe4cc 0%, #ffd3e8 35%, #d6e4ff 65%, #cdf5ec 100%)",
      }}
    >
      {/* Dark mode overlay */}
      <div className="pointer-events-none fixed inset-0 hidden dark:block"
        style={{ background: "linear-gradient(135deg, #12091f 0%, #1e0f2e 35%, #0b1628 65%, #050d0a 100%)" }}
      />

      {/* Floating orbs inside splash too */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Speech bubble */}
        <div className={`glass rounded-2xl px-7 py-4 text-center shadow-2xl
          transition-all duration-500
          ${phase === "in" ? "opacity-0 -translate-y-4 scale-90" : "opacity-100 translate-y-0 scale-100"}`}
        >
          <p className="text-xl font-bold text-zinc-900 dark:text-white">Hello! 👋</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Finding the best food near you…
          </p>
        </div>

        {/* Bubble tail */}
        <div
          className={`-mt-3 transition-opacity duration-500 ${phase === "in" ? "opacity-0" : "opacity-100"}`}
          style={{
            width: 0, height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderTop: "9px solid rgba(255,255,255,0.65)",
          }}
        />

        {/* Mascot */}
        <div className={phase === "in" ? "splash-mascot-enter" : phase === "out" ? "splash-mascot-exit" : ""}>
          <SplashMascot
            className={`h-36 w-36 drop-shadow-2xl
              ${phase === "hold" ? "mascot-waving" : phase === "out" ? "mascot-celebrating" : "mascot-idle"}`}
          />
        </div>

        {/* App name */}
        <p className={`accent-gradient-text text-3xl font-bold tracking-tight
          transition-all duration-500
          ${phase === "in" ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}
        >
          NearbyEats
        </p>
      </div>
    </div>
  );
}

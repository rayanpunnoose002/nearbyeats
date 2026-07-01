"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

export interface AccentPreset {
  id: string;
  label: string;
  from: string;
  to: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "sunset", label: "Sunset", from: "#fb923c", to: "#ec4899" },
  { id: "ocean", label: "Ocean", from: "#38bdf8", to: "#6366f1" },
  { id: "berry", label: "Berry", from: "#c084fc", to: "#e879f9" },
  { id: "mint", label: "Mint", from: "#34d399", to: "#22d3ee" },
];

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: AccentPreset;
  setAccentId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MODE_KEY = "nearby-eats-theme-mode";
const ACCENT_KEY = "nearby-eats-accent";

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  if (mode === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
  } else {
    root.classList.add(mode);
  }
}

function applyAccent(accent: AccentPreset) {
  const root = document.documentElement;
  root.style.setProperty("--accent-from", accent.from);
  root.style.setProperty("--accent-to", accent.to);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<AccentPreset>(ACCENT_PRESETS[0]);

  useEffect(() => {
    const storedMode = localStorage.getItem(MODE_KEY) as ThemeMode | null;
    const storedAccentId = localStorage.getItem(ACCENT_KEY);
    const initialMode = storedMode ?? "system";
    const initialAccent =
      ACCENT_PRESETS.find((a) => a.id === storedAccentId) ?? ACCENT_PRESETS[0];

    setModeState(initialMode);
    setAccent(initialAccent);
    applyMode(initialMode);
    applyAccent(initialAccent);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (initialMode === "system") applyMode("system");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    localStorage.setItem(MODE_KEY, next);
    applyMode(next);
  }

  function setAccentId(id: string) {
    const next = ACCENT_PRESETS.find((a) => a.id === id) ?? ACCENT_PRESETS[0];
    setAccent(next);
    localStorage.setItem(ACCENT_KEY, next.id);
    applyAccent(next);
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccentId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

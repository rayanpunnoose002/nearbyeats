"use client";

import { ACCENT_PRESETS, useTheme, type ThemeMode } from "@/lib/theme-context";

const MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "☀️ Light" },
  { value: "dark", label: "🌙 Dark" },
  { value: "system", label: "⚙️ Auto" },
];

export default function ThemeSwitcher() {
  const { mode, setMode, accent, setAccentId } = useTheme();

  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-2.5">
      <div className="segmented">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={mode === m.value ? "active" : ""}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 pl-1">
        {ACCENT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-label={preset.label}
            title={preset.label}
            onClick={() => setAccentId(preset.id)}
            className={`h-6 w-6 rounded-full transition-transform duration-150 hover:scale-110 active:scale-90 ${
              accent.id === preset.id
                ? "ring-2 ring-offset-2 ring-offset-transparent"
                : ""
            }`}
            style={{
              backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
              boxShadow: accent.id === preset.id ? `0 0 0 2px ${preset.from}` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

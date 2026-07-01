"use client";

import { useEffect, useRef, useState } from "react";

interface Suggestion {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
}

interface PlaceAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function PlaceAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: PlaceAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!focused || value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?input=${encodeURIComponent(value)}`);
        const data = await res.json();
        const results: Suggestion[] = data.suggestions ?? [];
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, focused]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(text: string) {
    onChange(text);
    setSuggestions([]);
    setOpen(false);
    setFocused(false);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--label-tertiary)]">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="rounded-xl border border-white/40 bg-white/40 px-3 py-2.5 backdrop-blur-sm transition focus:bg-white/70 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:focus:bg-black/40 disabled:opacity-50"
      />

      {open && suggestions.length > 0 && (
        <div className="glass absolute top-full left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl shadow-xl">
          {suggestions.map((s, i) => (
            <button
              key={s.placeId || i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s.text);
              }}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white/30 dark:hover:bg-white/10"
            >
              <span className="mt-0.5 shrink-0 text-sm text-zinc-400">📍</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {s.mainText || s.text}
                </span>
                {s.secondaryText && (
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {s.secondaryText}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

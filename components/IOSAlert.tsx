"use client";

import { useEffect } from "react";

interface IOSAlertProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function IOSAlert({ open, title, message, onClose }: IOSAlertProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in-up">
      <div className="ios-alert animate-pop-in mx-4 w-72 overflow-hidden rounded-2xl text-center">
        <div className="px-4 pt-4 pb-4">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
        </div>
        <div className="ios-alert-divider" />
        <button
          type="button"
          onClick={onClose}
          className="accent-text w-full py-3 text-base font-semibold transition active:bg-black/5 dark:active:bg-white/5"
        >
          OK
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android";

const DISMISS_KEY = "nearby-eats-install-dismissed";

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone || (!isIOS && !isAndroid)) return;

    if (isAndroid) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredEvent(e as BeforeInstallPromptEvent);
        setPlatform("android");
        setTimeout(() => setVisible(true), 1200);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }

    if (isIOS) {
      setPlatform("ios");
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function handleAdd() {
    if (platform === "android" && deferredEvent) {
      await deferredEvent.prompt();
      await deferredEvent.userChoice;
    }
    dismiss();
  }

  if (!visible || !platform) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm animate-fade-in-up">
      <div className="ios-alert animate-pop-in w-72 overflow-hidden rounded-2xl text-center">
        <div className="px-4 pt-5 pb-3">
          <div className="accent-gradient mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-lg">
            🍽️
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            Add Nearby Eats to Home Screen
          </h3>
          <p className="mt-1.5 text-sm leading-snug text-zinc-600 dark:text-zinc-300">
            {platform === "ios" ? (
              <>
                Tap <strong>Share</strong> <span aria-hidden>⬆️</span> below, then choose{" "}
                <strong>“Add to Home Screen”</strong>.
              </>
            ) : (
              "Install Nearby Eats for quick access and a full-screen, app-like experience."
            )}
          </p>
        </div>
        <div className="ios-alert-divider" />
        <div className="flex">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 py-3 text-base text-zinc-600 transition active:bg-black/5 dark:text-zinc-300 dark:active:bg-white/5"
          >
            Not Now
          </button>
          <div className="ios-alert-divider-vertical" />
          <button
            type="button"
            onClick={handleAdd}
            className="accent-text flex-1 py-3 text-base font-semibold transition active:bg-black/5 dark:active:bg-white/5"
          >
            {platform === "android" ? "Add" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}

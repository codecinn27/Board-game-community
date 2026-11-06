"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

// Cloudflare Turnstile, loaded straight from Cloudflare (spec 0010, own
// component). The widget calls `onToken` with a one time token; the form posts
// it as `turnstileToken`. Remount it (change its `key`) to get a fresh token.

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoad: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoad = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

type TurnstileProps = {
  siteKey: string;
  onToken: (token: string) => void;
};

export function Turnstile({ siteKey, onToken }: TurnstileProps) {
  const t = useTranslations("auth.turnstile");
  const container = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;
    loadScript()
      .then(() => {
        const element = container.current;
        if (cancelled || !element || !window.turnstile) return;
        widgetId = window.turnstile.render(element, {
          sitekey: siteKey,
          theme: "light",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        });
      })
      .catch(() => onTokenRef.current(""));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return (
    <div
      ref={container}
      role="group"
      aria-label={t("label")}
      className="flex min-h-[65px] items-center justify-center"
    />
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  signInWithGoogle,
  startGoogleSignIn,
} from "@/app/[locale]/sign-in/actions";
import { initialState, type FormState } from "@/lib/auth/state";
import { FormError } from "./form-parts";

// Google's own button (spec 0015). It hands an ID token to a Server Action; no
// One Tap and no redirect.

type GoogleIdApi = {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    nonce: string;
    ux_mode: "popup";
    auto_select: boolean;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      type: "standard";
      text: "continue_with";
      theme: "outline";
      shape: "pill";
      size: "large";
      width: number;
      locale: string;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

const SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GIVE_UP_MS = 8000;
const MAX_WIDTH = 400;

let scriptLoad: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoad = null;
      script.remove();
      reject(new Error("Google sign in failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

type GoogleButtonProps = { clientId: string; next: string };

export function GoogleButton({ clientId, next }: GoogleButtonProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  // Google may call back twice; only one sign in runs at a time.
  const busy = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const [state, dispatch, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      try {
        return await signInWithGoogle(previous, data);
      } finally {
        busy.current = false;
        // The nonce is spent, so the button is set up again with a new one.
        setAttempt((count) => count + 1);
      }
    },
    initialState,
  );

  useEffect(() => {
    let cancelled = false;
    busy.current = false;
    const timer = window.setTimeout(() => setUnavailable(true), GIVE_UP_MS);

    async function setUp() {
      await loadScript();
      window.clearTimeout(timer);
      if (cancelled) return;
      const nonce = await startGoogleSignIn();
      const element = container.current;
      const api = window.google?.accounts.id;
      if (cancelled || !element || !api) return;
      api.initialize({
        client_id: clientId,
        nonce,
        ux_mode: "popup",
        auto_select: false,
        callback: ({ credential }) => {
          if (busy.current) return;
          busy.current = true;
          const data = new FormData();
          data.set("credential", credential);
          data.set("locale", locale);
          data.set("next", next);
          startTransition(() => dispatch(data));
        },
      });
      element.replaceChildren();
      api.renderButton(element, {
        type: "standard",
        text: "continue_with",
        theme: "outline",
        shape: "pill",
        size: "large",
        width: Math.min(element.clientWidth, MAX_WIDTH),
        locale: locale === "zh" ? "zh_CN" : locale,
      });
      setReady(true);
    }

    // A script that fails or stalls is left to the timer above.
    setUp().catch(() => {});

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [attempt, clientId, dispatch, locale, next]);

  const hint = (
    <p className="text-center text-sm text-auth-ink-muted">
      {t("google.hint")}
    </p>
  );
  if (unavailable && !ready) return hint;

  return (
    <div className="flex flex-col gap-3">
      <div
        aria-hidden
        className="flex items-center gap-3 text-sm text-auth-ink-muted"
      >
        <span className="h-px flex-1 bg-current opacity-30" />
        {t("google.or")}
        <span className="h-px flex-1 bg-current opacity-30" />
      </div>
      <FormError error={state.error} />
      <div className="relative min-h-11">
        {/* Google draws inside this box; React never renders into it. */}
        <div
          ref={container}
          className={`flex w-full justify-center ${pending ? "invisible" : ""}`}
        />
        {!ready ? (
          <div
            aria-hidden
            className="absolute inset-0 mx-auto max-w-100 rounded-full bg-auth-field motion-safe:animate-pulse"
          />
        ) : null}
        {pending ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-auth-field opacity-60">
            <Loader2 aria-hidden className="size-5 animate-spin" />
            <span role="status" className="sr-only">
              {t("signIn.pending")}
            </span>
          </div>
        ) : null}
      </div>
      {hint}
    </div>
  );
}

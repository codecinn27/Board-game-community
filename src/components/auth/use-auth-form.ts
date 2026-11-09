"use client";

import { useActionState, useState } from "react";
import { initialState, type FormState } from "@/lib/auth/state";

type Action = (previous: FormState, data: FormData) => Promise<FormState>;

/**
 * A form action plus the Turnstile token that goes with it. A token works only
 * once, so after every answer the widget is remounted (`attempt` is its key)
 * and the stored token is cleared.
 */
export function useAuthForm(action: Action) {
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await action(previous, data);
      setToken("");
      setAttempt((count) => count + 1);
      return result;
    },
    initialState,
  );
  return { state, formAction, pending, token, setToken, attempt };
}

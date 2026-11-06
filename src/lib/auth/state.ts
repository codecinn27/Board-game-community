import { type AuthErrorKey } from "./errors";
import { type FieldCode } from "./validation";

/** What a form action hands back to `useActionState` (plain data only). */
export type FormState = {
  /** Key under `auth.errors` in the message files. */
  error?: AuthErrorKey | "inviteWrong" | "inviteNeeded";
  /** Field name to key under `auth.fieldErrors`. */
  fields?: Partial<Record<string, FieldCode>>;
  /** The "check your email" state. */
  sent?: boolean;
  /** A save went through. */
  ok?: boolean;
  /** Echoed back so a failed submit keeps what was typed (never passwords). */
  values?: Record<string, string>;
};

export const initialState: FormState = {};

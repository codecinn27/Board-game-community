// Field rules shared by the server actions and the forms (spec 0010).

export const DISPLAY_NAME_MAX = 40;
export const PASSWORD_MIN = 8;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

export type FieldCode =
  | "required"
  | "nameLength"
  | "usernameInvalid"
  | "usernameTaken"
  | "emailInvalid"
  | "passwordShort"
  | "passwordMismatch";

export function checkDisplayName(raw: string): {
  value: string;
  error?: FieldCode;
} {
  const value = raw.trim();
  if (value.length === 0) return { value, error: "required" };
  if ([...value].length > DISPLAY_NAME_MAX)
    return { value, error: "nameLength" };
  return { value };
}

/**
 * A username: 3 to 20 letters, digits, `_` or `-`. Case sensitive. It has no
 * `@`, so it can never be mistaken for an email at sign in.
 */
export function checkUsername(raw: string): {
  value: string;
  error?: FieldCode;
} {
  const value = raw.trim();
  if (value.length === 0) return { value, error: "required" };
  if (!/^[A-Za-z0-9_-]{3,20}$/.test(value))
    return { value, error: "usernameInvalid" };
  return { value };
}

export function checkEmail(raw: string): { value: string; error?: FieldCode } {
  const value = raw.trim();
  if (value.length === 0) return { value, error: "required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return { value, error: "emailInvalid" };
  return { value };
}

export function checkPassword(raw: string): FieldCode | undefined {
  if (raw.length === 0) return "required";
  if (raw.length < PASSWORD_MIN) return "passwordShort";
  return undefined;
}

/** A string form field, or an empty string when absent or a file. */
export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

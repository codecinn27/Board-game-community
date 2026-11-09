// Field rules shared by the server actions and the forms (spec 0010).

export const DISPLAY_NAME_MAX = 40;
export const PASSWORD_MIN = 8;

export type FieldCode =
  | "required"
  | "nameLength"
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

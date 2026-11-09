// Turns a Supabase auth error into one of our own message keys (spec 0010).
// Credential failures are always the same generic key, so the answer never
// reveals whether an email has an account.

export type AuthErrorKey =
  | "credentials"
  | "unconfirmed"
  | "emailTaken"
  | "captcha"
  | "weakPassword"
  | "rateLimit"
  | "generic";

type AuthErrorLike = { code?: string | undefined; status?: number | undefined };

export function authErrorKey(error: AuthErrorLike): AuthErrorKey {
  switch (error.code) {
    case "invalid_credentials":
    case "user_not_found":
      return "credentials";
    case "user_already_exists":
    case "email_exists":
      return "emailTaken";
    case "email_not_confirmed":
      return "unconfirmed";
    case "captcha_failed":
      return "captcha";
    case "weak_password":
      return "weakPassword";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimit";
    default:
      return error.status === 429 ? "rateLimit" : "generic";
  }
}

import { describe, expect, it } from "vitest";
import { authErrorKey } from "./errors";

describe("authErrorKey", () => {
  it("gives wrong credentials and an unknown user the same key", () => {
    expect(authErrorKey({ code: "invalid_credentials" })).toBe("credentials");
    expect(authErrorKey({ code: "user_not_found" })).toBe("credentials");
  });

  it("maps the other known codes", () => {
    expect(authErrorKey({ code: "email_not_confirmed" })).toBe("unconfirmed");
    expect(authErrorKey({ code: "captcha_failed" })).toBe("captcha");
    expect(authErrorKey({ code: "weak_password" })).toBe("weakPassword");
    expect(authErrorKey({ code: "over_email_send_rate_limit" })).toBe(
      "rateLimit",
    );
  });

  it("falls back to a rate limit on 429 and to generic otherwise", () => {
    expect(authErrorKey({ status: 429 })).toBe("rateLimit");
    expect(authErrorKey({ code: "something_new", status: 500 })).toBe(
      "generic",
    );
  });
});

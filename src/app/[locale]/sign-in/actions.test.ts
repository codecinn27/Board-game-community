import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SECRET = "test-secret-with-enough-length-0123456789";

const cookieJar = new Map<string, string>();
const cookieStore = {
  get: (name: string) => {
    const value = cookieJar.get(name);
    return value === undefined ? undefined : { name, value };
  },
  set: vi.fn((name: string, value: string) => cookieJar.set(name, value)),
  delete: vi.fn((name: string) => cookieJar.delete(name)),
};
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
};
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth }),
}));

const findEmailByUsername = vi.fn();
const isUsernameTaken = vi.fn();
vi.mock("@/lib/supabase/usernames", () => ({
  findEmailByUsername: (name: string) => findEmailByUsername(name),
  isUsernameTaken: (name: string) => isUsernameTaken(name),
}));

vi.mock("next/server", () => ({ after: (f: () => unknown) => void f() }));
const sendWelcomeEmail = vi.fn();
vi.mock("@/lib/email/send-welcome", () => ({
  sendWelcomeEmail: (request: unknown) => sendWelcomeEmail(request),
}));

const verifyTurnstile = vi.fn();
vi.mock("@/lib/auth/turnstile", () => ({
  verifyTurnstile: (token: string) => verifyTurnstile(token),
}));

// Redirects throw in Next; here they throw a plain marker with the target.
vi.mock("@/i18n/navigation", () => ({
  redirect: (target: unknown) => {
    throw new Error(`REDIRECT ${JSON.stringify(target)}`);
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  cookieJar.clear();
  vi.stubEnv("INVITE_CODE", "right-code-123");
  vi.stubEnv("INVITE_COOKIE_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  verifyTurnstile.mockResolvedValue(true);
  isUsernameTaken.mockResolvedValue(false);
});

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries({ locale: "en", ...values }).forEach(([key, value]) =>
    data.set(key, value),
  );
  return data;
}

async function validPass() {
  const { signInvitePass } = await import("@/lib/auth/invite-pass");
  return signInvitePass(SECRET, Date.now());
}

const register = {
  displayName: "Mei",
  username: "Mei_1",
  email: "mei@example.com",
  password: "long-enough-1",
  confirm: "long-enough-1",
  turnstileToken: "tok",
  next: "/shelf",
};

describe("verifyInvite", () => {
  it("refuses a wrong code and sets no pass", async () => {
    const { verifyInvite } = await import("./actions");
    const result = await verifyInvite({}, form({ code: "nope" }));
    expect(result.error).toBe("inviteWrong");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("refuses a failed security check before looking at the code", async () => {
    verifyTurnstile.mockResolvedValue(false);
    const { verifyInvite } = await import("./actions");
    const result = await verifyInvite({}, form({ code: "right-code-123" }));
    expect(result.error).toBe("captcha");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("sets a signed httpOnly 30 minute pass for the right code", async () => {
    const { verifyInvite } = await import("./actions");
    await expect(
      verifyInvite({}, form({ code: "right-code-123", turnstileToken: "t" })),
    ).rejects.toThrow("REDIRECT");
    const [name, , options] = cookieStore.set.mock.calls[0] as unknown as [
      string,
      string,
      { httpOnly: boolean; sameSite: string; maxAge: number; path: string },
    ];
    expect(name).toBe("invite_pass");
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1800,
      path: "/",
    });
  });
});

describe("signUpWithEmail", () => {
  it("is refused without an invite pass", async () => {
    const { signUpWithEmail } = await import("./actions");
    const result = await signUpWithEmail({}, form(register));
    expect(result.error).toBe("inviteNeeded");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("is refused with a tampered pass", async () => {
    cookieJar.set("invite_pass", `${Date.now() + 100000}.${"0".repeat(64)}`);
    const { signUpWithEmail } = await import("./actions");
    const result = await signUpWithEmail({}, form(register));
    expect(result.error).toBe("inviteNeeded");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("is refused with an expired pass", async () => {
    const { signInvitePass } = await import("@/lib/auth/invite-pass");
    cookieJar.set(
      "invite_pass",
      signInvitePass(SECRET, Date.now() - 3_600_000),
    );
    const { signUpWithEmail } = await import("./actions");
    const result = await signUpWithEmail({}, form(register));
    expect(result.error).toBe("inviteNeeded");
  });

  it("sends the username and the token, then signs the member in at once", async () => {
    cookieJar.set("invite_pass", await validPass());
    auth.signUp.mockResolvedValue({
      data: { session: { access_token: "t" }, user: { id: "u1" } },
      error: null,
    });
    const { signUpWithEmail } = await import("./actions");
    await expect(signUpWithEmail({}, form(register))).rejects.toThrow(
      '"href":"/shelf"',
    );
    const call = auth.signUp.mock.calls[0]?.[0] as {
      options: {
        data: { full_name: string; username: string };
        captchaToken: string;
      };
    };
    expect(call.options.data.full_name).toBe("Mei");
    expect(call.options.data.username).toBe("Mei_1");
    expect(call.options.captchaToken).toBe("tok");
    expect(cookieStore.delete).toHaveBeenCalledWith("invite_pass");
  });

  it("sends the welcome email after sign up, in the page language", async () => {
    cookieJar.set("invite_pass", await validPass());
    auth.signUp.mockResolvedValue({
      data: { session: { access_token: "t" }, user: { id: "u1" } },
      error: null,
    });
    const { signUpWithEmail } = await import("./actions");
    await expect(signUpWithEmail({}, form(register))).rejects.toThrow(
      "REDIRECT",
    );
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(sendWelcomeEmail).toHaveBeenCalledWith({
      userId: "u1",
      email: "mei@example.com",
      displayName: "Mei",
      locale: "en",
      siteUrl: "http://localhost:3000",
    });
  });

  it("uses the Chinese locale from the form", async () => {
    cookieJar.set("invite_pass", await validPass());
    auth.signUp.mockResolvedValue({
      data: { session: { access_token: "t" }, user: { id: "u1" } },
      error: null,
    });
    const { signUpWithEmail } = await import("./actions");
    await expect(
      signUpWithEmail({}, form({ ...register, locale: "zh" })),
    ).rejects.toThrow("REDIRECT");
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "zh" }),
    );
  });

  it("sends no email when sign up fails or returns no session", async () => {
    cookieJar.set("invite_pass", await validPass());
    const { signUpWithEmail } = await import("./actions");
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { code: "user_already_exists", status: 422 },
    });
    await signUpWithEmail({}, form(register));
    auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: "u1" } },
      error: null,
    });
    await signUpWithEmail({}, form(register));
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("says so when the email already has an account", async () => {
    cookieJar.set("invite_pass", await validPass());
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: { code: "user_already_exists", status: 422 },
    });
    const { signUpWithEmail } = await import("./actions");
    expect((await signUpWithEmail({}, form(register))).error).toBe(
      "emailTaken",
    );
  });

  it("checks the fields before calling Supabase", async () => {
    cookieJar.set("invite_pass", await validPass());
    const { signUpWithEmail } = await import("./actions");
    const result = await signUpWithEmail(
      {},
      form({ ...register, displayName: "", username: "", password: "short" }),
    );
    expect(result.fields).toEqual({
      displayName: "required",
      username: "required",
      password: "passwordShort",
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("refuses passwords that do not match", async () => {
    cookieJar.set("invite_pass", await validPass());
    const { signUpWithEmail } = await import("./actions");
    const result = await signUpWithEmail(
      {},
      form({ ...register, confirm: "something-else-1" }),
    );
    expect(result.fields).toEqual({ confirm: "passwordMismatch" });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it.each(["ab", "a".repeat(21), "has space", "me@home", "名字名字名"])(
    "refuses the username %j",
    async (username) => {
      cookieJar.set("invite_pass", await validPass());
      const { signUpWithEmail } = await import("./actions");
      const result = await signUpWithEmail({}, form({ ...register, username }));
      expect(result.fields).toEqual({ username: "usernameInvalid" });
      expect(auth.signUp).not.toHaveBeenCalled();
    },
  );

  it("refuses a username that is already taken", async () => {
    cookieJar.set("invite_pass", await validPass());
    isUsernameTaken.mockResolvedValue(true);
    const { signUpWithEmail } = await import("./actions");
    const result = await signUpWithEmail({}, form(register));
    expect(result.fields).toEqual({ username: "usernameTaken" });
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});

describe("signInWithEmail", () => {
  const credentials = {
    identifier: "mei@example.com",
    password: "secret-pass",
    turnstileToken: "tok",
  };

  it("shows one generic message for wrong credentials", async () => {
    auth.signInWithPassword.mockResolvedValue({
      error: { code: "invalid_credentials", status: 400 },
    });
    const { signInWithEmail } = await import("./actions");
    const result = await signInWithEmail({}, form(credentials));
    expect(result.error).toBe("credentials");
  });

  it("tells an unconfirmed member to confirm first", async () => {
    auth.signInWithPassword.mockResolvedValue({
      error: { code: "email_not_confirmed", status: 400 },
    });
    const { signInWithEmail } = await import("./actions");
    expect((await signInWithEmail({}, form(credentials))).error).toBe(
      "unconfirmed",
    );
  });

  it("returns to a safe next", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    const { signInWithEmail } = await import("./actions");
    await expect(
      signInWithEmail({}, form({ ...credentials, next: "/shelf" })),
    ).rejects.toThrow('"href":"/shelf"');
  });

  it("sends an unsafe next home", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    const { signInWithEmail } = await import("./actions");
    await expect(
      signInWithEmail({}, form({ ...credentials, next: "//evil.com" })),
    ).rejects.toThrow('"href":"/"');
  });

  it("needs a security check token", async () => {
    const { signInWithEmail } = await import("./actions");
    const result = await signInWithEmail(
      {},
      form({ ...credentials, turnstileToken: "" }),
    );
    expect(result.error).toBe("captcha");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in with a username by looking up its email", async () => {
    findEmailByUsername.mockResolvedValue("mei@example.com");
    auth.signInWithPassword.mockResolvedValue({ error: null });
    const { signInWithEmail } = await import("./actions");
    await expect(
      signInWithEmail({}, form({ ...credentials, identifier: "Mei_1" })),
    ).rejects.toThrow("REDIRECT");
    expect(findEmailByUsername).toHaveBeenCalledWith("Mei_1");
    expect(auth.signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: "mei@example.com" }),
    );
  });

  it("signs in with an email without a lookup", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    const { signInWithEmail } = await import("./actions");
    await expect(signInWithEmail({}, form(credentials))).rejects.toThrow(
      "REDIRECT",
    );
    expect(findEmailByUsername).not.toHaveBeenCalled();
  });

  it("gives the generic answer for an unknown username", async () => {
    findEmailByUsername.mockResolvedValue(null);
    const { signInWithEmail } = await import("./actions");
    const result = await signInWithEmail(
      {},
      form({ ...credentials, identifier: "nobody" }),
    );
    expect(result.error).toBe("credentials");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const { signInWithEmail } = await import("./actions");
    const result = await signInWithEmail(
      {},
      form({ ...credentials, identifier: "me@home" }),
    );
    expect(result.fields).toEqual({ identifier: "emailInvalid" });
  });
});

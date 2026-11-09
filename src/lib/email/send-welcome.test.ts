import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const claimEmailSlot = vi.fn();
const markEmailFailed = vi.fn();
vi.mock("@/lib/supabase/email-sends", () => ({
  claimEmailSlot: (...args: unknown[]) => claimEmailSlot(...args),
  markEmailFailed: (...args: unknown[]) => markEmailFailed(...args),
}));

const sendMail = vi.fn();
vi.mock("./transport", () => ({
  sendMail: (mail: unknown) => sendMail(mail),
}));

import { sendWelcomeEmail } from "./send-welcome";

const request = {
  userId: "u1",
  email: "someone@example.com",
  displayName: "Mei",
  locale: "en" as const,
  siteUrl: "https://shelf.example.com",
};

let logged: string[];

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  logged = [];
  const capture = (line: unknown) => void logged.push(String(line));
  vi.spyOn(console, "error").mockImplementation(capture);
  vi.spyOn(console, "warn").mockImplementation(capture);
  claimEmailSlot.mockResolvedValue("claimed");
  sendMail.mockResolvedValue(undefined);
  markEmailFailed.mockResolvedValue(undefined);
});

describe("sendWelcomeEmail", () => {
  it("claims a slot, then sends one email to the member", async () => {
    await sendWelcomeEmail(request);
    expect(claimEmailSlot).toHaveBeenCalledWith("u1", "welcome", 80);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "someone@example.com" }),
    );
    expect(markEmailFailed).not.toHaveBeenCalled();
  });

  it("passes the cap from the environment", async () => {
    vi.stubEnv("WELCOME_EMAIL_DAILY_CAP", "5");
    await sendWelcomeEmail(request);
    expect(claimEmailSlot).toHaveBeenCalledWith("u1", "welcome", 5);
  });

  it("sends nothing and logs the user id when capped", async () => {
    claimEmailSlot.mockResolvedValue("capped");
    await sendWelcomeEmail(request);
    expect(sendMail).not.toHaveBeenCalled();
    expect(logged).toEqual(["welcome email capped: user u1"]);
  });

  it("sends nothing for a duplicate", async () => {
    claimEmailSlot.mockResolvedValue("duplicate");
    await sendWelcomeEmail(request);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("marks the row failed and logs no address when sending throws", async () => {
    sendMail.mockRejectedValue(
      Object.assign(new Error("rejected someone@example.com"), {
        code: "EENVELOPE",
      }),
    );
    await expect(sendWelcomeEmail(request)).resolves.toBeUndefined();
    expect(markEmailFailed).toHaveBeenCalledWith("u1", "welcome");
    expect(logged).toEqual(["welcome email failed: user u1, send, EENVELOPE"]);
    expect(logged.join("")).not.toContain("@");
  });

  it("does not throw when the claim itself fails, and marks nothing", async () => {
    claimEmailSlot.mockRejectedValue(
      new Error("db down for someone@example.com"),
    );
    await expect(sendWelcomeEmail(request)).resolves.toBeUndefined();
    expect(sendMail).not.toHaveBeenCalled();
    expect(markEmailFailed).not.toHaveBeenCalled();
    expect(logged.join("")).not.toContain("@");
  });

  it("does not throw when marking failed also fails", async () => {
    sendMail.mockRejectedValue(new Error("x"));
    markEmailFailed.mockRejectedValue(new Error("y"));
    await expect(sendWelcomeEmail(request)).resolves.toBeUndefined();
  });
});

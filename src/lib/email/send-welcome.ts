import "server-only";

import { createTranslator } from "next-intl";
import en from "../../../messages/en.json";
import zh from "../../../messages/zh.json";
import { type Locale } from "@/i18n/routing";
import { claimEmailSlot, markEmailFailed } from "@/lib/supabase/email-sends";
import { readDailyCap } from "./cap";
import { sendMail } from "./transport";
import { buildWelcomeEmail, type WelcomeTranslator } from "./welcome";

export type WelcomeRequest = {
  userId: string;
  email: string;
  displayName: string;
  locale: Locale;
  siteUrl: string;
};

const MESSAGES = { en, zh } as const;

/** Only a fixed word and the error's code or name: never `message`, which can hold the address. */
function errorTag(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const { code, name } = error as { code?: unknown; name?: unknown };
    if (typeof code === "string") return code;
    if (typeof name === "string") return name;
  }
  return "unknown";
}

function translatorFor(locale: Locale): WelcomeTranslator {
  const t = createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "WelcomeEmail",
  });
  return (key, values) => (t as unknown as WelcomeTranslator)(key, values);
}

/**
 * Sends the welcome email after sign up. Never throws: a mail problem must not
 * touch the account (spec 0011, AC-4 to AC-7). No log line carries an address.
 */
export async function sendWelcomeEmail(request: WelcomeRequest): Promise<void> {
  const { userId } = request;
  let claimed = false;
  try {
    const cap = readDailyCap(process.env.WELCOME_EMAIL_DAILY_CAP);
    const result = await claimEmailSlot(userId, "welcome", cap);
    if (result !== "claimed") {
      console.warn(`welcome email ${result}: user ${userId}`);
      return;
    }
    claimed = true;
    const { subject, html, text } = buildWelcomeEmail({
      displayName: request.displayName,
      locale: request.locale,
      siteUrl: request.siteUrl,
      t: translatorFor(request.locale),
    });
    await sendMail({ to: request.email, subject, html, text });
  } catch (error) {
    console.error(
      `welcome email failed: user ${userId}, ${claimed ? "send" : "claim"}, ${errorTag(error)}`,
    );
    if (!claimed) return;
    try {
      await markEmailFailed(userId, "welcome");
    } catch (markError) {
      console.error(
        `welcome email mark failed: user ${userId}, ${errorTag(markError)}`,
      );
    }
  }
}

import "server-only";

import nodemailer from "nodemailer";
import { requireEnv } from "@/lib/supabase/env";

export type Mail = { to: string; subject: string; html: string; text: string };

const TIMEOUT_MS = 10_000;

/** Mailpit (local and e2e) speaks plain SMTP with no TLS. */
function isLocalHost(url: string): boolean {
  const host = new URL(url).hostname;
  return host === "127.0.0.1" || host === "localhost";
}

/** One code path for production, local dev, and Playwright: only `SMTP_URL` changes. */
export async function sendMail(mail: Mail): Promise<void> {
  const url = requireEnv(process.env.SMTP_URL, "SMTP_URL");
  const transporter = nodemailer.createTransport({
    url,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
    ...(isLocalHost(url) ? { ignoreTLS: true } : {}),
  });
  const replyTo = process.env.EMAIL_REPLY_TO;
  await transporter.sendMail({
    from: requireEnv(process.env.EMAIL_FROM, "EMAIL_FROM"),
    ...(replyTo ? { replyTo } : {}),
    ...mail,
  });
}

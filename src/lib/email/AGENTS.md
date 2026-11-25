# Email (welcome email, spec 0011)

- `sendWelcomeEmail` (`send-welcome.ts`) never throws: a mail problem must not touch the account. It claims a daily slot with `claimEmailSlot` (`@/lib/supabase/email-sends`, table `email_sends`), builds the message, sends it, and marks it failed on error.
- `transport.ts` is the only sender (nodemailer over `SMTP_URL`). Production is Resend SMTP, local and Playwright send into Mailpit (plain SMTP, no TLS). Only `SMTP_URL` changes between them.
- `cap.ts`: `readDailyCap` reads `WELCOME_EMAIL_DAILY_CAP`, falling back to 80 on anything that is not a positive whole number.
- `welcome.ts` builds subject, HTML, and text from the `WelcomeEmail` messages in `messages/en.json` and `messages/zh.json`; `escape.ts` escapes every inserted value.
- Never log an email address: log the user id and an error code or name only.
- Env vars: `SMTP_URL`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `WELCOME_EMAIL_DAILY_CAP` (see `.env.example`).
- Governing spec: [docs/specs/0011-welcome-email/index.md](../../../docs/specs/0011-welcome-email/index.md).

_Drafted by /sync from the introducing change, worth a quick human pass._

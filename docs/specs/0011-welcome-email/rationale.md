# 0011. Welcome email: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md`; this file explains why.

## Context

Spec 0010 lets a person enter the community's invite code and register with email and password, and they are signed in at once with no confirmation email. Nothing tells them by email that the account exists or where to start. The engineer wants a welcome email after every successful registration, in the member's language, kept free and easy to maintain.

There is a second, quieter gap. Supabase's built in mail sender is only for trying things out: it sends a handful of emails an hour and only to addresses on the Supabase team. The password reset flow from spec 0010 depends on it, so on the hosted project reset emails do not reach real members today.

Forces at play: the app runs on Vercel serverless functions and Supabase (both in Singapore); the community is small, so volume is a few sign ups a week, not thousands; the engineer owns `ianhee.com` with DNS at Shinjiru, so a sending domain can be verified; the budget is zero, so a free plan must never be able to bill; the project is at the Prototype tier and one engineer maintains it. Testing must be automatic: register a dummy account, see the email, and delete the account, with no manual steps and no real mail sent during tests.

If nothing is decided, members keep getting no welcome, reset stays broken on the hosted project, and any later email (notifications, digests) has no foundation to build on.

## Options considered

### Provider

**Resend (chosen).** Hosted email service with SMTP and an HTTP API. Free plan about 3,000 a month and 100 a day, one domain. Pros: simplest DNS setup, built for Next.js teams, the free plan stops at its limit instead of billing, and the same account serves Supabase SMTP. Cons: one domain on the free plan; the daily window is Resend's, not ours.

**Brevo.** Free plan about 300 a day, SMTP and API. Pros: three times the free daily volume. Cons: a marketing first product with a busier dashboard and more settings to get wrong; deliverability for transactional mail is reported as less consistent.

**Amazon SES.** About $0.10 per 1,000 emails. Pros: cheapest at any real scale, used by large companies. Cons: needs an AWS account, sandbox exit approval, and IAM setup; a card on file means it can bill.

**Postmark.** Pros: the strongest reputation for transactional deliverability. Cons: the free plan is about 100 a month, which suits testing only.

### Transport

**SMTP everywhere with nodemailer (chosen).** One code path; production points at `smtp.resend.com`, local and Playwright point at Mailpit. Pros: the e2e test runs the exact production sending code; switching provider later changes one env var. Cons: a fresh SMTP connection per send from serverless is slower than an HTTP call.

**Resend HTTP API in production, SMTP only in tests.** Pros: faster sends and richer error codes. Cons: two senders, and the production one is never exercised by the e2e test.

**Database webhook to a Supabase Edge Function.** Pros: also catches sign ups that skip the app's page. Cons: a second runtime (Deno) to deploy, configure, and test, for a small gain under the accepted soft gate.

### Template

**Plain HTML string (chosen by the engineer).** Pros: no new dependency, full control, text straight from next-intl. Cons: email client quirks are yours to handle, and there is no preview tool.

**React Email components.** Pros: handles client quirks, renders HTML and plain text, preview server. Cons: two new dependencies and a second rendering setup for one email.

**Provider hosted template.** Pros: edit without a deploy. Cons: lives outside git and outside next-intl, so the two languages drift.

### Daily cap

**Send log, one row per email (chosen).** Pros: the count, a one welcome per member guard, and a short history from one table. Cons: a table, a function, and pgTAP tests to maintain.

**Daily counter, one row per day.** Pros: smallest. Cons: no duplicate guard and no history.

**Rely on Resend's own limit only.** Pros: no code. Cons: no room is reserved for reset emails, and the app cannot tell "capped" from "broken".

### Retention cleanup

**Inside `claim_email_slot` (chosen).** Pros: no scheduler at all. Cons: old rows linger while nobody signs up, which is harmless.

**pg_cron nightly job.** Pros: cleans on schedule. Cons: a new extension and a job to watch.

**Vercel Cron route.** Pros: uses the unused `CRON_SECRET`. Cons: another route, and it needs the secret key.

## Rationale

Resend wins because it is the only option that is free, cannot bill, verifies a subdomain in a few DNS records, and also fixes the hosted reset emails through the same account. Volume here is tiny, so SES's price advantage buys nothing while its setup and billing risk cost real time. Sending from `tabletop.ianhee.com` keeps any reputation damage away from `ianhee.com` itself.

SMTP everywhere was chosen because the strongest guarantee a Prototype tier project can have is that the automated test runs the production code. The extra connection time is paid inside `after()`, after the member is already redirected, so nobody waits for it. The same choice makes a future provider change a one line env edit.

The engineer chose a plain HTML string over React Email, which was the recommendation. That works for one simple email with no images; the cost is hand testing in Outlook and Gmail once. If more email kinds arrive, revisit React Email then. The engineer also chose to list every planned member feature in the email, including ones not built yet; that reads well but promises features new members cannot find today, so the spec flags it as a tradeoff to revisit at ship time.

The app side cap exists because the engineer wants a hard stop that the app controls, below Resend's 100, leaving room for reset emails. The send log is preferred over a counter because the same unique constraint gives the one welcome per member guarantee for free, and an advisory lock makes the count safe under concurrent sign ups. Counting by the Malaysia day matches when the community actually lives. Cleaning old rows inside the claim avoids adding any scheduler to a project that has none.

Testing follows how larger teams do it: unit tests mock the sender, integration tests send to a local catcher (Mailpit, already in the Supabase local stack) and read it through its REST API, and cleanup deletes the test user through the admin API plus a teardown sweeper that refuses to touch a non local database. Real inbox services (Mailosaur, MailSlurp, Mailtrap) are only needed for staging checks against a live provider, which this project does not need yet.

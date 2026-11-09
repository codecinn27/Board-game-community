# Verify: welcome email · spec 0011 · updated 2026-11-08
_Steps derived from spec 0011 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Start the local stack (`supabase start`), set `SMTP_URL=smtp://127.0.0.1:54325` and the local Supabase keys, run `pnpm dev`, register at `/en/sign-in?mode=register` → land on `/en/shelf` at once, one Mailpit message to that address from `EMAIL_FROM` → AC-1, AC-4
- [ ] Same at `/zh/sign-in?mode=register` → Chinese subject and text, link ends `/zh/shelf` → AC-2
- [ ] Register with display name `<b>x</b>` → Mailpit HTML shows `&lt;b&gt;x&lt;/b&gt;`, no raw tag → AC-3
- [ ] Stop Mailpit (or set a bad `SMTP_URL`), register → sign up still succeeds and lands on the shelf, `email_sends.status = 'failed'`, server log has the user id and no `@` → AC-4, AC-5
- [ ] Set `WELCOME_EMAIL_DAILY_CAP=1`, register two accounts → second gets no email, log shows `capped` with its user id → AC-6
- [ ] Register with an email that already has an account, then with a wrong invite → no email in Mailpit → AC-7
- [ ] Open `/en/privacy` and `/zh/privacy` → a Resend bullet is listed under who handles data → AC-13
- [ ] Vary the locale and the display name (Chinese, long, with `&`) → each value shows correctly in the email (Value sourcing rows: name, locale, shelf link) → AC-2, AC-3
- [ ] Production: verify `tabletop.ianhee.com` in Resend, register a real account, Gmail "Show original" shows SPF, DKIM, DMARC all PASS → AC-12, AC-1
- [ ] Production: send a password reset to a non team address → it arrives from `mail@tabletop.ianhee.com` → AC-10

## Commands
- [ ] `supabase db reset && supabase test db` → all pgTAP files pass, including `07_email_sends` (14 tests: cap, Malaysia midnight, duplicate, 30 day delete, cascade, denied roles) → AC-6, AC-7, AC-8, AC-9
- [ ] `pnpm test` → email tests pass (`welcome`, `escape`, `cap`, `send-welcome`) and the sign up action tests for `after` → AC-2, AC-3, AC-5, AC-6, AC-7
- [ ] `E2E_REGISTER=1 pnpm test:e2e` against the local stack (Supabase URL on `127.0.0.1`) → English and Chinese registration tests pass, no `e2e...@example.com` user and no Mailpit message left → AC-11
- [ ] Run the sweeper with `NEXT_PUBLIC_SUPABASE_URL` set to a hosted URL and `E2E_REGISTER=1` → teardown errors and deletes nothing → AC-11
- [ ] Kill a registration test midway, then run the suite again → teardown removes leftover `e2e...@example.com` users → AC-11
- [ ] As `anon` and `authenticated`, `select * from email_sends` and `select claim_email_slot(...)` fail → AC-9

## Acceptance-criteria coverage
- AC-1 … Mailpit e2e, production Gmail check · AC-2 … Chinese e2e, `welcome.test.ts` · AC-3 … `welcome.test.ts`, e2e HTML check · AC-4 … e2e redirect before email, `actions.test.ts` · AC-5 … `send-welcome.test.ts`, manual failure run · AC-6 … pgTAP, `cap.test.ts`, `send-welcome.test.ts` · AC-7 … pgTAP, `actions.test.ts` · AC-8 … pgTAP · AC-9 … pgTAP · AC-10 … production reset check · AC-11 … e2e, teardown guard · AC-12 … production DNS and Gmail check · AC-13 … privacy e2e (7 bullets)

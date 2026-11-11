The database now has 2 owners with 6 games each, and the sign-up problem is explained below. I haven't fixed the sign-up problem, because that needs changes in your env files and dashboards.


## Why the invite code and sign up fail

I can't see the exact error on your screen, so this comes from reading the code. Both places go through the same Cloudflare Turnstile check, so the first thing to look at is the error text.

**Locally**
- Your `.env.local` uses Cloudflare's test site key (`1x0000…`) with a real secret key (`0x4AAA…`). A test widget token is never accepted by a real secret key, so `verifyInvite` fails with the captcha error before it even compares the code.
- The sign-up call also goes to your hosted Supabase. If captcha is turned on there, it checks the token with its own secret, so a test site key fails there too.
- **Fix:** use a matching pair of keys.
  - Use the real site key (the commented-out `turnstile_site_key` line) together with the real secret.
  - In the Cloudflare Turnstile dashboard, add `localhost` to that widget's allowed hostnames.
  - Restart `pnpm dev` afterwards.

**On Vercel**
- `local-invite-code-1234` is only your local value. Vercel uses its own `INVITE_CODE`, so the code only works if that variable holds the same text.
- Check that Vercel Settings → Environment Variables has these set for Production:
  - `INVITE_CODE`
  - `INVITE_COOKIE_SECRET` (a missing one makes sign-up fail)
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY` (both must be the real pair)
- Add your Vercel domain to the Turnstile widget's allowed hostnames. Redeploy after changing any variable, because they only apply to new deployments.
- The same real secret must be set in Supabase under Authentication → Attack Protection → Captcha.
- Also set `NEXT_PUBLIC_SITE_URL` to the Vercel URL.

**What I need from you:** the error text on the form. Typical ones are "captcha", "invite code wrong" or "invite needed". I can tell which of these applies from that message.

**Security note:** `.env.local` has the Resend/SMTP password in plain comment lines. Remove them and rotate that password, since I saw it in the output.

I'm leaving the tunnel and dev server running. Tell me when you've finished reviewing, and I'll stop both and revert the `allowedDevOrigins` edit.
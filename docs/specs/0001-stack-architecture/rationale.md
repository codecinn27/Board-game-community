# 0001. Stack and architecture: rationale

Decision record for [index.md](index.md). Builds do not need to read this file.

## Context

You are building a public board game shelf for a local community: under about 100 members and a few hundred to a couple thousand games in the first year. One person maintains it, comfortable with React and JavaScript, with no budget set aside for hosting.

The product needs more than static pages:
- **Server side code**, to fetch game details from outside sites (search and pasted links).
- **Server rendered public pages**, so search engines and chat apps (WhatsApp, Facebook) can read titles and covers.
- **Member sign in**, with rules that let anyone read but only members write, and only the owner of a rating or comment change it.
- **Image storage** for game covers.
- **Two languages**, English and Chinese.
- **Mobile first**, phone screens before desktop.

You already pay for a Shinjiru Economy Linux shared hosting plan (cPanel, 3 CPU, 3 GB RAM, 30 entry processes, which means at most 30 requests handled at once). It currently hosts two React sites (likely static builds) and three WordPress sites. Shared hosting of this kind is built around PHP and MySQL, and any Node.js support runs inside the same process limits shared with those five sites.

Without a decision every later feature stalls: the data model, sign in, design system, and translations all depend on the framework and platform.

## Options considered

### Option 1: Next.js on Vercel with Supabase (chosen)

One Next.js app on Vercel's free plan, with Supabase for database, sign in, and storage.

**Pros**:
- Free at this scale; deploys on every git push; preview link per branch.
- Server rendering and server code in the same React project.
- One platform for data, sign in, and files, with security rules in the database.

**Cons**:
- Two external vendors with free plan limits (Vercel Hobby is non commercial only; Supabase free pauses after 7 idle days).
- Serverless functions have time limits, which matters for slow scraping.

### Option 2: Next.js on your Shinjiru shared hosting with MySQL

Run Next.js through cPanel's Node.js app support (if the plan offers it), with the plan's MySQL database and a self hosted auth library.

**Pros**:
- Already paid for; data stays on a server you control.
- No new vendor accounts.

**Cons**:
- Node.js on shared hosting shares the 30 entry process limit with five other sites; slow scraping requests can block real visitors.
- Manual build and upload for every change; no preview deployments.
- Sign in, password reset email, and image storage must all be assembled and secured yourself.

### Option 3: Static React site + separate API

A React single page app (like your existing React sites) plus a separate backend for scraping and data.

**Pros**:
- Familiar pattern; the frontend can sit on any static host, including Shinjiru.

**Cons**:
- Pages render in the browser, so search engines and share previews see an empty page without extra work.
- Two projects, two deployments, an API contract to keep in sync, for one maintainer.

### Option 4: Next.js on Vercel with Neon Postgres and separate auth and storage

Same framework and host, but Neon for the database, a self hosted auth library, and a separate file storage service.

**Pros**:
- Neon wakes on its own when idle, so no keep alive job.
- Each piece can be swapped on its own.

**Cons**:
- Three services and three sets of credentials instead of one.
- Access rules live only in application code, so one missed check can expose data.

## Rationale

The forces that decide this are one maintainer, no hosting budget, and a site that needs server code, SEO, sign in, and images. Option 2 saves a vendor but puts a Node.js app inside a shared PHP plan with a hard concurrency cap shared by five other sites, and it makes you build and secure sign in and storage yourself. That cost lands on the one person maintaining everything. Option 3 fails the SEO and share preview requirement, or needs extra work to fix it. Option 4 is reasonable but triples the number of services to wire up and secure.

Option 1 keeps everything in one React based codebase you already understand. Hard parts like sign in, password reset, backups, and image storage go to managed services, all inside free limits a community of this size will not approach. Its real weaknesses are the Supabase pause and serverless time limits. The pause is handled by a daily keep alive job. The time limits are handled by designing lookups to fail fast with manual entry as a fallback, which feature 10 already requires.

Smaller calls made along the way:
- **Server actions over a REST API.** No other client calls this backend; a formal API is extra code to keep in sync for nobody. Runner up: route handlers everywhere.
- **The Supabase client over an ORM.** It is the same client that carries the signed in member into row level security, so there is only one way to touch the database. Runner up: Drizzle.
- **Previews use the second free Supabase project as staging.** Previews hold write capable keys, so pointing them at production would risk real member data; the free plan's two projects cover production and staging exactly. Runner up: disable previews.
- **Resend as the auth email sender from day one.** Supabase's built in sender only reaches the project team's own addresses at about 2 emails per hour, so ordinary members could not confirm sign up without it. Runner up: Google sign in only, which avoids email entirely but excludes members without Google.
- **Singapore for both database and functions.** Server code talks to the database on every page; keeping both close to each other and to Malaysia keeps pages fast.
- **Covers resized once at ingest, not on every view.** Vercel's free image optimization quota is small; resizing when a game is added costs nothing later. Runner up: `next/image` optimization with a remote pattern for Supabase.
- **Cross check.** An independent review on another model found the email, preview, region, Google consent, caching, Chinese search, and backup gaps; all were resolved in this spec.

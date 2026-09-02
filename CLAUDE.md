# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This repo contains two independently deployed pieces for **THE THIRDPLACE EBISU**, a membership community site:

- **`/` (repo root)** — static landing page (`index.html`, `style.css`, `script.js`, `images/`), deployed via GitHub Pages. Custom domain is set in `CNAME` (`thethirdplace-ebisu.com`). No build step — edit the HTML/CSS/JS directly. `style.css` and other assets are cache-busted with a `?v=NN` query string in `index.html`; bump that version when changing `style.css`.
- **`thirdplace-app/`** — a Next.js 14 (App Router) app deployed separately on Vercel (`yuta-blog.vercel.app`), handling event RSVPs, membership sign-up, and inquiries. This is the only part of the repo with a build/lint/dev toolchain.

The landing page and the Next.js app are **different origins**. `script.js` calls the app's API via `APP_API_BASE = 'https://yuta-blog.vercel.app'`, and every API route in `thirdplace-app` sends wildcard CORS headers to allow this cross-origin access.

## Commands (run from `thirdplace-app/`)

```bash
npm install       # install deps
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build
npm run start       # run production build
npm run lint        # next lint
```

There is no test suite in this repo.

### Local setup

Copy `.env.example` to `.env.local` inside `thirdplace-app/` and fill in Supabase credentials at minimum. `RESEND_API_KEY`, `NOTION_API_KEY`/`NOTION_*_DB_ID`, and `CRON_SECRET` are optional — routes that use them log a warning and no-op when unset rather than failing.

Database schema lives at `thirdplace-app/supabase/schema.sql` and must be run manually in the Supabase SQL editor (no migration tooling).

## Architecture (`thirdplace-app/`)

**Events are code, not data.** All event definitions (title, recurrence rule, capacity, deadline, extra RSVP fields, email copy) live as a constant array in `lib/events.ts` (`EVENTS`). There is no `events` table — adding/editing an event means editing this file and redeploying. `lib/events.ts` also computes event occurrences from recurrence rules (`once` / `weekly` / `monthly`) and RSVP deadlines.

**RSVP identity is device-based, not name-based.** Responses are keyed by `(event_id, occ_date, device_id)`, where `device_id` is a client-generated ID (`lib/deviceId.ts`, persisted in localStorage) — not the attendee's name — so two different people with the same name don't collide, and a returning visitor's RSVP is upserted rather than duplicated.

**`app/api/responses/route.ts`** is the core endpoint (GET/POST) and fans out on every POST:
1. Upserts into Supabase `responses` (anon-key client, RLS-protected, publicly readable).
2. Optionally stores the RSVP'er email in the separate `response_emails` table (not public-readable — used only for reminder cron) when status is `go`, and deletes it otherwise.
3. Sends a confirmation email via Resend if an email was supplied.
4. Mirrors the RSVP into a Notion database if `NOTION_RESPONSES_DB_ID` is set, matching existing pages by a synthetic `回答ID` (`eventId|occDate|deviceId`) so repeated edits update one row instead of creating new ones. Notion columns are all plain text; if an event's `extraFields` reference a Notion property that doesn't exist yet, the write is retried without those fields rather than failing outright.

**`app/api/members/route.ts`** and **`app/api/inquiries/route.ts`** are simple public insert-only endpoints (membership applications, contact form) backed by the `members`/`inquiries` tables, with the same Resend notification pattern.

**Two Vercel Cron jobs** (`vercel.json`) hit dedicated routes, authenticated by a `CRON_SECRET` bearer token when set:
- `app/api/cron/check-capacity/route.ts` (daily) — on each event's RSVP deadline day, emails organizers (`NOTIFY_EMAIL_TO`) if confirmed attendees are below `MIN_ATTENDEES`.
- `app/api/cron/send-reminders/route.ts` (daily) — emails a reminder to everyone in `response_emails` whose event occurs "tomorrow" (JST).

Cron routes use `lib/supabaseAdmin.ts` (service-role key, bypasses RLS) since they need to read `response_emails`, which the anon key cannot. Regular request handlers use `lib/supabase.ts` (anon key).

**Supabase client fallback:** `lib/supabase.ts` and `lib/supabaseAdmin.ts` hard-code fallback URL/anon-key values, used only when the corresponding env var is unset or contains non-ASCII bytes — this works around a recurring Vercel dashboard encoding bug for those specific values. Prefer fixing env vars over relying on the fallback when changing Supabase projects.

**Row Level Security model:** `responses` is public read/insert/update (attendee names are not sensitive); `response_emails` is insert/update/delete only, no public select (protects attendee emails, readable only via the service-role key in cron jobs); `members` is insert-only.

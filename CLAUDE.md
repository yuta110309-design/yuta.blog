# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo contains two independently deployed parts of the same project (**THE THIRDPLACE EBISU**, a members-only community/club site):

1. **Root** (`/index.html`, `/script.js`, `/style.css`, `/images/`) — a static landing page hosted on **GitHub Pages** (custom domain via `CNAME`: `thethirdplace-ebisu.com`). No build step; edit the files directly.
2. **`thirdplace-app/`** — a separate **Next.js 14 (App Router)** app deployed on **Vercel**, providing the event attendance/RSVP tool plus the backend API the landing page calls into.

These two parts communicate over the network as separate origins — the static site is a client of the Next.js app's API, not a subdirectory of it. Keep that boundary in mind: changes to API request/response shape must be kept in sync on both sides (`script.js` on one side, `app/api/*/route.ts` on the other).

## Commands

All commands below run from `thirdplace-app/` (the root static site has no build/lint/test tooling — just edit and reload).

```bash
cd thirdplace-app
npm install
npm run dev     # local dev server at http://localhost:3000
npm run build   # production build
npm run start   # run the production build
npm run lint    # next lint
```

There is no test suite in this repo.

### Local setup

```bash
cp .env.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example` for the full list, including optional Resend and Notion integration keys). Note: `lib/supabase.ts` and `lib/supabaseAdmin.ts` hard-code fallback Supabase credentials, used only when the env var is unset or contains non-ASCII characters (a workaround for a Vercel env var mangling issue) — real deployments should still set the env vars properly.

### Deployment

- **Root site**: pushes to the deployed branch publish directly via GitHub Pages.
- **`thirdplace-app/`**: deployed on Vercel with **Root Directory** set to `thirdplace-app`. Two Vercel Cron jobs are configured in `vercel.json`: `check-capacity` (daily) and `send-reminders` (daily) — see Architecture below.

## Architecture (`thirdplace-app/`)

### Data flow

- `lib/events.ts` holds the `EVENTS` array — event definitions (title, recurrence, capacity, deadline, extra form fields, email copy) are **code-managed constants**, not stored in Supabase. To add/change an event, edit this file directly. Recurrence math (weekly/monthly/once → next occurrence date) also lives here.
- **Supabase** (Postgres) is the datastore, via `lib/supabase.ts` (anon client, RLS-scoped, used by client and API routes for public reads/writes) and `lib/supabaseAdmin.ts` (service-role client, bypasses RLS, used only by the reminder cron to read attendee emails).
- Three tables (`supabase/schema.sql`):
  - `responses` — public RSVP data (event_id, occ_date, name, status, extra JSONB). Uniqueness/upsert key is `(event_id, occ_date, device_id)`, **not** name — this avoids collisions between different people with the same name.
  - `response_emails` — attendee emails for reminder purposes, kept in a separate table (not `responses`) specifically because `responses` is publicly SELECT-able and emails shouldn't be; only insert/update/delete are allowed for the anon role, SELECT requires the service-role key.
  - `members` — membership applications, insert-only for the anon role (contains PII, not publicly readable).
- `lib/deviceId.ts` generates/persists a random per-browser ID in `localStorage`, used as the identity key for RSVPs (distinguishes same-name attendees, lets a person update/cancel their own response).

### API routes (`app/api/*/route.ts`)

- `responses` — GET (list all RSVPs) / POST (upsert an RSVP). On POST, also: sends a confirmation email (Resend, if `RESEND_API_KEY` set), maintains the `response_emails` row for reminders, and syncs the row to a Notion database (if Notion env vars set).
- `members` — POST for membership applications; saves to Supabase, emails the organizers, syncs to Notion.
- `inquiries` — POST for sponsor/partner inquiries; email-only (no Supabase/Notion persistence), notifies a fixed organizer address.
- `cron/check-capacity` — runs daily; for events whose signup deadline is today, emails organizers if confirmed attendance is below `MIN_ATTENDEES` (3).
- `cron/send-reminders` — runs daily; emails attendees whose event occurs tomorrow (JST), reading from `response_emails` via the service-role client.

All public API routes (`responses`, `members`, `inquiries`) send permissive CORS headers (`Access-Control-Allow-Origin: *`) because they're called cross-origin from the GitHub Pages landing page (`script.js`, via `APP_API_BASE = 'https://yuta-blog.vercel.app'`). Cron routes check `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set (Vercel Cron sends this automatically).

Third-party integrations (Resend email, Notion sync) are all soft-optional: routes check for the relevant env var and skip with a `console.warn` if absent, rather than failing the request. Notion writes retry without event-specific "extra" fields if the initial write 400s (e.g. a Notion DB column doesn't exist yet), so that core fields still get recorded — see the retry logic in `syncResponseToNotion` (`app/api/responses/route.ts`).

### Frontend

- `app/page.tsx` — top-level page with an attendee/organizer tab switcher (defaults to attendee), renders one `EventCard` per entry in `EVENTS`.
- `components/EventCard.tsx` / `AttendeeForm.tsx` / `OrganizerPanel.tsx` — per-event card, the RSVP form (capacity/deadline handling — note: once capacity is hit, only the "attending" option is disabled, the form itself stays visible so existing attendees can still change/cancel their response), and the organizer's aggregate/history view, respectively.
- Tailwind is configured with brand tokens (deep green `#0c1815`, gold `#D9B876`, off-white `#FBF9F2`) in `tailwind.config.ts` — reuse these tokens rather than hardcoding colors.
- `next.config.js` disables caching (`Cache-Control: no-cache, no-store, ...`) on all non-static routes, to avoid stale views in in-app browsers (e.g. LINE's webview).

### Known gaps (see `thirdplace-app/README.md`)

- The organizer tab has no authentication — anyone can switch to it.
- Events are hardcoded in `lib/events.ts`; there's no admin UI or `events` table yet.
- No LINE/webhook notifications on new RSVPs.

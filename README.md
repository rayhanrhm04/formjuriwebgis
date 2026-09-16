# MAPID WebGIS Competition 2026 — Judging System

A mobile-first judging application built with Next.js App Router and Supabase. Draft scores are saved but excluded from the leaderboard. A judge contributes to a team's final score only after submitting both Booth and Presentation evaluations.

## Run locally

1. Use Node.js 22 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the required values.
3. In the project's Supabase SQL Editor, check whether the application tables already exist:

   ```sql
   select tablename from pg_catalog.pg_tables
   where schemaname = 'public'
     and tablename in ('judges', 'teams', 'scoring_sessions', 'criteria',
                       'scores', 'score_items', 'leaderboard_updates',
                       'committee_access_codes');
   ```

   If the query returns no rows, apply the [initial database schema](./supabase/migrations/20260914000000_initial_schema.sql) in the SQL Editor. Do not rerun it over existing application tables. The schema includes the rubric, explicit grants, RLS, and the committee access-code hash. A publishable or secret API key alone cannot execute schema migrations.
4. Add real teams in the committee dashboard, then set `NEXT_PUBLIC_DEMO_MODE=false` in `.env.local` and restart the server. The sample teams are intentionally not inserted into the production database.
5. Run `npm run dev` and verify committee login, team management, scoring, and leaderboard updates.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key.
- `NEXT_PUBLIC_DEMO_MODE`: set to `true` until the database schema and server secret key are ready. Set to `false` for production data.
- `SUPABASE_SECRET_KEY`: server-only key. Never use a `NEXT_PUBLIC_` prefix.
- `JUDGE_SESSION_SECRET`: random string of at least 32 characters used to sign session cookies.
- `COMMITTEE_CODE_HASH`: local demo fallback in `salt:scrypt-hash` format. In production, the hash is read from `committee_access_codes` in Supabase instead.
- `GOOGLE_SHEETS_WEBHOOK_URL`: optional asynchronous mirror after a successful Supabase write.

## Committee access

The dashboard uses a single access code instead of an email/password account. The server compares a salted scrypt hash and issues a 12-hour HttpOnly cookie. The code is never bundled into browser JavaScript. In production, the hash is read from the protected `committee_access_codes` table. Its row-level security is enabled, and no anonymous or authenticated table access is granted.

To activate production access, apply the database schema, provide `SUPABASE_SECRET_KEY`, and set `NEXT_PUBLIC_DEMO_MODE=false`. Until all three are ready, keep the app in clearly labeled demo mode. Committee data management now goes through authenticated server routes, never directly from the browser with the publishable key.

## Data architecture

- `save_judge_score` commits the score and criterion values in one database transaction.
- The unique `(judge_id, team_id, session_id)` constraint prevents duplicate scores.
- Individual scores are not publicly readable. Judge API routes use signed cookies and a server-only secret key.
- `get_leaderboard()` is a read-only aggregate RPC. Drafts and one-session evaluations do not affect the final average.
- `leaderboard_updates` contains timestamp-only change signals; clients refetch aggregate rankings after receiving a Realtime update.
- Public-schema tables use RLS and explicit grants.

## Verify

```bash
npm test
npm run lint
npm run build
```

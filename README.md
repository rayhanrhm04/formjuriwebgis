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
4. Run `npm run dev`, sign in to the committee dashboard, and add the real judges and teams. A fresh database has no judge, team, or score records.
5. Verify committee login, team management, scoring, and leaderboard updates before deploying. Missing configuration or tables produce an error; the application does not fall back to sample records.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe publishable key.
- `SUPABASE_SECRET_KEY`: server-only key. Never use a `NEXT_PUBLIC_` prefix.
- `JUDGE_SESSION_SECRET`: random string of at least 32 characters used to sign session cookies.
- `GOOGLE_SHEETS_WEBHOOK_URL`: optional asynchronous mirror after a successful Supabase write.

## Committee access

The dashboard uses a single access code instead of an email/password account. The server compares a salted scrypt hash and issues a 12-hour HttpOnly cookie. The code is never bundled into browser JavaScript. In production, the hash is read from the protected `committee_access_codes` table. Its row-level security is enabled, and no anonymous or authenticated table access is granted.

To activate access, apply the database schema and configure all required Supabase and session environment variables in both local development and Vercel Production. Redeploy after changing Vercel environment variables. Committee data management goes through authenticated server routes, never directly from the browser with the publishable key. The migration seeds only the rubric and access-code hash; it does not create sample judges, teams, or scores.

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

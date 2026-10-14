# Assessment Submission — Civic Community Events Board

## 1. What was built

A single Next.js 16 App Router application backed by PostgreSQL and Prisma. Visitors browse
a filterable public catalogue, save favourite categories to drive a personalised feed, set
reminders on events, and design a personal event card with three themes and five stickers.
Administrators manage the catalogue, including past and inactive events.

The public API is specified in `lib/api-spec/openapi.yaml` and served by Route Handlers.
Zod schemas and the TanStack Query client are generated from that single source.

## 2. How to run it

See the repository `README.md`. In short: `pnpm install`, start PostgreSQL, copy
`.env.example` to `.env` and fill it in, then `pnpm db:generate`, `pnpm db:migrate`,
`pnpm db:seed`, `pnpm dev`.

## 3. Three short answers

The same three answers appear in the README, which is where the assessment asks for them.

**Why did you choose this architecture?**

The brief required Prisma and Next.js, so those override the Express and Drizzle templates
the workspace shipped with. A single App Router application keeps the UI and its JSON API
in one deployment with one type-checking pass, instead of running a separate server whose
routes must be kept manually in step with the frontend. Generating the client from an
OpenAPI document means the wire contract is written down once and drift becomes a codegen
diff rather than a runtime bug.

**What is the most important security decision you made?**

Treating the JWT as untrusted input on every request rather than only at login. Every
request re-derives identity from the token and then re-checks it against current state:
a visitor must still exist with the same email, and an admin session is rejected unless
`ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` are both configured and the email matches. That
means an administrator can be locked out by unsetting a variable, and a deleted account
loses access immediately instead of at token expiry. The second decision was not trusting
`X-Forwarded-For`: it is caller-controlled, so keying rate limits on it would let an
attacker mint a fresh bucket per request. Peer bucketing is now opt-in behind
`AUTH_TRUSTED_IP_HEADER`.

**What did you cut for time, and what would you do next?**

Rate limiting is in-process, so it is correct for a single instance and wrong behind a load
balancer. Reminders are filtered at read time rather than expired by a job. There is no
service-level integration suite or CI configuration, only unit tests and the Playwright
browser suite. Next steps in order: a shared rate-limit store, an audit trail for admin
edits, and database-backed integration tests alongside the browser suite.

## 4. Architecture and security tradeoffs

| Decision | Why | What it costs |
|---|---|---|
| Admin is an environment-provisioned account with no database row | Guarantees no public default credentials, and admin can be disabled by unsetting a variable | No admin user management; a single admin |
| JWT re-verified against live state on every request | Deleted accounts and revoked admins lose access immediately | One extra read per authenticated request |
| Same-origin check on mutations instead of CSRF tokens | Fewer moving parts; `SameSite=Lax` already blocks cross-site form posts | Requires correct proxy `Host` handling; bearer clients must still send `Origin` |
| Rate limits in process | No infrastructure to run for a single instance | Not shared across instances; resets on deploy |
| Optimistic concurrency via `updatedAt` on event edits | Prevents two admins silently overwriting each other | Clients must send the timestamp they last read |
| Reminders filtered at read time | No scheduler to operate or fail | Read queries carry the filter |
| Orval-generated client | Contract drift surfaces as a build diff | Codegen step must run before typecheck when the spec changes |
| Prices stored as `Decimal`, sent as strings | Exact currency arithmetic; no float drift in the API | Slightly more verbose client handling |
| SQLite-free, PostgreSQL only | Brief requirement; better concurrency semantics | Heavier local setup than SQLite |

## 5. Interviewer guide

The full guide is a separate document: [`docs/interviewer-guide.md`](interviewer-guide.md).
It covers the architecture diagram, module responsibilities, schema and example queries,
indexing trade-offs, the auth flows, authorization reasoning, optimistic updates, card
design, testing strategy, setup and troubleshooting, limitations, and likely questions.

A short version for a walkthrough:

**Entry points**
- `src/app/api/**/route.ts` — every API route
- `src/lib/http.ts` — `handler` wrapper, error mapping, body reading
- `src/lib/auth/session.ts` — identity resolution and origin checks
- `src/lib/services/*.ts` — all business logic, no HTTP concerns
- `prisma/schema.prisma` — data model

**Questions worth asking a candidate**
1. Walk me through what happens between a browser clicking "save reminder" and the row in
   the database. Where does the optimistic update roll back?
2. Why does `identityFromToken` query the database when the token is already signed? What
   attack does that prevent?
3. `eventDto` returns exactly twelve fields. What would you add, and what must never be
   added?
4. The seed includes inactive and past events. Why, and which query proves it?
5. `readJson` caps bodies at 16 KB before parsing. Why parse the raw text first?

**Where to push back**
- If someone claims service-level integration tests exist, they do not. There is a unit
  suite and a Playwright browser suite, but no database-backed Vitest integration suite.
- If someone proposes trusting `X-Forwarded-For`, ask how an attacker defeats it.
- If someone says the admin hash can live in `.env`, ask what happens to the `$2b$12$`
  prefix, and have them check the value the process actually receives.

## 6. AI disclosure

This project was developed with AI assistance, used as a coding assistant for scaffolding,
implementation, debugging and test authoring. The requirements, architecture decisions and
tradeoffs were mine. Every change was reviewed, run and verified locally: `pnpm typecheck`,
`pnpm lint`, `pnpm test`, `pnpm build` and `pnpm test:e2e` all pass, and the application was
exercised against a local PostgreSQL instance.

Browser tests run against a real server and a real database. What is not implemented is a
service-level integration suite and CI configuration, and no claim is made that either ran.

## 7. Recording script

1. **Intro, 20s** — "This is Civic, a community events board. Next.js 16 App Router,
   PostgreSQL through Prisma. I'll show discovery, then auth, then the admin path, then
   how it's tested."
2. **Discovery, 60s** — Load `/`. Filter by category and city, page through results. Show
   `/api/events/meta` driving the filter UI in the network tab.
3. **Auth, 60s** — Sign up. Show the `HttpOnly` cookie in devtools, then `/api/auth/me`.
   Note the token is never in page HTML.
4. **Visitor features, 90s** — Save favourite categories, show the feed narrow to them. Set
   a reminder, show the optimistic update and the rollback on a forced 401. Open an event
   and change theme and stickers.
5. **Admin, 60s** — Sign in as admin, create an event, edit it, toggle it inactive, and
   show it disappears from public discovery but remains in the admin list. Note there is no
   delete, and why.
6. **Contract, 45s** — Open `lib/api-spec/openapi.yaml`, show a schema change, run
   `pnpm codegen`, show the generated diff.
7. **Security, 90s** — Walk through `assertOrigin`, `identityFromToken`, `readJson` and the
   generic error path. Explicitly show the test that asserts a database error message never
   reaches the client.
8. **Laptop layout and decisions, 45s** — Explain JWT re-verification per request, the `id`
   tiebreaker in the sort, and why rate limiting ignores forwarded IP headers.
9. **Close, 20s** — Name the known limits: in-process rate limiting, reminders filtered at
   read time rather than expired, and no `pg_trgm` index for substring search.
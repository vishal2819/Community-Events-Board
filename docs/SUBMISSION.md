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

Browser end-to-end automation and database-backed integration tests are not implemented;
the 98 unit tests cover server logic only, and that boundary should be stated plainly
rather than papered over. Rate limiting is in-process, so it is correct for a single
instance and wrong behind a load balancer. Next steps in order: end-to-end coverage of the
signup-to-reminder journey, a shared rate-limit store, and a scheduled job to expire old
reminders rather than filtering them out at read time.

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
- If someone claims the tests cover the API end to end, they do not. There is no
  database-backed suite and no browser automation.
- If someone proposes trusting `X-Forwarded-For`, ask how an attacker defeats it.

## 6. AI disclosure

This project was developed with AI assistance, used as a coding assistant for scaffolding,
implementation, debugging and test authoring. The requirements, architecture decisions and
tradeoffs were mine. Every change was reviewed, run and verified locally: `pnpm typecheck`,
`pnpm lint`, `pnpm test` and `pnpm build` all pass, and the application was exercised
against a local PostgreSQL instance.

No browser end-to-end automation has been run, and no claims of such testing are made.

## 7. Recording script

1. **Intro, 20s** — "This is Civic, a community events board. Next.js 16 App Router,
   PostgreSQL through Prisma, about four thousand lines. I'll show discovery, then auth,
   then the admin path, then how it's tested."
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
8. **Testing, 60s** — `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. State the
   boundary: unit tests only, no end-to-end automation, and what I would add next.
9. **Close, 30s** — Name the two known limits: in-process rate limiting, and reminders
   filtered at read time rather than expired by a job.
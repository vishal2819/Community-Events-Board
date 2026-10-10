# Community Events Board delivery plan

## Reconnaissance
The uploaded ZIP is a React/Vite presentation prototype. Its Civic branding,
shared tokens and screen compositions are useful; in-memory authentication,
preferences and reminders are not an implementation of the assessment.
The supplied project is a pnpm workspace with unused Express/Drizzle templates.
The assessment app will be a single Next.js App Router package, with its own
Prisma database access and JSON Route Handlers; the template API is not used.
There is no configured Git remote at reconnaissance time. Do not invent one.

## Phases and acceptance
1. Foundation: supported Next.js, strict TypeScript, shared Civic tokens and
   shadcn components, OpenAPI contracts and generated client. App starts.
2. Data: five normalized Prisma entities, foreign keys, unique constraints,
   indexes, committed development migration and reproducible 15+ event seed.
3. Authentication: bcrypt, jose HS256, safe DTOs, cookie/bearer policy, CSRF,
   rate limiting, protected pages and operations. No public admin credentials.
4. Events: database filters with AND semantics, UTC upcoming cutoff, stable
   sorting/pagination, admin create/edit/status without deletion.
5. Visitors: persisted favourites, feed, reminders with optimistic rollback,
   three themes/five stickers with per-user design persistence.
6. Quality: static checks, unit/integration tests and production build; inspect
   public responsive views. Browser end-to-end automation is deferred on the
   initial build; do not claim it ran.
7. Submission: setup, API reference, three short answers, security/architecture
   tradeoffs, interviewer guide, AI disclosure and recording script.

## Risks and decisions
- Preserve prototype style, not simulated success, fake RSVP/email promises,
  unrelated ticket booking or other features outside the assignment.
- Prisma/Next are explicit requirements and override template Express/Drizzle.
- Existing SESSION_SECRET may be used only as an isolated development JWT
  secret. Production requires JWT_SECRET. Admin is disabled until ADMIN_EMAIL
  and ADMIN_PASSWORD_HASH are provisioned by the owner.
- No migration, seed or DDL at production startup/build.
- Git commits are local until a specific remote/branch is available.
- In-process rate limits are suitable for a single assessment instance, not
  distributed production abuse prevention.

## Intended commits
`chore: establish Civic Next.js foundation and API contracts`
`feat: add Prisma events schema and reproducible seed`
`feat: implement secure auth and protected event APIs`
`feat: integrate Civic visitor and admin experiences`
`test: validate security and persistent user features`
`docs: add setup and assessment submission guide`

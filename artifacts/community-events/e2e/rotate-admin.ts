/**
 * One-off: rotate the local development admin password used by the browser suite.
 *
 * Only `.env.e2e-admin` is rewritten. `ADMIN_PASSWORD_HASH` must stay out of `.env`,
 * because Next.js gives .env precedence over the process environment and would then
 * shadow the credentials the suite injects, silently breaking admin login.
 *
 * Both files are gitignored; this script must never be committed.
 *
 *   cd artifacts/community-events
 *   pnpm exec tsx e2e/rotate-admin.ts
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { hashSync } from "bcryptjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const target = path.join(projectRoot, ".env.e2e-admin");

if (!existsSync(target)) {
  throw new Error("Missing .env.e2e-admin. Copy .env.e2e-admin.example first.");
}

const password = `Civic-${randomBytes(9).toString("base64url")}`;
const contents = readFileSync(target, "utf8");
const updated = contents
  .replace(/^ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH="${hashSync(password, 12)}"`)
  .replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD="${password}"`);

writeFileSync(target, updated, "utf8");

process.stdout.write(`New browser-suite admin password: ${password}\n\n`);
process.stdout.write("To use the same password for the dev server, export it in the shell:\n\n");
process.stdout.write(`  bash  export ADMIN_EMAIL='admin@example.com'\n`);
process.stdout.write(`        export ADMIN_PASSWORD_HASH='${updated.match(/^ADMIN_PASSWORD_HASH="([^"]+)"/m)![1]}'\n\n`);
process.stdout.write("  pwsh  $env:ADMIN_EMAIL='admin@example.com'\n");
process.stdout.write(`        $env:ADMIN_PASSWORD_HASH='${updated.match(/^ADMIN_PASSWORD_HASH="([^"]+)"/m)![1]}'\n`);

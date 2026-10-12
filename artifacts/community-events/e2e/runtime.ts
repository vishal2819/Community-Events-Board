import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parse as parseDotenv } from "dotenv";

export interface AdminCredentials {
  email: string;
  /** bcrypt hash, matched by the application against ADMIN_PASSWORD_HASH. */
  hash: string;
  /** Plaintext, needed to sign in. Never committed: it lives in the gitignored .env. */
  password: string;
}

/** Matches the cost-factor guard in src/lib/services/auth.ts. */
const COST_GUARD = /^\$2[aby]\$(?:1[2-9]|2\d|3[01])\$/;

/** Single source of truth for the suite's origin, shared with playwright.config.ts. */
export const baseURL = `http://127.0.0.1:${process.env.E2E_PORT ?? 3100}`;

export const projectRoot = path.resolve(import.meta.dirname, "..");

/**
 * Admin credentials for the browser suite.
 *
 * They are read from `.env.e2e-admin` rather than `.env`, and injected into the
 * web server's environment, because Next.js expands `$name` references while
 * loading `.env`. A bcrypt hash begins `$2b$12$`, so those segments are stripped
 * and the server rejects the value, failing every admin login with 503. Quoting
 * the value does not prevent it, and this file is parsed with dotenv directly.
 *
 * `.env` must therefore not define ADMIN_EMAIL or ADMIN_PASSWORD_HASH, or it
 * would take precedence over the injected values.
 */
export function resolveAdminCredentials(): AdminCredentials {
  const source = path.join(projectRoot, ".env.e2e-admin");
  if (!existsSync(source)) {
    throw new Error(
      `Missing ${path.basename(source)}. Copy .env.e2e-admin.example and fill in ` +
        "ADMIN_EMAIL, ADMIN_PASSWORD_HASH (from `pnpm admin:hash`) and ADMIN_PASSWORD.",
    );
  }
  const file = parseDotenv(readFileSync(source, "utf8"));
  const pick = (key: string) => process.env[key] ?? file[key] ?? "";

  const email = pick("ADMIN_EMAIL").trim().toLowerCase();
  const hash = pick("ADMIN_PASSWORD_HASH").trim();
  const password = pick("ADMIN_PASSWORD");

  if (!email || !hash) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD_HASH must be set in .env.e2e-admin.");
  }
  if (!COST_GUARD.test(hash)) {
    throw new Error(
      "ADMIN_PASSWORD_HASH is not a bcrypt hash with cost 12 or more. Generate one with `pnpm admin:hash`.",
    );
  }
  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD is missing. It is the plaintext matching ADMIN_PASSWORD_HASH, " +
        "used only by the browser suite to sign in. Gitignored; never commit it.",
    );
  }

  const shadowing = [".env", ".env.local"].filter((name) => {
    const file2 = path.join(projectRoot, name);
    if (!existsSync(file2)) return false;
    const parsed = parseDotenv(readFileSync(file2, "utf8"));
    return Boolean(parsed.ADMIN_PASSWORD_HASH || parsed.ADMIN_EMAIL);
  });
  if (shadowing.length) {
    throw new Error(
      `${shadowing.join(" and ")} define ADMIN_EMAIL/ADMIN_PASSWORD_HASH and would override the ` +
        "injected credentials, because Next.js gives .env precedence over the process " +
        "environment. Remove those keys and try again.",
    );
  }

  return { email, hash, password };
}

export function defaultTestDatabaseUrl(): string {
  return process.env.E2E_DB_URL ?? "postgresql://postgres:postgres@localhost:5432/civic_test";
}

/** Swaps only the database name, so the maintenance connection keeps its credentials. */
export function maintenanceUrl(databaseUrl = defaultTestDatabaseUrl()): string {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

/** Writes a gitignored runtime file so test workers can read the credentials. */
export function writeRuntime(credentials: AdminCredentials): void {
  const dir = path.join(import.meta.dirname, ".runtime");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "admin.json"), JSON.stringify(credentials), "utf8");
}

export function readRuntime(): AdminCredentials {
  const file = path.join(import.meta.dirname, ".runtime", "admin.json");
  if (!existsSync(file)) {
    throw new Error(`Missing ${file}. Run the suite through \`pnpm test:e2e\`.`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as AdminCredentials;
}
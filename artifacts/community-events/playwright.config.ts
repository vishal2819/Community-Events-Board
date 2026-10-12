import { defineConfig, devices } from "@playwright/test";
import { resolveAdminCredentials, writeRuntime, defaultTestDatabaseUrl, baseURL } from "./e2e/runtime";

/**
 * Browser tests run against a dedicated port and a dedicated database
 * (`civic_test`) so they never disturb a development server or its data.
 * Override E2E_DB_URL to point at a different Postgres instance.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const DIST_DIR = ".next-e2e";

// `.env` cannot carry a bcrypt hash (Next expands `$name` and corrupts it), so the
// credentials come from `.env.e2e-admin` and are injected into the server's
// environment, where nothing rewrites them.
const admin = resolveAdminCredentials();
writeRuntime(admin);

export default defineConfig({
  testDir: "./e2e",
  // Specs create and mutate rows, so they run serially to stay deterministic.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  outputDir: "./e2e/.runtime/results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    // The brief requires layouts verified at phone widths.
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    // The launcher clears the build directory first: a server killed mid-run leaves
    // Turbopack's persistent task store in a state that panics on the next boot
    // ("stale reference to an already-collected task").
    command: `node e2e/start-server.mjs`,
    url: `${baseURL}/signup`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NODE_ENV: "development",
      PORT: String(PORT),
      // Isolated output so this server never collides with a dev server on 3000.
      NEXT_DIST_DIR: DIST_DIR,
      DATABASE_URL: defaultTestDatabaseUrl(),
      JWT_SECRET: process.env.E2E_JWT_SECRET ?? "e2e-only-secret-not-used-anywhere-else-32",
      ADMIN_EMAIL: admin.email,
      ADMIN_PASSWORD_HASH: admin.hash,
      // Keep peer rate limiting off: it is opt-in and irrelevant for a local suite.
      AUTH_TRUSTED_IP_HEADER: "",
    },
  },
});
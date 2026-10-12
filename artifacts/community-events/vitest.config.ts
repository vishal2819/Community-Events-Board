import path from "node:path";
import { defineConfig } from "vitest/config";

const resolve = (relative: string) => path.resolve(import.meta.dirname, relative);

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: resolve("src") },
      // `server-only` is a build-time guard that throws outside a React Server
      // Component. These suites exercise real server logic in isolation, so the
      // guard is stubbed rather than removed from application code.
      { find: "server-only", replacement: resolve("tests/stubs/server-only.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Server-only modules import Next and Prisma internals that need no browser,
    // but React Query hooks are not exercised here; unit scope is server logic only.
    globals: false,
  },
});
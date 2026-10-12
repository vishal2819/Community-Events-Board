import { rmSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

/**
 * Launches the development server for the browser suite.
 *
 * Two things are handled here rather than in the Playwright config, because
 * Playwright re-imports the config inside worker processes:
 *
 * - The suite's build directory is removed before the server starts. Doing it from
 *   the config would delete it again once workers load, from under the live server.
 * - `next` is resolved through Node rather than `pnpm exec`, which avoids
 *   `spawnSync pnpm.cmd EINVAL` on Node 24 for batch files.
 */
const projectRoot = path.resolve(import.meta.dirname, "..");
const distDir = process.env.NEXT_DIST_DIR || ".next-e2e";
const port = process.env.PORT || "3100";

rmSync(path.join(projectRoot, distDir), { recursive: true, force: true });

const requireFromProject = createRequire(path.join(projectRoot, "noop.js"));
const nextBin = requireFromProject.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", port], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

// Forward termination so Playwright can stop the server cleanly.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
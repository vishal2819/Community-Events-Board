import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["*.replit.dev", "*.replit.app"],
  // The browser suite points this at its own directory so it can run alongside a
  // development server without colliding on the dev lock or build output.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: { cpus: 2 },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};
export default config;

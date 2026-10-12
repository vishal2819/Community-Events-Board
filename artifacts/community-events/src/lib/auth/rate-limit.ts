import { ApiError } from "@/lib/http";
import { createHash } from "node:crypto";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW = 15 * 60 * 1000;
const MAX_TRACKED_BUCKETS = 10_000;
const EMAIL_LIMIT = 10;
const PEER_LIMIT = 40;

/**
 * Client IPs are only used when a proxy header is explicitly trusted. Forwarded
 * headers are attacker-controlled by default, so treating them as identity would
 * let a caller mint a fresh rate-limit bucket per request and defeat the limit
 * entirely. Without this opt-in the per-account bucket below is the only
 * limiter, which is the property that actually protects stored credentials.
 */
function trustedPeer(request: Request): string | null {
  const header = process.env.AUTH_TRUSTED_IP_HEADER?.trim();
  if (!header) return null;
  const value = request.headers.get(header)?.split(",")[0]?.trim();
  return value ? createHash("sha256").update(value).digest("hex") : null;
}

export function limitAuth(request: Request, email: string) {
  consumeLimit(`email:${createHash("sha256").update(email).digest("hex")}`, EMAIL_LIMIT);
  const peer = trustedPeer(request);
  if (peer) consumeLimit(`peer:${peer}`, PEER_LIMIT);
}

export function consumeLimit(key: string, max: number, now = Date.now()) {
  for (const [id, bucket] of attempts) if (bucket.resetAt <= now) attempts.delete(id);
  if (attempts.size >= MAX_TRACKED_BUCKETS && !attempts.has(key)) {
    throw new ApiError(429, "RATE_LIMIT", "Please try again later.");
  }
  const bucket = attempts.get(key) ?? { count: 0, resetAt: now + WINDOW };
  bucket.count++;
  attempts.set(key, bucket);
  if (bucket.count > max) throw new ApiError(429, "RATE_LIMIT", "Too many attempts. Please wait 15 minutes.");
}
import { ApiError } from "@/lib/http";
import { createHash } from "node:crypto";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW = 15 * 60 * 1000;
export function limitAuth(request: Request, email: string) {
  // Email bucket is not dependent on trusting spoofable client IP headers.
  const peer = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  consumeLimit(`email:${createHash("sha256").update(email).digest("hex")}`, 10);
  consumeLimit(`peer:${peer}`, 40);
}
export function consumeLimit(key: string, max: number, now = Date.now()) {
  for (const [id, bucket] of attempts) if (bucket.resetAt <= now) attempts.delete(id);
  if (attempts.size >= 10000 && !attempts.has(key)) throw new ApiError(429, "RATE_LIMIT", "Please try again later.");
  const bucket = attempts.get(key) ?? { count: 0, resetAt: now + WINDOW };
  bucket.count++;
  attempts.set(key, bucket);
  if (bucket.count > max) throw new ApiError(429, "RATE_LIMIT", "Too many attempts. Please wait 15 minutes.");
}

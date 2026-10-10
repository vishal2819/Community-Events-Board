import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";
import pino from "pino";

export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export function handler(fn: (request: Request) => Promise<NextResponse>) {
  return async (request: Request) => {
    try { return await fn(request); }
    catch (error) {
      if (error instanceof ZodError) {
        return json({ error: { code: "VALIDATION_ERROR", message: "Please check the submitted fields.", fields: error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })) } }, 422);
      }
      if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message } }, error.status);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return json({ error: { code: "CONFLICT", message: "This request could not be completed. Try signing in or refreshing." } }, 409);
      }
      // Do not log request bodies, tokens, connection strings or Prisma error text.
      logger.error({ type: error instanceof Error ? error.name : "UnknownError" }, "API request failed");
      return json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, 500);
    }
  };
}
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(415, "CONTENT_TYPE", "Use application/json.");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 16_384) throw new ApiError(413, "TOO_LARGE", "Request is too large.");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new ApiError(400, "INVALID_JSON", "Malformed JSON."); }
  return schema.parse(body);
}

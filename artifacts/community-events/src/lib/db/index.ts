import "server-only";
import { PrismaClient } from "@prisma/client";

const globalDb = globalThis as unknown as { civicDb?: PrismaClient };
export const db = globalDb.civicDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.civicDb = db;

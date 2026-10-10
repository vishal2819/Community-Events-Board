import { db } from "@/lib/db";
import { handler, json } from "@/lib/http";

export const GET = handler(async () => {
  await db.$queryRaw`SELECT 1`;
  return json({ status: "ok" });
});

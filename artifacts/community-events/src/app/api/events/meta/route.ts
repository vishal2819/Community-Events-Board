import { handler, json } from "@/lib/http";
import { eventMeta } from "@/lib/services/events";

export const GET = handler(async () => json(await eventMeta()));

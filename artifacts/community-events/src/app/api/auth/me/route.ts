import { handler, json } from "@/lib/http";
import { optionalUser } from "@/lib/auth/session";

export const GET = handler(async request => json({ data: await optionalUser(request) }));

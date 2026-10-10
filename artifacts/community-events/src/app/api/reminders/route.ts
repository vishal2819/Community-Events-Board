import { handler, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getReminders } from "@/lib/services/visitor";

export const GET = handler(async request => json(await getReminders((await requireUser(request)).id)));

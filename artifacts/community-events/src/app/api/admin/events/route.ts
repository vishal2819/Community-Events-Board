import { handler, json, readJson } from "@/lib/http";
import { eventInputSchema, querySchema } from "@/lib/validations";
import { requireAdmin, assertOrigin } from "@/lib/auth/session";
import { listEvents, createEvent } from "@/lib/services/events";

export const GET = handler(async request => {
  await requireAdmin(request);
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return json(await listEvents(query, undefined, true));
});
export const POST = handler(async request => {
  assertOrigin(request);
  await requireAdmin(request);
  const input = await readJson(request, eventInputSchema);
  return json(await createEvent({ ...input, isActive: input.isActive ?? true }), 201);
});

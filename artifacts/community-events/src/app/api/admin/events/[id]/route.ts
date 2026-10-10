import { handler, json, readJson } from "@/lib/http";
import { idSchema, eventUpdateSchema } from "@/lib/validations";
import { requireAdmin, assertOrigin } from "@/lib/auth/session";
import { getEvent, updateEvent } from "@/lib/services/events";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return handler(async req => {
    await requireAdmin(req);
    return json(await getEvent(idSchema.parse((await context.params).id), true));
  })(request);
}
export async function PATCH(request: Request, context: Context) {
  return handler(async req => {
    assertOrigin(req);
    await requireAdmin(req);
    return json(await updateEvent(idSchema.parse((await context.params).id), await readJson(req, eventUpdateSchema)));
  })(request);
}

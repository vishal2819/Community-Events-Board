import { handler, json, readJson } from "@/lib/http";
import { cardDesignSchema, idSchema } from "@/lib/validations";
import { requireUser, assertOrigin } from "@/lib/auth/session";
import { getDesign, saveDesign } from "@/lib/services/visitor";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return handler(async req => {
    const user = await requireUser(req);
    return json(await getDesign(user.id, idSchema.parse((await context.params).id)));
  })(request);
}
export async function PUT(request: Request, context: Context) {
  return handler(async req => {
    assertOrigin(req);
    const user = await requireUser(req);
    return json(await saveDesign(user.id, idSchema.parse((await context.params).id), await readJson(req, cardDesignSchema)));
  })(request);
}

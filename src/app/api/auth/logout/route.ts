import { destroySession } from "@/lib/session";
import { json, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withRouteErrors(async () => {
 await destroySession();
 return json({ ok: true });
});
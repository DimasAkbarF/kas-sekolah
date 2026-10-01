import { getSessionUser } from "@/lib/session";
import { error, json, withRouteErrors } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withRouteErrors(async () => {
 const user = await getSessionUser();
 if (!user) return error("Tidak terautentikasi.", 401);
 return json({ user });
});
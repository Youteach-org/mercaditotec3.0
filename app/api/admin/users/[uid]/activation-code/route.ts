import { NextResponse } from "next/server";
import { AdminUserError } from "@/lib/security/adminUsers";
import { renewManualActivationCode } from "@/lib/security/manualUserActivation";
import { ApiAuthError, requireSuperadmin } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/admin/users/[uid]/activation-code">) {
  try {
    const actor = await requireSuperadmin(request);
    const { uid } = await context.params;
    return NextResponse.json(await renewManualActivationCode(actor.uid, uid));
  } catch (error) {
    if (error instanceof AdminUserError || error instanceof ApiAuthError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("MANUAL_USER_REISSUE_ERROR", error);
    return NextResponse.json({ error: "No se pudo emitir el código." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { AccountProfileError, updateOwnProfile } from "@/lib/security/accountProfile";
import { ApiAuthError, requireUnblockedUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    const body = await request.json().catch(() => ({}));
    await updateOwnProfile(user.uid, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof AccountProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PROFILE_UPDATE_ERROR", error);
    return NextResponse.json({ error: "No se pudo actualizar el perfil." }, { status: 500 });
  }
}

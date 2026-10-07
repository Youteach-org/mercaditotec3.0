import { NextResponse } from "next/server";

import { ApiAuthError, requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireFirebaseUser(request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("ACCOUNT_ACCESS_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo validar el acceso a Mercadito." },
      { status: 401 },
    );
  }
}

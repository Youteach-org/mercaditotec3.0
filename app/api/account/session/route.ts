import { NextResponse } from "next/server";

import { ApiAuthError, requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";

// Firebase Authentication confirms the password, not Mercadito eligibility.
// This endpoint checks the currently signed token, the persisted profile and
// the five-year student rule on the server. No cached or client-supplied role.
export async function GET(request: Request) {
  try {
    await requireFirebaseUser(request);
    return NextResponse.json(
      { eligible: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { eligible: false, error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("ACCOUNT_ACCESS_CHECK_ERROR", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { eligible: false, error: "No fue posible verificar el acceso a Mercadito." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

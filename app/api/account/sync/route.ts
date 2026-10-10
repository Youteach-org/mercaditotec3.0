import { NextResponse } from "next/server";

import { getAdminAuth } from "@/lib/firebaseAdmin";
import { FirestoreRestError } from "@/lib/firestoreRest";
import { AccountProfileError, syncVerifiedAccountProfile } from "@/lib/security/accountProfile";

export const runtime = "nodejs";

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new AccountProfileError(401, "Debes iniciar sesión.");
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new AccountProfileError(401, "Debes iniciar sesión.");
  return token;
}

export async function POST(request: Request) {
  try {
    const claims = await getAdminAuth().verifyIdToken(bearerToken(request), true);
    await syncVerifiedAccountProfile(claims);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && (
      error.name === "FirebaseAuthUnavailableError" ||
      error.name === "GoogleOAuthUnavailableError"
    )) {
      console.error("ACCOUNT_SYNC_AUTH_PROVIDER_UNAVAILABLE");
      return NextResponse.json(
        { error: "Firebase está temporalmente saturado.", retryable: true },
        { status: 503, headers: { "Retry-After": "30", "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof FirestoreRestError && (error.status === 429 || error.status >= 500)) {
      // A backend quota/outage is not an invalid Firebase session.
      console.error("ACCOUNT_SYNC_DATA_UNAVAILABLE", error.status);
      return NextResponse.json(
        { error: "El servicio de datos está temporalmente saturado.", retryable: true },
        { status: 503, headers: { "Retry-After": "60" } },
      );
    }
    console.error("ACCOUNT_SYNC_ERROR", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "No se pudo validar tu cuenta." }, { status: 401 });
  }
}

import { NextResponse } from "next/server";

import { getAdminAuth } from "@/lib/firebaseAdmin";
import { AccountProfileError, bootstrapAccountProfile } from "@/lib/security/accountProfile";

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
    await bootstrapAccountProfile(claims);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("ACCOUNT_BOOTSTRAP_ERROR", error);
    return NextResponse.json({ error: "No se pudo preparar la cuenta." }, { status: 401 });
  }
}

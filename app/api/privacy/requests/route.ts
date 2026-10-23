import { NextResponse } from "next/server";
import { requirePrivacyIdentity, privacyApiFailure } from "@/lib/privacy/auth";
import { parseArcoSubmission, ArcoValidationError } from "@/lib/privacy/arco";
import { createArcoRequest, listOwnArcoRequests } from "@/lib/privacy/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { uid, email, profile } = await requirePrivacyIdentity(request);
    const requests = await listOwnArcoRequests(uid);
    // Only user-entered account data. NEVER leak roles, audit fields,
    // password hashes, Firebase service credentials or third-party messages.
    const account = {
      email,
      nickname: typeof profile.nickname === "string" ? profile.nickname : "",
      whatsappNumber: typeof profile.whatsappNumber === "string" ? profile.whatsappNumber : "",
      photoURL: typeof profile.photoURL === "string" ? profile.photoURL : "",
    };
    return NextResponse.json({ account, requests }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const fail = privacyApiFailure(error);
    return NextResponse.json({ error: fail.message }, { status: fail.status, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requirePrivacyIdentity(request, true);
    const raw = await request.text();
    if (raw.length > 2200) return NextResponse.json({ error: "Solicitud demasiado larga." }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
    const { type, details } = parseArcoSubmission(body);
    const requestRecord = await createArcoRequest(identity.uid, identity.email, type, details);
    return NextResponse.json({ request: requestRecord }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ArcoValidationError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    const fail = privacyApiFailure(error);
    return NextResponse.json({ error: fail.message }, { status: fail.status, headers: { "Cache-Control": "no-store" } });
  }
}

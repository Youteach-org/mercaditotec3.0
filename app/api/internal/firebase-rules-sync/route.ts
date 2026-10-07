import { NextResponse } from "next/server";

import { syncProductionFirebaseRules } from "@/lib/security/firebaseRulesDeployment";

export const runtime = "nodejs";

const INTERNAL_HEADER = "x-mercadito-internal-runtime";
const INTERNAL_VALUE = "firebase-rules-sync-v1";

export async function POST(request: Request) {
  if (request.headers.get(INTERNAL_HEADER) !== INTERNAL_VALUE) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await syncProductionFirebaseRules();
    return NextResponse.json({ ok: true, ...result }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(
      "FIREBASE_RULES_SYNC_ERROR",
      error instanceof Error ? error.message : "UnknownError",
    );
    return NextResponse.json(
      { ok: false, error: "No se pudieron sincronizar las reglas de Firebase." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

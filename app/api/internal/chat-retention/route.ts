import { NextResponse } from "next/server";
import { pruneExpiredGeneralChatMessages } from "@/lib/moderation/repository";

export const runtime = "nodejs";

/** Invoked exclusively by the daily Cloudflare Worker scheduled handler. */
export async function POST(request: Request) {
  if (request.headers.get("x-mercadito-internal-runtime") !== "chat-retention-cron-v1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const cleanup = await pruneExpiredGeneralChatMessages();
    console.info("GENERAL_CHAT_DAILY_RETENTION", cleanup);
    return NextResponse.json(
      { ok: true, ...cleanup },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("GENERAL_CHAT_DAILY_RETENTION_FAILED", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json(
      { ok: false, error: "No se pudo completar la depuración del chat." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

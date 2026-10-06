import { NextResponse } from "next/server";

import {
  DirectChatError,
  markDirectConversationRead,
} from "@/lib/chat/directRepository";
import {
  ApiAuthError,
  requireUnblockedUser,
} from "@/lib/store/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await requireUnblockedUser(request);
    const body = await request.json().catch(() => ({}));
    const targetUid = String((body as Record<string, unknown>).targetUid ?? "");
    const result = await markDirectConversationRead(actor.uid, targetUid);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof DirectChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected private chat read-state error:", error);
    return NextResponse.json(
      { error: "No se pudo marcar la conversación como leída." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import {
  DirectChatError,
  getOrCreateDirectChat,
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
    const session = await getOrCreateDirectChat(actor.uid, targetUid);
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof DirectChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected direct chat session error:", error);
    return NextResponse.json(
      { error: "No se pudo abrir el chat privado." },
      { status: 500 },
    );
  }
}

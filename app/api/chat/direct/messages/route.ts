import { NextResponse } from "next/server";

import {
  createDirectChatMessage,
  DirectChatError,
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
    const message = await createDirectChatMessage(actor.uid, targetUid, body);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof DirectChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected direct chat message error:", error);
    return NextResponse.json(
      { error: "No se pudo enviar el mensaje privado." },
      { status: 500 },
    );
  }
}

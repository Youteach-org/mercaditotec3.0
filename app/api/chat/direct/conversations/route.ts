import { NextResponse } from "next/server";

import {
  DirectChatError,
  listDirectConversations,
} from "@/lib/chat/directRepository";
import {
  ApiAuthError,
  requireUnblockedUser,
} from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireUnblockedUser(request);
    const conversations = await listDirectConversations(actor.uid);
    return NextResponse.json(
      { conversations },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof DirectChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected private conversation list error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar tus conversaciones." },
      { status: 500 },
    );
  }
}

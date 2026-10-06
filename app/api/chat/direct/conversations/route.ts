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
    const totalUnread = conversations.reduce(
      (sum, conversation) => sum + conversation.unreadCount,
      0,
    );
    return NextResponse.json(
      { conversations, totalUnread },
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

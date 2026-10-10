import { NextResponse } from "next/server";
import { createNotificationSafely } from "@/lib/notifications/repository";

import {
  createDirectChatMessage,
  DirectChatError,
  listDirectMessages,
} from "@/lib/chat/directRepository";
import {
  ApiAuthError,
  requireUnblockedUser,
} from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireUnblockedUser(request);
    const targetUid = new URL(request.url).searchParams.get("targetUid") ?? "";
    const result = await listDirectMessages(actor.uid, targetUid);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof DirectChatError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Unexpected direct chat history error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la conversación privada." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireUnblockedUser(request);
    const body = await request.json().catch(() => ({}));
    const targetUid = String((body as Record<string, unknown>).targetUid ?? "");
    const message = await createDirectChatMessage(actor.uid, targetUid, body);
    await createNotificationSafely({
      recipientUid: message.recipientId,
      type: "direct_message",
      title: "Nuevo mensaje privado",
      message: "Alguien intentó contactarte por el chat de MercaditoTec.",
      href: `/chat/personal/${actor.uid}`,
      dedupeKey: `chat:${message.id}:received`,
    });
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

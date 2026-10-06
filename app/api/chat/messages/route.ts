import { NextResponse } from "next/server";

import { moderationApiError, serializePublicMessage } from "@/lib/moderation/http";
import {
  createGeneralChatMessage,
  pruneExpiredGeneralChatMessages,
} from "@/lib/moderation/repository";
import {
  requireFirebaseUser,
  requireUnblockedUser,
} from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireFirebaseUser(request);
    const cleanup = await pruneExpiredGeneralChatMessages();
    return NextResponse.json({ cleanup });
  } catch (error) {
    const apiError = moderationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene datos válidos." },
        { status: 400 },
      );
    }
    const message = await createGeneralChatMessage(user.uid, body);
    return NextResponse.json(
      { message: serializePublicMessage(message as unknown as Record<string, unknown> & { id: string }) },
      { status: 201 },
    );
  } catch (error) {
    const apiError = moderationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

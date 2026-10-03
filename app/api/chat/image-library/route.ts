import { NextResponse } from "next/server";

import {
  findSharedChatImage,
  listSharedChatImages,
  saveSharedChatImage,
} from "@/lib/chat/imageLibraryRepository";
import { ApiAuthError, requireFirebaseUser, requireUnblockedUser } from "@/lib/store/auth";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "No se pudo procesar la solicitud." },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  try {
    await requireFirebaseUser(request);
    const url = new URL(request.url);
    const sha256 = url.searchParams.get("sha256");

    if (sha256) {
      const image = await findSharedChatImage(sha256);
      return NextResponse.json({ image });
    }

    const images = await listSharedChatImages(250);
    return NextResponse.json({ images });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    const body = await request.json();
    const image = await saveSharedChatImage(user.uid, body);
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

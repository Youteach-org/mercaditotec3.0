import { NextResponse } from "next/server";

import {
  AccountProfileError,
  isNicknameAvailable,
} from "@/lib/security/accountProfile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const nickname = String((body as Record<string, unknown>).nickname ?? "");
    const available = await isNicknameAvailable(nickname);
    return NextResponse.json({ available });
  } catch (error) {
    if (error instanceof AccountProfileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("NICKNAME_AVAILABILITY_ERROR", error);
    return NextResponse.json(
      { error: "No se pudo comprobar el nickname." },
      { status: 500 },
    );
  }
}

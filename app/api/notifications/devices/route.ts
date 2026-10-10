import { NextResponse } from "next/server";
import { ApiAuthError, requireFirebaseUser } from "@/lib/store/auth";
import {
  PushDeviceError, registerPushDevice, unregisterPushDevice,
} from "@/lib/notifications/push";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof ApiAuthError || error instanceof PushDeviceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("PUSH_DEVICE_ERROR", error instanceof Error ? error.name : "Unknown");
  return NextResponse.json({ error: "No se pudieron configurar las notificaciones." }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    await requireFirebaseUser(request);
    return NextResponse.json(
      { vapidPublicKey: process.env.FIREBASE_WEB_PUSH_PUBLIC_KEY ?? "" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const data = await request.json() as { token?: unknown };
    await registerPushDevice(user.uid, data?.token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const data = await request.json() as { token?: unknown };
    await unregisterPushDevice(user.uid, data?.token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

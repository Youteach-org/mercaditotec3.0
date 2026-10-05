import { NextResponse } from "next/server";
import { requireUnblockedUser, ApiAuthError } from "@/lib/store/auth";
import { savePersonalImage } from "@/lib/chat/personalActions";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    const text = await request.text();
    if (text.length > 4096) throw new ApiAuthError(413, "Solicitud demasiado grande.");
    let input: unknown;
    try { input = JSON.parse(text); } catch { throw new ApiAuthError(400, "Solicitud inválida."); }
    await savePersonalImage(user.uid, input);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("CHAT_ACTION_ERROR", error);
    return NextResponse.json({ error: "No se pudo guardar el cambio." }, { status: 500 });
  }
}

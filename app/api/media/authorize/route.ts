import { NextResponse } from "next/server";
import { requireUnblockedUser, ApiAuthError } from "@/lib/store/auth";
import { authorizeImageUpload } from "@/lib/security/mediaAuthorization";
import { StoreRepositoryError } from "@/lib/store/repository";
import { ProductRepositoryError } from "@/lib/store/productRepository";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    const text = await request.text();
    if (text.length > 4096) throw new ApiAuthError(413, "Solicitud demasiado grande.");
    let input;
    try { input = JSON.parse(text); } catch { throw new ApiAuthError(400, "Solicitud inválida."); }
    if (!input || typeof input.path !== "string") throw new ApiAuthError(400, "Ruta de imagen inválida.");
    await authorizeImageUpload(user.uid, input.path);
    return NextResponse.json({ uid: user.uid, path: input.path }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError || error instanceof StoreRepositoryError || error instanceof ProductRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("MEDIA_AUTHORIZATION_ERROR", error);
    return NextResponse.json({ error: "No se pudo autorizar la imagen." }, { status: 400 });
  }
}

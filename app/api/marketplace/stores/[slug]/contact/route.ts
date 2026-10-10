import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firestoreRest";
import { createNotificationSafely } from "@/lib/notifications/repository";
import { requireUnblockedUser, ApiAuthError } from "@/lib/store/auth";

export const runtime = "nodejs";

/**
 * Tracks an authenticated click on the store's WhatsApp contact link.
 * A click is only an attempted contact, not proof a WhatsApp message was sent.
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/marketplace/stores/[slug]/contact">,
) {
  try {
    const actor = await requireUnblockedUser(request);
    const { slug } = await context.params;
    if (!slug || slug.length > 150) {
      return NextResponse.json({ error: "Tienda no válida." }, { status: 400 });
    }
    const result = await getAdminDb().collection("stores")
      .where("slug", "==", slug).limit(1).get();
    const store = result.docs[0];
    if (!store || store.data().status !== "active") {
      return NextResponse.json({ error: "Tienda no disponible." }, { status: 404 });
    }
    const ownerUid = String(store.data().ownerUid ?? "");
    if (ownerUid && ownerUid !== actor.uid) {
      // One notice per visitor/store/hour, even on repeat taps and retries.
      await createNotificationSafely({
        recipientUid: ownerUid,
        type: "contact_attempt",
        title: "Intentaron contactar tu tienda",
        message: "Alguien abrió el enlace de WhatsApp de tu tienda.",
        href: `/mystore/${store.id}`,
        dedupeKey: `contact:${store.id}:${actor.uid}:${Math.floor(Date.now() / 3_600_000)}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "No se pudo registrar el intento de contacto." }, { status: 503 });
  }
}

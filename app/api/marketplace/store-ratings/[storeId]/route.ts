import { NextResponse } from "next/server";

import { ApiAuthError, requireFirebaseUser, requireUnblockedUser } from "@/lib/store/auth";
import { getStoreRatingForUser, saveStoreRatingForUser } from "@/lib/store/storeRatingRepository";
import { parseStoreRatingValue, StoreRatingError } from "@/lib/store/storeRating";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ratingError(error: unknown): Response {
  if (error instanceof ApiAuthError || error instanceof StoreRatingError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  }
  console.error("STORE_RATING_ERROR", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json({ error: "No se pudo procesar la valoración." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/marketplace/store-ratings/[storeId]">,
) {
  try {
    const user = await requireFirebaseUser(request);
    const { storeId } = await context.params;
    const rating = await getStoreRatingForUser(storeId, user.uid);
    return NextResponse.json({ rating }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return ratingError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/marketplace/store-ratings/[storeId]">,
) {
  try {
    const user = await requireUnblockedUser(request);
    const { storeId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const value = parseStoreRatingValue(body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).value : null);
    const rating = await saveStoreRatingForUser(storeId, user.uid, value);
    return NextResponse.json({ rating }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return ratingError(error);
  }
}

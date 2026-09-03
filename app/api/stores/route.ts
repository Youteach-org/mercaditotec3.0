import { NextResponse } from "next/server";

import { requireFirebaseUser, requireUnblockedUser } from "@/lib/store/auth";
import {
  parseStoreEditableInput,
  serializeStore,
  toApiError,
} from "@/lib/store/http";
import {
  createEmptyStoreDraft,
  createStoreDraft,
  listStoresForOwner,
} from "@/lib/store/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const stores = await listStoresForOwner(user.uid);
    return NextResponse.json({ stores: stores.map(serializeStore) });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    let body: unknown = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const bootstrap = Boolean(
      body &&
        typeof body === "object" &&
        (body as Record<string, unknown>).bootstrap === true,
    );

    const store = bootstrap
      ? await createEmptyStoreDraft(user.uid)
      : await createStoreDraft(user.uid, parseStoreEditableInput(body));

    return NextResponse.json({ store: serializeStore(store) }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

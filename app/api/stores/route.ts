import { NextResponse } from "next/server";

import { requireFirebaseUser, requireUnblockedUser, type AuthenticatedUser } from "@/lib/store/auth";
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

// Reserved Plus account. The email is authenticated and verified by Firebase.
function isPlusUser(user: AuthenticatedUser): boolean {
  const email = (user.claims.email ?? "").trim().toLowerCase();
  return user.profile?.plan === "plus" || user.profile?.plan === "premium" ||
    (user.claims.email_verified === true && email === "l22121079@morelia.tecnm.mx" &&
      String(user.profile?.email ?? "").trim().toLowerCase() === email);
}

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
      ? await createEmptyStoreDraft(user.uid, isPlusUser(user))
      : await createStoreDraft(user.uid, parseStoreEditableInput(body), isPlusUser(user));

    return NextResponse.json({ store: serializeStore(store) }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

import { NextResponse } from "next/server";

import { parseAdminStoreStatusRequest } from "@/lib/store/admin";
import { requireAdmin } from "@/lib/store/auth";
import { serializeStore, toApiError } from "@/lib/store/http";
import {
  adminSetStoreStatus,
  getStoreForAdmin,
} from "@/lib/store/repository";
import { promoteSuggestedCategoriesForStore } from "@/lib/store/productRepository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ storeId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { storeId } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene datos válidos." },
        { status: 400 },
      );
    }

    let input;
    try {
      input = parseAdminStoreStatusRequest(body);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Acción administrativa inválida.",
        },
        { status: 400 },
      );
    }

    const current = await getStoreForAdmin(storeId);
    if (current.status === "pending_review" && input.status === "active") {
      await promoteSuggestedCategoriesForStore(storeId);
    }

    const store = await adminSetStoreStatus(storeId, input.status, input.message);
    return NextResponse.json({ store: serializeStore(store) });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

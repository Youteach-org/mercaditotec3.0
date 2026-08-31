import { NextResponse } from "next/server";

import { writeAuditEntry } from "@/lib/security/audit";
import { parseAdminStoreStatusRequest } from "@/lib/store/admin";
import {
  ApiAuthError,
  getAuthenticatedAdminRole,
  requireAdmin,
} from "@/lib/store/auth";
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

function auditAction(previousStatus: string, nextStatus: string) {
  if (previousStatus === "pending_review" && nextStatus === "active") return "store.approve";
  if (previousStatus === "pending_review" && nextStatus === "changes_required") return "store.changes_required";
  if (previousStatus === "active" && nextStatus === "suspended") return "store.suspend";
  if (previousStatus === "suspended" && nextStatus === "active") return "store.reactivate";
  return "store.status.update";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireAdmin(request);
    const actorRole = await getAuthenticatedAdminRole(actor);
    if (!actorRole) {
      throw new ApiAuthError(403, "No tienes permisos de administrador.");
    }

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
    await writeAuditEntry({
      actorUid: actor.uid,
      actorRole,
      action: auditAction(current.status, store.status),
      targetType: "store",
      targetId: storeId,
      metadata: {
        previousStatus: current.status,
        nextStatus: store.status,
        message: input.message ?? null,
        ownerUid: store.ownerUid,
      },
    });

    return NextResponse.json({ store: serializeStore(store) });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

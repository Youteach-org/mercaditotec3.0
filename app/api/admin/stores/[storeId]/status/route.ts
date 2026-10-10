import { NextResponse } from "next/server";
import { createNotificationSafely } from "@/lib/notifications/repository";

import { writeAuditEntry } from "@/lib/security/audit";
import { getStudentTrust, TrustRepositoryError } from "@/lib/security/trustRepository";
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
  StoreRepositoryError,
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
      try {
        const trust = await getStudentTrust(current.ownerUid);
        if (trust.status !== "verified") {
          throw new StoreRepositoryError(
            409,
            trust.status === "revoked"
              ? "No se puede aprobar la tienda porque la confirmación de alumno del propietario está revocada."
              : "No se puede aprobar la tienda porque el propietario todavía no está confirmado como alumno.",
          );
        }
      } catch (error) {
        if (error instanceof StoreRepositoryError) throw error;
        if (error instanceof TrustRepositoryError) {
          throw new StoreRepositoryError(error.status, error.message);
        }
        throw error;
      }

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

    const ownerNotice = {
      active: current.status === "suspended" ? "Tu tienda volvió a estar activa" : "Tu tienda fue aprobada",
      changes_required: "Tu tienda necesita correcciones",
      suspended: "Tu tienda fue suspendida",
      draft: "",
      pending_review: "",
    }[store.status];
    if (ownerNotice) {
      const type = store.status === "changes_required" ? "store_changes_required"
        : store.status === "suspended" ? "store_suspended"
        : current.status === "suspended" ? "store_reactivated"
        : "store_approved";
      await createNotificationSafely({
        recipientUid: store.ownerUid,
        type,
        title: ownerNotice,
        message: `Revisa el estado de ${store.name} y las indicaciones de administración.`,
        href: `/mystore/${store.id}`,
        dedupeKey: `store:${store.id}:status:${store.updatedAt.toMillis()}:${store.status}`,
      });
    }
    return NextResponse.json({ store: serializeStore(store) });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

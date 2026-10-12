import type { StoreStatus } from "./domain";

export interface AdminStoreStatusRequest {
  status:
    | "active"
    | "changes_required"
    | "suspended";

  message?: string;
  /** Explicit confirmation that the reviewer inspected the store. */
  reviewConfirmed?: boolean;
  /** Superadmin-only approval of the submitted store without requiring edits/products. */
  approveAsIs?: boolean;
}

const ALL_STORE_STATUSES: StoreStatus[] = [
  "draft",
  "pending_review",
  "changes_required",
  "active",
  "suspended",
];

export function parseStoreStatusFilter(
  value: string | null,
): StoreStatus | null {
  if (!value) {
    return null;
  }

  if (!ALL_STORE_STATUSES.includes(value as StoreStatus)) {
    throw new Error("Estado de tienda inválido.");
  }

  return value as StoreStatus;
}

export function parseAdminStoreStatusRequest(
  input: unknown,
): AdminStoreStatusRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Datos administrativos inválidos.");
  }

  const data = input as Record<string, unknown>;
  const status = String(data.status ?? "");

  if (
    status !== "active" &&
    status !== "changes_required" &&
    status !== "suspended"
  ) {
    throw new Error("Acción administrativa inválida.");
  }

  const message =
    typeof data.message === "string"
      ? data.message.trim()
      : "";

  if (data.approveAsIs !== undefined && typeof data.approveAsIs !== "boolean") {
    throw new Error("Aprobación especial inválida.");
  }
  if (data.reviewConfirmed !== undefined && typeof data.reviewConfirmed !== "boolean") {
    throw new Error("Confirmación de revisión inválida.");
  }
  if (data.approveAsIs === true && status !== "active") {
    throw new Error("La aprobación especial solo aplica a tiendas pendientes.");
  }

  return {
    status,
    message: message || undefined,
    ...(data.reviewConfirmed === true ? { reviewConfirmed: true } : {}),
    ...(data.approveAsIs === true ? { approveAsIs: true } : {}),
  };
}

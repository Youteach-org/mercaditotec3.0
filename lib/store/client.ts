import type { User } from "firebase/auth";

import type { StoreOperationalMode, StoreSchedule } from "./schedule";
import type { MarketplaceVariant, StoreStatus } from "./domain";

export interface StoreApiRecord {
  id: string;
  ownerUid: string;
  name: string;
  nameNormalized: string;
  slug: string | null;
  description: string;
  deliveryLocation?: string;
  status: StoreStatus;
  reviewMessage: string | null;
  suspensionReason: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  schedule: StoreSchedule;
  operationalMode: StoreOperationalMode;
  manualOpen: boolean | null;
  marketplaceLabel: string;
  marketplaceNote: string;
  marketplaceTags: string[];
  marketplaceVariant: MarketplaceVariant | null;
  createdAt: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  suspendedAt: string | null;
}

export function storeStatusLabel(status: StoreStatus): string {
  switch (status) {
    case "draft":
      return "Borrador";
    case "pending_review":
      return "Pendiente de revisión";
    case "changes_required":
      return "Requiere cambios";
    case "active":
      return "Activa";
    case "suspended":
      return "Suspendida";
  }
}

export function storeStatusClasses(status: StoreStatus): string {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "pending_review":
      return "bg-amber-100 text-amber-800";
    case "changes_required":
      return "bg-orange-100 text-orange-800";
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "suspended":
      return "bg-red-100 text-red-800";
  }
}

export function canOwnerSubmitStore(status: StoreStatus): boolean {
  return status === "draft" || status === "changes_required";
}

export function canOwnerEditStoreView(status: StoreStatus): boolean {
  return status !== "pending_review";
}

export function submitButtonLabel(status: StoreStatus): string {
  return status === "changes_required" ? "Guardar correcciones" : "Guardar";
}

export async function storeApiFetch(
  user: User,
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}

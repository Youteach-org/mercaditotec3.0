import type { StoreEditableInput } from "./domain";
import { validateStoreDraftInput } from "./domain";
import { ApiAuthError } from "./auth";
import { StoreRepositoryError, type StoreRecord } from "./repository";

export class StoreHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function parseStoreEditableInput(input: unknown): StoreEditableInput {
  try {
    return validateStoreDraftInput(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datos de tienda inválidos.";
    throw new StoreHttpError(400, message);
  }
}

function timestampToIso(value: StoreRecord["createdAt"] | null): string | null {
  return value ? value.toDate().toISOString() : null;
}

export function serializeStore(store: StoreRecord) {
  return {
    id: store.id,
    ownerUid: store.ownerUid,
    name: store.name,
    nameNormalized: store.nameNormalized,
    slug: store.slug,
    description: store.description,
    deliveryLocation: store.deliveryLocation,
    status: store.status,
    reviewMessage: store.reviewMessage,
    suspensionReason: store.suspensionReason,
    logoUrl: store.logoUrl,
    coverUrl: store.coverUrl,
    schedule: store.schedule,
    operationalMode: store.operationalMode,
    manualOpen: store.manualOpen,
    marketplaceLabel: store.marketplaceLabel,
    marketplaceNote: store.marketplaceNote,
    marketplaceTags: [...store.marketplaceTags],
    marketplaceVariant: store.marketplaceVariant,
    createdAt: timestampToIso(store.createdAt),
    updatedAt: timestampToIso(store.updatedAt),
    submittedAt: timestampToIso(store.submittedAt),
    approvedAt: timestampToIso(store.approvedAt),
    suspendedAt: timestampToIso(store.suspendedAt),
  };
}

export function toApiError(error: unknown): { status: number; message: string } {
  if (
    error instanceof ApiAuthError ||
    error instanceof StoreRepositoryError ||
    error instanceof StoreHttpError
  ) {
    return { status: error.status, message: error.message };
  }

  console.error("Unexpected store API error:", error);
  return { status: 500, message: "Ocurrió un error interno." };
}

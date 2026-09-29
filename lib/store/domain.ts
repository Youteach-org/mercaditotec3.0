export type StoreStatus =
  | "draft"
  | "pending_review"
  | "changes_required"
  | "active"
  | "suspended";

export const MARKETPLACE_VARIANTS = [
  "cloud-1",
  "cloud-2",
  "cloud-3",
  "cloud-4",
  "cloud-5",
  "cloud-6",
] as const;

export type MarketplaceVariant = (typeof MARKETPLACE_VARIANTS)[number];

export interface StoreEditableInput {
  name: string;
  description: string;
  deliveryLocation?: string;
  marketplaceLabel?: string;
  marketplaceNote?: string;
  marketplaceTags?: string[];
  marketplaceVariant?: MarketplaceVariant | null;
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeStoreName(name: string): string {
  return stripDiacritics(name)
    .toLocaleLowerCase("es-MX")
    .trim()
    .replace(/\s+/g, " ");
}

export function makeStoreSlug(name: string): string {
  return stripDiacritics(name)
    .toLocaleLowerCase("es-MX")
    .trim()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function validateStoreDraftInput(input: unknown): StoreEditableInput {
  if (!input || typeof input !== "object") {
    throw new Error("Datos de tienda inválidos.");
  }

  const raw = input as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const deliveryLocation =
    typeof raw.deliveryLocation === "string" ? raw.deliveryLocation.trim() : "";
  const marketplaceLabel =
    typeof raw.marketplaceLabel === "string" ? raw.marketplaceLabel.trim() : "";
  const marketplaceNote =
    typeof raw.marketplaceNote === "string" ? raw.marketplaceNote.trim() : "";
  const marketplaceTags = Array.isArray(raw.marketplaceTags)
    ? raw.marketplaceTags
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
        .filter((value, index, values) =>
          values.findIndex((candidate) => candidate.toLocaleLowerCase("es-MX") === value.toLocaleLowerCase("es-MX")) === index
        )
    : [];
  const marketplaceVariant =
    raw.marketplaceVariant === null || raw.marketplaceVariant === undefined || raw.marketplaceVariant === ""
      ? null
      : typeof raw.marketplaceVariant === "string"
        ? raw.marketplaceVariant
        : null;

  if (name.length < 3 || name.length > 60) {
    throw new Error("El nombre de la tienda debe tener entre 3 y 60 caracteres.");
  }

  if (description.length > 600) {
    throw new Error("La descripción de la tienda no puede exceder 600 caracteres.");
  }

  if (deliveryLocation.length > 240) {
    throw new Error("El lugar de entrega no puede exceder 240 caracteres.");
  }

  if (marketplaceLabel.length > 40) {
    throw new Error("El rótulo del collage no puede exceder 40 caracteres.");
  }

  if (marketplaceNote.length > 90) {
    throw new Error("La nota del collage no puede exceder 90 caracteres.");
  }

  if (marketplaceTags.length > 3) {
    throw new Error("Puedes mostrar como máximo 3 etiquetas en el collage.");
  }

  if (marketplaceTags.some((tag) => tag.length > 24)) {
    throw new Error("Cada etiqueta del collage no puede exceder 24 caracteres.");
  }

  if (
    marketplaceVariant &&
    !MARKETPLACE_VARIANTS.includes(marketplaceVariant as MarketplaceVariant)
  ) {
    throw new Error("La forma visual de la tienda no es válida.");
  }

  if (!makeStoreSlug(name)) {
    throw new Error("El nombre de la tienda no genera una URL válida.");
  }

  return {
    name,
    description,
    deliveryLocation,
    marketplaceLabel,
    marketplaceNote,
    marketplaceTags,
    marketplaceVariant: marketplaceVariant as MarketplaceVariant | null,
  };
}

export function canOwnerEditStore(status: StoreStatus): boolean {
  return status !== "pending_review";
}

const ADMIN_TRANSITIONS: Record<StoreStatus, StoreStatus[]> = {
  draft: [],
  pending_review: ["active", "changes_required"],
  changes_required: [],
  active: ["suspended"],
  suspended: ["active"],
};

export function assertAdminTransition(from: StoreStatus, to: StoreStatus): void {
  if (!ADMIN_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transición administrativa no permitida: ${from} → ${to}`);
  }
}

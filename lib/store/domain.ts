export type StoreStatus =
  | "draft"
  | "pending_review"
  | "changes_required"
  | "active"
  | "suspended";

export interface StoreEditableInput {
  name: string;
  description: string;
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

export function validateStoreDraftInput(
  input: unknown
): StoreEditableInput {
  if (!input || typeof input !== "object") {
    throw new Error("Datos de tienda inválidos.");
  }

  const raw = input as Record<string, unknown>;

  const name =
    typeof raw.name === "string"
      ? raw.name.trim()
      : "";

  const description =
    typeof raw.description === "string"
      ? raw.description.trim()
      : "";

  if (name.length < 3 || name.length > 60) {
    throw new Error(
      "El nombre de la tienda debe tener entre 3 y 60 caracteres."
    );
  }

  if (description.length > 600) {
    throw new Error(
      "La descripción de la tienda no puede exceder 600 caracteres."
    );
  }

  if (!makeStoreSlug(name)) {
    throw new Error(
      "El nombre de la tienda no genera una URL válida."
    );
  }

  return {
    name,
    description,
  };
}

export function canOwnerEditStore(
  status: StoreStatus
): boolean {
  return status !== "pending_review";
}

const ADMIN_TRANSITIONS: Record<
  StoreStatus,
  StoreStatus[]
> = {
  draft: [],
  pending_review: [
    "active",
    "changes_required",
  ],
  changes_required: [],
  active: ["suspended"],
  suspended: ["active"],
};

export function assertAdminTransition(
  from: StoreStatus,
  to: StoreStatus
): void {
  if (!ADMIN_TRANSITIONS[from].includes(to)) {
    throw new Error(
      `Transición administrativa no permitida: ${from} → ${to}`
    );
  }
}

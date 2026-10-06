import {
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Transaction,
} from "../firestoreRest";

import { getAdminDb } from "../firestoreRest";
import {
  assertAdminTransition,
  canOwnerEditStore,
  makeStoreSlug,
  normalizeStoreName,
  validateStoreDraftInput,
  type MarketplaceVariant,
  type StoreEditableInput,
  type StoreStatus,
} from "./domain";
import {
  createEmptyStoreSchedule,
  normalizeStoredSchedule,
  validateStoreOperationalSettings,
  type StoreOperationalMode,
  type StoreSchedule,
} from "./schedule";

export interface StoreRuleRecord {
  id: string;
  ownerUid: string;
  name: string;
  description: string;
  deliveryLocation?: string;
  status: StoreStatus;
  nameNormalized?: string;
  slug?: string | null;
  reviewMessage?: string | null;
  suspensionReason?: string | null;
}

export interface StoreBaseRecord {
  id: string;
  ownerUid: string;
  name: string;
  nameNormalized: string;
  slug: string | null;
  description: string;
  deliveryLocation: string;
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
}

export interface StoreRecord extends StoreBaseRecord {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt: Timestamp | null;
  approvedAt: Timestamp | null;
  suspendedAt: Timestamp | null;
}

export class StoreRepositoryError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function reservationKeyForName(normalizedName: string): string {
  return encodeURIComponent(normalizeStoreName(normalizedName));
}

export function buildCreateStoreMutation(
  ownerUid: string,
  input: StoreEditableInput,
  storeId: string,
) {
  const validated = validateStoreDraftInput(input);
  const nameNormalized = normalizeStoreName(validated.name);

  return {
    store: {
      id: storeId,
      ownerUid,
      name: validated.name,
      nameNormalized,
      slug: null,
      description: validated.description,
      deliveryLocation: validated.deliveryLocation ?? "",
      marketplaceLabel: validated.marketplaceLabel ?? "",
      marketplaceNote: validated.marketplaceNote ?? "",
      marketplaceTags: validated.marketplaceTags ?? [],
      marketplaceVariant: validated.marketplaceVariant ?? null,
      status: "draft" as const,
      reviewMessage: null,
      suspensionReason: null,
    },
  };
}

export function buildOwnerStoreUpdate(
  ownerUid: string,
  current: StoreRuleRecord,
  input: StoreEditableInput,
) {
  if (current.ownerUid !== ownerUid) {
    throw new StoreRepositoryError(403, "No tienes permiso para editar esta tienda.");
  }
  if (!canOwnerEditStore(current.status)) {
    throw new StoreRepositoryError(409, "La tienda está en revisión y no puede editarse.");
  }

  const validated = validateStoreDraftInput(input);
  return {
    name: validated.name,
    nameNormalized: normalizeStoreName(validated.name),
    description: validated.description,
    deliveryLocation: validated.deliveryLocation ?? "",
    marketplaceLabel: validated.marketplaceLabel ?? "",
    marketplaceNote: validated.marketplaceNote ?? "",
    marketplaceTags: validated.marketplaceTags ?? [],
    marketplaceVariant: validated.marketplaceVariant ?? null,
  };
}

export function buildSubmitMutation(ownerUid: string, current: StoreRuleRecord) {
  if (current.ownerUid !== ownerUid) {
    throw new StoreRepositoryError(403, "No tienes permiso para enviar esta tienda.");
  }
  if (current.status !== "draft" && current.status !== "changes_required") {
    throw new StoreRepositoryError(409, "Esta tienda no puede enviarse a revisión en su estado actual.");
  }

  return {
    status: "pending_review" as const,
    reviewMessage: null,
  };
}

export function buildAdminStatusMutation(
  current: StoreRuleRecord,
  target: StoreStatus,
  message?: string,
) {
  try {
    assertAdminTransition(current.status, target);
  } catch {
    throw new StoreRepositoryError(409, "Cambio de estado no permitido.");
  }

  if (target === "changes_required") {
    const cleanMessage = message?.trim() ?? "";
    if (!cleanMessage) {
      throw new StoreRepositoryError(400, "Debes indicar qué cambios necesita la tienda.");
    }
    return { status: "changes_required" as const, reviewMessage: cleanMessage };
  }

  if (target === "suspended") {
    const cleanMessage = message?.trim() ?? "";
    if (!cleanMessage) {
      throw new StoreRepositoryError(400, "Debes indicar el motivo de la suspensión.");
    }
    return { status: "suspended" as const, suspensionReason: cleanMessage };
  }

  if (current.status === "suspended" && target === "active") {
    return { status: "active" as const, suspensionReason: null };
  }

  return { status: target, reviewMessage: null };
}

function coerceTimestamp(value: unknown, fallback?: Timestamp): Timestamp {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return Timestamp.fromDate(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Timestamp.fromMillis(value);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return Timestamp.fromDate(parsed);
    }
  }
  return fallback ?? Timestamp.fromMillis(0);
}

function toStoreRecord(id: string, data: DocumentData): StoreRecord {
  return {
    id,
    ownerUid: String(data.ownerUid ?? ""),
    name: String(data.name ?? ""),
    nameNormalized: String(data.nameNormalized ?? ""),
    slug: typeof data.slug === "string" && data.slug.trim() ? data.slug : null,
    description: String(data.description ?? ""),
    deliveryLocation: String(data.deliveryLocation ?? ""),
    status: data.status as StoreStatus,
    reviewMessage: typeof data.reviewMessage === "string" ? data.reviewMessage : null,
    suspensionReason: typeof data.suspensionReason === "string" ? data.suspensionReason : null,
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
    coverUrl: typeof data.coverUrl === "string" ? data.coverUrl : null,
    schedule: normalizeStoredSchedule(data.schedule),
    operationalMode: data.operationalMode === "manual" ? "manual" : "automatic",
    manualOpen: typeof data.manualOpen === "boolean" ? data.manualOpen : null,
    marketplaceLabel: typeof data.marketplaceLabel === "string" ? data.marketplaceLabel : "",
    marketplaceNote: typeof data.marketplaceNote === "string" ? data.marketplaceNote : "",
    marketplaceTags: Array.isArray(data.marketplaceTags)
      ? data.marketplaceTags.filter((value): value is string => typeof value === "string")
      : [],
    marketplaceVariant:
      data.marketplaceVariant === "cloud-1" ||
      data.marketplaceVariant === "cloud-2" ||
      data.marketplaceVariant === "cloud-3" ||
      data.marketplaceVariant === "cloud-4" ||
      data.marketplaceVariant === "cloud-5" ||
      data.marketplaceVariant === "cloud-6"
        ? data.marketplaceVariant
        : null,
    createdAt: coerceTimestamp(data.createdAt),
    updatedAt: coerceTimestamp(data.updatedAt, coerceTimestamp(data.createdAt)),
    submittedAt: data.submittedAt == null ? null : coerceTimestamp(data.submittedAt),
    approvedAt: data.approvedAt == null ? null : coerceTimestamp(data.approvedAt),
    suspendedAt: data.suspendedAt == null ? null : coerceTimestamp(data.suspendedAt),
  };
}

async function findAvailableSlug(
  transaction: Transaction,
  baseSlug: string,
  currentStoreId?: string,
): Promise<string> {
  const db = getAdminDb();

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const candidate = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
    const reference = db.collection("store_slug_reservations").doc(candidate);
    const snapshot = await transaction.get(reference);

    if (!snapshot.exists) return candidate;

    const existingStoreId = String(snapshot.data()?.storeId ?? "");
    if (currentStoreId && existingStoreId === currentStoreId) return candidate;
  }

  throw new StoreRepositoryError(409, "No se pudo generar una URL única para la tienda.");
}

function makeNewStoreRecord(
  ownerUid: string,
  id: string,
  input?: StoreEditableInput,
): StoreRecord {
  const now = Timestamp.now();
  const base = input
    ? buildCreateStoreMutation(ownerUid, input, id).store
    : {
        id,
        ownerUid,
        name: "",
        nameNormalized: "",
        slug: null,
        description: "",
        deliveryLocation: "",
        marketplaceLabel: "",
        marketplaceNote: "",
        marketplaceTags: [],
        marketplaceVariant: null,
        status: "draft" as const,
        reviewMessage: null,
        suspensionReason: null,
      };

  return {
    ...base,
    logoUrl: null,
    coverUrl: null,
    schedule: createEmptyStoreSchedule(),
    operationalMode: "automatic",
    manualOpen: null,
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    approvedAt: null,
    suspendedAt: null,
  };
}

export async function createStoreDraft(
  ownerUid: string,
  input: StoreEditableInput,
): Promise<StoreRecord> {
  const db = getAdminDb();
  const reference = db.collection("stores").doc();
  const store = makeNewStoreRecord(ownerUid, reference.id, input);
  await reference.set(store);
  return store;
}

export async function createEmptyStoreDraft(ownerUid: string): Promise<StoreRecord> {
  const db = getAdminDb();
  const reference = db.collection("stores").doc();
  const store = makeNewStoreRecord(ownerUid, reference.id);
  await reference.set(store);
  return store;
}

export async function listStoresForOwner(ownerUid: string): Promise<StoreRecord[]> {
  const snapshot = await getAdminDb()
    .collection("stores")
    .where("ownerUid", "==", ownerUid)
    .get();

  return snapshot.docs
    .map((document) => toStoreRecord(document.id, document.data()))
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
}

export async function getStoreForOwner(
  ownerUid: string,
  storeId: string,
): Promise<StoreRecord> {
  const snapshot = await getAdminDb().collection("stores").doc(storeId).get();
  if (!snapshot.exists) throw new StoreRepositoryError(404, "Tienda no encontrada.");

  const store = toStoreRecord(snapshot.id, snapshot.data()!);
  if (store.ownerUid !== ownerUid) {
    throw new StoreRepositoryError(404, "Tienda no encontrada.");
  }
  return store;
}

export async function updateStoreByOwner(
  ownerUid: string,
  storeId: string,
  input: StoreEditableInput,
): Promise<StoreRecord> {
  const db = getAdminDb();
  const reference = db.collection("stores").doc(storeId);
  let result: StoreRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new StoreRepositoryError(404, "Tienda no encontrada.");

    const current = toStoreRecord(snapshot.id, snapshot.data()!);
    const update = buildOwnerStoreUpdate(ownerUid, current, input);
    const now = Timestamp.now();

    transaction.update(reference, {
      name: update.name,
      nameNormalized: update.nameNormalized,
      description: update.description,
      deliveryLocation: update.deliveryLocation,
      marketplaceLabel: update.marketplaceLabel,
      marketplaceNote: update.marketplaceNote,
      marketplaceTags: update.marketplaceTags,
      marketplaceVariant: update.marketplaceVariant,
      updatedAt: now,
    });

    result = { ...current, ...update, updatedAt: now };
  });

  if (!result) throw new StoreRepositoryError(500, "No se pudo actualizar la tienda.");
  return result;
}

export async function submitStore(
  ownerUid: string,
  storeId: string,
): Promise<StoreRecord> {
  const db = getAdminDb();
  const reference = db.collection("stores").doc(storeId);
  let result: StoreRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new StoreRepositoryError(404, "Tienda no encontrada.");

    const current = toStoreRecord(snapshot.id, snapshot.data()!);
    const mutation = buildSubmitMutation(ownerUid, current);
    const normalizedName = normalizeStoreName(current.name);
    const nameReference = db.collection("store_name_reservations").doc(
      reservationKeyForName(normalizedName),
    );
    const nameSnapshot = await transaction.get(nameReference);

    if (
      nameSnapshot.exists &&
      String(nameSnapshot.data()?.storeId ?? "") !== storeId
    ) {
      throw new StoreRepositoryError(409, "Ese nombre de tienda ya está en uso.");
    }

    const now = Timestamp.now();
    transaction.set(nameReference, {
      storeId,
      ownerUid,
      name: current.name,
      createdAt: now,
    });
    transaction.update(reference, {
      ...mutation,
      slug: null,
      submittedAt: now,
      updatedAt: now,
    });

    result = {
      ...current,
      ...mutation,
      slug: null,
      submittedAt: now,
      updatedAt: now,
    };
  });

  if (!result) throw new StoreRepositoryError(500, "No se pudo enviar la tienda a revisión.");
  return result;
}

export async function adminSetStoreStatus(
  storeId: string,
  target: StoreStatus,
  message?: string,
): Promise<StoreRecord> {
  const db = getAdminDb();
  const reference = db.collection("stores").doc(storeId);
  let result: StoreRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new StoreRepositoryError(404, "Tienda no encontrada.");

    const current = toStoreRecord(snapshot.id, snapshot.data()!);
    const mutation = buildAdminStatusMutation(current, target, message);
    const now = Timestamp.now();

    let nextSlug = current.slug;
    let slugReference: DocumentReference | null = null;
    let nameReference: DocumentReference | null = null;

    if (current.status === "pending_review" && target === "active") {
      const slugBase = makeStoreSlug(current.name);
      if (!slugBase) throw new StoreRepositoryError(409, "El nombre no permite generar una URL pública.");

      nextSlug = await findAvailableSlug(transaction, slugBase, storeId);
      slugReference = db.collection("store_slug_reservations").doc(nextSlug);
      nameReference = db.collection("store_name_reservations").doc(
        reservationKeyForName(current.nameNormalized),
      );
      await transaction.get(nameReference);
    }

    if (current.status === "pending_review" && target === "changes_required" && current.nameNormalized) {
      nameReference = db.collection("store_name_reservations").doc(
        reservationKeyForName(current.nameNormalized),
      );
      await transaction.get(nameReference);
    }

    const extra: {
      approvedAt?: Timestamp;
      suspendedAt?: Timestamp;
      slug?: string | null;
    } = {};

    if (current.status === "pending_review" && target === "active") {
      extra.approvedAt = now;
      extra.slug = nextSlug;
      transaction.set(slugReference!, {
        storeId,
        ownerUid: current.ownerUid,
        slug: nextSlug,
        createdAt: now,
      });
      transaction.set(nameReference!, {
        storeId,
        ownerUid: current.ownerUid,
        name: current.name,
        createdAt: now,
      });
    }

    if (current.status === "pending_review" && target === "changes_required" && nameReference) {
      transaction.delete(nameReference);
    }

    if (current.status === "active" && target === "suspended") {
      extra.suspendedAt = now;
    }

    transaction.update(reference, { ...mutation, ...extra, updatedAt: now });
    result = { ...current, ...mutation, ...extra, updatedAt: now };
  });

  if (!result) throw new StoreRepositoryError(500, "No se pudo cambiar el estado de la tienda.");
  return result;
}

export async function listStoresForAdmin(status?: StoreStatus | null): Promise<StoreRecord[]> {
  const collection = getAdminDb().collection("stores");
  const snapshot = status
    ? await collection.where("status", "==", status).limit(100).get()
    : await collection.limit(100).get();

  return snapshot.docs
    .map((document) => toStoreRecord(document.id, document.data()))
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
}

export async function getStoreForAdmin(storeId: string): Promise<StoreRecord> {
  const snapshot = await getAdminDb().collection("stores").doc(storeId).get();
  if (!snapshot.exists) throw new StoreRepositoryError(404, "Tienda no encontrada.");
  return toStoreRecord(snapshot.id, snapshot.data()!);
}

export async function updateStoreOperationalSettingsByOwner(
  ownerUid: string,
  storeId: string,
  input: unknown,
): Promise<StoreRecord> {
  const store = await getStoreForOwner(ownerUid, storeId);
  if (!canOwnerEditStore(store.status)) {
    throw new StoreRepositoryError(409, "La tienda está en revisión y no puede editarse.");
  }

  const settings = validateStoreOperationalSettings(input);
  const now = Timestamp.now();

  await getAdminDb().collection("stores").doc(storeId).update({
    schedule: settings.schedule,
    operationalMode: settings.operationalMode,
    manualOpen: settings.manualOpen,
    updatedAt: now,
  });

  return { ...store, ...settings, updatedAt: now };
}

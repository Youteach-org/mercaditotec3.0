import {
  Timestamp,
  type DocumentData,
  type Transaction,
} from "firebase-admin/firestore";

import { getAdminDb } from "../firebaseAdmin";

import {
  assertAdminTransition,
  canOwnerEditStore,
  makeStoreSlug,
  normalizeStoreName,
  validateStoreDraftInput,
  type StoreEditableInput,
  type StoreStatus,
} from "./domain";

export interface StoreRuleRecord {
  id: string;
  ownerUid: string;
  name: string;
  description: string;
  status: StoreStatus;
  nameNormalized?: string;
  slug?: string;
  reviewMessage?: string | null;
  suspensionReason?: string | null;
}

export interface StoreBaseRecord {
  id: string;
  ownerUid: string;

  name: string;
  nameNormalized: string;
  slug: string;
  description: string;

  status: StoreStatus;

  reviewMessage: string | null;
  suspensionReason: string | null;
}

export interface StoreRecord
  extends StoreBaseRecord {
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

export function reservationKeyForName(
  normalizedName: string,
): string {
  return encodeURIComponent(
    normalizeStoreName(normalizedName),
  );
}

export function buildCreateStoreMutation(
  ownerUid: string,
  input: StoreEditableInput,
  storeId: string,
) {
  const validated =
    validateStoreDraftInput(input);

  const nameNormalized =
    normalizeStoreName(validated.name);

  const slug =
    makeStoreSlug(validated.name);

  return {
    store: {
      id: storeId,
      ownerUid,
      name: validated.name,
      nameNormalized,
      slug,
      description: validated.description,
      status: "draft" as const,
      reviewMessage: null,
      suspensionReason: null,
    },
    nameReservationKey:
      reservationKeyForName(
        nameNormalized,
      ),
    slugBase: slug,
  };
}

export function buildOwnerStoreUpdate(
  ownerUid: string,
  current: StoreRuleRecord,
  input: StoreEditableInput,
) {
  if (current.ownerUid !== ownerUid) {
    throw new StoreRepositoryError(
      403,
      "No tienes permiso para editar esta tienda.",
    );
  }

  if (!canOwnerEditStore(current.status)) {
    throw new StoreRepositoryError(
      409,
      "La tienda está en revisión y no puede editarse.",
    );
  }

  const validated =
    validateStoreDraftInput(input);

  return {
    name: validated.name,
    nameNormalized:
      normalizeStoreName(validated.name),
    slugBase:
      makeStoreSlug(validated.name),
    description:
      validated.description,
  };
}

export function buildSubmitMutation(
  ownerUid: string,
  current: StoreRuleRecord,
) {
  if (current.ownerUid !== ownerUid) {
    throw new StoreRepositoryError(
      403,
      "No tienes permiso para enviar esta tienda.",
    );
  }

  if (
    current.status !== "draft" &&
    current.status !==
      "changes_required"
  ) {
    throw new StoreRepositoryError(
      409,
      "Esta tienda no puede enviarse a revisión en su estado actual.",
    );
  }

  return {
    status:
      "pending_review" as const,
    reviewMessage: null,
  };
}

export function buildAdminStatusMutation(
  current: StoreRuleRecord,
  target: StoreStatus,
  message?: string,
) {
  assertAdminTransition(
    current.status,
    target,
  );

  if (
    target === "changes_required"
  ) {
    const cleanMessage =
      message?.trim() ?? "";

    if (!cleanMessage) {
      throw new StoreRepositoryError(
        400,
        "Debes indicar qué cambios necesita la tienda.",
      );
    }

    return {
      status:
        "changes_required" as const,
      reviewMessage: cleanMessage,
    };
  }

  if (target === "suspended") {
    const cleanMessage =
      message?.trim() ?? "";

    if (!cleanMessage) {
      throw new StoreRepositoryError(
        400,
        "Debes indicar el motivo de la suspensión.",
      );
    }

    return {
      status: "suspended" as const,
      suspensionReason: cleanMessage,
    };
  }

  if (
    current.status === "suspended" &&
    target === "active"
  ) {
    return {
      status: "active" as const,
      suspensionReason: null,
    };
  }

  return {
    status: target,
    reviewMessage: null,
  };
}

function toStoreRecord(
  id: string,
  data: DocumentData,
): StoreRecord {
  return {
    id,

    ownerUid:
      String(data.ownerUid ?? ""),

    name:
      String(data.name ?? ""),

    nameNormalized:
      String(
        data.nameNormalized ?? "",
      ),

    slug:
      String(data.slug ?? ""),

    description:
      String(
        data.description ?? "",
      ),

    status:
      data.status as StoreStatus,

    reviewMessage:
      typeof data.reviewMessage ===
      "string"
        ? data.reviewMessage
        : null,

    suspensionReason:
      typeof data.suspensionReason ===
      "string"
        ? data.suspensionReason
        : null,

    createdAt:
      data.createdAt as Timestamp,

    updatedAt:
      data.updatedAt as Timestamp,

    submittedAt:
      data.submittedAt instanceof
      Timestamp
        ? data.submittedAt
        : null,

    approvedAt:
      data.approvedAt instanceof
      Timestamp
        ? data.approvedAt
        : null,

    suspendedAt:
      data.suspendedAt instanceof
      Timestamp
        ? data.suspendedAt
        : null,
  };
}

async function findAvailableSlug(
  transaction: Transaction,
  baseSlug: string,
  currentStoreId?: string,
): Promise<string> {
  const db = getAdminDb();

  for (
    let attempt = 1;
    attempt <= 100;
    attempt += 1
  ) {
    const candidate =
      attempt === 1
        ? baseSlug
        : `${baseSlug}-${attempt}`;

    const reference =
      db.collection(
        "store_slug_reservations",
      ).doc(candidate);

    const snapshot =
      await transaction.get(
        reference,
      );

    if (!snapshot.exists) {
      return candidate;
    }

    const existingStoreId =
      String(
        snapshot.data()?.storeId ??
          "",
      );

    if (
      currentStoreId &&
      existingStoreId ===
        currentStoreId
    ) {
      return candidate;
    }
  }

  throw new StoreRepositoryError(
    409,
    "No se pudo generar una URL única para la tienda.",
  );
}

export async function createStoreDraft(
  ownerUid: string,
  input: StoreEditableInput,
): Promise<StoreRecord> {
  const db = getAdminDb();

  const storeReference =
    db.collection("stores").doc();

  const mutation =
    buildCreateStoreMutation(
      ownerUid,
      input,
      storeReference.id,
    );

  let created:
    | StoreRecord
    | null = null;

  await db.runTransaction(
    async (transaction) => {
      const nameReference =
        db.collection(
          "store_name_reservations",
        ).doc(
          mutation
            .nameReservationKey,
        );

      const nameSnapshot =
        await transaction.get(
          nameReference,
        );

      if (nameSnapshot.exists) {
        throw new StoreRepositoryError(
          409,
          "Ese nombre de tienda ya está en uso.",
        );
      }

      const slug =
        await findAvailableSlug(
          transaction,
          mutation.slugBase,
        );

      const slugReference =
        db.collection(
          "store_slug_reservations",
        ).doc(slug);

      const now = Timestamp.now();

      const store: StoreRecord = {
        ...mutation.store,
        slug,

        createdAt: now,
        updatedAt: now,

        submittedAt: null,
        approvedAt: null,
        suspendedAt: null,
      };

      transaction.set(
        storeReference,
        store,
      );

      transaction.set(
        nameReference,
        {
          storeId:
            storeReference.id,
          ownerUid,
          name: store.name,
          createdAt: now,
        },
      );

      transaction.set(
        slugReference,
        {
          storeId:
            storeReference.id,
          ownerUid,
          slug,
          createdAt: now,
        },
      );

      created = store;
    },
  );

  if (!created) {
    throw new StoreRepositoryError(
      500,
      "No se pudo crear la tienda.",
    );
  }

  return created;
}

export async function listStoresForOwner(
  ownerUid: string,
): Promise<StoreRecord[]> {
  const snapshot =
    await getAdminDb()
      .collection("stores")
      .where(
        "ownerUid",
        "==",
        ownerUid,
      )
      .get();

  return snapshot.docs
    .map((document) =>
      toStoreRecord(
        document.id,
        document.data(),
      ),
    )
    .sort(
      (a, b) =>
        b.updatedAt.toMillis() -
        a.updatedAt.toMillis(),
    );
}

export async function getStoreForOwner(
  ownerUid: string,
  storeId: string,
): Promise<StoreRecord> {
  const snapshot =
    await getAdminDb()
      .collection("stores")
      .doc(storeId)
      .get();

  if (!snapshot.exists) {
    throw new StoreRepositoryError(
      404,
      "Tienda no encontrada.",
    );
  }

  const store =
    toStoreRecord(
      snapshot.id,
      snapshot.data()!,
    );

  if (
    store.ownerUid !== ownerUid
  ) {
    throw new StoreRepositoryError(
      404,
      "Tienda no encontrada.",
    );
  }

  return store;
}

export async function updateStoreByOwner(
  ownerUid: string,
  storeId: string,
  input: StoreEditableInput,
): Promise<StoreRecord> {
  const db = getAdminDb();

  const storeReference =
    db.collection("stores").doc(
      storeId,
    );

  let result:
    | StoreRecord
    | null = null;

  await db.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          storeReference,
        );

      if (!snapshot.exists) {
        throw new StoreRepositoryError(
          404,
          "Tienda no encontrada.",
        );
      }

      const current =
        toStoreRecord(
          snapshot.id,
          snapshot.data()!,
        );

      const update =
        buildOwnerStoreUpdate(
          ownerUid,
          current,
          input,
        );

      let nextSlug =
        current.slug;

      const nameChanged =
        update.nameNormalized !==
        current.nameNormalized;

      let nextNameReference = null;
      let nextSlugReference = null;

      if (nameChanged) {
        nextNameReference =
          db.collection(
            "store_name_reservations",
          ).doc(
            reservationKeyForName(
              update.nameNormalized,
            ),
          );

        const nextNameSnapshot =
          await transaction.get(
            nextNameReference,
          );

        if (
          nextNameSnapshot.exists &&
          String(
            nextNameSnapshot.data()
              ?.storeId ?? "",
          ) !== storeId
        ) {
          throw new StoreRepositoryError(
            409,
            "Ese nombre de tienda ya está en uso.",
          );
        }

        nextSlug =
          await findAvailableSlug(
            transaction,
            update.slugBase,
            storeId,
          );

        nextSlugReference =
          db.collection(
            "store_slug_reservations",
          ).doc(nextSlug);
      }

      const now = Timestamp.now();

      const nextStore: StoreRecord = {
        ...current,

        name: update.name,
        nameNormalized:
          update.nameNormalized,
        slug: nextSlug,
        description:
          update.description,

        updatedAt: now,
      };

      transaction.update(
        storeReference,
        {
          name: nextStore.name,
          nameNormalized:
            nextStore.nameNormalized,
          slug: nextStore.slug,
          description:
            nextStore.description,
          updatedAt: now,
        },
      );

      if (
        nameChanged &&
        nextNameReference &&
        nextSlugReference
      ) {
        transaction.set(
          nextNameReference,
          {
            storeId,
            ownerUid,
            name: nextStore.name,
            createdAt: now,
          },
        );

        transaction.set(
          nextSlugReference,
          {
            storeId,
            ownerUid,
            slug: nextStore.slug,
            createdAt: now,
          },
        );

        const oldNameReference =
          db.collection(
            "store_name_reservations",
          ).doc(
            reservationKeyForName(
              current.nameNormalized,
            ),
          );

        const oldSlugReference =
          db.collection(
            "store_slug_reservations",
          ).doc(current.slug);

        if (
          oldNameReference.path !==
          nextNameReference.path
        ) {
          transaction.delete(
            oldNameReference,
          );
        }

        if (
          oldSlugReference.path !==
          nextSlugReference.path
        ) {
          transaction.delete(
            oldSlugReference,
          );
        }
      }

      result = nextStore;
    },
  );

  if (!result) {
    throw new StoreRepositoryError(
      500,
      "No se pudo actualizar la tienda.",
    );
  }

  return result;
}

export async function submitStore(
  ownerUid: string,
  storeId: string,
): Promise<StoreRecord> {
  const db = getAdminDb();

  const reference =
    db.collection("stores").doc(
      storeId,
    );

  let result:
    | StoreRecord
    | null = null;

  await db.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          reference,
        );

      if (!snapshot.exists) {
        throw new StoreRepositoryError(
          404,
          "Tienda no encontrada.",
        );
      }

      const current =
        toStoreRecord(
          snapshot.id,
          snapshot.data()!,
        );

      const mutation =
        buildSubmitMutation(
          ownerUid,
          current,
        );

      const now = Timestamp.now();

      transaction.update(
        reference,
        {
          ...mutation,
          submittedAt: now,
          updatedAt: now,
        },
      );

      result = {
        ...current,
        ...mutation,
        submittedAt: now,
        updatedAt: now,
      };
    },
  );

  if (!result) {
    throw new StoreRepositoryError(
      500,
      "No se pudo enviar la tienda a revisión.",
    );
  }

  return result;
}

export async function adminSetStoreStatus(
  storeId: string,
  target: StoreStatus,
  message?: string,
): Promise<StoreRecord> {
  const db = getAdminDb();

  const reference =
    db.collection("stores").doc(
      storeId,
    );

  let result:
    | StoreRecord
    | null = null;

  await db.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          reference,
        );

      if (!snapshot.exists) {
        throw new StoreRepositoryError(
          404,
          "Tienda no encontrada.",
        );
      }

      const current =
        toStoreRecord(
          snapshot.id,
          snapshot.data()!,
        );

      const mutation =
        buildAdminStatusMutation(
          current,
          target,
          message,
        );

      const now = Timestamp.now();

      const extra: {
        approvedAt?: Timestamp;
        suspendedAt?: Timestamp;
      } = {};

      if (
        current.status ===
          "pending_review" &&
        target === "active"
      ) {
        extra.approvedAt = now;
      }

      if (
        current.status ===
          "active" &&
        target === "suspended"
      ) {
        extra.suspendedAt = now;
      }

      transaction.update(
        reference,
        {
          ...mutation,
          ...extra,
          updatedAt: now,
        },
      );

      result = {
        ...current,
        ...mutation,
        ...extra,
        updatedAt: now,
      };
    },
  );

  if (!result) {
    throw new StoreRepositoryError(
      500,
      "No se pudo cambiar el estado de la tienda.",
    );
  }

  return result;
}

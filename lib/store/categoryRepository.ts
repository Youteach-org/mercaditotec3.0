import {
  Timestamp,
  type DocumentData,
} from "../firestoreRest";

import {
  getAdminDb,
} from "../firestoreRest";

export interface StoreCategory {
  id: string;

  name: string;
  normalizedName: string;

  active: boolean;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CategoryEditableInput {
  name: string;
  active: boolean;
}

export class CategoryRepositoryError
  extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function normalizeCategoryName(
  value: string,
): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function validateCategoryInput(
  input: unknown,
) {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new CategoryRepositoryError(
      400,
      "Datos de categoría inválidos.",
    );
  }

  const data =
    input as Record<
      string,
      unknown
    >;

  const name =
    typeof data.name === "string"
      ? data.name.trim()
      : "";

  if (
    name.length < 2 ||
    name.length > 60
  ) {
    throw new CategoryRepositoryError(
      400,
      "El nombre de la categoría debe tener entre 2 y 60 caracteres.",
    );
  }

  if (
    typeof data.active !==
    "boolean"
  ) {
    throw new CategoryRepositoryError(
      400,
      "El estado de la categoría no es válido.",
    );
  }

  return {
    name,

    normalizedName:
      normalizeCategoryName(name),

    active: data.active,
  };
}

function reservationKey(
  normalizedName: string,
): string {
  return encodeURIComponent(
    normalizedName,
  );
}

function toCategory(
  id: string,
  data: DocumentData,
): StoreCategory {
  return {
    id,

    name:
      String(
        data.name ?? "",
      ),

    normalizedName:
      String(
        data.normalizedName ?? "",
      ),

    active:
      data.active === true,

    createdAt:
      data.createdAt instanceof
      Timestamp
        ? data.createdAt
        : undefined,

    updatedAt:
      data.updatedAt instanceof
      Timestamp
        ? data.updatedAt
        : undefined,
  };
}

export function assertCategoryCanPublish(
  category: Pick<
    StoreCategory,
    | "id"
    | "name"
    | "normalizedName"
    | "active"
  >,
): void {
  if (!category.active) {
    throw new CategoryRepositoryError(
      409,
      "La categoría seleccionada no está disponible.",
    );
  }
}

export async function requireActiveCategory(
  categoryId: string,
): Promise<StoreCategory> {
  const snapshot =
    await getAdminDb()
      .collection(
        "store_categories",
      )
      .doc(categoryId)
      .get();

  if (!snapshot.exists) {
    throw new CategoryRepositoryError(
      409,
      "La categoría seleccionada no está disponible.",
    );
  }

  const category =
    toCategory(
      snapshot.id,
      snapshot.data()!,
    );

  assertCategoryCanPublish(
    category,
  );

  return category;
}

export async function listActiveCategories():
  Promise<StoreCategory[]> {
  const snapshot =
    await getAdminDb()
      .collection(
        "store_categories",
      )
      .where(
        "active",
        "==",
        true,
      )
      .get();

  return snapshot.docs
    .map(
      (document) =>
        toCategory(
          document.id,
          document.data(),
        ),
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "es",
        ),
    );
}

export async function listAllCategories():
  Promise<StoreCategory[]> {
  const snapshot =
    await getAdminDb()
      .collection(
        "store_categories",
      )
      .get();

  return snapshot.docs
    .map(
      (document) =>
        toCategory(
          document.id,
          document.data(),
        ),
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "es",
        ),
    );
}

export async function createCategory(
  input: CategoryEditableInput,
): Promise<StoreCategory> {
  const validated =
    validateCategoryInput(
      input,
    );

  const db =
    getAdminDb();

  const categoryReference =
    db.collection(
      "store_categories",
    ).doc();

  const nameReference =
    db.collection(
      "store_category_names",
    ).doc(
      reservationKey(
        validated.normalizedName,
      ),
    );

  let result:
    | StoreCategory
    | null = null;

  await db.runTransaction(
    async (transaction) => {
      const nameSnapshot =
        await transaction.get(
          nameReference,
        );

      if (nameSnapshot.exists) {
        throw new CategoryRepositoryError(
          409,
          "Esa categoría ya existe.",
        );
      }

      const now =
        Timestamp.now();

      const category:
        StoreCategory = {
        id:
          categoryReference.id,

        name:
          validated.name,

        normalizedName:
          validated.normalizedName,

        active:
          validated.active,

        createdAt: now,
        updatedAt: now,
      };

      transaction.set(
        categoryReference,
        category,
      );

      transaction.set(
        nameReference,
        {
          categoryId:
            categoryReference.id,

          createdAt: now,
        },
      );

      result = category;
    },
  );

  if (!result) {
    throw new CategoryRepositoryError(
      500,
      "No se pudo crear la categoría.",
    );
  }

  return result;
}

export async function updateCategory(
  categoryId: string,
  input: CategoryEditableInput,
): Promise<StoreCategory> {
  const validated =
    validateCategoryInput(
      input,
    );

  const db =
    getAdminDb();

  const categoryReference =
    db.collection(
      "store_categories",
    ).doc(categoryId);

  let result:
    | StoreCategory
    | null = null;

  await db.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          categoryReference,
        );

      if (!snapshot.exists) {
        throw new CategoryRepositoryError(
          404,
          "Categoría no encontrada.",
        );
      }

      const current =
        toCategory(
          snapshot.id,
          snapshot.data()!,
        );

      const nameChanged =
        current.normalizedName !==
        validated.normalizedName;

      if (nameChanged) {
        const nextNameReference =
          db.collection(
            "store_category_names",
          ).doc(
            reservationKey(
              validated.normalizedName,
            ),
          );

        const nextSnapshot =
          await transaction.get(
            nextNameReference,
          );

        if (nextSnapshot.exists) {
          throw new CategoryRepositoryError(
            409,
            "Esa categoría ya existe.",
          );
        }

        transaction.set(
          nextNameReference,
          {
            categoryId,
            createdAt:
              Timestamp.now(),
          },
        );

        const oldNameReference =
          db.collection(
            "store_category_names",
          ).doc(
            reservationKey(
              current.normalizedName,
            ),
          );

        transaction.delete(
          oldNameReference,
        );
      }

      const now =
        Timestamp.now();

      const next:
        StoreCategory = {
        ...current,

        name:
          validated.name,

        normalizedName:
          validated.normalizedName,

        active:
          validated.active,

        updatedAt: now,
      };

      transaction.update(
        categoryReference,
        {
          name:
            next.name,

          normalizedName:
            next.normalizedName,

          active:
            next.active,

          updatedAt: now,
        },
      );

      result = next;
    },
  );

  if (!result) {
    throw new CategoryRepositoryError(
      500,
      "No se pudo actualizar la categoría.",
    );
  }

  return result;
}

export function serializeCategory(
  category: StoreCategory,
) {
  return {
    id:
      category.id,

    name:
      category.name,

    active:
      category.active,

    createdAt:
      category.createdAt
        ? category.createdAt
            .toDate()
            .toISOString()
        : null,

    updatedAt:
      category.updatedAt
        ? category.updatedAt
            .toDate()
            .toISOString()
        : null,
  };
}

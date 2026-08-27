import {
  CategoryRepositoryError,
  createCategory,
  listAllCategories,
  normalizeCategoryName,
  updateCategory,
  type StoreCategory,
} from "./categoryRepository";

export const DEFAULT_STORE_CATEGORIES = [
  "Comida y bebidas",
  "Dulces, postres y snacks",
  "Ropa y accesorios",
  "Tecnología y accesorios",
  "Componentes electrónicos",
  "Papelería y material escolar",
  "Libros y apuntes",
  "Belleza y cuidado personal",
  "Arte, manualidades y personalizados",
  "Coleccionables y hobbies",
  "Deportes",
  "Servicios",
  "Otros",
] as const;

export async function ensureDefaultStoreCategories(): Promise<void> {
  const existing = await listAllCategories();
  const normalized = new Set(existing.map((category) => category.normalizedName));

  const missing = DEFAULT_STORE_CATEGORIES.filter(
    (name) => !normalized.has(normalizeCategoryName(name)),
  );

  await Promise.all(
    missing.map(async (name) => {
      try {
        await createCategory({ name, active: true });
      } catch (error) {
        if (!(error instanceof CategoryRepositoryError) || error.status !== 409) {
          throw error;
        }
      }
    }),
  );
}

export async function promoteSuggestedCategory(name: string): Promise<StoreCategory> {
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 60) {
    throw new CategoryRepositoryError(
      400,
      "La categoría sugerida debe tener entre 2 y 60 caracteres.",
    );
  }

  const normalized = normalizeCategoryName(cleanName);
  const existing = (await listAllCategories()).find(
    (category) => category.normalizedName === normalized,
  );

  if (existing) {
    if (existing.active) return existing;
    return updateCategory(existing.id, { name: existing.name, active: true });
  }

  try {
    return await createCategory({ name: cleanName, active: true });
  } catch (error) {
    if (error instanceof CategoryRepositoryError && error.status === 409) {
      const retry = (await listAllCategories()).find(
        (category) => category.normalizedName === normalized,
      );
      if (retry) {
        return retry.active
          ? retry
          : updateCategory(retry.id, { name: retry.name, active: true });
      }
    }
    throw error;
  }
}

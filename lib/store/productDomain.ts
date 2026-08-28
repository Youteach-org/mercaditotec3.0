export type ProductVisibility = "published" | "hidden";
export type ProductPriceType = "fixed" | "negotiable" | "ask";

export interface ProductEditableInput {
  title: string;
  description: string;
  imageUrls: string[];
  categoryId: string;
  suggestedCategoryName?: string;
  priceType: ProductPriceType;
  priceAmount: number | null;
  visibility: ProductVisibility;
}

const MAX_PRODUCT_IMAGES = 5;

export function validateProductInput(input: unknown): ProductEditableInput {
  if (!input || typeof input !== "object") {
    throw new Error("Datos de producto inválidos.");
  }

  const data = input as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (title.length < 2 || title.length > 100) {
    throw new Error("El nombre del producto debe tener entre 2 y 100 caracteres.");
  }

  const description = typeof data.description === "string" ? data.description.trim() : "";
  if (description.length > 1500) {
    throw new Error("La descripción del producto no puede exceder 1500 caracteres.");
  }

  if (!Array.isArray(data.imageUrls)) {
    throw new Error("Las imágenes del producto no son válidas.");
  }
  if (data.imageUrls.length > MAX_PRODUCT_IMAGES) {
    throw new Error("Un producto puede tener máximo 5 imágenes.");
  }

  const imageUrls = data.imageUrls.map((value) => {
    if (typeof value !== "string") throw new Error("Las imágenes del producto no son válidas.");
    return value.trim();
  });
  if (imageUrls.some((value) => !value)) {
    throw new Error("Las imágenes del producto no son válidas.");
  }

  const categoryId = typeof data.categoryId === "string" ? data.categoryId.trim() : "";
  const suggestedCategoryName =
    typeof data.suggestedCategoryName === "string"
      ? data.suggestedCategoryName.trim()
      : "";

  if (!categoryId && !suggestedCategoryName) {
    throw new Error("Debes seleccionar o sugerir una categoría.");
  }
  if (suggestedCategoryName && (suggestedCategoryName.length < 2 || suggestedCategoryName.length > 60)) {
    throw new Error("La categoría sugerida debe tener entre 2 y 60 caracteres.");
  }

  const priceType = data.priceType;
  if (priceType !== "fixed" && priceType !== "negotiable" && priceType !== "ask") {
    throw new Error("Modalidad de precio inválida.");
  }

  let priceAmount: number | null = null;
  if (priceType === "fixed" || priceType === "negotiable") {
    if (
      typeof data.priceAmount !== "number" ||
      !Number.isFinite(data.priceAmount) ||
      data.priceAmount <= 0
    ) {
      throw new Error("El precio debe ser mayor que cero.");
    }
    priceAmount = Math.round(data.priceAmount * 100) / 100;
  }

  if (priceType === "ask") {
    if (data.priceAmount !== null && data.priceAmount !== undefined) {
      throw new Error("Preguntar al vendedor no debe tener precio numérico.");
    }
    priceAmount = null;
  }

  const visibility = data.visibility;
  if (visibility !== "published" && visibility !== "hidden") {
    throw new Error("Visibilidad de producto inválida.");
  }

  if (visibility === "published" && imageUrls.length === 0) {
    throw new Error("Un producto visible debe tener al menos una imagen.");
  }

  return {
    title,
    description,
    imageUrls,
    categoryId,
    ...(suggestedCategoryName ? { suggestedCategoryName } : {}),
    priceType,
    priceAmount,
    visibility,
  };
}

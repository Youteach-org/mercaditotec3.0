import type { ProductPriceType, ProductVisibility } from "./productDomain";
import { STORE_WEEK_DAYS, type StoreSchedule } from "./schedule";

export interface CompletenessStore {
  name: string;
  description: string;
  schedule: StoreSchedule;
}

export interface CompletenessProduct {
  title: string;
  imageUrls: string[];
  categoryId: string;
  suggestedCategoryName?: string | null;
  priceType: ProductPriceType;
  priceAmount: number | null;
  visibility: ProductVisibility;
}

export function validateStoreCompleteness(
  store: CompletenessStore,
  products: CompletenessProduct[],
): void {
  if (!store.name.trim()) {
    throw new Error("La tienda necesita un nombre.");
  }
  if (!store.description.trim()) {
    throw new Error("Agrega una descripción de la tienda.");
  }

  const hasSchedule = STORE_WEEK_DAYS.some((day) => store.schedule[day].slots.length > 0);
  if (!hasSchedule) {
    throw new Error("Selecciona al menos una hora de atención.");
  }

  const published = products.filter((product) => product.visibility === "published");
  if (published.length === 0) {
    throw new Error("Debes tener al menos un producto publicado antes de guardar la tienda.");
  }

  for (const product of published) {
    const title = product.title.trim() || "Producto sin nombre";
    if (!product.title.trim()) {
      throw new Error("Todos los productos publicados necesitan nombre.");
    }
    if (product.imageUrls.length === 0) {
      throw new Error(`El producto "${title}" necesita al menos una foto.`);
    }
    if (product.imageUrls.length > 5) {
      throw new Error(`El producto "${title}" tiene más de 5 fotos.`);
    }
    if (!product.categoryId.trim() && !product.suggestedCategoryName?.trim()) {
      throw new Error(`El producto "${title}" necesita una categoría.`);
    }

    if (product.priceType === "fixed" || product.priceType === "negotiable") {
      if (
        typeof product.priceAmount !== "number" ||
        !Number.isFinite(product.priceAmount) ||
        product.priceAmount <= 0
      ) {
        throw new Error(`El producto "${title}" necesita un precio válido.`);
      }
    }

    if (product.priceType === "ask" && product.priceAmount !== null) {
      throw new Error(`El producto "${title}" tiene una configuración de precio inválida.`);
    }
  }
}

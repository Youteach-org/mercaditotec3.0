export const CATEGORY_ICON_KEYS = [
  "food",
  "drinks",
  "desserts",
  "crafts",
  "stationery",
  "entertainment",
  "clothing",
  "electronics",
  "beauty",
  "services",
  "books",
  "sports",
  "other",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export const CATEGORY_ICON_LABELS: Record<CategoryIconKey, string> = {
  food: "Comida",
  drinks: "Bebidas",
  desserts: "Postres",
  crafts: "Artesanías",
  stationery: "Papelería",
  entertainment: "Cine / entretenimiento",
  clothing: "Ropa / moda",
  electronics: "Tecnología",
  beauty: "Belleza",
  services: "Servicios",
  books: "Libros",
  sports: "Deportes",
  other: "Otra categoría",
};

export function inferCategoryIconKey(name: string): CategoryIconKey {
  const normalized = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/postre|dulce|pastel|repost|panader|galleta|helado/.test(normalized)) {
    return "desserts";
  }
  if (/bebida|cafe|jugo|te\b|agua|refresco/.test(normalized)) {
    return "drinks";
  }
  if (/comida|alimento|snack|torta|hamburg|pizza|taco|cocina/.test(normalized)) {
    return "food";
  }
  if (/cine|pelicula|entreten|evento|video|musica|juego/.test(normalized)) {
    return "entertainment";
  }
  if (/artesan|manualidad|joyer|accesorio/.test(normalized)) {
    return "crafts";
  }
  if (/papeler|util|cuaderno|libreta|impresion/.test(normalized)) {
    return "stationery";
  }
  if (/ropa|moda|playera|calzado|zapato|vestido/.test(normalized)) {
    return "clothing";
  }
  if (/electron|tecnolog|comput|celular|accesorio tech/.test(normalized)) {
    return "electronics";
  }
  if (/belleza|cosmetic|maquill|cabello|uñas|unas/.test(normalized)) {
    return "beauty";
  }
  if (/servicio|asesor|repar|clase|tutoria|diseño|diseno/.test(normalized)) {
    return "services";
  }
  if (/libro|lectura|comic|manga/.test(normalized)) {
    return "books";
  }
  if (/deporte|fitness|gym|ejercicio/.test(normalized)) {
    return "sports";
  }

  return "other";
}

export function normalizeCategoryIconKey(
  value: unknown,
  categoryName: string,
): CategoryIconKey {
  return CATEGORY_ICON_KEYS.includes(value as CategoryIconKey)
    ? (value as CategoryIconKey)
    : inferCategoryIconKey(categoryName);
}

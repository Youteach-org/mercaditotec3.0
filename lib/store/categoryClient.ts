import type { User } from "firebase/auth";

import { storeApiFetch } from "./client";

export interface StoreCategoryApiRecord {
  id: string;
  name: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function loadPublicCategories(): Promise<StoreCategoryApiRecord[]> {
  const response = await fetch("/api/categories", { cache: "no-store" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "No se pudieron cargar las categorías.");
  }

  return Array.isArray(data.categories) ? data.categories : [];
}

export async function loadAdminCategories(
  user: User,
): Promise<StoreCategoryApiRecord[]> {
  const response = await storeApiFetch(user, "/api/admin/categories");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "No se pudieron cargar las categorías.");
  }

  return Array.isArray(data.categories) ? data.categories : [];
}

export async function createAdminCategory(
  user: User,
  input: { name: string; active: boolean },
): Promise<StoreCategoryApiRecord> {
  const response = await storeApiFetch(user, "/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo crear la categoría.");
  }

  return data.category;
}

export async function updateAdminCategory(
  user: User,
  categoryId: string,
  input: { name: string; active: boolean },
): Promise<StoreCategoryApiRecord> {
  const response = await storeApiFetch(
    user,
    `/api/admin/categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo actualizar la categoría.");
  }

  return data.category;
}

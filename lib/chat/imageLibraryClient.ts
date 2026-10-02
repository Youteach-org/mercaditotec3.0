"use client";

import { auth } from "@/lib/firebase";

export interface SharedImageMetadata {
  id: string;
  url: string;
  ownerUid: string;
  sha256: string;
  createdAt: number;
}

async function authenticatedFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Debes iniciar sesión.");

  const token = await user.getIdToken(false);
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}

export async function findSharedImageByHash(
  sha256: string,
): Promise<SharedImageMetadata | null> {
  const response = await authenticatedFetch(
    `/api/chat/image-library?sha256=${encodeURIComponent(sha256)}`,
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo consultar la biblioteca.");
  return data.image ?? null;
}

export async function loadSharedImageLibrary(): Promise<SharedImageMetadata[]> {
  const response = await authenticatedFetch("/api/chat/image-library");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo cargar la biblioteca.");
  return Array.isArray(data.images) ? data.images : [];
}

export async function saveSharedImageMetadata(input: {
  url: string;
  sha256: string;
}): Promise<SharedImageMetadata> {
  const response = await authenticatedFetch("/api/chat/image-library", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo guardar la imagen compartida.");
  return data.image as SharedImageMetadata;
}

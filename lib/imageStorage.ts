"use client";

import { auth } from "@/lib/firebase";
import {
  SUPABASE_IMAGE_UPLOAD_ENDPOINT,
  SUPABASE_PUBLISHABLE_KEY,
} from "@/lib/supabase";

export async function uploadImageFile(input: {
  path: string;
  file: Blob;
  filename?: string;
}): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debes iniciar sesión para subir imágenes.");
  }

  const token = await user.getIdToken(false);
  const form = new FormData();

  form.append("path", input.path);
  form.append(
    "file",
    input.file,
    input.filename || (input.file instanceof File ? input.file.name : "image"),
  );

  const response = await fetch(
    SUPABASE_IMAGE_UPLOAD_ENDPOINT,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: form,
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };

  if (!response.ok || !payload.url) {
    throw new Error(
      payload.error || "No se pudo subir la imagen.",
    );
  }

  return payload.url;
}

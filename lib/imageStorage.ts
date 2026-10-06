"use client";

import imageCompression from "browser-image-compression";

import { auth } from "@/lib/firebase";
import {
  SUPABASE_IMAGE_UPLOAD_ENDPOINT,
  SUPABASE_PUBLISHABLE_KEY,
} from "@/lib/supabase";

export const MAX_UPLOADED_IMAGE_BYTES = 1_048_576;
const TARGET_IMAGE_BYTES = 940_000;
const MAX_SOURCE_IMAGE_BYTES = 30 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function filenameForType(filename: string, type: string): string {
  const stem = filename.replace(/\.[^.]+$/, "") || "image";
  const extension =
    type === "image/png"
      ? "png"
      : type === "image/gif"
        ? "gif"
        : type === "image/jpeg"
          ? "jpg"
          : "webp";
  return `${stem}.${extension}`;
}

function asFile(blob: Blob, filename: string): File {
  if (blob instanceof File) return blob;
  return new File([blob], filename, {
    type: blob.type || "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function prepareImageForUpload(
  blob: Blob,
  filename = blob instanceof File ? blob.name : "image",
): Promise<File> {
  const source = asFile(blob, filename);

  if (!ALLOWED_IMAGE_TYPES.has(source.type)) {
    throw new Error("Formato de imagen no permitido.");
  }

  if (!Number.isFinite(source.size) || source.size <= 0) {
    throw new Error("La imagen no es válida.");
  }

  if (source.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error(
      "La imagen original es demasiado grande para procesarla. El límite de entrada es 30 MB.",
    );
  }

  if (source.size <= MAX_UPLOADED_IMAGE_BYTES) {
    return source;
  }

  const attempts = [
    { maxWidthOrHeight: 2560, initialQuality: 0.82, maxSizeMB: 0.90 },
    { maxWidthOrHeight: 2048, initialQuality: 0.74, maxSizeMB: 0.82 },
    { maxWidthOrHeight: 1600, initialQuality: 0.66, maxSizeMB: 0.74 },
    { maxWidthOrHeight: 1280, initialQuality: 0.58, maxSizeMB: 0.66 },
    { maxWidthOrHeight: 960, initialQuality: 0.50, maxSizeMB: 0.58 },
  ] as const;

  let current = source;

  try {
    for (const attempt of attempts) {
      const optimized = await imageCompression(current, {
        maxSizeMB: attempt.maxSizeMB,
        maxWidthOrHeight: attempt.maxWidthOrHeight,
        initialQuality: attempt.initialQuality,
        useWebWorker: true,
        fileType: "image/webp",
        alwaysKeepResolution: false,
      });

      current = new File(
        [optimized],
        filenameForType(filename, optimized.type || "image/webp"),
        {
          type: optimized.type || "image/webp",
          lastModified: Date.now(),
        },
      );

      if (
        current.size <= TARGET_IMAGE_BYTES ||
        current.size <= MAX_UPLOADED_IMAGE_BYTES
      ) {
        return current;
      }
    }
  } catch {
    throw new Error(
      "No se pudo optimizar automáticamente esta imagen. Prueba con otra imagen.",
    );
  }

  if (current.size > MAX_UPLOADED_IMAGE_BYTES) {
    throw new Error(
      "No se pudo reducir la imagen por debajo de 1 MB automáticamente.",
    );
  }

  return current;
}

export async function uploadImageFile(input: {
  path: string;
  file: Blob;
  filename?: string;
}): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Debes iniciar sesión para subir imágenes.");
  }

  const filename =
    input.filename || (input.file instanceof File ? input.file.name : "image");
  const prepared = await prepareImageForUpload(input.file, filename);

  if (prepared.size > MAX_UPLOADED_IMAGE_BYTES) {
    throw new Error("La imagen no puede superar 1 MB.");
  }

  const token = await user.getIdToken(false);
  const form = new FormData();

  form.append("path", input.path);
  form.append("file", prepared, prepared.name);

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

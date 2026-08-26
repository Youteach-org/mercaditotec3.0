"use client";

import {
  supabase,
} from "@/lib/supabase";

import {
  buildStoreMediaPath,
  STORE_MEDIA_BUCKET,
  validateMediaFileMeta,
  type StoreMediaKind,
} from "./media";

export async function uploadStoreMedia(
  input: {
    storeId: string;
    kind: StoreMediaKind;
    file: File;
    productId?: string;
  },
): Promise<string> {
  validateMediaFileMeta({
    type:
      input.file.type,

    size:
      input.file.size,
  });

  const nonce =
    crypto.randomUUID();

  const path =
    buildStoreMediaPath({
      storeId:
        input.storeId,

      kind:
        input.kind,

      productId:
        input.productId,

      nonce,

      mimeType:
        input.file.type,
    });

  const {
    error,
  } = await supabase
    .storage
    .from(STORE_MEDIA_BUCKET)
    .upload(
      path,
      input.file,
      {
        cacheControl: "3600",
        upsert: false,
        contentType:
          input.file.type,
      },
    );

  if (error) {
    throw new Error(
      `No se pudo subir la imagen: ${error.message}`,
    );
  }

  const {
    data,
  } = supabase
    .storage
    .from(STORE_MEDIA_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

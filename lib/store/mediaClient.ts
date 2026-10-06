"use client";

import {
  prepareImageForUpload,
  uploadImageFile,
} from "@/lib/imageStorage";

import {
  buildStoreMediaPath,
  validateMediaFileMeta,
  type StoreMediaKind,
} from "./media";

export async function uploadStoreMedia(
  input: {
    ownerUid: string;
    storeId: string;
    kind: StoreMediaKind;
    file: File;
    productId?: string;
  },
): Promise<string> {
  const prepared = await prepareImageForUpload(
    input.file,
    input.file.name,
  );

  validateMediaFileMeta({
    type:
      prepared.type,

    size:
      prepared.size,
  });

  const nonce =
    crypto.randomUUID();

  const path =
    buildStoreMediaPath({
      ownerUid:
        input.ownerUid,

      storeId:
        input.storeId,

      kind:
        input.kind,

      productId:
        input.productId,

      nonce,

      mimeType:
        prepared.type,
    });

  return uploadImageFile({
    path,
    file: prepared,
    filename: prepared.name,
  });
}

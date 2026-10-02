"use client";

import { uploadImageFile } from "@/lib/imageStorage";

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
        input.file.type,
    });

  return uploadImageFile({
    path,
    file: input.file,
    filename: input.file.name,
  });
}

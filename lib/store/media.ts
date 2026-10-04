export const STORE_MEDIA_BUCKET =
  "chat-images";

export const STORE_MEDIA_MAX_BYTES =
  1_048_576;

export type StoreMediaKind =
  | "logo"
  | "cover"
  | "product";

const SUPABASE_MEDIA_ORIGIN =
  "https://wfmokinfcypfpdisussw.supabase.co";

const ALLOWED_MIME_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);

const EXTENSION_BY_MIME:
  Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

export function validateMediaFileMeta(
  file: {
    type: string;
    size: number;
  },
): void {
  if (
    !ALLOWED_MIME_TYPES.has(
      file.type,
    )
  ) {
    throw new Error(
      "Formato de imagen no permitido.",
    );
  }

  if (
    !Number.isFinite(file.size) ||
    file.size <= 0
  ) {
    throw new Error(
      "La imagen no es válida.",
    );
  }

  if (
    file.size >
    STORE_MEDIA_MAX_BYTES
  ) {
    throw new Error(
      "La imagen no puede superar 1 MB.",
    );
  }
}

function assertSafeId(
  value: string,
): void {
  if (
    !/^[A-Za-z0-9_-]{1,160}$/.test(
      value,
    )
  ) {
    throw new Error(
      "Identificador de imagen inválido.",
    );
  }
}

export function parseImageUploadPath(path: string, ownerUid: string): {
  path: string; storeId?: string; productId?: string;
} {
  assertSafeId(ownerUid);
  const parts = path.split("/");
  if (path.length > 600 || parts.some((part) => !part || part === "." || part === ".." || /[%\\?#]/.test(part))) {
    throw new Error("Ruta de imagen inválida.");
  }
  if (parts[1] !== ownerUid || !/^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/.test(parts.at(-1) ?? "")) {
    throw new Error("La ruta de imagen no pertenece al usuario.");
  }
  if (parts[0] === "chat" && parts.length === 5 &&
      ["shared", "product"].includes(parts[2]) && /^\d{4}-(0[1-9]|1[0-2])$/.test(parts[3])) {
    return { path };
  }
  if (parts[0] === "stores") {
    assertSafeId(parts[2] ?? "");
    if (parts.length === 5 && ["logo", "cover"].includes(parts[3])) {
      return { path, storeId: parts[2] };
    }
    if (parts.length === 6 && parts[3] === "products") {
      assertSafeId(parts[4]);
      return { path, storeId: parts[2], productId: parts[4] };
    }
  }
  throw new Error("Ruta de imagen inválida.");
}

export function buildStoreMediaPath(
  input: {
    ownerUid: string;
    storeId: string;
    kind: StoreMediaKind;
    nonce: string;
    mimeType: string;
    productId?: string;
  },
): string {
  assertSafeId(input.ownerUid);
  assertSafeId(input.storeId);
  assertSafeId(input.nonce);

  const extension =
    EXTENSION_BY_MIME[
      input.mimeType
    ];

  if (!extension) {
    throw new Error(
      "Formato de imagen no permitido.",
    );
  }

  if (
    input.kind === "product"
  ) {
    if (!input.productId) {
      throw new Error(
        "Falta el producto para guardar la imagen.",
      );
    }

    assertSafeId(
      input.productId,
    );

    return [
      "stores",
      input.ownerUid,
      input.storeId,
      "products",
      input.productId,
      `${input.nonce}.${extension}`,
    ].join("/");
  }

  return [
    "stores",
    input.ownerUid,
    input.storeId,
    input.kind,
    `${input.nonce}.${extension}`,
  ].join("/");
}

function mediaPathFromUrl(
  value: string,
): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "URL de imagen inválida.",
    );
  }

  if (
    url.origin !==
    SUPABASE_MEDIA_ORIGIN
  ) {
    throw new Error(
      "La imagen no pertenece a Supabase.",
    );
  }

  const prefix =
    `/storage/v1/object/public/${STORE_MEDIA_BUCKET}/`;

  if (
    !url.pathname.startsWith(
      prefix,
    )
  ) {
    throw new Error(
      "URL de imagen inválida.",
    );
  }

  return decodeURIComponent(
    url.pathname.slice(
      prefix.length,
    ),
  );
}

export function validateStoreMediaUrl(
  value: string,
  ownerUid: string,
  storeId: string,
  kind: "logo" | "cover",
): void {
  const path =
    mediaPathFromUrl(value);

  const expectedPrefix =
    `stores/${ownerUid}/${storeId}/${kind}/`;

  if (
    !path.startsWith(
      expectedPrefix,
    )
  ) {
    throw new Error(
      "La imagen no pertenece a esta tienda.",
    );
  }
}

export function assertProductImageUrlsForStore(
  urls: string[],
  ownerUid: string,
  storeId: string,
  productId: string,
): void {
  const expectedPrefix =
    `stores/${ownerUid}/${storeId}/products/${productId}/`;

  for (const value of urls) {
    const path =
      mediaPathFromUrl(value);

    if (
      !path.startsWith(
        expectedPrefix,
      )
    ) {
      throw new Error(
        "Una imagen no pertenece a este producto.",
      );
    }
  }
}

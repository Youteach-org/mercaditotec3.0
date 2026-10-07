import {
  SUPABASE_IMAGE_BUCKET,
  SUPABASE_STORAGE_URL,
} from "../supabase";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function assertSafeSegment(value: string): void {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(value)) {
    throw new Error("Identificador de imagen inválido.");
  }
}

export function buildCommunityPostMediaPath(input: {
  ownerUid: string;
  nonce: string;
  mimeType: string;
}): string {
  assertSafeSegment(input.ownerUid);
  assertSafeSegment(input.nonce);

  const extension = EXTENSION_BY_MIME[input.mimeType];
  if (!extension) {
    throw new Error("Formato de imagen no permitido.");
  }

  return `community-posts/${input.ownerUid}/${input.nonce}.${extension}`;
}

export function validateCommunityPostImageUrl(
  value: string,
  ownerUid: string,
): string {
  assertSafeSegment(ownerUid);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL de imagen inválida.");
  }

  if (url.origin !== SUPABASE_STORAGE_URL) {
    throw new Error("La imagen no pertenece a Supabase.");
  }

  const prefix = `/storage/v1/object/public/${SUPABASE_IMAGE_BUCKET}/`;
  if (!url.pathname.startsWith(prefix)) {
    throw new Error("URL de imagen inválida.");
  }

  const objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
  const parts = objectPath.split("/");
  if (
    parts.length !== 3 ||
    parts[0] !== "community-posts" ||
    parts[1] !== ownerUid ||
    !/^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/.test(parts[2] ?? "")
  ) {
    throw new Error("La imagen no pertenece a esta publicación.");
  }

  return value;
}

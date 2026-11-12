/**
 * Browser-only delivery URL for public store photographs. The original
 * Supabase URL stays in Firestore, so existing ownership validation works.
 */
const SUPABASE_ORIGIN = "https://wfmokinfcypfpdisussw.supabase.co";
const STORE_PREFIX = "/storage/v1/object/public/chat-images/stores/";
const VALID_STORE_PATH =
  /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/(?:(?:logo|cover)\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp|gif)|products\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp|gif))$/i;

export function publicStoreImageSrc(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.origin !== SUPABASE_ORIGIN || url.search || url.hash) return value;
    if (!url.pathname.startsWith(STORE_PREFIX)) return value;
    const key = url.pathname.slice(STORE_PREFIX.length);
    if (VALID_STORE_PATH.test(key)) return "/media/stores/" + key;
  } catch {
    // Demo/external assets and local preview URLs are unaffected.
  }
  return value;
}

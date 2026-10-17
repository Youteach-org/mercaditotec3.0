import { normalizeWhatsappNumber, whatsappUrlFromNumber, WhatsappNumberError } from "../security/whatsapp";

/** A verified Mercadito profile is the sole source of a publisher's contact. */
export function publisherWhatsappUrl(profile: Record<string, unknown> | undefined): string | null {
  const number = profile?.whatsappNumber;
  if (typeof number !== "string" || !number.trim()) return null;
  try {
    return whatsappUrlFromNumber(normalizeWhatsappNumber(number));
  } catch (error) {
    if (error instanceof WhatsappNumberError) return null;
    throw error;
  }
}

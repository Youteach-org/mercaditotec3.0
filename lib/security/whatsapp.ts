export class WhatsappNumberError extends Error {}

const ALLOWED_SEPARATORS = /[\s()\-]/g;

export function normalizeWhatsappNumber(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  if (/[A-Za-z]/.test(raw) || (raw.match(/\+/g)?.length ?? 0) > 1 || (raw.includes("+") && !raw.startsWith("+"))) {
    throw new WhatsappNumberError("El número de WhatsApp no es válido.");
  }

  const compact = raw.replace(ALLOWED_SEPARATORS, "");
  if (!/^\+?\d+$/.test(compact)) {
    throw new WhatsappNumberError("El número de WhatsApp no es válido.");
  }

  if (/^\d{10}$/.test(compact)) {
    return `+52${compact}`;
  }

  if (/^52\d{10}$/.test(compact)) {
    return `+${compact}`;
  }

  const normalized = compact.startsWith("+") ? compact : `+${compact}`;
  const digits = normalized.slice(1);

  if (!/^\d{8,15}$/.test(digits)) {
    throw new WhatsappNumberError("El número de WhatsApp no es válido.");
  }

  return normalized;
}

export function whatsappUrlFromNumber(normalized: string): string | null {
  const value = normalized.trim();
  if (!value) return null;

  if (!/^\+\d{8,15}$/.test(value)) {
    return null;
  }

  return `https://wa.me/${value.slice(1)}`;
}

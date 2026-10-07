import type { Timestamp } from "../firestoreRest";

export type CommunityPostType = "quick_notice" | "found_item";
export type CommunityPostStatus = "active" | "resolved";

export interface CommunityPostCreateInput {
  type: CommunityPostType;
  title: string;
  body: string;
  location: string;
  imageUrl: string | null;
}

export interface CommunityPostRecord {
  id: string;
  authorUid: string;
  type: CommunityPostType;
  title: string;
  body: string;
  location: string;
  imageUrl: string | null;
  status: CommunityPostStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt: Timestamp | null;
}

export class CommunityDomainError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function requiredText(
  value: unknown,
  fieldLabel: string,
  maxLength: number,
): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new CommunityDomainError(400, `${fieldLabel} es obligatorio.`);
  }
  if (text.length > maxLength) {
    throw new CommunityDomainError(
      400,
      `${fieldLabel} no puede superar ${maxLength} caracteres.`,
    );
  }
  return text;
}

function optionalText(
  value: unknown,
  fieldLabel: string,
  maxLength: number,
): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > maxLength) {
    throw new CommunityDomainError(
      400,
      `${fieldLabel} no puede superar ${maxLength} caracteres.`,
    );
  }
  return text;
}

export function parseCommunityPostCreateInput(
  input: unknown,
): CommunityPostCreateInput {
  if (!input || typeof input !== "object") {
    throw new CommunityDomainError(400, "Publicación inválida.");
  }

  const body = input as Record<string, unknown>;
  const type = body.type;
  if (type !== "quick_notice" && type !== "found_item") {
    throw new CommunityDomainError(400, "Tipo de publicación inválido.");
  }

  const title = requiredText(body.title, "El título", 80);
  const message = requiredText(body.body, "El mensaje", 500);
  const location = optionalText(body.location, "La ubicación", 120);
  const imageUrl =
    typeof body.imageUrl === "string" && body.imageUrl.trim()
      ? body.imageUrl.trim()
      : null;

  if (type === "found_item" && !imageUrl) {
    throw new CommunityDomainError(
      400,
      "Las publicaciones de objetos encontrados requieren una foto.",
    );
  }

  return {
    type,
    title,
    body: message,
    location,
    imageUrl,
  };
}

export function parseCommunityPostListQuery(
  searchParams: URLSearchParams,
): { type?: CommunityPostType; limit: number } {
  const typeValue = searchParams.get("type");
  let type: CommunityPostType | undefined;

  if (typeValue) {
    if (typeValue !== "quick_notice" && typeValue !== "found_item") {
      throw new CommunityDomainError(400, "Tipo de publicación inválido.");
    }
    type = typeValue;
  }

  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const normalizedLimit = Number.isFinite(rawLimit)
    ? Math.floor(rawLimit)
    : 20;
  const limit = Math.min(50, Math.max(1, normalizedLimit || 20));

  return { type, limit };
}

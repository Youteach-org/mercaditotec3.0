import type { CommunityPostRecord } from "./domain";

export interface CommunityPostApiRecord {
  id: string;
  authorUid: string;
  type: CommunityPostRecord["type"];
  title: string;
  body: string;
  location: string;
  imageUrl: string | null;
  status: CommunityPostRecord["status"];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export function serializeCommunityPost(
  record: CommunityPostRecord,
): CommunityPostApiRecord {
  return {
    id: record.id,
    authorUid: record.authorUid,
    type: record.type,
    title: record.title,
    body: record.body,
    location: record.location,
    imageUrl: record.imageUrl,
    status: record.status,
    createdAt: record.createdAt.toJSON(),
    updatedAt: record.updatedAt.toJSON(),
    resolvedAt: record.resolvedAt?.toJSON() ?? null,
  };
}

export function toCommunityApiError(
  error: unknown,
): { status: number; message: string } {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const candidate = error as { status: number; message: string };
    if (candidate.status >= 400 && candidate.status <= 599) {
      return { status: candidate.status, message: candidate.message };
    }
  }

  return {
    status: 500,
    message: "No se pudo procesar la publicación.",
  };
}

import { getAdminDb, Timestamp, type DocumentData } from "../firestoreRest";
import type {
  CommunityPostCreateInput,
  CommunityPostRecord,
  CommunityPostType,
} from "./domain";

export const QUICK_NOTICE_LIFETIME_MS = 48 * 60 * 60 * 1000;

export class CommunityRepositoryError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function toRecord(id: string, data: DocumentData): CommunityPostRecord {
  return {
    id,
    authorUid: String(data.authorUid ?? ""),
    type: data.type === "found_item" ? "found_item" : "quick_notice",
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    location: String(data.location ?? ""),
    imageUrl: typeof data.imageUrl === "string" && data.imageUrl ? data.imageUrl : null,
    status: data.status === "resolved" ? "resolved" : "active",
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromMillis(0),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.fromMillis(0),
    resolvedAt: data.resolvedAt instanceof Timestamp ? data.resolvedAt : null,
  };
}

export async function createCommunityPost(
  authorUid: string,
  input: CommunityPostCreateInput,
): Promise<CommunityPostRecord> {
  const now = Timestamp.now();
  const reference = getAdminDb().collection("community_posts").doc();
  const record: CommunityPostRecord = {
    id: reference.id,
    authorUid,
    type: input.type,
    title: input.title,
    body: input.body,
    location: input.location,
    imageUrl: input.imageUrl,
    status: "active",
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  };

  const { id: _id, ...stored } = record;
  await reference.set(stored);
  return record;
}

export async function listActiveCommunityPosts(options: {
  type?: CommunityPostType;
  limit: number;
  now?: Date;
}): Promise<CommunityPostRecord[]> {
  const snapshot = await getAdminDb()
    .collection("community_posts")
    .where("status", "==", "active")
    .limit(100)
    .get();

  const nowMs = (options.now ?? new Date()).getTime();
  const quickNoticeCutoffMs = nowMs - QUICK_NOTICE_LIFETIME_MS;

  return snapshot.docs
    .map((document) => toRecord(document.id, document.data()))
    .filter((post) => {
      if (options.type && post.type !== options.type) return false;
      if (post.type === "found_item") return true;
      return post.createdAt.toMillis() >= quickNoticeCutoffMs;
    })
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, Math.max(1, Math.min(50, Math.floor(options.limit))));
}

export async function resolveCommunityPost(
  authorUid: string,
  postId: string,
): Promise<CommunityPostRecord> {
  const reference = getAdminDb().collection("community_posts").doc(postId);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    throw new CommunityRepositoryError(404, "Publicación no encontrada.");
  }

  const current = toRecord(snapshot.id, snapshot.data()!);
  if (current.authorUid !== authorUid) {
    throw new CommunityRepositoryError(404, "Publicación no encontrada.");
  }

  if (current.status === "resolved") {
    return current;
  }

  const now = Timestamp.now();
  await reference.update({
    status: "resolved",
    resolvedAt: now,
    updatedAt: now,
  });

  return {
    ...current,
    status: "resolved",
    resolvedAt: now,
    updatedAt: now,
  };
}

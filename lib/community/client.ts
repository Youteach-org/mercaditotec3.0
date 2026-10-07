import type { User } from "firebase/auth";

import { storeApiFetch } from "../store/client";
import type { CommunityPostCreateInput, CommunityPostType } from "./domain";
import type { CommunityPostApiRecord } from "./http";

async function communityResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo procesar la publicación.");
  }
  return data;
}

export async function loadCommunityPosts(
  user: User,
  options: { type?: CommunityPostType; limit?: number } = {},
): Promise<CommunityPostApiRecord[]> {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (typeof options.limit === "number") params.set("limit", String(options.limit));
  const suffix = params.size ? `?${params.toString()}` : "";

  const response = await storeApiFetch(user, `/api/community-posts${suffix}`);
  const data = await communityResponse(response);
  return Array.isArray(data.posts) ? data.posts : [];
}

export async function createCommunityPostRequest(
  user: User,
  input: CommunityPostCreateInput,
): Promise<CommunityPostApiRecord> {
  const response = await storeApiFetch(user, "/api/community-posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return (await communityResponse(response)).post as CommunityPostApiRecord;
}

export async function resolveCommunityPostRequest(
  user: User,
  postId: string,
): Promise<CommunityPostApiRecord> {
  const response = await storeApiFetch(
    user,
    `/api/community-posts/${encodeURIComponent(postId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved" }),
    },
  );
  return (await communityResponse(response)).post as CommunityPostApiRecord;
}

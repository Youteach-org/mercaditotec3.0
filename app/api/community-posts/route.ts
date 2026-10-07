import { NextResponse } from "next/server";

import {
  parseCommunityPostCreateInput,
  parseCommunityPostListQuery,
} from "@/lib/community/domain";
import { serializeCommunityPost, toCommunityApiError } from "@/lib/community/http";
import { validateCommunityPostImageUrl } from "@/lib/community/media";
import {
  createCommunityPost,
  listActiveCommunityPosts,
} from "@/lib/community/repository";
import { requireFirebaseUser, requireUnblockedUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireFirebaseUser(request);
    const options = parseCommunityPostListQuery(new URL(request.url).searchParams);
    const posts = await listActiveCommunityPosts(options);
    return NextResponse.json(
      { posts: posts.map(serializeCommunityPost) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const apiError = toCommunityApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    const body = await request.json().catch(() => ({}));
    const input = parseCommunityPostCreateInput(body);

    if (input.imageUrl) {
      validateCommunityPostImageUrl(input.imageUrl, user.uid);
    }

    const post = await createCommunityPost(user.uid, input);
    return NextResponse.json(
      { post: serializeCommunityPost(post) },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const apiError = toCommunityApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

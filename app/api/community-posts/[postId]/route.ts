import { NextResponse } from "next/server";

import { CommunityDomainError } from "@/lib/community/domain";
import { serializeCommunityPost, toCommunityApiError } from "@/lib/community/http";
import { resolveCommunityPost } from "@/lib/community/repository";
import { requireUnblockedUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/community-posts/[postId]">,
) {
  try {
    const user = await requireUnblockedUser(request);
    const body = await request.json().catch(() => ({}));

    if (!body || body.status !== "resolved") {
      throw new CommunityDomainError(400, "Actualización de publicación inválida.");
    }

    const { postId } = await context.params;
    const post = await resolveCommunityPost(user.uid, postId);
    return NextResponse.json(
      { post: serializeCommunityPost(post) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const apiError = toCommunityApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

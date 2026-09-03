import { NextResponse } from "next/server";

import { moderationApiError, parseAdminReportFilters } from "@/lib/moderation/http";
import { listReportedMessages } from "@/lib/moderation/repository";
import { requireAdmin } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const filters = parseAdminReportFilters(new URL(request.url).searchParams);
    const items = await listReportedMessages(filters);
    return NextResponse.json({ items });
  } catch (error) {
    const apiError = moderationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

import { NextResponse } from "next/server";

import { parseAdminReportFilters } from "@/lib/moderation/http";
import { moderationApiError } from "@/lib/moderation/http";
import { listReportsForAdmin } from "@/lib/moderation/repository";
import { requireAdmin } from "@/lib/store/auth";

export const runtime = "nodejs";

const emptyFilters = {
  status: null,
  targetType: null,
  reasonCode: "",
  search: "",
  from: null,
  to: null,
} as const;

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const filters = parseAdminReportFilters(new URL(request.url).searchParams);
    const [reports, allReports] = await Promise.all([
      listReportsForAdmin(filters),
      listReportsForAdmin(emptyFilters),
    ]);
    const counts = { open: 0, in_review: 0, resolved: 0, dismissed: 0 };
    for (const report of allReports) counts[report.status] += 1;
    return NextResponse.json({ reports, counts });
  } catch (error) {
    const apiError = moderationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

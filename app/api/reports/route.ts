import { NextResponse } from "next/server";

import { parseReportInput } from "@/lib/moderation/domain";
import { moderationApiError, serializeReporterReceipt } from "@/lib/moderation/http";
import { createReport } from "@/lib/moderation/repository";
import { requireUnblockedUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene datos válidos." },
        { status: 400 },
      );
    }
    const report = await createReport(user.uid, parseReportInput(body));
    return NextResponse.json(
      { report: serializeReporterReceipt(report as unknown as Record<string, unknown>) },
      { status: 201 },
    );
  } catch (error) {
    const apiError = moderationApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

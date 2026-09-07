import { NextResponse } from "next/server";

import {
  parseOrderStatusBody,
  serializeOrder,
  toOrderApiError,
} from "@/lib/orders/http";
import { setOrderStatus } from "@/lib/orders/repository";
import { requireUnblockedUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/orders/[orderId]/status">,
) {
  try {
    const user = await requireUnblockedUser(request);
    const { orderId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const status = parseOrderStatusBody(body);
    const order = await setOrderStatus(user.uid, orderId, status);
    return NextResponse.json({ order: serializeOrder(order) });
  } catch (error) {
    const apiError = toOrderApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

import { NextResponse } from "next/server";

import {
  parseOrderCreateBody,
  serializeOrder,
  toOrderApiError,
} from "@/lib/orders/http";
import {
  createOrder,
  listOrdersForBuyer,
  listOrdersForSeller,
} from "@/lib/orders/repository";
import { requireFirebaseUser, requireUnblockedUser } from "@/lib/store/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") ?? "buyer";

    if (role !== "buyer" && role !== "seller") {
      return NextResponse.json({ error: "Vista de pedidos inválida." }, { status: 400 });
    }

    const orders = role === "seller"
      ? await listOrdersForSeller(user.uid)
      : await listOrdersForBuyer(user.uid);

    return NextResponse.json({ orders: orders.map(serializeOrder) });
  } catch (error) {
    const apiError = toOrderApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUnblockedUser(request);
    const body = await request.json().catch(() => ({}));
    const order = await createOrder(user.uid, parseOrderCreateBody(body));
    return NextResponse.json({ order: serializeOrder(order) }, { status: 201 });
  } catch (error) {
    const apiError = toOrderApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

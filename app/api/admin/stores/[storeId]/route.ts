import { NextResponse } from "next/server";

import {
  requireAdmin,
} from "@/lib/store/auth";

import {
  serializeStore,
  toApiError,
} from "@/lib/store/http";

import {
  getStoreForAdmin,
} from "@/lib/store/repository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    storeId: string;
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    await requireAdmin(request);

    const { storeId } =
      await context.params;

    const store =
      await getStoreForAdmin(storeId);

    return NextResponse.json({
      store: serializeStore(store),
    });
  } catch (error) {
    const apiError = toApiError(error);

    return NextResponse.json(
      {
        error: apiError.message,
      },
      {
        status: apiError.status,
      },
    );
  }
}

import { NextResponse } from "next/server";

import {
  parseStoreStatusFilter,
} from "@/lib/store/admin";

import {
  requireAdmin,
} from "@/lib/store/auth";

import {
  serializeStore,
  toApiError,
} from "@/lib/store/http";

import {
  listStoresForAdmin,
} from "@/lib/store/repository";

export const runtime = "nodejs";

export async function GET(
  request: Request,
) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);

    let status;

    try {
      status = parseStoreStatusFilter(
        url.searchParams.get("status"),
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Estado de tienda inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const stores =
      await listStoresForAdmin(status);

    return NextResponse.json({
      stores: stores.map(serializeStore),
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

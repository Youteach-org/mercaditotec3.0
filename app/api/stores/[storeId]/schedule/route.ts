import { NextResponse } from "next/server";

import {
  requireUnblockedUser,
} from "@/lib/store/auth";

import {
  serializeStore,
  toApiError,
} from "@/lib/store/http";

import {
  updateStoreOperationalSettingsByOwner,
} from "@/lib/store/repository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    storeId: string;
  }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const user =
      await requireUnblockedUser(
        request,
      );

    const {
      storeId,
    } = await context.params;

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "La solicitud no contiene datos válidos.",
        },
        {
          status: 400,
        },
      );
    }

    const store =
      await updateStoreOperationalSettingsByOwner(
        user.uid,
        storeId,
        body,
      );

    return NextResponse.json({
      store:
        serializeStore(
          store,
        ),
    });
  } catch (error) {
    const result =
      toApiError(error);

    return NextResponse.json(
      {
        error:
          result.message,
      },
      {
        status:
          result.status,
      },
    );
  }
}

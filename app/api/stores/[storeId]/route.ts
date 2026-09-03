import { NextResponse } from "next/server";

import {
  requireFirebaseUser,
  requireUnblockedUser,
} from "@/lib/store/auth";

import {
  parseStoreEditableInput,
  serializeStore,
  toApiError,
} from "@/lib/store/http";

import {
  getStoreForOwner,
  updateStoreByOwner,
} from "@/lib/store/repository";

import {
  resetStoreForOwner,
} from "@/lib/store/reset";

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
    const user =
      await requireFirebaseUser(
        request,
      );

    const {
      storeId,
    } = await context.params;

    const store =
      await getStoreForOwner(
        user.uid,
        storeId,
      );

    return NextResponse.json({
      store:
        serializeStore(
          store,
        ),
    });
  } catch (error) {
    const apiError =
      toApiError(error);

    return NextResponse.json(
      {
        error:
          apiError.message,
      },
      {
        status:
          apiError.status,
      },
    );
  }
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

    if (
      body &&
      typeof body === "object" &&
      (body as Record<string, unknown>).action === "reset"
    ) {
      const result =
        await resetStoreForOwner(
          user.uid,
          storeId,
        );

      return NextResponse.json({
        ok: true,
        ...result,
      });
    }

    const input =
      parseStoreEditableInput(
        body,
      );

    const store =
      await updateStoreByOwner(
        user.uid,
        storeId,
        input,
      );

    return NextResponse.json({
      store:
        serializeStore(
          store,
        ),
    });
  } catch (error) {
    const apiError =
      toApiError(error);

    return NextResponse.json(
      {
        error:
          apiError.message,
      },
      {
        status:
          apiError.status,
      },
    );
  }
}

import { NextResponse } from "next/server";

import {
  requireFirebaseUser,
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
      await requireFirebaseUser(
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

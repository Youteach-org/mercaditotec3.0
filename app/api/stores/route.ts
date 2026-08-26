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
  createStoreDraft,
  listStoresForOwner,
} from "@/lib/store/repository";

export const runtime = "nodejs";

export async function GET(
  request: Request,
) {
  try {
    const user =
      await requireFirebaseUser(
        request,
      );

    const stores =
      await listStoresForOwner(
        user.uid,
      );

    return NextResponse.json({
      stores:
        stores.map(
          serializeStore,
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

export async function POST(
  request: Request,
) {
  try {
    const user =
      await requireFirebaseUser(
        request,
      );

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
      await createStoreDraft(
        user.uid,
        input,
      );

    return NextResponse.json(
      {
        store:
          serializeStore(
            store,
          ),
      },
      {
        status: 201,
      },
    );
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

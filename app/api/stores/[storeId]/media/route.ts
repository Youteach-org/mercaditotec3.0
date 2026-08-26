import { NextResponse } from "next/server";

import {
  requireFirebaseUser,
} from "@/lib/store/auth";

import {
  serializeStore,
  toApiError,
} from "@/lib/store/http";

import {
  setStoreMedia,
} from "@/lib/store/storeMediaRepository";

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

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "Datos de imagen inválidos.",
        },
        {
          status: 400,
        },
      );
    }

    const data =
      body as Record<
        string,
        unknown
      >;

    const kind =
      data.kind;

    if (
      kind !== "logo" &&
      kind !== "cover"
    ) {
      return NextResponse.json(
        {
          error:
            "Tipo de imagen inválido.",
        },
        {
          status: 400,
        },
      );
    }

    const url =
      data.url === null
        ? null
        : typeof data.url ===
          "string"
          ? data.url
          : undefined;

    if (
      url === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "URL de imagen inválida.",
        },
        {
          status: 400,
        },
      );
    }

    const store =
      await setStoreMedia(
        user.uid,
        storeId,
        kind,
        url,
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

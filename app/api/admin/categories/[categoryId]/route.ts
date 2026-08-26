import { NextResponse } from "next/server";

import {
  requireAdmin,
} from "@/lib/store/auth";

import {
  CategoryRepositoryError,
  serializeCategory,
  updateCategory,
} from "@/lib/store/categoryRepository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    categoryId: string;
  }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    await requireAdmin(request);

    const {
      categoryId,
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

    const category =
      await updateCategory(
        categoryId,
        body as {
          name: string;
          active: boolean;
        },
      );

    return NextResponse.json({
      category:
        serializeCategory(
          category,
        ),
    });
  } catch (error) {
    if (
      error instanceof
      CategoryRepositoryError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status:
            error.status,
        },
      );
    }

    console.error(
      "PATCH_CATEGORY_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error interno.",
      },
      {
        status: 500,
      },
    );
  }
}

import { NextResponse } from "next/server";

import {
  requireAdmin,
} from "@/lib/store/auth";

import {
  CategoryRepositoryError,
  createCategory,
  listAllCategories,
  serializeCategory,
} from "@/lib/store/categoryRepository";

export const runtime = "nodejs";

function apiError(
  error: unknown,
) {
  if (
    error instanceof
    CategoryRepositoryError
  ) {
    return {
      status:
        error.status,

      message:
        error.message,
    };
  }

  console.error(
    "CATEGORY_ADMIN_ERROR",
    error,
  );

  return {
    status: 500,
    message:
      "Ocurrió un error interno.",
  };
}

export async function GET(
  request: Request,
) {
  try {
    await requireAdmin(request);

    const categories =
      await listAllCategories();

    return NextResponse.json({
      categories:
        categories.map(
          serializeCategory,
        ),
    });
  } catch (error) {
    const result =
      apiError(error);

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

export async function POST(
  request: Request,
) {
  try {
    await requireAdmin(request);

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
      await createCategory(
        body as {
          name: string;
          active: boolean;
        },
      );

    return NextResponse.json(
      {
        category:
          serializeCategory(
            category,
          ),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    const result =
      apiError(error);

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

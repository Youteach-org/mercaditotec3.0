import { NextResponse } from "next/server";

import {
  listActiveCategories,
  serializeCategory,
} from "@/lib/store/categoryRepository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories =
      await listActiveCategories();

    return NextResponse.json({
      categories:
        categories.map(
          serializeCategory,
        ),
    });
  } catch (error) {
    console.error(
      "GET_CATEGORIES_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "No se pudieron cargar las categorías.",
      },
      {
        status: 500,
      },
    );
  }
}

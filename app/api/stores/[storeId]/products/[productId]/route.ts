import { NextResponse } from "next/server";

import {
  requireUnblockedUser,
} from "@/lib/store/auth";

import {
  parseProductInput,
  serializeProduct,
  toProductApiError,
} from "@/lib/store/productHttp";

import {
  deleteProduct,
  updateProduct,
} from "@/lib/store/productRepository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    storeId: string;
    productId: string;
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
      productId,
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
      parseProductInput(
        body,
      );

    const product =
      await updateProduct(
        user.uid,
        storeId,
        productId,
        input,
      );

    return NextResponse.json({
      product:
        serializeProduct(
          product,
        ),
    });
  } catch (error) {
    const apiError =
      toProductApiError(
        error,
      );

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

export async function DELETE(
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
      productId,
    } = await context.params;

    await deleteProduct(
      user.uid,
      storeId,
      productId,
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    const apiError =
      toProductApiError(
        error,
      );

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

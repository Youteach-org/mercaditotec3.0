import { NextResponse } from "next/server";

import {
  requireFirebaseUser,
} from "@/lib/store/auth";

import {
  parseProductInput,
  serializeProduct,
  toProductApiError,
} from "@/lib/store/productHttp";

import {
  createProduct,
  listProductsForOwner,
} from "@/lib/store/productRepository";

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

    const products =
      await listProductsForOwner(
        user.uid,
        storeId,
      );

    return NextResponse.json({
      products:
        products.map(
          serializeProduct,
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

export async function POST(
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
      parseProductInput(
        body,
      );

    const product =
      await createProduct(
        user.uid,
        storeId,
        input,
      );

    return NextResponse.json(
      {
        product:
          serializeProduct(
            product,
          ),
      },
      {
        status: 201,
      },
    );
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

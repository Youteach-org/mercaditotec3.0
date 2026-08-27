import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/store/auth";
import {
  listAllCategories,
  serializeCategory,
} from "@/lib/store/categoryRepository";
import { serializeStore, toApiError } from "@/lib/store/http";
import { serializeProduct } from "@/lib/store/productHttp";
import { listProductsForAdmin } from "@/lib/store/productRepository";
import { getStoreForAdmin } from "@/lib/store/repository";

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
    await requireAdmin(request);

    const { storeId } = await context.params;

    const [store, products, categories] = await Promise.all([
      getStoreForAdmin(storeId),
      listProductsForAdmin(storeId),
      listAllCategories(),
    ]);

    return NextResponse.json({
      store: serializeStore(store),
      products: products.map(serializeProduct),
      categories: categories.map(serializeCategory),
    });
  } catch (error) {
    const apiError = toApiError(error);

    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.status },
    );
  }
}

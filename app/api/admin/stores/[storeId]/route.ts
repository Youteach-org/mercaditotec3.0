import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/store/auth";
import { getAdminDb } from "@/lib/firestoreRest";
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

    const ownerSnapshot = await getAdminDb()
      .collection("users")
      .doc(store.ownerUid)
      .get();
    const ownerData = ownerSnapshot.data() ?? {};

    return NextResponse.json({
      store: serializeStore(store),
      products: products.map(serializeProduct),
      categories: categories.map(serializeCategory),
      owner: {
        uid: store.ownerUid,
        nickname: String(ownerData.nickname ?? "").trim(),
        displayName: String(ownerData.displayName ?? "").trim(),
        email: String(ownerData.email ?? "").trim(),
        studentStatus: String(ownerData.studentStatus ?? "pending"),
        studentEndorsementCount: Number(ownerData.studentEndorsementCount ?? 0),
      },
    });
  } catch (error) {
    const apiError = toApiError(error);

    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.status },
    );
  }
}

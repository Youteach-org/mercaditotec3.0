import { NextResponse } from "next/server";

import { DEMO_MARKETPLACE_STORES } from "@/lib/store/demoMarketplace";
import { getMarketplaceContent } from "@/lib/store/marketplaceContentRepository";
import { listPublicStores } from "@/lib/store/publicMarketplaceRepository";
import {
  listActiveCategories,
  serializeCategory,
} from "@/lib/store/categoryRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
};

export async function GET() {
  try {
    const [liveStores, content, categories] = await Promise.all([
      listPublicStores(),
      getMarketplaceContent(),
      listActiveCategories(),
    ]);

    const temporaryExamples = DEMO_MARKETPLACE_STORES
      .filter((demoStore) => !liveStores.some((liveStore) => liveStore.id === demoStore.id))
      .slice(0, Math.max(0, 6 - liveStores.length));

    const stores = [...liveStores, ...temporaryExamples];

    return NextResponse.json(
      {
        stores,
        content,
        categories: categories.map(serializeCategory),
        temporaryExamplesEnabled: true,
        realStoreCount: liveStores.length,
        exampleStoreCount: temporaryExamples.length,
        totalStoreCount: stores.length,
        revision: "marketplace-demo-v2",
      },
      { headers: HEADERS },
    );
  } catch (error) {
    console.error("Marketplace v2 load error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el Mercadito." },
      { status: 500, headers: HEADERS },
    );
  }
}

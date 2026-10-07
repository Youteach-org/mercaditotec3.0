import { NextResponse } from "next/server";

import { DEMO_MARKETPLACE_STORES } from "@/lib/store/demoMarketplace";
import { getMarketplaceContent } from "@/lib/store/marketplaceContentRepository";
import { listPublicStores } from "@/lib/store/publicMarketplaceRepository";
import {
  listActiveCategories,
  serializeCategory,
} from "@/lib/store/categoryRepository";

export const runtime = "nodejs";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
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
      },
      { headers: PUBLIC_CACHE_HEADERS },
    );
  } catch (error) {
    // Only safe diagnostic metadata is logged. Never expose account details
    // or backend credentials in public HTTP responses.
    console.error(
      "PUBLIC_MARKETPLACE_RUNTIME_ERROR",
      error instanceof Error ? error.name : "UnknownError",
      error instanceof Error ? error.message.slice(0, 240) : "Unexpected backend error",
    );
    return NextResponse.json(
      { error: "No se pudo cargar el Mercadito." },
      { status: 500 },
    );
  }
}

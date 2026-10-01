import { NextResponse } from "next/server";

import { DEMO_MARKETPLACE_STORES } from "@/lib/store/demoMarketplace";
import { getMarketplaceContent } from "@/lib/store/marketplaceContentRepository";
import { listPublicStores } from "@/lib/store/publicMarketplaceRepository";

export const runtime = "nodejs";

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

export async function GET() {
  try {
    const [liveStores, content] = await Promise.all([
      listPublicStores(),
      getMarketplaceContent(),
    ]);

    const temporaryExamples = DEMO_MARKETPLACE_STORES
      .filter((demoStore) => !liveStores.some((liveStore) => liveStore.id === demoStore.id))
      .slice(0, Math.max(0, 6 - liveStores.length));

    const stores = [...liveStores, ...temporaryExamples];

    return NextResponse.json(
      {
        stores,
        content,
        temporaryExamplesEnabled: true,
        realStoreCount: liveStores.length,
        exampleStoreCount: temporaryExamples.length,
      },
      { headers: PUBLIC_CACHE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar el Mercadito." },
      { status: 500 },
    );
  }
}

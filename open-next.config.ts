import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Static routes are prerendered by Next at build time. Use Cloudflare's
// read-only Static Assets cache for their initial content rather than costly
// runtime regeneration on the Workers Free 10 ms CPU budget.
// Authenticated APIs and dynamic routes keep their normal server execution.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});

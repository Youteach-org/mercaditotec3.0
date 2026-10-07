import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const publicStore = readFileSync(
  join(here, "..", "..", "app", "marketplace", "stores", "[slug]", "page.tsx"),
  "utf8",
);
const preview = readFileSync(join(here, "StorefrontPreview.tsx"), "utf8");

describe("logo overlay without changing approved storefront aesthetics", () => {
  it("restores the exact original clipped rounded card and unmodified cover", () => {
    expect(publicStore).toContain(
      '<header className="overflow-hidden rounded-3xl bg-white shadow-lg">',
    );
    expect(publicStore).toContain(
      '<div className="relative h-44 bg-gradient-to-br from-slate-900 to-slate-600 sm:h-60">',
    );
    expect(publicStore).toContain('<div className="p-5 sm:p-7">');
    expect(publicStore).not.toContain("relative isolate overflow-visible rounded-3xl");
    expect(publicStore).not.toContain("rounded-t-3xl bg-gradient-to-br");
  });

  it("changes only the logo stacking priority while keeping its original sizing and overlap", () => {
    expect(publicStore).toContain(
      'className="relative z-10 -mt-14 h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-md"',
    );
    expect(publicStore).toContain('src={store.logoUrl}');
    expect(publicStore).toContain('src={store.coverUrl}');
  });

  it("restores the original preview without unrelated logo styling changes", () => {
    expect(preview).toContain(
      'className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-24 lg:w-24"',
    );
    expect(preview).not.toContain('className="relative z-20 flex h-20 w-20');
  });
});

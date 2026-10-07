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

describe("store logo sits over cover in all storefront headers", () => {
  it("does not clip the overlapping logo at the public header boundary", () => {
    expect(publicStore).toContain(
      '<header className="relative isolate overflow-visible rounded-3xl bg-white shadow-lg">',
    );
    expect(publicStore).not.toContain(
      '<header className="overflow-hidden rounded-3xl bg-white shadow-lg">',
    );
  });

  it("clips the cover itself, under the brand information and logo", () => {
    expect(publicStore).toContain(
      'className="relative z-0 h-44 overflow-hidden rounded-t-3xl',
    );
    expect(publicStore).toContain('className="relative z-10 p-5 sm:p-7"');
    expect(publicStore).toContain(
      'className="relative z-20 -mt-14 h-24 w-24',
    );

    const banner = publicStore.indexOf("relative z-0 h-44");
    const details = publicStore.indexOf("relative z-10 p-5 sm:p-7");
    const logo = publicStore.indexOf("relative z-20 -mt-14 h-24");
    expect(banner).toBeGreaterThan(0);
    expect(details).toBeGreaterThan(banner);
    expect(logo).toBeGreaterThan(details);
  });

  it("keeps the store logo on top in mobile/desktop preview used by owner and admins", () => {
    expect(preview).toContain(
      'className="relative z-20 flex h-20 w-20',
    );
    expect(preview).toContain('alt="Logo de la tienda"');
  });

  it("preserves zoomable images instead of replacing actual logo with decoration", () => {
    expect(publicStore).toContain("src={store.logoUrl}");
    expect(publicStore).toContain("src={store.coverUrl}");
    expect(preview).toContain("src={logoUrl}");
  });
});

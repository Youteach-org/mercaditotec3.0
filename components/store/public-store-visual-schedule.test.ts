import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const storefront = readFileSync(
  join(root, "app", "marketplace", "stores", "[slug]", "page.tsx"), "utf8",
);
const grid = readFileSync(
  join(root, "components", "store", "StoreScheduleGrid.tsx"), "utf8",
);

describe("public storefront weekly visual timetable", () => {
  it("uses the existing seven-day hourly grid instead of a text-only list", () => {
    expect(storefront).toContain('import StoreScheduleGrid from "@/components/store/StoreScheduleGrid"');
    expect(storefront).toContain("<StoreScheduleGrid schedule={store.schedule} publicView />");
    expect(storefront).toContain("Horario de atención");
    expect(storefront).toContain("Disponible");
    expect(storefront).toContain("No disponible");
    expect(storefront).not.toContain('slots.join(", ")');
    expect(storefront).not.toContain("STORE_WEEK_DAYS.map");
  });

  it("keeps all 7 days and all time slots visible in the read-only public variant", () => {
    expect(grid).toContain("publicView?: boolean");
    expect(grid).toContain("publicView = false");
    expect(grid).toContain("STORE_WEEK_DAYS.map((day)");
    expect(grid).toContain("STORE_HOURS.map((hour)");
    expect(grid).toContain("schedule[day].slots.includes(hour)");
    expect(grid).toContain("aria-label={");
    expect(grid).toContain("disabled={!editable}");
    expect(grid).toContain("publicView ? (\n              DAY_LABELS[day]");
    expect(grid).toContain("publicView ? (\n                hour");
  });

  it("uses the available width and does not reserve half the catalog for a missing second product", () => {
    expect(storefront).toContain('max-w-[1500px]');
    expect(storefront).toContain('store.products.length === 1');
    expect(storefront).toContain('"grid gap-6 lg:grid-cols-2 lg:items-start"');
    expect(storefront).toContain('minmax(350px,440px)');
    expect(storefront).toContain('"grid-cols-1" : "sm:grid-cols-2"');
    expect(storefront).toContain('className="min-w-0"');
  });

  it("shows the normal timetable even while manual open/closed override is active", () => {
    expect(storefront).toContain('store.operationalMode === "manual"');
    expect(storefront).toContain("Pausada temporalmente");
    expect(storefront).toContain("Abierta temporalmente");
    expect(storefront).toContain("horario semanal mostrado");
    expect(storefront).toContain("<StoreScheduleGrid schedule={store.schedule} publicView />");
  });

  it("preserves the previously approved store header, layering and photo zoom", () => {
    expect(storefront).toContain('<header className="overflow-hidden rounded-3xl bg-white shadow-lg">');
    expect(storefront).toContain('className="relative z-10 -mt-14 h-24 w-24');
    expect(storefront).toContain('src={store.coverUrl}');
    expect(storefront).toContain('src={store.logoUrl}');
    expect(storefront).toContain('src={product.imageUrls[0]}');
  });
});

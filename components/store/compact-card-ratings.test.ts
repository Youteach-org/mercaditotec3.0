import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "..", "..", "app", "marketplace", "page.tsx"), "utf8");
const details = readFileSync(join(here, "..", "..", "app", "marketplace", "stores", "[slug]", "page.tsx"), "utf8");
const rating = readFileSync(join(here, "StoreEmojiRating.tsx"), "utf8");
const css = readFileSync(join(here, "..", "..", "app", "globals.css"), "utf8");

describe("compact emoji ratings on Marketplace cards", () => {
  it("only shows the interactive picker on real shop cards for authenticated visitors", () => {
    expect(page).toContain("ratingUser={!forceDemo && firebaseUser ? firebaseUser : null}");
    expect(page).toContain("{ratingUser && !requiresLogin && (");
    expect(page).toContain("<StoreEmojiRatingCard user={ratingUser} store={store} />");
    expect(page).not.toContain("<StoreRatingBadge store={store} />");
    expect(page).not.toContain("demoRating.toFixed");
  });

  it("keeps navigation separated from the rating button and the original image gesture", () => {
    expect(page).toContain('<div className={className}>');
    expect(page).toContain('className="mkt-store-card-link"');
    expect(page).toContain('target.closest(".mkt-store-photo, .mkt-store-logo")');
    const inner = page.split('<Link prefetch={false}')[1]?.split('</Link>')[0];
    expect(inner).toBeDefined();
    expect(inner).not.toContain("<StoreEmojiRatingCard");
    expect(page).toContain('</Link>\n      {ratingUser');
    expect(css).toContain(".mkt-store-card-link {");
    expect(css).toContain(".mkt-card-emoji-rating {");
  });

  it("fetches own votes only when a card is tapped, not at Marketplace startup", () => {
    expect(rating).toContain("async function openPicker()");
    expect(rating).toContain('cache: "no-store"');
    expect(rating).toContain("const response = await fetch(endpoint");
    expect(rating).toContain('method: "POST"');
    expect(rating).toContain("createPortal(");
    expect(rating).not.toContain("useEffect(() => {\n    void user.getIdToken()");
  });

  it("replaces the bulky store-page dashboard with just a compact summary", () => {
    expect(details).toContain("<StoreRatingBadge store={store} />");
    expect(details).not.toContain("<StoreEmojiRating ");
    expect(rating).not.toContain("Distribución de valoraciones");
    expect(css).toContain(".mkt-store-rating-summary {");
  });
});

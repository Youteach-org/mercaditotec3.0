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

  it("finds an actual unobstructed cloud location, instead of a fixed position over store names", () => {
    const cssBlock = css.split("/* STORE EMOJI RATINGS — 2026-10-14")[1];
    expect(cssBlock).toBeDefined();
    const desktop = cssBlock.split(".mkt-card-emoji-rating {")[1]?.split("}")[0];
    expect(desktop).toContain("left: var(--mkt-rating-x, 74%) !important;");
    expect(desktop).toContain("top: var(--mkt-rating-y, 40%) !important;");
    expect(desktop).toContain("visibility: hidden !important;");
    expect(cssBlock).toContain('.mkt-card-emoji-rating[data-positioned="true"]');
    const phone = cssBlock.split("@media (max-width: 620px) {")[1];
    expect(phone).toContain("left: var(--mkt-rating-x, 74%) !important;");
    expect(phone).toContain("top: var(--mkt-rating-y, 40%) !important;");
    expect(rating).toContain('".mkt-store-ribbon, .mkt-store-copy, .mkt-store-logo, .mkt-hand-note"');
    expect(rating).toContain("ratingBadgeCandidates(");
    expect(rating).toContain("ratingBadgeOverlapArea(bounds, obstacle.rect)");
    expect(rating).toContain('button.dataset.positioned = "true"');
    expect(rating).toContain('window.addEventListener("orientationchange", schedule)');
    expect(rating).toContain("new ResizeObserver(schedule)");
    expect(rating).not.toContain("top: 11%");
    expect(rating).not.toContain("bottom: 32%");
    expect(css).toContain("right: 8% !important;");
  });

  it("fetches own votes only when a card is tapped, not at Marketplace startup", () => {
    expect(rating).toContain("async function openPicker()");
    expect(rating).toContain('cache: "no-store"');
    expect(rating).toContain("const response = await fetch(endpoint");
    expect(rating).toContain('method: "POST"');
    expect(rating).toContain("createPortal(");
    expect(rating).not.toContain("useEffect(() => {\n    void user.getIdToken()");
  });

  it("displays only the emoji and rounded integer without /5, decimals or voter counts", () => {
    expect(rating).toContain("const label = display ? `${display.emoji} ${display.score}`");
    expect(rating).toContain("compactStoreRating(store.ratingAverage)");
    expect(rating).toContain("compactStoreRating(rating.ratingAverage)");
    expect(rating).not.toContain(".toFixed(1)");
    expect(rating).not.toContain("/5 ·");
    expect(rating).not.toContain("${count} valoraciones");
    expect(rating).not.toContain("ratingCount} votos");
  });

  it("replaces the bulky store-page dashboard with just a compact summary", () => {
    expect(details).toContain("<StoreRatingBadge store={store} />");
    expect(details).not.toContain("<StoreEmojiRating ");
    expect(rating).not.toContain("Distribución de valoraciones");
    expect(css).toContain(".mkt-store-rating-summary {");
  });
});

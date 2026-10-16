import { describe, expect, it, vi } from "vitest";
import { prohibitedTextReason, safeImageUrl, screenListing } from "./automaticReview.mjs";

const photo = "https://wfmokinfcypfpdisussw.supabase.co/storage/v1/object/public/chat-images/discover-listings/owneruid/6014afbe-fe4c-4b78-b178-27f96bc8be7a.jpg";
const input = { title: "Televisión de 43 pulgadas", description: "Usada, funciona bien", imageUrl: photo };
const jpeg = new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1,0,1]);
const fetchPhoto = vi.fn(async () => new Response(jpeg, { headers: { "content-type": "image/jpeg" } }));

describe("automatic prepublication product screening", () => {
  it("blocks alcohol, drugs and vapes in Spanish", () => {
    for (const term of ["Cerveza", "TEQUILA", "Vino tinto", "marihuana", "cocaína", "THC",
      "VAPE sin nicotina", "cigarrillo electrónico", "vapeadores"]) {
      expect(prohibitedTextReason(term), term).not.toBeNull();
    }
    for (const term of ["Televisión", "Fresas con crema", "Vestido rojo", "Bicicleta", "Coca-Cola", "Libros"]) {
      expect(prohibitedTextReason(term), term).toBeNull();
    }
  });

  it("rejects external image hosts or tampered photo URLs", () => {
    expect(safeImageUrl(photo)).toBe(true);
    expect(safeImageUrl("https://evil.com/a.jpg")).toBe(false);
    expect(safeImageUrl(photo + "?redirect=https://evil.com")).toBe(false);
  });

  it("cannot allow alcohol or drugs even if the model would say APPROVE", async () => {
    const run = vi.fn(async () => ({ response: JSON.stringify({
      decision: "APPROVE", matchesText: true, containsProhibited: false,
      item: "beverage", confidence: 1,
    }) }));
    const result = await screenListing({ ...input, description: "Paquete de cerveza" }, { run }, fetchPhoto);
    expect(result.decision).toBe("blocked");
    expect(run).not.toHaveBeenCalled();
  });

  it("approves ordinary goods only after explicit visual AI approval", async () => {
    const ai = { run: vi.fn(async () => ({ response: JSON.stringify({
      decision: "APPROVE", matchesText: true, containsProhibited: false,
      item: "flat screen television", confidence: 0.99,
    }) })) };
    expect((await screenListing(input, ai, fetchPhoto)).decision).toBe("approved");
    expect(ai.run.mock.calls[0][0]).toBe("@cf/google/gemma-4-26b-a4b-it");
    expect(JSON.stringify(ai.run.mock.calls[0][1])).toContain("image_url");
  });

  it("fails closed on uncertainty, missing AI, bad output and model outages", async () => {
    expect((await screenListing(input, null, fetchPhoto)).decision).toBe("needs_changes");
    for (const response of [
      "APPROVE",
      '{"decision":"APPROVE","matchesText":false,"containsProhibited":false,"item":"tv","confidence":1}',
      '{"decision":"APPROVE","matchesText":true,"containsProhibited":false,"item":"television","confidence":0.8}',
      '{"decision":"APPROVE","matchesText":true,"containsProhibited":true,"item":"television","confidence":1}',
      '{"decision":"UNCERTAIN","matchesText":false,"containsProhibited":false,"item":"","confidence":0}',
      "Plain text no JSON",
    ]) {
      expect((await screenListing(input, { run: async () => ({ response }) }, fetchPhoto)).decision)
        .not.toBe("approved");
    }
    expect((await screenListing(input, { run: async () => { throw new Error("quota"); } }, fetchPhoto)).decision)
      .toBe("needs_changes");
  });

  it("never approves non-image data", async () => {
    const badFetch = async () => new Response(new TextEncoder().encode("not a jpeg image"));
    const result = await screenListing(input, { run: vi.fn() }, badFetch);
    expect(result.decision).toBe("needs_changes");
  });
});

import { describe, expect, it, vi } from "vitest";
import { prohibitedTextReason, safeImageUrl, screenListing, classifyAutomaticReviewError } from "./automaticReview.mjs";

const photo = "https://wfmokinfcypfpdisussw.supabase.co/storage/v1/object/public/chat-images/discover-listings/owneruid/6014afbe-fe4c-4b78-b178-27f96bc8be7a.jpg";
const storePhoto = "https://wfmokinfcypfpdisussw.supabase.co/storage/v1/object/public/chat-images/stores/owneruid/store123/products/product123/nonce123.jpg";
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

  it("accepts owner-scoped shop product photos through the same image reviewer", async () => {
    expect(safeImageUrl(storePhoto)).toBe(true);
    expect(safeImageUrl(storePhoto + "?redirect=https://evil.com")).toBe(false);
    const ai = { run: async () => ({ response: JSON.stringify({ decision: "APPROVE", matchesText: true, containsProhibited: false, item: "televisión", confidence: 0.96 }) }) };
    expect((await screenListing({ ...input, imageUrl: storePhoto }, ai, fetchPhoto)).decision).toBe("approved");
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
    const ai = { run: vi.fn(async (_model: string, _payload: unknown) => ({ response: JSON.stringify({
      decision: "APPROVE", matchesText: true, containsProhibited: false,
      item: "flat screen television", confidence: 0.99,
    }) })) };
    expect((await screenListing(input, ai, fetchPhoto)).decision).toBe("approved");
    expect(ai.run.mock.calls[0][0]).toBe("@cf/google/gemma-4-26b-a4b-it");
    expect(JSON.stringify(ai.run.mock.calls[0][1])).toContain("image_url");
    expect(ai.run.mock.calls[0][1]).toMatchObject({
      chat_template_kwargs: { enable_thinking: false },
      max_tokens: 240,
    });
  });

  it("parses the actual Gemma 4 native choices response", async () => {
    const payload = { decision: "APPROVE", matchesText: true, containsProhibited: false,
      item: "video game controller", confidence: 0.96 };
    const result = await screenListing(
      { ...input, title: "Control de videojuegos" },
      { run: async () => ({
        id: "completion", choices: [{
          finish_reason: "stop",
          message: { role: "assistant", content: JSON.stringify(payload) },
        }],
      }) },
      fetchPhoto,
    );
    expect(result.decision).toBe("approved");
  });

  it("supports a complete fenced JSON response and parsed JSON responses", async () => {
    const payload = { decision: "APPROVE", matchesText: true, containsProhibited: false,
      item: "video game controller", confidence: 0.97 };
    for (const response of [
      { choices: [{ message: { content: "```json\n" + JSON.stringify(payload) + "\n```" }, finish_reason: "stop" }] },
      { response: payload },
      { choices: [{ message: { parsed: payload }, finish_reason: "stop" }] },
      { choices: [{ message: { content: [{ type: "text", text: JSON.stringify(payload) }] }, finish_reason: "stop" }] },
    ]) {
      expect((await screenListing(input, { run: async () => response }, fetchPhoto)).decision).toBe("approved");
    }
  });

  it("keeps ambiguous, truncated, or invalid AI responses private for human review", async () => {
    for (const response of [
      { choices: [{ message: { content: "I think this is a video game controller" }, finish_reason: "stop" }] },
      { choices: [{ message: { content: '{"decision":"UNCERTAIN"}' }, finish_reason: "stop" }] },
      { choices: [{ message: { content: '{"decision":"APPROVE"}' }, finish_reason: "length" }] },
      { response: JSON.stringify({ decision: "APPROVE", matchesText: true, containsProhibited: false,
        item: "controller", confidence: 0.80 }) },
      { response: 'Valid product: {"decision":"APPROVE","matchesText":true,"containsProhibited":false,"item":"controller","confidence":0.99}' },
    ]) {
      const result = await screenListing(input, { run: async () => response }, fetchPhoto);
      expect(result.decision).toBe("manual_review");
      expect(result.reason).toContain("revisión manual");
    }
  });

  it("blocks only explicit forbidden visual detections", async () => {
    const blocked = { decision: "BLOCK", containsProhibited: true, matchesText: false,
      item: "vapeador", confidence: 0.98 };
    expect((await screenListing(input, { run: async () => ({ response: JSON.stringify(blocked) }) }, fetchPhoto)).decision)
      .toBe("blocked");
    expect((await screenListing(input, { run: async () => ({ response: JSON.stringify({ ...blocked, containsProhibited: false }) }) }, fetchPhoto)).decision)
      .toBe("manual_review");
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

  it("distinguishes exhausted free quota, overloaded AI and inaccessible image downloads", () => {
    const quota = classifyAutomaticReviewError(new Error("3036: You have used up your daily free allocation of 10,000 neurons"));
    expect(quota.category).toBe("daily-quota");
    expect(quota.message).toContain("cuota gratuita");
    expect(classifyAutomaticReviewError(new Error("3040: Capacity temporarily exceeded")).category).toBe("capacity");
    expect(classifyAutomaticReviewError({ status: 429, message: "unknown throttle" }).category).toBe("rate-limit");
    expect(classifyAutomaticReviewError(new Error("fetch failed"), "photo").category).toBe("photo-fetch");
    expect(classifyAutomaticReviewError({ status: 403, message: "model unauthorized" }).category).toBe("model-access");
    expect(classifyAutomaticReviewError({ name: "TimeoutError" }).category).toBe("timeout");
  });

  it("never approves a listing after an AI quota failure", async () => {
    const ai = { run: vi.fn(async () => { throw new Error("3036: free allocation"); }) };
    const result = await screenListing(input, ai, fetchPhoto);
    expect(result.decision).toBe("manual_review");
    expect(result.reason).toContain("revisión manual");
  });

    it("never sends model outages or capacity errors to manual approval", async () => {
    for (const error of [new Error("3040: Capacity temporarily exceeded"), new Error("unknown")]) {
      const result = await screenListing(input, { run: async () => { throw error; } }, fetchPhoto);
      expect(result.decision).toBe("needs_changes");
    }
  });

  it("accepts Supabase CDN redirects without passing bearer credentials", async () => {
    const ai = { run: vi.fn(async () => ({ response: JSON.stringify({
      decision: "APPROVE", matchesText: true, containsProhibited: false,
      item: "video game controller", confidence: 0.99,
    }) })) };
    const fetcher = vi.fn(async (_url: RequestInfo | URL, opts?: RequestInit) => {
      expect(opts?.redirect).toBe("follow");
      expect(new Headers(opts?.headers).has("authorization")).toBe(false);
      return new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } });
    });
    expect((await screenListing(input, ai, fetcher)).decision).toBe("approved");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries Supabase fetch once, without multiple AI invocations", async () => {
    const ai = { run: vi.fn(async () => ({ response: JSON.stringify({
      decision: "APPROVE", matchesText: true, containsProhibited: false,
      item: "video game controller", confidence: 0.99,
    }) })) };
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(jpeg));
    expect((await screenListing(input, ai, fetcher)).decision).toBe("approved");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(ai.run).toHaveBeenCalledTimes(1);
  });

  it("sends Supabase network outages to manual review, never to public feed", async () => {
    const ai = { run: vi.fn() };
    const fetcher = vi.fn(async () => { throw new TypeError("network unreachable"); });
    const result = await screenListing(input, ai, fetcher);
    expect(result.decision).toBe("manual_review");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(ai.run).not.toHaveBeenCalled();
  });

  it("keeps nonexistent photos and oversized files out of manual approval", async () => {
    const ai = { run: vi.fn() };
    const missing = async () => new Response(null, { status: 404 });
    const oversized = async () => new Response("not a photo", {
      status: 200, headers: { "content-length": "1048577" },
    });
    expect((await screenListing(input, ai, missing)).decision).toBe("needs_changes");
    expect((await screenListing(input, ai, oversized)).decision).toBe("needs_changes");
    expect(ai.run).not.toHaveBeenCalled();
  });

  it("never approves non-image data", async () => {
    const badFetch = async () => new Response(new TextEncoder().encode("not a jpeg image"));
    const result = await screenListing(input, { run: vi.fn() }, badFetch);
    expect(result.decision).toBe("needs_changes");
  });
});

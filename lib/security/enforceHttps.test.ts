import { describe, expect, it } from "vitest";
import { enforceHttps } from "./enforceHttps.mjs";

describe("public HTTP to HTTPS security boundary", () => {
  it("forces the custom domain from HTTP to HTTPS without changing its path or query", () => {
    const response = enforceHttps(new Request("http://mercaditotec.store/chat?view=general&n=4"));
    expect(response?.status).toBe(308);
    expect(response?.headers.get("location"))
      .toBe("https://mercaditotec.store/chat?view=general&n=4");
  });

  it("also redirects shop routes, marketplace, APIs and any other public hostname", () => {
    for (const path of ["/", "/marketplace", "/marketplace/stores/k-rollos", "/api/chat/messages"]) {
      const response = enforceHttps(new Request("http://mercaditotec.store" + path));
      expect(response?.status).toBe(308);
      expect(response?.headers.get("location"))
        .toBe("https://mercaditotec.store" + path);
    }
  });

  it("keeps HTTPS requests intact", () => {
    expect(enforceHttps(new Request("https://mercaditotec.store/chat"))).toBeNull();
  });

  it("does not break local HTTP emulator access", () => {
    expect(enforceHttps(new Request("http://localhost:8787/chat"))).toBeNull();
    expect(enforceHttps(new Request("http://127.0.0.1:8787/chat"))).toBeNull();
  });
});

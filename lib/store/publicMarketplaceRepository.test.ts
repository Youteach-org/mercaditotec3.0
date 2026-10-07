import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicStoreDetail } from "./publicMarketplaceRepository";

vi.mock("../firebaseAdmin", () => ({
  getAdminAccessToken: async () => "test-service-token",
  getFirebaseProjectId: () => "test-project",
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function stringValue(value: string) {
  return { stringValue: value };
}

function booleanValue(value: boolean) {
  return { booleanValue: value };
}

function storeDocument() {
  return {
    name: "projects/test-project/databases/(default)/documents/stores/store-1",
    fields: {
      ownerUid: stringValue("owner-1"),
      name: stringValue("Tienda Uno"),
      slug: stringValue("tienda-uno"),
      description: stringValue("Descripción"),
      deliveryLocation: stringValue("Patio central"),
      status: stringValue("active"),
      operationalMode: stringValue("manual"),
      manualOpen: booleanValue(true),
      marketplaceLabel: stringValue("TIENDA UNO"),
      marketplaceNote: stringValue(""),
      marketplaceTags: { arrayValue: { values: [] } },
    },
  };
}

function database(ownerWhatsapp?: string, ownerExists = true) {
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);

    if (url.pathname.endsWith("/documents:runQuery")) {
      const body = JSON.parse(String(init?.body ?? "{}"));
      const collectionId = body?.structuredQuery?.from?.[0]?.collectionId;

      if (collectionId === "stores") {
        return Response.json([{ document: storeDocument() }]);
      }

      if (collectionId === "products") {
        return Response.json([]);
      }
    }

    if (url.pathname.endsWith("/documents/users/owner-1")) {
      if (!ownerExists) {
        return Response.json({}, { status: 404 });
      }

      return Response.json({
        name: "projects/test-project/databases/(default)/documents/users/owner-1",
        fields: {
          email: stringValue("owner@morelia.tecnm.mx"),
          role: stringValue("user"),
          ...(ownerWhatsapp ? { whatsappNumber: stringValue(ownerWhatsapp) } : {}),
        },
      });
    }

    throw new Error(`Unexpected Firestore request: ${url.pathname}`);
  });
}

describe("getPublicStoreDetail WhatsApp privacy", () => {
  it("derives a wa.me URL from the owner's stored WhatsApp number", async () => {
    database("+524431234567");

    const detail = await getPublicStoreDetail("tienda-uno");

    expect(detail.whatsappUrl).toBe("https://wa.me/524431234567");
  });

  it("returns null when the owner has no WhatsApp number", async () => {
    database();

    const detail = await getPublicStoreDetail("tienda-uno");

    expect(detail.whatsappUrl).toBeNull();
  });

  it("returns null when the owner profile is missing", async () => {
    database(undefined, false);

    const detail = await getPublicStoreDetail("tienda-uno");

    expect(detail.whatsappUrl).toBeNull();
  });

  it("does not expose owner identity or private profile fields", async () => {
    database("+524431234567");

    const detail = await getPublicStoreDetail("tienda-uno");

    expect(detail).not.toHaveProperty("ownerUid");
    expect(detail).not.toHaveProperty("whatsappNumber");
    expect(detail).not.toHaveProperty("email");
    expect(detail).not.toHaveProperty("role");
  });
});

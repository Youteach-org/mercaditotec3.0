import { describe, expect, it } from "vitest";

import { Timestamp } from "../firestoreRest";
import { CommunityDomainError } from "./domain";
import { serializeCommunityPost, toCommunityApiError } from "./http";

describe("serializeCommunityPost", () => {
  it("serializes timestamps without exposing extra fields", () => {
    expect(
      serializeCommunityPost({
        id: "post-1",
        authorUid: "student-1",
        type: "quick_notice",
        title: "Aviso",
        body: "Mensaje",
        location: "",
        imageUrl: null,
        status: "active",
        createdAt: Timestamp.fromDate(new Date("2026-10-07T12:00:00Z")),
        updatedAt: Timestamp.fromDate(new Date("2026-10-07T12:05:00Z")),
        resolvedAt: null,
      }),
    ).toEqual({
      id: "post-1",
      authorUid: "student-1",
      type: "quick_notice",
      title: "Aviso",
      body: "Mensaje",
      location: "",
      imageUrl: null,
      status: "active",
      createdAt: "2026-10-07T12:00:00.000Z",
      updatedAt: "2026-10-07T12:05:00.000Z",
      resolvedAt: null,
    });
  });
});

describe("toCommunityApiError", () => {
  it("preserves known status-bearing errors and hides unknown failures", () => {
    expect(
      toCommunityApiError(new CommunityDomainError(400, "Aviso inválido.")),
    ).toEqual({ status: 400, message: "Aviso inválido." });

    expect(toCommunityApiError(new Error("secret failure"))).toEqual({
      status: 500,
      message: "No se pudo procesar la publicación.",
    });
  });
});

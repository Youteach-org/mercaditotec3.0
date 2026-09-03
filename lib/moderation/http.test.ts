import { describe, expect, it } from "vitest";

import {
  parseAdminReportFilters,
  sanitizeAdminReporter,
  sanitizeAdminTarget,
  serializePublicMessage,
  serializeReporterReceipt,
} from "./http";

describe("moderation HTTP boundaries", () => {
  it("removes moderated content from a public message", () => {
    expect(serializePublicMessage({
      id: "m1",
      text: "contenido oculto",
      imageUrls: ["https://example.test/private.jpg"],
      senderId: "u1",
      senderName: "Alumno",
      createdAt: 10,
      hidden: true,
      hiddenReason: "dato administrativo",
    })).toEqual({
      id: "m1",
      text: "",
      imageUrls: [],
      senderId: "u1",
      senderName: "Alumno",
      createdAt: 10,
      hidden: true,
    });
  });

  it("returns a minimal receipt to the reporter", () => {
    expect(serializeReporterReceipt({
      id: "r1",
      status: "open",
      createdAt: "2026-09-02T12:00:00.000Z",
      reporterUid: "secret-reporter",
      targetSnapshot: { text: "secret target" },
    })).toEqual({
      id: "r1",
      status: "open",
      createdAt: "2026-09-02T12:00:00.000Z",
    });
  });

  it("normalizes supported filters and ignores invalid status values", () => {
    expect(parseAdminReportFilters(new URLSearchParams(
      "status=broken&targetType=message&reason=spam&search=%20m1%20",
    ))).toEqual({
      status: null,
      targetType: "message",
      reasonCode: "spam",
      search: "m1",
      from: null,
      to: null,
    });
  });

  it("does not expose unrelated user fields to report detail", () => {
    expect(sanitizeAdminReporter("u1", {
      email: "student@example.test",
      displayName: "Student",
      refreshToken: "must-not-leak",
    })).toEqual({
      uid: "u1",
      email: "student@example.test",
      displayName: "Student",
      nickname: "",
    });
  });

  it("limits the current message target to moderation fields", () => {
    expect(sanitizeAdminTarget("message", "m1", {
      text: "Reported",
      senderId: "u1",
      senderName: "Student",
      createdAt: 10,
      hidden: false,
      seenBy: { private: 20 },
    })).toEqual({
      id: "m1",
      text: "Reported",
      senderId: "u1",
      senderName: "Student",
      createdAt: 10,
      hidden: false,
      imageUrls: [],
    });
  });
});

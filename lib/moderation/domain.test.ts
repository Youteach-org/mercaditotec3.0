import { describe, expect, it } from "vitest";

import {
  allowedActionsForTarget,
  assertModerationState,
  assertReportTransition,
  isAdministrativeBlockActive,
  parseReportInput,
  parseResolutionInput,
  selectGeneralChatContext,
} from "./domain";

describe("report input", () => {
  it("accepts a controlled reason for the matching target", () => {
    expect(parseReportInput({
      targetType: "message",
      targetId: "message-1",
      reasonCode: "harassment",
      details: "Insultos repetidos",
    })).toEqual({
      targetType: "message",
      targetId: "message-1",
      reasonCode: "harassment",
      details: "Insultos repetidos",
    });
  });

  it("rejects a reason that belongs to another target type", () => {
    expect(() => parseReportInput({
      targetType: "message",
      targetId: "message-1",
      reasonCode: "prohibited_items",
    })).toThrow("El motivo no corresponde");
  });

  it("bounds explanatory details", () => {
    expect(() => parseReportInput({
      targetType: "store",
      targetId: "store-1",
      reasonCode: "fraud",
      details: "x".repeat(501),
    })).toThrow("500");
  });
});

describe("moderation resolution", () => {
  it("requires an administrative reason", () => {
    expect(() => parseResolutionInput({
      action: "message_hide",
      reason: "  ",
    })).toThrow("motivo administrativo");
  });

  it("only exposes actions valid for each target", () => {
    expect(allowedActionsForTarget("message")).toEqual([
      "dismiss",
      "message_hide",
      "message_restore",
      "user_block",
      "user_unblock",
      "trust_revoke",
      "trust_restore",
    ]);
    expect(allowedActionsForTarget("store")).not.toContain("message_hide");
  });

  it("rejects resolving an already terminal report", () => {
    expect(() => assertReportTransition("resolved", "resolved")).toThrow(
      "ya fue resuelto",
    );
    expect(() => assertReportTransition("dismissed", "resolved")).toThrow(
      "ya fue resuelto",
    );
  });

  it("rejects restoring a visible message", () => {
    expect(() => assertModerationState(
      "message",
      "message_restore",
      { hidden: false },
      new Date("2026-09-02T12:00:00Z"),
    )).toThrow("ya está visible");
  });

  it("only reactivates a suspended store", () => {
    expect(() => assertModerationState(
      "store",
      "store_reactivate",
      { status: "active" },
      new Date("2026-09-02T12:00:00Z"),
    )).toThrow("no está suspendida");
  });
});

describe("temporary blocks", () => {
  const now = new Date("2026-09-02T12:00:00.000Z");

  it("treats a future block as active", () => {
    expect(isAdministrativeBlockActive({
      blocked: true,
      blockedUntil: "2026-09-03T12:00:00.000Z",
    }, now)).toBe(true);
  });

  it("treats an expired block as inactive", () => {
    expect(isAdministrativeBlockActive({
      blocked: true,
      blockedUntil: Date.parse("2026-09-01T12:00:00.000Z"),
    }, now)).toBe(false);
  });
});

describe("general chat context", () => {
  const messages = Array.from({ length: 15 }, (_, index) => ({
    id: `m${index + 1}`,
    createdAt: index + 1,
  }));

  it("selects five messages before and after the reported message", () => {
    expect(selectGeneralChatContext(messages, "m8", 5).map((item) => item.id))
      .toEqual(["m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "m11", "m12", "m13"]);
  });

  it("sorts chronologically and never pads beyond room boundaries", () => {
    expect(selectGeneralChatContext([...messages].reverse(), "m2", 5).map((item) => item.id))
      .toEqual(["m1", "m2", "m3", "m4", "m5", "m6", "m7"]);
  });
});

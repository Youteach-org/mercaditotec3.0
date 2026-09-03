import { describe, expect, it } from "vitest";

import {
  actionOptionsForTarget,
  buildReportPayload,
  moderationActionLabel,
  reportStatusOptions,
  reportTargetLabel,
} from "./client";

describe("moderation client metadata", () => {
  it("provides all queue status filters", () => {
    expect(reportStatusOptions.map((option) => option.value)).toEqual([
      "open",
      "in_review",
      "resolved",
      "dismissed",
    ]);
  });

  it("uses clear Spanish moderation labels", () => {
    expect(moderationActionLabel("message_hide")).toBe("Ocultar mensaje");
    expect(moderationActionLabel("store_request_changes")).toBe("Solicitar cambios");
    expect(reportTargetLabel("message")).toBe("Mensaje del chat general");
  });

  it("does not offer store actions for a message report", () => {
    expect(actionOptionsForTarget("message").map((option) => option.value))
      .not.toContain("store_suspend");
  });

  it("trims the student explanation before submission", () => {
    expect(buildReportPayload({
      targetType: "message",
      targetId: "m1",
      reasonCode: "spam",
      details: "  Publicidad repetida  ",
    })).toEqual({
      targetType: "message",
      targetId: "m1",
      reasonCode: "spam",
      details: "Publicidad repetida",
    });
  });
});

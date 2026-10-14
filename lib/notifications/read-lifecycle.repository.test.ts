import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminDb, Timestamp } from "../firestoreRest";
import {
  acknowledgeNotificationsAtDestination,
  listUnreadNotificationsForUser,
} from "./repository";

vi.mock("../firestoreRest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../firestoreRest")>();
  return { ...actual, getAdminDb: vi.fn() };
});

type Row = Record<string, unknown>;
const rows = new Map<string, Row>();
const userCounters = new Map<string, number>();
const updatedIds: string[] = [];

function makeNotification(id: string, recipientUid: string, type: string, href: string, dedupeKey = id, read = false) {
  rows.set(id, {
    recipientUid, type, href, title: "Aviso", message: "Nuevo evento",
    dedupeKey, createdAt: Timestamp.fromMillis(1_000 + rows.size),
    readAt: read ? Timestamp.fromMillis(2_000) : null,
  });
}

beforeEach(() => {
  rows.clear();
  userCounters.clear();
  updatedIds.length = 0;
  vi.mocked(getAdminDb).mockReturnValue({
    collection: (name: string) => {
      if (name === "users") {
        return { doc: (id: string) => ({
          update: async (data: Row) => { userCounters.set(id, Number(data.unreadNotificationCount)); },
        }) };
      }
      const filters: Array<[string, unknown]> = [];
      const query: Record<string, unknown> = {
        where: (key: string, _op: string, value: unknown) => {
          filters.push([key, value]);
          return query;
        },
        limit: (_count: number) => query,
        get: async () => ({
          docs: [...rows.entries()]
            .filter(([, value]) => filters.every(([field, expected]) => value[field] === expected))
            .map(([id, data]) => ({ id, data: () => data, ref: { id } })),
        }),
        count: () => ({
          get: async () => ({
            data: () => ({ count: [...rows.values()].filter(row =>
              filters.every(([field, expected]) => row[field] === expected)).length }),
          }),
        }),
      };
      return query;
    },
    batch: () => {
      const changes: string[] = [];
      return {
        update: (reference: { id: string }, _data: Row) => { changes.push(reference.id); },
        commit: async () => {
          for (const id of changes) {
            rows.set(id, { ...rows.get(id), readAt: Timestamp.now() });
            updatedIds.push(id);
          }
        },
      };
    },
  } as unknown as ReturnType<typeof getAdminDb>);
});

describe("notification read lifecycle", () => {
  it("lists only pending events and folds legacy copies with the same event key", async () => {
    makeNotification("a", "user-1", "order_accepted", "/orders", "order:123:accepted");
    makeNotification("a-copy", "user-1", "order_accepted", "/orders", "order:123:accepted");
    makeNotification("read", "user-1", "order_accepted", "/orders", "order:123:ready", true);
    makeNotification("other", "user-2", "order_accepted", "/orders");
    const data = await listUnreadNotificationsForUser("user-1");
    expect(data).toHaveLength(1);
    expect(data[0].dedupeKey).toBe("order:123:accepted");
  });

  it("clears only linked alerts of the signed-in account and synchronizes the badge", async () => {
    makeNotification("order-a", "user-1", "order_accepted", "/orders");
    makeNotification("chat-a", "user-1", "direct_message", "/chat/personal/sender-1");
    makeNotification("chat-b", "user-1", "direct_message", "/chat/personal/sender-2");
    makeNotification("other-account", "user-2", "order_accepted", "/orders");
    const result = await acknowledgeNotificationsAtDestination("user-1", "/chat/personal/sender-1");
    expect(result).toEqual({ updatedCount: 1, notificationIds: ["chat-a"] });
    expect(updatedIds).toEqual(["chat-a"]);
    expect(userCounters.get("user-1")).toBe(2);
    expect(rows.get("chat-a")?.readAt).toBeInstanceOf(Timestamp);
    expect(rows.get("chat-b")?.readAt).toBeNull();
    expect(rows.get("other-account")?.readAt).toBeNull();
    await acknowledgeNotificationsAtDestination("user-1", "/chat/personal/sender-1");
    expect(updatedIds).toHaveLength(1);
    await acknowledgeNotificationsAtDestination("user-1", "/orders");
    expect(userCounters.get("user-1")).toBe(1);
  });

  it("never marks messages read when merely viewing the inbox overview", async () => {
    makeNotification("chat-a", "user-1", "direct_message", "/chat/personal/sender-1");
    expect(await acknowledgeNotificationsAtDestination("user-1", "/chat/personal")).toEqual({
      updatedCount: 0, notificationIds: [],
    });
    expect(updatedIds).toHaveLength(0);
  });
});

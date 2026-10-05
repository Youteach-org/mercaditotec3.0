import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { getAdminDb } from "../firestoreRest";
import { toggleMessageReaction, savePersonalImage } from "./personalActions";
vi.mock("../firebaseAdmin", () => ({ getAdminAccessToken: async () => "owner", getFirebaseProjectId: () => "demo-mercadito-security" }));
const nativeFetch = globalThis.fetch;
describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("real Firestore transactions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", (input: string, options?: RequestInit) => {
      if (!input.startsWith("https://firestore.googleapis.com/")) throw new Error("External requests forbidden in emulator test");
      return nativeFetch(input.replace("https://firestore.googleapis.com", `http://${process.env.FIRESTORE_EMULATOR_HOST}`), options);
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("two simultaneous toggles return to no reaction", async () => {
    const db = getAdminDb();
    await db.collection("messages").doc("concurrent-message").set({ hidden: false, expiresAt: Date.now()+60000 });
    const input = { messageId: "concurrent-message", emoji: "👍" };
    await Promise.all([toggleMessageReaction("concurrent-alice", input), toggleMessageReaction("concurrent-alice", input)]);
    const result = await db.collection("message_reactions").where("messageId", "==", input.messageId).get();
    expect(result.docs).toHaveLength(0);
  }, 60000);
  it("simultaneous personal saves produce one record", async () => {
    const input = { url: "https://wfmokinfcypfpdisussw.supabase.co/storage/v1/object/public/chat-images/chat/concurrent-alice/product/2026-10/a.png" };
    await Promise.all([savePersonalImage("concurrent-alice", input), savePersonalImage("concurrent-alice", input)]);
    expect((await getAdminDb().collection("users").doc("concurrent-alice").collection("images").get()).docs).toHaveLength(1);
  }, 60000);
});

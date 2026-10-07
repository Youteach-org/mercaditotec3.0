import { execFileSync } from "node:child_process";
import { before, after, test } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

let env;
const identity = (verified = true, email = "a22121079@morelia.tecnm.mx") => ({ email, email_verified: verified });
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-mercadito-security", firestore: { rules: readFileSync("firestore.rules", "utf8") }, storage: { rules: readFileSync("storage.rules", "utf8") } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [uid, fields] of Object.entries({
      alice: { role: "user", isActive: true },
      victim: { role: "user", isActive: true },
      other: { role: "user", isActive: true },
      blocked: { role: "user", blocked: true, blockedUntil: Timestamp.fromDate(new Date("2099-01-01")) },
      inactive: { role: "user", isActive: false },
    })) await setDoc(doc(db, "users", uid), fields);
    await setDoc(doc(db, "messages", "message-1"), { text: "Hello", createdAt: 1, hidden: false });
    await setDoc(doc(db, "direct_chats", "chat-1"), {
      participantUids: ["alice", "victim"],
      createdAt: 1,
      updatedAt: 1,
    });
    await setDoc(doc(db, "direct_chats", "chat-1", "messages", "message-1"), {
      senderId: "alice",
      recipientId: "victim",
      text: "Hola",
      createdAt: 1,
    });
  });
}, { timeout: 180000 });
after(async () => { if (env) await env.cleanup(); });

test("ordinary student cannot promote themselves or edit verification and trust", async () => {
  const db = env.authenticatedContext("alice", identity()).firestore();
  for (const fields of [{ role: "superadmin" }, { isAdmin: true }, { admin: true }, { emailVerified: true }, { studentStatus: "verified" }, { studentEndorsementCount: 2 }, { blocked: false }]) {
    await assertFails(updateDoc(doc(db, "users", "alice"), fields));
  }
});
test("student can read their profile but not another account", async () => {
  const db = env.authenticatedContext("alice", identity()).firestore();
  await assertSucceeds(getDoc(doc(db, "users", "alice")));
  await assertFails(getDoc(doc(db, "users", "victim")));
});
test("over-five-year accounts cannot read private data even with valid Firebase auth", async () => {
  const expired = env.authenticatedContext("alice", identity(true, "a10121079@morelia.tecnm.mx")).firestore();
  await assertFails(getDoc(doc(expired, "users", "alice")));
  await assertFails(getDoc(doc(expired, "messages", "message-1")));
  await assertFails(getDoc(doc(expired, "direct_chats", "chat-1")));
  await assertFails(getDoc(doc(expired, "direct_chats", "chat-1", "messages", "message-1")));
});
test("missing profile cannot read private data even with a valid institutional identity", async () => {
  const missing = env.authenticatedContext("no-profile", identity()).firestore();
  await assertFails(getDoc(doc(missing, "users", "no-profile")));
  await assertFails(getDoc(doc(missing, "messages", "message-1")));
});
test("unverified and external accounts cannot read institutional chat", async () => {
  for (const claims of [identity(false), identity(true, "student@example.com")]) {
    const db = env.authenticatedContext("alice", claims).firestore();
    await assertFails(getDoc(doc(db, "messages", "message-1")));
  }
});
test("private chat is readable only by its participants", async () => {
  for (const uid of ["alice", "victim"]) {
    const db = env.authenticatedContext(uid, identity()).firestore();
    await assertSucceeds(getDoc(doc(db, "direct_chats", "chat-1")));
    await assertSucceeds(
      getDoc(doc(db, "direct_chats", "chat-1", "messages", "message-1")),
    );
  }

  const outsider = env.authenticatedContext("other", identity()).firestore();
  await assertFails(getDoc(doc(outsider, "direct_chats", "chat-1")));
  await assertFails(
    getDoc(doc(outsider, "direct_chats", "chat-1", "messages", "message-1")),
  );
});
test("direct reactions cannot bypass the server mutation budget", async () => {
  for (const uid of ["alice", "blocked", "inactive"]) {
    const db = env.authenticatedContext(uid, identity()).firestore();
    const operation = setDoc(doc(db, "message_reactions", uid), { messageId: "message-1", userId: uid, emoji: "👍", createdAt: 1 });
    await assertFails(operation);
  }
});
test("reaction cannot impersonate another user", async () => {
  const db = env.authenticatedContext("alice", identity()).firestore();
  await assertFails(setDoc(doc(db, "message_reactions", "forged"), { messageId: "message-1", userId: "victim", emoji: "👍", createdAt: 1 }));
});
test("anonymous access and direct server-data writes are denied", async () => {
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "messages", "message-1")));
  const db = env.authenticatedContext("alice", identity()).firestore();
  for (const collection of ["orders", "stores", "admin_audit_logs", "mutation_budgets"]) await assertFails(setDoc(doc(db, collection, "forged"), { uid: "alice" }));
});
test("profile-image uploads enforce ownership, format and verified identity", async () => {
  const own = env.authenticatedContext("alice", identity()).storage();
  await assertSucceeds(uploadBytes(ref(own, "profile-images/alice/a.png"), new Uint8Array([1]), { contentType: "image/png" }));
  await assertFails(uploadBytes(ref(own, "profile-images/victim/a.png"), new Uint8Array([1]), { contentType: "image/png" }));
  await assertFails(uploadBytes(ref(own, "profile-images/alice/a.svg"), new Uint8Array([1]), { contentType: "image/svg+xml" }));
  const unverified = env.authenticatedContext("alice", identity(false)).storage();
  await assertFails(uploadBytes(ref(unverified, "profile-images/alice/b.png"), new Uint8Array([1]), { contentType: "image/png" }));
  const expiredStudent = env.authenticatedContext("alice", identity(true, "a10121079@morelia.tecnm.mx")).storage();
  await assertFails(uploadBytes(ref(expiredStudent, "profile-images/alice/expired.png"), new Uint8Array([1]), { contentType: "image/png" }));
  for (const uid of ["blocked", "inactive"]) {
    const storage = env.authenticatedContext(uid, identity()).storage();
    await assertFails(uploadBytes(ref(storage, `profile-images/${uid}/a.png`), new Uint8Array([1]), { contentType: "image/png" }));
  }
});

test("personal image writes cannot bypass the server mutation budget", async () => {
 const db = env.authenticatedContext("alice", identity()).firestore();
 await assertFails(setDoc(doc(db, "users", "alice", "images", "spam"), { url: "https://example.com/a.png", createdAt: 1 }));
});

test("server transactions resist concurrent reaction and image writes", () => {
 execFileSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "lib/chat/personalActions.emulator.test.ts"], { stdio: "inherit" });
}, { timeout: 60000 });

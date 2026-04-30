"use client";

import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSession } from "@/lib/useSession";
import AuthGuard from "@/components/AuthGuard";

type ChatMessage = {
  id: string;
  text: string;
  senderId?: string;
  senderName?: string;
  createdAt: number;
  seenBy?: Record<string, number>;
};

function formatTime(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatContent() {
  const { firebaseUser } = useSession();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt"));

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      setMessages(msgs);

      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
        });
      }, 50);
    });

    return () => unsub();
  }, []);

  async function send() {
    if (!text.trim() || !firebaseUser) return;

    await addDoc(collection(db, "messages"), {
      text,
      senderId: firebaseUser.uid,
      senderName: firebaseUser.email || "Usuario",
      createdAt: Date.now(),
      seenBy: {},
    });

    setText("");
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-gray-100 p-2 md:p-4">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-md">
        
        <div className="shrink-0 border-b pb-2 mb-2">
          <h1 className="text-xl font-bold">Chat</h1>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 pr-1"
        >
          {messages.map((msg) => {
            const isMine = msg.senderId === firebaseUser?.uid;
            const seenCount = Object.keys(msg.seenBy || {}).length;

            return (
              <div key={msg.id} className={lex }>
                <div className="max-w-[80%] bg-gray-200 rounded-xl p-2">
                  <p className="text-sm">{msg.text}</p>

                  <div className="flex items-center gap-2 text-[10px] text-gray-600 mt-1">
                    <span>{formatTime(msg.createdAt)}</span>
                    <span title={`Visto por ${seenCount}`}>👁 {seenCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border rounded-xl p-2"
            placeholder="Escribe..."
          />
          <button
            onClick={send}
            className="bg-blue-600 text-white px-4 rounded-xl"
          >
            Enviar
          </button>
        </div>

      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import { moderationApiFetch } from "@/lib/moderation/client";
import { useSession } from "@/lib/useSession";

type DirectMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: number;
};

type DirectSession = {
  chatId: string;
  target: {
    uid: string;
    username: string;
    displayName: string;
  };
};

function PersonalChatContent() {
  const params = useParams<{ uid: string }>();
  const targetUid = String(params?.uid ?? "");
  const { firebaseUser, loading } = useSession();
  const [session, setSession] = useState<DirectSession | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [opening, setOpening] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!firebaseUser || !targetUid) return;

    let cancelled = false;
    setOpening(true);
    setError("");

    void moderationApiFetch(firebaseUser, "/api/chat/direct/session", {
      method: "POST",
      body: JSON.stringify({ targetUid }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "No se pudo abrir el chat privado.");
        if (!cancelled) setSession(data.session as DirectSession);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo abrir el chat privado.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setOpening(false);
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, targetUid]);

  const loadMessages = useCallback(async () => {
    if (!firebaseUser || !targetUid) return;

    try {
      const response = await moderationApiFetch(
        firebaseUser,
        `/api/chat/direct/messages?targetUid=${encodeURIComponent(targetUid)}`,
        { method: "GET" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los mensajes privados.");
      }

      if (data.session) setSession(data.session as DirectSession);
      setMessages(Array.isArray(data.messages) ? data.messages : []);

      window.setTimeout(() => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      }, 30);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los mensajes privados.",
      );
    }
  }, [firebaseUser, targetUid]);

  useEffect(() => {
    if (!firebaseUser || !targetUid) return;

    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [firebaseUser, loadMessages, targetUid]);

  async function sendMessage() {
    if (!firebaseUser || !text.trim() || sending) return;

    setSending(true);
    setError("");
    try {
      const response = await moderationApiFetch(
        firebaseUser,
        "/api/chat/direct/messages",
        {
          method: "POST",
          body: JSON.stringify({ targetUid, text: text.trim() }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo enviar el mensaje privado.");
      }
      const saved = data.message as DirectMessage | undefined;
      if (saved) {
        setMessages((current) => {
          if (current.some((message) => message.id === saved.id)) return current;
          return [...current, saved];
        });
      }
      setText("");
      await loadMessages();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "No se pudo enviar el mensaje privado.",
      );
    } finally {
      setSending(false);
    }
  }

  if (loading || opening) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-md">
          Abriendo chat privado...
        </div>
      </main>
    );
  }

  const title =
    session?.target.displayName ||
    (session?.target.username ? `@${session.target.username}` : "Usuario");

  return (
    <main className="h-[calc(100dvh-3.5rem)] bg-gray-100 p-3 sm:p-4">
      <div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-md">
        <header className="border-b border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/chat/personal" className="text-sm font-bold text-blue-700 hover:underline">
                ← Chats privados
              </Link>
              <h1 className="mt-1 text-xl font-black text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">
                Chat privado{session?.target.username ? ` · @${session.target.username}` : ""}
              </p>
            </div>
            <Link
              href="/chat"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700"
            >
              Chat general
            </Link>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
        >
          {messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Aún no hay mensajes en esta conversación.
            </div>
          ) : (
            messages.map((message) => {
              const mine = message.senderId === firebaseUser?.uid;
              return (
                <div
                  key={message.id}
                  className={mine ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      mine
                        ? "max-w-[82%] rounded-2xl bg-slate-900 px-4 py-3 text-white"
                        : "max-w-[82%] rounded-2xl bg-gray-100 px-4 py-3 text-gray-900"
                    }
                  >
                    <div className="whitespace-pre-wrap break-words text-sm">
                      {message.text}
                    </div>
                    <div
                      className={
                        mine
                          ? "mt-1 text-[10px] text-slate-300"
                          : "mt-1 text-[10px] text-gray-400"
                      }
                    >
                      {new Date(message.createdAt).toLocaleString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="border-t border-gray-200 p-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              maxLength={1000}
              placeholder="Escribe un mensaje privado..."
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-slate-500"
            />
            <button
              type="button"
              disabled={sending || !text.trim()}
              onClick={() => void sendMessage()}
              className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-40"
            >
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default function PersonalChatPage() {
  return (
    <AuthGuard>
      <PersonalChatContent />
    </AuthGuard>
  );
}

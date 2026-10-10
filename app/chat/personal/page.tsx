"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import { moderationApiFetch } from "@/lib/moderation/client";
import { useSession } from "@/lib/useSession";

type Conversation = {
  chatId: string;
  target: {
    uid: string;
    username: string;
    displayName: string;
  };
  lastMessage: {
    id: string;
    senderId: string;
    recipientId: string;
    text: string;
    createdAt: number;
  } | null;
  updatedAt: number;
  unreadCount: number;
};

function PrivateInboxContent() {
  const { firebaseUser, appUser, loading } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    if (!firebaseUser) return;

    try {
      const response = await moderationApiFetch(
        firebaseUser,
        "/api/chat/direct/conversations",
        { method: "GET" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar tus conversaciones.");
      }
      setConversations(
        Array.isArray(data.conversations) ? data.conversations : [],
      );
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar tus conversaciones.",
      );
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    // The already-subscribed user profile changes when a new private-message
    // notification is created. Refresh only on that event, tab return or push.
    // No periodic full conversation-list downloads.
    let busy = false;
    const refresh = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try { await loadConversations(); }
      finally { busy = false; }
    };
    void refresh();
    const onVisible = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("notifications:changed", refresh);
    window.addEventListener("direct-chat:changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("notifications:changed", refresh);
      window.removeEventListener("direct-chat:changed", refresh);
    };
  }, [firebaseUser, loadConversations, appUser?.unreadNotificationCount]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-md">
          Cargando conversaciones...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="rounded-2xl bg-white p-5 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                Chats privados
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Tus conversaciones se guardan y puedes volver a abrirlas aquí.
              </p>
            </div>
            <Link
              href="/chat"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
            >
              Chat general
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow-md">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Todavía no tienes conversaciones privadas guardadas.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => {
                const label =
                  conversation.target.displayName ||
                  (conversation.target.username
                    ? `@${conversation.target.username}`
                    : "Usuario");
                return (
                  <Link
                    key={conversation.chatId}
                    href={`/chat/personal/${conversation.target.uid}`}
                    className={
                      conversation.unreadCount > 0
                        ? "block bg-amber-50 p-4 hover:bg-amber-100"
                        : "block p-4 hover:bg-gray-50"
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={
                            conversation.unreadCount > 0
                              ? "truncate font-black text-gray-950"
                              : "truncate font-bold text-gray-900"
                          }>
                            {label}
                          </div>
                          {conversation.unreadCount > 0 && (
                            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white">
                              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        {conversation.target.username && (
                          <div className="text-xs font-semibold text-gray-500">
                            @{conversation.target.username}
                          </div>
                        )}
                        <div className={
                          conversation.unreadCount > 0
                            ? "mt-2 truncate text-sm font-black text-gray-900"
                            : "mt-2 truncate text-sm text-gray-600"
                        }>
                          {conversation.lastMessage?.text || "Sin mensajes"}
                        </div>
                      </div>
                      {conversation.lastMessage && (
                        <time className="shrink-0 text-[11px] text-gray-400">
                          {new Date(
                            conversation.lastMessage.createdAt,
                          ).toLocaleString("es-MX", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function PrivateInboxPage() {
  return (
    <AuthGuard>
      <PrivateInboxContent />
    </AuthGuard>
  );
}

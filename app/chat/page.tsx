"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import imageCompression from "browser-image-compression";
import { db } from "@/lib/firebase";
import { uploadImageFile } from "@/lib/imageStorage";
import {
  findSharedImageByHash,
  loadSharedImageLibrary,
  saveSharedImageMetadata,
} from "@/lib/chat/imageLibraryClient";
import {
  generalChatCutoff,
  isGeneralChatMessageCurrent,
} from "@/lib/chat/generalRetention";
import { useSession } from "@/lib/useSession";
import AuthGuard from "@/components/AuthGuard";
import ReportDialog from "@/components/moderation/ReportDialog";
import { moderationApiFetch } from "@/lib/moderation/client";
import { validateNicknameSyntax } from "@/lib/security/nickname";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const TEMPLATE_MESSAGES = [
  "Ok",
  "¿Sigue disponible?",
  "Me interesa",
  "¿Cuánto? y ¿por qué tan caro?",
  "¿Dónde entregas?",
  "Quiero comprar",
  "¿Tienes más fotos?",
];

type SenderRole = "buyer" | "seller";

type ReplyTo = {
  id: string;
  senderName: string;
  text: string;
};

type ChatMessage = {
  id: string;
  text: string;
  senderId?: string;
  senderName?: string;
  senderPlan?: "free" | "premium";
  senderPhotoURL?: string;
  senderRole?: SenderRole;
  messageType?: "template" | "custom" | "image";
  imageUrls?: string[];
  createdAt: number;
  expiresAt?: number;
  replyTo?: ReplyTo | null;
  hidden?: boolean;
  hiddenAt?: unknown;
};

type UserImage = {
  id: string;
  url: string;
  createdAt: number;
  source?: "chat" | "product" | "shared";
  shared?: boolean;
  sha256?: string;
  originalOwnerUid?: string;
};

type SharedImage = {
  id: string;
  url: string;
  ownerUid: string;
  sha256: string;
  createdAt: number;
};

type ReactionRecord = {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
};

function safeName(name?: string | null) {
  if (!name || !name.trim()) return "Usuario";
  return name.trim();
}

function shortenText(text: string, max = 100) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function menuButtonClasses(darkMode: boolean) {
  return darkMode
    ? "bg-slate-700 text-slate-100 px-3 py-2 rounded-xl text-sm font-semibold"
    : "bg-slate-200 text-slate-800 px-3 py-2 rounded-xl text-sm font-semibold";
}

function bubbleClasses(darkMode: boolean, isMine: boolean, role: SenderRole) {
  if (isMine && role === "buyer") {
    return darkMode
      ? "max-w-[85%] min-w-[280px] p-2 md:p-3 bg-blue-900 rounded-2xl border-2 border-blue-400 shadow-[0_0_0_1px_rgba(96,165,250,0.35)] transition-all"
      : "max-w-[85%] min-w-[280px] p-2 md:p-3 bg-blue-100 rounded-2xl border-2 border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.18)] transition-all";
  }

  if (isMine && role === "seller") {
    return darkMode
      ? "max-w-[85%] min-w-[280px] p-2 md:p-3 bg-emerald-900 rounded-2xl border-2 border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35)] transition-all"
      : "max-w-[85%] min-w-[280px] p-2 md:p-3 bg-emerald-100 rounded-2xl border-2 border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.18)] transition-all";
  }

  if (!isMine && role === "seller") {
    return darkMode
      ? "max-w-[85%] min-w-[280px] p-2 md:p-3 bg-emerald-950 rounded-2xl border-2 border-emerald-500 transition-all"
      : "max-w-[85%] min-w-[280px] p-2 md:p-3 bg-emerald-50 rounded-2xl border-2 border-emerald-400 transition-all";
  }

  return darkMode
    ? "max-w-[85%] min-w-[280px] p-2 md:p-3 bg-slate-800 rounded-2xl border border-slate-700 transition-all"
    : "max-w-[85%] min-w-[280px] p-2 md:p-3 bg-gray-100 rounded-2xl border border-gray-200 transition-all";
}

async function sha256OfBlob(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function uploadToSupabase(
  file: File,
  userId: string,
  shareInLibrary: boolean,
  personalImages: UserImage[]
) {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    initialQuality: 0.68,
  });

  const sha256 = await sha256OfBlob(compressed);

  const personalMatch = personalImages.find(
    (image) => image.sha256 === sha256
  );

  if (personalMatch?.url) {
    return {
      url: personalMatch.url,
      sha256,
      ownerUid: personalMatch.originalOwnerUid || userId,
      shared: personalMatch.shared === true,
      reused: true,
    };
  }

  if (shareInLibrary) {
    const existing = await findSharedImageByHash(sha256);

    if (existing?.url) {
      return {
        url: existing.url,
        sha256,
        ownerUid: existing.ownerUid || userId,
        shared: true,
        reused: true,
      };
    }
  }

  const mimeType =
    compressed.type ||
    file.type ||
    "image/jpeg";

  const extensionByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  const ext =
    extensionByMime[mimeType] ||
    file.name.split(".").pop()?.toLowerCase() ||
    "jpg";

  const now = new Date();

  const monthFolder =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

  const safeUserId =
    userId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const privacyFolder =
    shareInLibrary ? "shared" : "product";

  const fileName =
    `${sha256.slice(0, 20)}-${Date.now()}.${ext}`;

  const filePath =
    `chat/${safeUserId}/${privacyFolder}/${monthFolder}/${fileName}`;

  const url = await uploadImageFile({
    path: filePath,
    file: compressed,
    filename: fileName,
  });

  if (shareInLibrary) {
    await saveSharedImageMetadata({
      url,
      sha256,
    });
  }

  return {
    url,
    sha256,
    ownerUid: userId,
    shared: shareInLibrary,
    reused: false,
  };
}

function formatChatTime(timestamp?: number) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatContent() {
  const { firebaseUser, appUser, loading, logout } = useSession();
  const appUserAny = appUser as any;
  const appUserRole = String(
    appUserAny?.role ??
    appUserAny?.userRole ??
    appUserAny?.type ??
    appUserAny?.accountType ??
    ""
  ).toLowerCase();

  const isAdmin =
    appUserRole === "admin" ||
    appUserRole === "administrator" ||
    appUserAny?.isAdmin === true ||
    appUserAny?.admin === true;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [retentionNow, setRetentionNow] = useState(() => Date.now());
  const [userImages, setUserImages] = useState<UserImage[]>([]);
  const [sharedImages, setSharedImages] = useState<SharedImage[]>([]);
  const [reactions, setReactions] = useState<ReactionRecord[]>([]);
  const [nicknameOverride, setNicknameOverride] =
    useState("");
  const [nicknameResolved, setNicknameResolved] =
    useState(false);
  const [nicknameEditorOpen, setNicknameEditorOpen] =
    useState(false);
  const [nicknameInput, setNicknameInput] =
    useState("");
  const [nicknameSaving, setNicknameSaving] =
    useState(false);
  const [nicknameError, setNicknameError] =
    useState("");

  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [newMessagesWaiting, setNewMessagesWaiting] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [actionForMessage, setActionForMessage] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedSavedUrls, setSelectedSavedUrls] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [sendingImages, setSendingImages] = useState(false);
  const [imageReuseMode, setImageReuseMode] =
    useState<"shared" | "product">("shared");
  const [senderRole, setSenderRole] = useState<SenderRole>("buyer");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("mercaditotec_dark_mode") === "true";
  });

  const savedNickname = String(
    nicknameOverride ||
    appUserAny?.nickname ||
    ""
  ).trim();

  const currentNickname = safeName(
    savedNickname ||
    appUserAny?.displayName ||
    firebaseUser?.displayName ||
    firebaseUser?.email ||
    "Usuario"
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const lastMessageCreatedAtRef = useRef(0);
  const isNearBottomRef = useRef(true);

  function validateNickname(value: string) {
    const parsed = validateNicknameSyntax(value);
    return parsed.valid ? "" : parsed.reason;
  }

  async function saveNickname() {

    if (!firebaseUser) {
      return;
    }

    const nickname =
      nicknameInput.trim();

    const validation =
      validateNickname(
        nickname
      );

    if (validation) {
      setNicknameError(
        validation
      );

      return;
    }

    try {

      setNicknameSaving(
        true
      );

      setNicknameError(
        ""
      );

      const token =
        await firebaseUser
          .getIdToken(true);

      const response =
        await fetch(
          "/api/nickname",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                nickname,
              }),
          }
        );

      const result =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {

        setNicknameError(
          result?.error ||
            "No se pudo guardar el nickname."
        );

        return;
      }

      setNicknameOverride(
        String(result?.nickname || nickname).trim()
      );
      setNicknameResolved(true);

      setNicknameInput(
        nickname
      );

      setNicknameEditorOpen(
        false
      );

      setNicknameError(
        ""
      );

      setToast(
        `Nickname actualizado: ${nickname}`
      );

      window.setTimeout(
        () =>
          setToast(""),
        2200
      );

    } catch (error) {

      console.error(
        "SAVE_NICKNAME_ERROR",
        error
      );

      setNicknameError(
        "No se pudo guardar el nickname."
      );

    } finally {

      setNicknameSaving(
        false
      );
    }
  }

  function ensureNicknameReady() {

    if (savedNickname) {
      return true;
    }

    if (!nicknameResolved) {
      setToast("Cargando tu nickname...");
      window.setTimeout(() => setToast(""), 1600);
      return false;
    }

    setNicknameInput("");
    setNicknameError("");
    setNicknameEditorOpen(true);

    setToast(
      "Elige un nickname para tu cuenta antes de enviar mensajes."
    );

    window.setTimeout(
      () => setToast(""),
      2500
    );

    return false;
  }

  useEffect(() => {
    setNicknameOverride("");
    setNicknameResolved(false);
    setNicknameEditorOpen(false);

    if (!firebaseUser) return;

    let cancelled = false;

    void moderationApiFetch(firebaseUser, "/api/nickname", {
      method: "GET",
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        const accountNickname = String(result?.nickname ?? "").trim();
        setNicknameOverride(accountNickname);
        setNicknameResolved(true);

        if (accountNickname) {
          setNicknameInput(accountNickname);
          setNicknameEditorOpen(false);
        }
      })
      .catch((error) => {
        console.error("LOAD_ACCOUNT_NICKNAME_ERROR", error);
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser?.uid]);

  useEffect(() => {
    localStorage.setItem("mercaditotec_dark_mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const savedRole = localStorage.getItem("mercaditotec_sender_role");
    if (savedRole === "buyer" || savedRole === "seller") setSenderRole(savedRole);
  }, []);

  useEffect(() => {
    localStorage.setItem("mercaditotec_sender_role", senderRole);
  }, [senderRole]);

  useEffect(() => {
    function closeAllPopups() {
      setMenuOpen(false);
      setActionForMessage(null); setActionMenuPosition(null);
      setTemplatesOpen(false);
      setGalleryOpen(false);
    }

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;

      if (target?.closest("[data-popup-root='true']")) {
        return;
      }

      closeAllPopups();
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeAllPopups();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    if (
      loading ||
      !firebaseUser ||
      !nicknameResolved ||
      savedNickname
    ) {
      return;
    }

    setNicknameInput("");
    setNicknameError("");
    setNicknameEditorOpen(true);
  }, [
    loading,
    firebaseUser?.uid,
    nicknameResolved,
    savedNickname,
  ]);

  useEffect(() => {
    // Only local clock work: no Firestore reads, no API call, no listener reset.
    // The visible 48-hour window still expires older messages on screen.
    const refreshClock = () => {
      if (!document.hidden) setRetentionNow(Date.now());
    };
    const interval = window.setInterval(refreshClock, 60_000);
    document.addEventListener("visibilitychange", refreshClock);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshClock);
    };
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    let unsubscribe: (() => void) | null = null;
    const watchMessages = () => {
      unsubscribe?.();
      unsubscribe = null;
      if (document.hidden) return;
      const q = query(
        collection(db, "messages"),
        where("createdAt", ">=", generalChatCutoff()),
        orderBy("createdAt", "desc"),
        limit(100),
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...(item.data() as Omit<ChatMessage, "id">),
        }))
        .filter((message) =>
          isGeneralChatMessageCurrent(Number(message.createdAt), Date.now())
        )
        .reverse();

      const newest = msgs[msgs.length - 1];
      const wasInitialized = initializedRef.current;
      const previousNewestCreatedAt = lastMessageCreatedAtRef.current;
      const newlyArrived = wasInitialized
        ? msgs.filter((msg) => msg.createdAt > previousNewestCreatedAt)
        : [];
      const hasNewMessage = newlyArrived.length > 0;
      const newestNewMessage = hasNewMessage ? newlyArrived[newlyArrived.length - 1] : null;

      setMessages(msgs);

      if (!wasInitialized) {
        initializedRef.current = true;
        if (newest) {
          lastMessageCreatedAtRef.current = newest.createdAt || 0;
        }

        window.setTimeout(() => {
          const el = scrollRef.current;
          if (!el) return;
          el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
          isNearBottomRef.current = true;
          setNewMessagesWaiting(0);
        }, 60);
        return;
      }

      if (newest) {
        lastMessageCreatedAtRef.current = Math.max(
          lastMessageCreatedAtRef.current,
          newest.createdAt || 0
        );
      }

      if (!hasNewMessage || !newestNewMessage) return;

      const newestIsMine = newestNewMessage.senderId === firebaseUser?.uid;

      if (!newestIsMine) {
        setToast(`Nuevo mensaje de ${safeName(newestNewMessage.senderName)}`);
        window.setTimeout(() => setToast(""), 2200);
      }

      if (newestIsMine || isNearBottomRef.current) {
        window.setTimeout(() => {
          const el = scrollRef.current;
          if (!el) return;
          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
          isNearBottomRef.current = true;
          setNewMessagesWaiting(0);
        }, 60);
      } else {
        setNewMessagesWaiting((count) => count + newlyArrived.length);
      }
    });

    };
    watchMessages();
    document.addEventListener("visibilitychange", watchMessages);
    return () => {
      document.removeEventListener("visibilitychange", watchMessages);
      unsubscribe?.();
    };
  }, [firebaseUser?.uid]);

  useEffect(() => {
    if (!firebaseUser) return;
    let unsubscribe: (() => void) | null = null;
    const watchImages = () => {
      unsubscribe?.();
      unsubscribe = null;
      if (document.hidden) return;
      const q = query(
        collection(db, "users", firebaseUser.uid, "images"),
        orderBy("createdAt", "desc"),
        limit(100),
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        setUserImages(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<UserImage, "id">),
          }))
        );
      });
    };
    watchImages();
    document.addEventListener("visibilitychange", watchImages);
    return () => {
      document.removeEventListener("visibilitychange", watchImages);
      unsubscribe?.();
    };
  }, [firebaseUser?.uid]);

  useEffect(() => {
    if (!firebaseUser || !galleryOpen) return;

    let cancelled = false;

    async function loadSharedImages() {
      try {
        const images = await loadSharedImageLibrary();
        if (cancelled) return;
        setSharedImages(images);
      } catch (error) {
        console.error("SHARED_IMAGE_LIBRARY_ERROR", error);
      }
    }

    void loadSharedImages();

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, galleryOpen]);

  useEffect(() => {
    if (!firebaseUser) return;
    let unsubscribe: (() => void) | null = null;
    const watchReactions = () => {
      unsubscribe?.();
      unsubscribe = null;
      if (document.hidden) return;
      const q = query(
        collection(db, "message_reactions"),
        orderBy("createdAt", "desc"),
        limit(500),
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        setReactions(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ReactionRecord, "id">),
          }))
        );
      });
    };
    watchReactions();
    document.addEventListener("visibilitychange", watchReactions);
    return () => {
      document.removeEventListener("visibilitychange", watchReactions);
      unsubscribe?.();
    };
  }, [firebaseUser?.uid]);

  useEffect(() => {
    const urls = selectedImages.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedImages]);

  function handleChatScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= 120;
    isNearBottomRef.current = nearBottom;

    if (nearBottom && newMessagesWaiting > 0) {
      setNewMessagesWaiting(0);
    }
  }

  function scrollToLatestMessages() {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setNewMessagesWaiting(0);
  }

  function reactionsForMessage(messageId: string) {
    const related = reactions.filter((r) => r.messageId === messageId);
    return QUICK_EMOJIS.map((emoji) => {
      const users = related.filter((r) => r.emoji === emoji);
      return {
        emoji,
        count: users.length,
        mine: users.some((r) => r.userId === firebaseUser?.uid),
      };
    }).filter((x) => x.count > 0);
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!firebaseUser) return;

    try {
      await moderationApiFetch(firebaseUser!, "/api/chat/reactions", {
        method: "POST", body: JSON.stringify({ messageId, emoji }),
      });
      setActionForMessage(null);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo guardar la reacción.");
      window.setTimeout(() => setToast(""), 3000);
    }
  }

  function startReply(message: ChatMessage) {
    setReplyingTo({
      id: message.id,
      senderName: safeName(
        message.senderName
      ),
      text: message.text || (message.imageUrls?.length ? "Imagen" : ""),
    });

    setActionForMessage(null); setActionMenuPosition(null);

    setTimeout(() => {
      const el = document.querySelector('textarea, input[type="text"]') as HTMLTextAreaElement | HTMLInputElement | null;
      el?.focus();
    }, 0);
  }

  function clearReply() {
    setReplyingTo(null);
  }

  function jumpToMessage(messageId: string) {
    const target = messageRefs.current[messageId];
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(messageId);
    window.setTimeout(() => setHighlightedId(null), 1800);
  }

  function handleImageSelect(files: FileList | null) {
    if (!files || files.length === 0) return;

    const picked = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 10);

    if (picked.length === 0) {
      setToast("Solo se permiten imágenes.");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }

    setSelectedImages(picked);
    setSelectedSavedUrls([]);
    setImageReuseMode("shared");
  }

  function toggleSavedUrl(url: string) {
    setSelectedImages([]);
    setImageReuseMode("shared");

    setSelectedSavedUrls((prev) =>
      prev.includes(url)
        ? prev.filter((x) => x !== url)
        : [...prev, url]
    );
  }

  async function saveImageReference(
    url: string,
    options?: {
      source?: "chat" | "product" | "shared";
      shared?: boolean;
      sha256?: string;
      originalOwnerUid?: string;
    }
  ) {
    if (!firebaseUser) return;

    await moderationApiFetch(firebaseUser, "/api/chat/images", {
      method: "POST", body: JSON.stringify({ url, sha256: options?.sha256 ?? "" }),
    });
  }

  async function sendChatMessage(payload: {
    text: string;
    senderRole: SenderRole;
    messageType: "template" | "custom" | "image";
    imageUrls: string[];
    replyTo: ReplyTo | null;
  }) {
    if (!firebaseUser) return;
    const response = await moderationApiFetch(firebaseUser, "/api/chat/messages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error ?? "No se pudo enviar el mensaje.";
      setToast(message);
      window.setTimeout(() => setToast(""), 3200);
      return false;
    }
    return true;
  }

  async function sendTemplateMessage(templateText: string) {
    if (!firebaseUser) return;
    if (!ensureNicknameReady()) return;

    const sent = await sendChatMessage({
      text: templateText,
      senderRole,
      messageType: "template",
      imageUrls: [],
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
          }
        : null,
    });
    if (!sent) return;

    clearReply();
    setTemplatesOpen(false);
  }

  async function sendCustomMessage() {
    if (!firebaseUser || !text.trim()) return;
    if (!ensureNicknameReady()) return;

    const sent = await sendChatMessage({
      text: text.trim(),
      senderRole,
      messageType: "custom",
      imageUrls: [],
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
          }
        : null,
    });
    if (!sent) return;

    setText("");
    clearReply();
  }

  async function sendImages() {
    if (!firebaseUser) return;
    if (!ensureNicknameReady()) return;

    if (
      selectedImages.length === 0 &&
      selectedSavedUrls.length === 0
    ) return;

    try {
      setSendingImages(true);

      const urls: string[] = [...selectedSavedUrls];

      for (const selectedUrl of selectedSavedUrls) {
        const sharedImage =
          sharedImages.find((image) => image.url === selectedUrl);

        if (sharedImage) {
          await saveImageReference(selectedUrl, {
            source: "shared",
            shared: true,
            sha256: sharedImage.sha256,
            originalOwnerUid: sharedImage.ownerUid,
          });
        }
      }

      for (const file of selectedImages) {
        const shareInLibrary =
          imageReuseMode === "shared";

        const uploaded =
          await uploadToSupabase(
            file,
            firebaseUser.uid,
            shareInLibrary,
            userImages
          );

        urls.push(uploaded.url);

        await saveImageReference(uploaded.url, {
          source: uploaded.shared ? "chat" : "product",
          shared: uploaded.shared,
          sha256: uploaded.sha256,
          originalOwnerUid: uploaded.ownerUid,
        });
      }

      const sent = await sendChatMessage({
        text: text.trim(),
        senderRole,
        messageType: "image",
        imageUrls: urls,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              text: replyingTo.text,
            }
          : null,
      });
      if (!sent) return;

      setSelectedImages([]);
      setSelectedSavedUrls([]);
      setImageReuseMode("shared");
      setText("");
      clearReply();
      setGalleryOpen(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setToast("Imagen enviada.");
      window.setTimeout(() => setToast(""), 1800);

    } catch (error) {

      console.error("SEND_IMAGE_ERROR", error);

      setToast("No se pudo subir la imagen.");
      window.setTimeout(() => setToast(""), 2500);

    } finally {

      setSendingImages(false);
    }
  }

  async function sendCurrentMessage() {
    if (sendingImages) return;

    if (
      selectedImages.length > 0 ||
      selectedSavedUrls.length > 0
    ) {
      await sendImages();
      return;
    }

    await sendCustomMessage();
  }

  function handleTextKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendCurrentMessage();
    }
  }

  if (loading) {
    return (
      <main className="flex h-[calc(100dvh-6.75rem)] items-center justify-center bg-gray-100 md:h-[calc(100dvh-3.5rem)]">
        <p className="text-gray-700">Cargando...</p>
      </main>
    );
  }

  return (
    <main className={darkMode ? "h-[calc(100dvh-6.75rem)] bg-slate-950 p-2 md:h-[calc(100dvh-3.5rem)] md:p-4" : "h-[calc(100dvh-6.75rem)] bg-gray-100 p-2 md:h-[calc(100dvh-3.5rem)] md:p-4"}>
      <div className={darkMode ? "mx-auto flex h-full max-w-5xl flex-col rounded-2xl bg-slate-900 p-2 shadow-md md:p-4" : "mx-auto flex h-full max-w-5xl flex-col rounded-2xl bg-white p-2 shadow-md md:p-4"}>
        <div className={darkMode ? "mb-2 border-b border-slate-700 pb-2 flex items-start justify-between gap-3" : "mb-2 border-b pb-2 flex items-start justify-between gap-3"}>
          <div>
            <h1 className={darkMode ? "text-xl md:text-2xl font-bold text-slate-100" : "text-xl md:text-2xl font-bold text-gray-900"}>
              MercaditoTec
            </h1>

            <p className={darkMode ? "mt-2 text-xs font-semibold text-slate-400" : "mt-2 text-xs font-semibold text-slate-500"}>
              Sala general
            </p>
          </div>

          <div className="relative" data-popup-root="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setActionForMessage(null); setActionMenuPosition(null); setMenuOpen((prev) => !prev); }} className={menuButtonClasses(darkMode)}
            >
              {menuOpen ? "Cerrar menú" : "Menú"}
            </button>

            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={darkMode ? "absolute right-0 mt-2 w-56 rounded-2xl border border-slate-700 bg-slate-800 shadow-lg p-2 z-20" : "absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white shadow-lg p-2 z-20"}
              >
                <a href="/" className={darkMode ? "block px-3 py-2 rounded-xl text-sm text-slate-100 hover:bg-slate-700" : "block px-3 py-2 rounded-xl text-sm text-gray-900 hover:bg-gray-100"}>
                  Inicio
                </a>
                <a href="/chat/personal" className={darkMode ? "block px-3 py-2 rounded-xl text-sm text-slate-100 hover:bg-slate-700" : "block px-3 py-2 rounded-xl text-sm text-gray-900 hover:bg-gray-100"}>
                  Chats privados
                </a>
                <a href="/mystore" className={darkMode ? "block px-3 py-2 rounded-xl text-sm text-slate-100 hover:bg-slate-700" : "block px-3 py-2 rounded-xl text-sm text-gray-900 hover:bg-gray-100"}>
                  MyStore
                </a>
                <a href="/profile" className={darkMode ? "block px-3 py-2 rounded-xl text-sm text-slate-100 hover:bg-slate-700" : "block px-3 py-2 rounded-xl text-sm text-gray-900 hover:bg-gray-100"}>
                  Perfil
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setNicknameInput(
                      savedNickname
                    );
                    setNicknameError("");
                    setNicknameEditorOpen(true);
                    setMenuOpen(false);
                  }}
                  className={
                    darkMode
                      ? "block w-full text-left px-3 py-2 rounded-xl text-sm text-slate-100 hover:bg-slate-700"
                      : "block w-full text-left px-3 py-2 rounded-xl text-sm text-gray-900 hover:bg-gray-100"
                  }
                >
                  Nickname
                  {savedNickname
                    ? `: ${savedNickname}`
                    : ": elegir"}
                </button>
                <button
                  onClick={() => setDarkMode((prev) => !prev)}
                  className={darkMode ? "mt-2 w-full text-left px-3 py-2 rounded-xl text-sm text-slate-100 hover:bg-slate-700" : "mt-2 w-full text-left px-3 py-2 rounded-xl text-sm text-gray-900 hover:bg-gray-100"}
                >
                  {darkMode ? "Modo claro" : "Modo oscuro"}
                </button>
                <button
                  onClick={logout}
                  className="mt-2 w-full text-left px-3 py-2 rounded-xl text-sm text-white bg-red-600"
                >
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>

        {nicknameEditorOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
            onClick={() => {
              if (savedNickname) {
                setNicknameEditorOpen(false);
              }
            }}
          >
            <div
              data-popup-root="true"
              onClick={(e) =>
                e.stopPropagation()
              }
              className={
                darkMode
                  ? "w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
                  : "w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
              }
            >
              <div className="mb-4">
                <h2
                  className={
                    darkMode
                      ? "text-lg font-bold text-white"
                      : "text-lg font-bold text-gray-900"
                  }
                >
                  Elige tu nickname
                </h2>

                <p
                  className={
                    darkMode
                      ? "mt-1 text-xs text-slate-400"
                      : "mt-1 text-xs text-gray-500"
                  }
                >
                  Será el nombre que verán los demás en el chat.
                  No se mostrará tu número de control como nombre.
                </p>
              </div>

              <input
                type="text"
                value={nicknameInput}
                maxLength={24}
                autoFocus
                autoComplete="off"
                placeholder="Ej. Batman25"
                onChange={(e) => {
                  setNicknameInput(
                    e.target.value
                  );
                  setNicknameError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void saveNickname();
                  }

                  if (
                    e.key === "Escape" &&
                    savedNickname
                  ) {
                    setNicknameEditorOpen(false);
                  }
                }}
                className={
                  darkMode
                    ? "w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 text-white outline-none focus:border-violet-400"
                    : "w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none focus:border-violet-500"
                }
              />

              <p
                className={
                  darkMode
                    ? "mt-2 text-[11px] text-slate-400"
                    : "mt-2 text-[11px] text-gray-500"
                }
              >
                3–24 caracteres. Letras, números y _. El sistema
                verifica que nadie más esté usando ese nickname.
              </p>

              {nicknameError && (
                <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700">
                  {nicknameError}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">

                {savedNickname && (
                  <button
                    type="button"
                    disabled={nicknameSaving}
                    onClick={() =>
                      setNicknameEditorOpen(false)
                    }
                    className={
                      darkMode
                        ? "rounded-xl bg-slate-700 px-4 py-2 text-sm text-white"
                        : "rounded-xl bg-gray-200 px-4 py-2 text-sm text-gray-800"
                    }
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="button"
                  disabled={
                    nicknameSaving ||
                    !nicknameInput.trim()
                  }
                  onClick={() =>
                    void saveNickname()
                  }
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400"
                >
                  {nicknameSaving
                    ? "Guardando..."
                    : "Guardar nickname"}
                </button>

              </div>

              {!savedNickname && (
                <p
                  className={
                    darkMode
                      ? "mt-3 text-center text-[11px] text-slate-500"
                      : "mt-3 text-center text-[11px] text-gray-400"
                  }
                >
                  Necesitas elegir uno para participar en el chat.
                </p>
              )}
            </div>
          </div>
        )}

        {toast && (
          <div className="mb-2 rounded-xl bg-slate-900 text-white px-3 py-2 text-xs md:text-sm">
            {toast}
          </div>
        )}

        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollRef}
            onScroll={handleChatScroll}
            className={darkMode ? "h-full overflow-y-auto overscroll-contain space-y-4 pr-1 text-slate-100" : "h-full overflow-y-auto overscroll-contain space-y-4 pr-1"}
          >
          {messages.filter((msg) => isGeneralChatMessageCurrent(Number(msg.createdAt), retentionNow)).map((msg) => {
            const isMine = msg.senderId === firebaseUser?.uid;
            const role = msg.senderRole ?? "buyer";
            const isAdmin = appUser?.role === "admin";
            const groupedReactions = reactionsForMessage(msg.id);

            if (msg.hidden) {
              return (
                <div key={msg.id} id={`msg-${msg.id}`} className="flex justify-center">
                  <div className={darkMode
                    ? "rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs italic text-slate-300"
                    : "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs italic text-slate-500"}
                  >
                    Mensaje retirado por moderación.
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                ref={(el) => {
                  messageRefs.current[msg.id] = el;
                }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className="chat-message-stack relative flex max-w-[85%] flex-col-reverse pb-3">
                  {groupedReactions.length > 0 && (
                    <div className={`chat-reactions-row absolute -bottom-2 ${isMine ? "right-2 justify-end" : "left-2 justify-start"} z-10 flex flex-wrap gap-1`}>
                      {groupedReactions.map((r) => (
                        <button
                          key={r.emoji}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await toggleReaction(msg.id, r.emoji);
                          }}
                          className={
                            r.mine
                              ? "px-2 py-1 rounded-full text-xs bg-yellow-200 text-slate-900"
                              : darkMode
                              ? "px-2 py-1 rounded-full text-xs bg-slate-700 text-slate-100"
                              : "px-2 py-1 rounded-full text-xs bg-gray-200 text-slate-800"
                          }
                        >
                          {r.emoji} {r.count}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={highlightedId === msg.id ? "min-w-[280px] p-2 md:p-3 bg-yellow-100 rounded-2xl border-2 border-yellow-400 transition-all" : bubbleClasses(darkMode, isMine, role)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        {!isMine && (
                          <>
                            {msg.senderPhotoURL ? (
                              <img
                                src={msg.senderPhotoURL}
                                alt="perfil"
                                className="w-7 h-7 rounded-full object-cover border border-gray-300 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                                {safeName(
                                  msg.senderName
                                )
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                            )}
                          </>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className={darkMode ? "text-[11px] md:text-xs text-slate-100 font-bold leading-tight truncate" : "text-[11px] md:text-xs text-gray-900 font-bold leading-tight truncate"}>
                            {isMine
                              ? currentNickname
                              : safeName(
                                  msg.senderName
                                )}
                          </p>
                        </div>
                      </div>

                      <div className="relative shrink-0" data-popup-root="true" onClick={(e) => e.stopPropagation()}>
                        {msg.senderPlan === "premium" && (
                          <span className="text-sm md:text-base mr-1" title="Premium">
                            👑
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);

                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuWidth = 260;
                            const menuHeight = 270;
                            const gap = 10;

                            const candidates = [
                              { left: rect.left, top: rect.bottom + gap },
                              { left: rect.right - menuWidth, top: rect.bottom + gap },
                              { left: rect.left, top: rect.top - menuHeight - gap },
                              { left: rect.right - menuWidth, top: rect.top - menuHeight - gap },
                              { left: rect.right + gap, top: rect.top },
                              { left: rect.left - menuWidth - gap, top: rect.top },
                            ];

                            function overflow(pos: { left: number; top: number }) {
                              return (
                                Math.max(0, gap - pos.left) +
                                Math.max(0, gap - pos.top) +
                                Math.max(0, pos.left + menuWidth - (window.innerWidth - gap)) +
                                Math.max(0, pos.top + menuHeight - (window.innerHeight - gap))
                              );
                            }

                            const best = candidates
                              .map((pos) => ({ pos, score: overflow(pos) }))
                              .sort((a, b) => a.score - b.score)[0].pos;

                            const left = Math.min(Math.max(gap, best.left), window.innerWidth - menuWidth - gap);
                            const top = Math.min(Math.max(gap, best.top), window.innerHeight - menuHeight - gap);

                            if (actionForMessage === msg.id) {
                              setActionForMessage(null);
                              setActionMenuPosition(null);
                            } else {
                              setActionForMessage(msg.id);
                              setActionMenuPosition({ left, top });
                            }
                          }}
                          className={darkMode ? "text-xs bg-slate-700 text-slate-100 px-2 py-1 rounded-xl" : "text-xs bg-slate-800 text-white px-2 py-1 rounded-xl"}
                        >
                          ⋯
                        </button>

                        {actionForMessage === msg.id && actionMenuPosition && (
                          <div
                            data-popup-root="true"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              left: actionMenuPosition.left,
                              top: actionMenuPosition.top,
                            }}
                            className={darkMode ? "fixed z-[99999] w-[260px] max-w-[90vw] rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl" : "fixed z-[99999] w-[260px] max-w-[90vw] rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl"}
                          >
                            <button
                              type="button"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startReply(msg);
                                const details = e.currentTarget.closest("details");
                                if (details) details.removeAttribute("open");
                              }}
                              className="w-full text-left text-xs px-3 py-2 rounded-xl bg-blue-600 text-white"
                            >
                              Responder
                            </button>

                            {!isMine && (
                              <button
                                type="button"
                                onPointerDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setActionForMessage(null);
                                  setActionMenuPosition(null);
                                  setReportMessageId(msg.id);
                                }}
                                className="mt-2 w-full rounded-xl bg-red-600 px-3 py-2 text-left text-xs font-bold text-white"
                              >
                                Reportar
                              </button>
                            )}

                            <div className="mt-2 flex flex-wrap gap-2">
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onPointerDown={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    await toggleReaction(msg.id, emoji);
                                    const details = e.currentTarget.closest("details");
                                    if (details) details.removeAttribute("open");
                                  }}
                                  className={darkMode ? "px-3 py-2 rounded-xl text-sm bg-slate-700 text-slate-100" : "px-3 py-2 rounded-xl text-sm bg-gray-100 text-slate-900"}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {msg.replyTo && (
                      <button
                        onClick={() => jumpToMessage(msg.replyTo!.id)}
                        className={darkMode ? "mt-2 w-full text-left rounded-lg border-l-4 border-blue-400 bg-slate-700 px-3 py-2" : "mt-2 w-full text-left rounded-lg border-l-4 border-blue-500 bg-blue-50 px-3 py-2"}
                      >
                        <p className={darkMode ? "text-[11px] md:text-sm text-slate-100 break-words" : "text-[11px] md:text-sm text-blue-900 break-words"}>
                          {shortenText(msg.replyTo.text)}
                        </p>
                      </button>
                    )}

                    {!!msg.text && (
                      <p className={darkMode ? "text-[11px] md:text-sm text-slate-100 mt-2 break-words leading-snug" : "text-[11px] md:text-sm text-gray-900 mt-2 break-words leading-snug"}>
                        {msg.text}
                      </p>
                    )}
                    <div className={darkMode ? "mt-2 flex items-center gap-2 text-[10px] text-slate-300" : "mt-2 flex items-center gap-2 text-[10px] text-gray-500"}>
                      <span>{formatChatTime(msg.createdAt)}</span>
                    </div>

                    {msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div className={
                        (msg.imageUrls?.length ?? 0) === 1
                          ? "mt-2 grid grid-cols-1 gap-2"
                          : "mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2"
                      }>
                        {msg.imageUrls.map((url) => (
                          <button
                            key={url}
                            type="button"
                            title="Toca para ampliar"
                            className={
                              (msg.imageUrls?.length ?? 0) === 1
                                ? "flex w-full justify-center overflow-hidden rounded-xl"
                                : "block w-full overflow-hidden rounded-xl"
                            }
                          >
                            <img
                              src={url}
                              alt="Imagen del mensaje"
                              loading="lazy"
                              decoding="async"
                              data-force-image-zoom="true"
                              className={
                                (msg.imageUrls?.length ?? 0) === 1
                                  ? "w-full max-w-[520px] max-h-[360px] h-auto object-contain rounded-xl border border-gray-300"
                                  : "w-full max-h-72 object-cover rounded-xl border border-gray-300"
                              }
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {newMessagesWaiting > 0 && (
            <button
              type="button"
              onClick={scrollToLatestMessages}
              className={darkMode
                ? "absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 shadow-lg hover:bg-slate-700"
                : "absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-lg hover:bg-gray-50"}
            >
              ↓ {newMessagesWaiting === 1 ? "Nuevo mensaje" : `${newMessagesWaiting} nuevos mensajes`}
            </button>
          )}
        </div>

        {replyingTo && (
          <div className={darkMode ? "mb-2 rounded-xl border border-blue-400 bg-slate-800 p-3" : "mb-2 rounded-xl border border-blue-200 bg-blue-50 p-3"}>
            <div className="flex items-start justify-between gap-2">
              <p className={darkMode ? "text-xs md:text-sm text-slate-100 break-words flex-1" : "text-xs md:text-sm text-blue-900 break-words flex-1"}>
                {shortenText(replyingTo.text)}
              </p>
              <button
                onClick={clearReply}
                className="shrink-0 bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs md:text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {previewUrls.length > 0 && (
          <div className={darkMode ? "mb-2 rounded-2xl border border-slate-700 bg-slate-800 p-3" : "mb-2 rounded-2xl border border-gray-200 bg-gray-50 p-3"}>
            <p className={darkMode ? "text-xs text-slate-200 mb-2" : "text-xs text-gray-700 mb-2"}>
              Vista previa
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {previewUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt="preview"
                  className="max-h-44 w-full object-cover rounded-xl border border-gray-300 mx-auto"

                            decoding="async"/>
              ))}
            </div>
          </div>
        )}

        {galleryOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={darkMode ? "mb-2 rounded-2xl border border-slate-700 bg-slate-800 p-3" : "mb-2 rounded-2xl border border-gray-200 bg-gray-50 p-3"}
          >
            <div className="flex items-center justify-between mb-2">
              <p className={darkMode ? "text-xs md:text-sm font-semibold text-slate-100" : "text-xs md:text-sm font-semibold text-gray-800"}>
                Biblioteca de imágenes
              </p>
              <button
                onClick={() => setGalleryOpen(false)}
                className="bg-red-600 text-white px-3 py-1 rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>

            {userImages.length === 0 ? (
              <p className={darkMode ? "text-xs text-yellow-300" : "text-xs text-gray-600"}>
                Aún no tienes imágenes guardadas.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {userImages.map((img) => {
                  const selected = selectedSavedUrls.includes(img.url);
                  return (
                    <button
                      key={img.id}
                      onClick={() => toggleSavedUrl(img.url)}
                      className={selected ? "rounded-xl border-2 border-blue-600 p-1 bg-blue-50" : darkMode ? "rounded-xl border border-slate-600 p-1 bg-slate-900" : "rounded-xl border border-gray-300 p-1 bg-white"}
                    >
                      <img
                        src={img.url}
                        alt="guardada"
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            <div
              className={
                darkMode
                  ? "mt-4 border-t border-slate-600 pt-3"
                  : "mt-4 border-t border-gray-300 pt-3"
              }
            >
              <p
                className={
                  darkMode
                    ? "mb-1 text-xs md:text-sm font-semibold text-slate-100"
                    : "mb-1 text-xs md:text-sm font-semibold text-gray-800"
                }
              >
                Compartidas por estudiantes
              </p>

              <p
                className={
                  darkMode
                    ? "mb-3 text-[11px] text-slate-400"
                    : "mb-3 text-[11px] text-gray-500"
                }
              >
                Reutilizarlas no vuelve a subir el archivo.
              </p>

              {sharedImages.filter(
                (shared) =>
                  !userImages.some(
                    (own) => own.url === shared.url
                  )
              ).length === 0 ? (
                <p
                  className={
                    darkMode
                      ? "text-xs text-slate-400"
                      : "text-xs text-gray-500"
                  }
                >
                  Todavía no hay imágenes compartidas nuevas.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sharedImages
                    .filter(
                      (shared) =>
                        !userImages.some(
                          (own) => own.url === shared.url
                        )
                    )
                    .map((img) => {
                      const selected =
                        selectedSavedUrls.includes(img.url);

                      return (
                        <button
                          key={img.id}
                          onClick={() => toggleSavedUrl(img.url)}
                          className={
                            selected
                              ? "rounded-xl border-2 border-blue-600 p-1 bg-blue-50"
                              : darkMode
                              ? "rounded-xl border border-slate-600 p-1 bg-slate-900"
                              : "rounded-xl border border-gray-300 p-1 bg-white"
                          }
                        >
                          <img
                            src={img.url}
                            alt="compartida"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {templatesOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={darkMode ? "rounded-2xl border border-slate-700 bg-slate-800 p-3" : "rounded-2xl border border-gray-200 bg-gray-50 p-3"}
            >
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_MESSAGES.map((template) => (
                  <button
                    key={template}
                    onClick={() => sendTemplateMessage(template)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs md:text-sm"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="grid grid-cols-[auto_auto_auto_auto_minmax(0,1fr)_auto] items-stretch gap-2 pb-[env(safe-area-inset-bottom)] mb-3 max-[620px]:grid-cols-3"
          >
            <button
              onClick={() => setTemplatesOpen((prev) => !prev)}
              className="bg-blue-600 text-white px-3 py-2 rounded-xl text-sm"
              title="Mensajes rápidos"
            >
              ⚡
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageSelect(e.target.files)}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm shadow-sm transition hover:bg-emerald-700 active:scale-95"
              title="Adjuntar imágenes nuevas"
              aria-label="Adjuntar imágenes nuevas"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H9l1.2-1.7A1 1 0 0 1 11 4h2a1 1 0 0 1 .8.3L15 6h2.5A2.5 2.5 0 0 1 20 8.5v7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5v-7Z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M18.5 3.5v4M16.5 5.5h4" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setGalleryOpen((prev) => !prev)}
              className="inline-flex items-center justify-center bg-amber-500 text-white px-3 py-2 rounded-xl text-sm shadow-sm transition hover:bg-amber-600 active:scale-95"
              title="Usar imágenes anteriores"
              aria-label="Usar imágenes anteriores"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="5" width="14" height="14" rx="2" />
                <path d="m8 15 3-3 2.2 2.2 1.6-1.6L18 16" />
                <circle cx="14.5" cy="9.5" r="1.2" />
                <path d="M3 8V5a2 2 0 0 1 2-2h11" />
              </svg>
            </button>

            <div className={darkMode ? "flex shrink-0 rounded-xl border border-slate-600 bg-slate-800 p-1 max-[620px]:col-span-3 max-[620px]:grid max-[620px]:grid-cols-2" : "flex shrink-0 rounded-xl border border-gray-300 bg-gray-100 p-1 max-[620px]:col-span-3 max-[620px]:grid max-[620px]:grid-cols-2"}>
              <button
                type="button"
                onClick={() => setSenderRole("buyer")}
                className={
                  senderRole === "buyer"
                    ? "rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                    : darkMode
                    ? "rounded-lg px-3 py-2 text-xs font-semibold text-slate-200"
                    : "rounded-lg px-3 py-2 text-xs font-semibold text-slate-700"
                }
              >
                Comprador
              </button>

              <button
                type="button"
                onClick={() => setSenderRole("seller")}
                className={
                  senderRole === "seller"
                    ? "rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                    : darkMode
                    ? "rounded-lg px-3 py-2 text-xs font-semibold text-slate-200"
                    : "rounded-lg px-3 py-2 text-xs font-semibold text-slate-700"
                }
              >
                Vendedor
              </button>
            </div>

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleTextKeyDown}
              className={darkMode ? "min-w-0 w-full border border-slate-600 bg-slate-800 rounded-xl p-2 md:p-3 text-sm text-slate-100 placeholder:text-slate-400 max-[620px]:col-span-2 max-[620px]:min-h-11" : "min-w-0 w-full border border-gray-300 rounded-xl p-2 md:p-3 text-sm text-gray-900 placeholder:text-gray-700 max-[620px]:col-span-2 max-[620px]:min-h-11"}
              placeholder="Escribe un mensaje..."
            />

            <button
              type="button"
              onClick={() => void sendCurrentMessage()}
              disabled={
                sendingImages ||
                (
                  !text.trim() &&
                  selectedImages.length === 0 &&
                  selectedSavedUrls.length === 0
                )
              }
              className="bg-violet-600 text-white px-3 py-2 md:px-4 md:py-3 rounded-xl text-sm font-bold disabled:bg-gray-400 disabled:cursor-not-allowed max-[620px]:min-w-0 max-[620px]:px-3"
            >
              {sendingImages ? "Subiendo..." : "Enviar"}
            </button>
          </div>

          {(selectedImages.length > 0 || selectedSavedUrls.length > 0) && (
            <div className="relative flex flex-wrap items-center gap-2">

              {selectedImages.length > 0 && (
                <label
                  className={
                    darkMode
                      ? "w-full flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100"
                      : "w-full flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800"
                  }
                >
                  <input
                    type="checkbox"
                    checked={imageReuseMode === "product"}
                    onChange={(e) =>
                      setImageReuseMode(
                        e.target.checked ? "product" : "shared"
                      )
                    }
                  />

                  Foto de mi producto · solo yo puedo reutilizarla
                </label>
              )}

              <p className={darkMode ? "text-xs md:text-sm text-slate-200 break-all flex-1" : "text-xs md:text-sm text-gray-700 break-all flex-1"}>
                {selectedImages.length > 0
                  ? `${selectedImages.length} imagen(es) nueva(s) seleccionada(s)`
                  : `${selectedSavedUrls.length} imagen(es) guardada(s) seleccionada(s)`}
              </p>
              <button
                onClick={() => {
                  setSelectedImages([]);
                  setSelectedSavedUrls([]);
                  setImageReuseMode("shared");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="bg-red-600 text-white px-3 py-2 rounded-xl text-sm"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {reportMessageId && firebaseUser && (
        <ReportDialog
          user={firebaseUser}
          targetType="message"
          targetId={reportMessageId}
          onClose={() => setReportMessageId(null)}
          onReported={() => {
            setToast("Reporte enviado a administración.");
            window.setTimeout(() => setToast(""), 2400);
          }}
        />
      )}



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











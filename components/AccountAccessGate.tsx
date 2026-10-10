"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { storeApiFetch } from "@/lib/store/client";
import { followUpSessionRetryDelayMs, immediateSessionRetryDelayMs } from "@/lib/security/sessionRetry.mjs";
import { useSession } from "@/lib/useSession";

type AccessState = "checking" | "allowed" | "unavailable" | "denied";

function isAccountSetupPage(path: string): boolean {
  return path === "/login" || path === "/register" || path === "/verify-email";
}

function isProtectedPage(path: string): boolean {
  return [
    "/admin", "/chat", "/cosas-perdidas", "/mystore", "/mystores", "/notifications",
    "/orders", "/profile", "/sell", "/verify-student",
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export default function AccountAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseUser, loading } = useSession();
  const [state, setState] = useState<AccessState>("checking");
  const [attempt, setAttempt] = useState(0);
  const [verified, setVerified] = useState<{ uid: string; path: string; checkedAt: number } | null>(null);
  const lastVerified = useRef<{ uid: string; checkedAt: number } | null>(null);
  const setupPage = isAccountSetupPage(pathname);
  const protectedPage = isProtectedPage(pathname);

  useEffect(() => {
    if (setupPage) return;
    if (loading) {
      setState("checking");
      return;
    }
    if (!firebaseUser) {
      lastVerified.current = null;
      setVerified(null);
      setState("denied");
      if (protectedPage) router.replace("/login");
      return;
    }

    // A short UI-only cache prevents repeat Firestore reads on every click.
    // Every protected API still checks the eight-year rule independently.
    const cached = lastVerified.current;
    if (cached?.uid === firebaseUser.uid && Date.now() - cached.checkedAt < 30_000 && attempt === 0) {
      setVerified({ ...cached, path: pathname });
      setState("allowed");
      return;
    }

    let cancelled = false;
    let followUpTimer: number | null = null;
    const controller = new AbortController();
    setState("checking");

    const scheduleFollowUp = (delayMs: number) => {
      // Two automatic retries maximum; manual Reintentar remains available.
      // Stagger by device to avoid a synchronized wave on campus Wi-Fi.
      if (cancelled || attempt >= 2) return;
      followUpTimer = window.setTimeout(() => {
        if (!cancelled) setAttempt((current) => current + 1);
      }, delayMs + Math.floor(Math.random() * 3000));
    };

    void (async () => {
      try {
        // Retry only transient backend outages. Never retry an explicit
        // account denial, and never grant access while verification is pending.
        let response: Response;
        for (let retry = 0; ; retry += 1) {
          response = await storeApiFetch(firebaseUser, "/api/account/session", {
            signal: controller.signal,
            cache: "no-store",
          });
          // Never hammer a 429; honor Retry-After from Firebase/Cloudflare.
          const delayMs = immediateSessionRetryDelayMs(
            response.status, retry, response.headers.get("retry-after"),
          );
          if (delayMs === null) break;
          await new Promise<void>((resolve, reject) => {
            const delay = window.setTimeout(resolve, delayMs + Math.floor(Math.random() * 350));
            controller.signal.addEventListener("abort", () => {
              window.clearTimeout(delay);
              reject(new DOMException("Aborted", "AbortError"));
            }, { once: true });
          });
        }
        if (cancelled) return;
        if (response.ok) {
          const result = await response.json().catch(() => ({}));
          if (cancelled) return;
          if (result.eligible !== true) {
            setState("denied");
            return;
          }
          const validated = { uid: firebaseUser.uid, checkedAt: Date.now() };
          lastVerified.current = validated;
          setVerified({ ...validated, path: pathname });
          setState("allowed");
          return;
        }

        lastVerified.current = null;
        setVerified(null);
        if (response.status === 401 || response.status === 403) {
          const deniedBody = await response.json().catch(() => ({}));
          const deniedMessage =
            typeof deniedBody.error === "string" && deniedBody.error.trim()
              ? deniedBody.error
              : "No tienes acceso a Mercadito.";
          window.sessionStorage.setItem("mercaditoAccessError", deniedMessage);
          setState("denied");
          await signOut(auth).catch(() => undefined);
          if (!cancelled && protectedPage) router.replace("/login");
        } else {
          // No backend verification means NO protected content, even if
          // Firebase left an old local session active.
          setState("unavailable");
          scheduleFollowUp(
            followUpSessionRetryDelayMs(response.status, response.headers.get("retry-after")),
          );
        }
      } catch {
        if (!cancelled) {
          lastVerified.current = null;
          setVerified(null);
          setState("unavailable");
          scheduleFollowUp(20_000);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (followUpTimer !== null) window.clearTimeout(followUpTimer);
      controller.abort();
    };
  }, [firebaseUser, loading, pathname, protectedPage, router, setupPage, attempt]);

  if (setupPage || !protectedPage) return <>{children}</>;
  if (state === "allowed" && verified?.uid === firebaseUser?.uid && verified?.path === pathname) return <>{children}</>;

  return (
    <main className="min-h-screen bg-gray-100 p-5">
      <div role="status" className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-md">
        {state === "unavailable" ? (
          <>
            <h1 className="text-xl font-bold">Acceso temporalmente no disponible</h1>
            <p className="mt-2 text-sm">
              No podemos verificar los requisitos de acceso con el servidor.
              Las funciones privadas permanecerán bloqueadas por seguridad.
              El sistema intentará conectarse de nuevo automáticamente.
            </p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">
              Reintentar
            </button>
          </>
        ) : (
          <p className="font-semibold">
            {state === "denied" ? "Cuenta no autorizada. Regresando al inicio de sesión..." : "Comprobando acceso institucional..."}
          </p>
        )}
      </div>
    </main>
  );
}

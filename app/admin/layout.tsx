"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { isAdminRole } from "@/lib/security/domain";
import { storeApiFetch } from "@/lib/store/client";
import { useSession } from "@/lib/useSession";

type AccessState = "checking" | "allowed" | "denied" | "unavailable";

/**
 * No admin page is mounted until a fresh, server-side check confirms
 * both the current Firebase session and the user's current admin role.
 * Stale Firestore snapshots, failed logins, and unavailable databases
 * cannot unlock an administrative screen.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseUser, appUser, loading } = useSession();
  const [access, setAccess] = useState<AccessState>("checking");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const recheck = () => setRetry((current) => current + 1);
    window.addEventListener("focus", recheck);
    return () => window.removeEventListener("focus", recheck);
  }, []);

  useEffect(() => {
    if (loading) {
      setAccess("checking");
      return;
    }
    if (!firebaseUser) {
      setAccess("denied");
      router.replace("/login");
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    setAccess("checking");

    void (async () => {
      try {
        const response = await storeApiFetch(firebaseUser, "/api/admin/session", {
          cache: "no-store",
          signal: abortController.signal,
        });
        if (cancelled) return;

        if (response.ok) {
          const body = await response.json().catch(() => ({}));
          if (cancelled) return;
          if (body.role === "superadmin" || body.role === "subadmin") {
            setAccess("allowed");
          } else {
            setAccess("denied");
            router.replace("/marketplace");
          }
        } else if (response.status === 401) {
          setAccess("denied");
          await signOut(auth).catch(() => undefined);
          if (!cancelled) router.replace("/login");
        } else if (response.status === 403) {
          setAccess("denied");
          router.replace("/marketplace");
        } else {
          // Including Firestore 429/503: fail closed; never render admin UI.
          setAccess("unavailable");
        }
      } catch {
        if (!cancelled) setAccess("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [firebaseUser, loading, pathname, retry, router]);

  if (access === "allowed" && isAdminRole(appUser)) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div role="status" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-md">
        {access === "unavailable" ? (
          <>
            <h1 className="text-xl font-bold">Administración temporalmente bloqueada</h1>
            <p className="mt-2 text-sm">
              No se pudieron verificar los permisos con el servidor. Por seguridad,
              las funciones administrativas permanecerán cerradas hasta restablecer la conexión.
            </p>
            <button
              type="button"
              onClick={() => setRetry((current) => current + 1)}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Reintentar verificación
            </button>
          </>
        ) : (
          <p className="text-sm font-semibold">
            {access === "denied"
              ? "Acceso administrativo no autorizado. Redirigiendo..."
              : "Verificando sesión y permisos de administración..."}
          </p>
        )}
      </div>
    </main>
  );
}

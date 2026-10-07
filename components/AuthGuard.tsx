"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { firebaseUser, loading, logout } = useSession();
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      setAccessGranted(false);
      router.replace("/login");
      return;
    }

    const currentUser = firebaseUser;
    let cancelled = false;
    setAccessGranted(false);

    async function validateAccess() {
      try {
        const token = await currentUser.getIdToken(true);
        const response = await fetch("/api/account/access", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body.error ?? "No tienes acceso a Mercadito.");
        }

        if (!cancelled) setAccessGranted(true);
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "No se pudo validar tu acceso a Mercadito.";

        window.sessionStorage.setItem("mercaditoAccessError", message);
        await logout().catch(() => undefined);
        router.replace("/login");
      }
    }

    void validateAccess();

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, loading, logout, router]);

  if (loading || (firebaseUser && !accessGranted)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Validando acceso...</p>
      </main>
    );
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
}

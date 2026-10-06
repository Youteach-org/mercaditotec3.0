"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { firebaseUser, loading } = useSession();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      const next = pathname && pathname !== "/login" ? pathname : "/marketplace";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [firebaseUser, loading, pathname, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-700">Cargando...</p>
      </main>
    );
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
}

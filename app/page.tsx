"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/useSession";

// Guests retain the approved store-first Marketplace.
// Signed-in users land on the approved product-first Descubre wall.
export default function HomePage() {
  const router = useRouter();
  const { firebaseUser, loading } = useSession();
  useEffect(() => {
    if (loading) return;
    router.replace(firebaseUser ? "/descubre" : "/marketplace");
  }, [loading, firebaseUser, router]);
  return <main className="min-h-screen bg-[#fff9ee]" aria-busy="true" aria-label="Abriendo Mercadito" />;
}

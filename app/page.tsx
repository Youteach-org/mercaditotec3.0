"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/useSession";

// Descubre is the public homepage. Product details and shops require login.
export default function HomePage() {
  const router = useRouter();
  const { loading } = useSession();
  useEffect(() => {
    if (loading) return;
    router.replace("/descubre");
  }, [loading, router]);
  return <main className="min-h-screen bg-[#fff9ee]" aria-busy="true" aria-label="Abriendo Mercadito" />;
}

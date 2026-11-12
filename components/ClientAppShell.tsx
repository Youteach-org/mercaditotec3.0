"use client";

import dynamic from "next/dynamic";

import StoreImageCacheRegistration from "@/components/StoreImageCacheRegistration";

const RuntimeAppShell = dynamic(
  () => import("@/components/RuntimeAppShell"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-100" aria-busy="true" />
    ),
  },
);

export default function ClientAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StoreImageCacheRegistration />
      <RuntimeAppShell>{children}</RuntimeAppShell>
    </>
  );
}

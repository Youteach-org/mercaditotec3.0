"use client";

import AppShell from "@/components/AppShell";
import { SessionProvider } from "@/lib/useSession";

export default function RuntimeAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}

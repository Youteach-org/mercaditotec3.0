"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/admin/users", label: "Usuarios", icon: "👥" },
  { href: "/admin/stores", label: "Tiendas", icon: "🏪" },
  { href: "/admin/categories", label: "Categorías", icon: "🗂️" },
  { href: "/admin/marketplace", label: "Portada", icon: "✏️" },
  { href: "/admin/reports", label: "Reportes", icon: "🚩" },
  { href: "/admin/chat", label: "Chat", icon: "💬" },
  { href: "/admin/users#administradores", label: "Administradores", icon: "🛡️" },
  { href: "/admin/audit", label: "Historial", icon: "🧾" },
];

export default function AdminQuickNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Accesos rápidos de administración" className="flex w-full flex-wrap gap-2 rounded-2xl bg-white/90 p-2 shadow-sm">
      {destinations.map(({ href, label, icon }) => {
        const active = pathname === href.split("#")[0] && !href.includes("#");
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-md sm:flex-none ${active ? "border-amber-400 bg-amber-100 text-slate-900" : "border-gray-200 bg-gray-50 text-slate-800"}`}>
            <span aria-hidden="true">{icon}</span><span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  effectiveAdminRole,
  isAdminRole,
  isSuperadminRole,
} from "@/lib/security/domain";
import { useSession } from "@/lib/useSession";

const cards: Array<{
  title: string;
  description: string;
  href: string | null;
  icon: string;
}> = [
  {
    title: "Usuarios y aprobaciones",
    description: "Busca alumnos, revisa avales, aprueba pendientes y depura cuentas.",
    href: "/admin/users",
    icon: "👥",
  },
  {
    title: "Tiendas",
    description: "Aprueba, devuelve para cambios, suspende o reactiva tiendas.",
    href: "/admin/stores",
    icon: "🏪",
  },
  {
    title: "Categorías de productos",
    description: "Organiza las categorías, elige sus iconos visualmente y controla cuáles están activas.",
    href: "/admin/categories",
    icon: "🗂️",
  },
  {
    title: "Portada Mercadito",
    description: "Edita post-its, letreros, buscador y etiquetas visibles en la portada.",
    href: "/admin/marketplace",
    icon: "✏️",
  },
  {
    title: "Reportes",
    description: "Cola central para reportes de usuarios, tiendas y mensajes.",
    href: "/admin/reports",
    icon: "🚩",
  },
  {
    title: "Chat",
    description: "Moderación de mensajes reportados y contenido inapropiado.",
    href: "/admin/chat",
    icon: "💬",
  },
  {
    title: "Administradores",
    description: "Gestiona subadmins. Solo el superadmin puede cambiar estos permisos.",
    href: "/admin/users#administradores",
    icon: "🛡️",
  },
  {
    title: "Historial",
    description: "Consulta quién realizó cada acción administrativa sensible.",
    href: "/admin/audit",
    icon: "🧾",
  },
  {
    title: "Consumo y rendimiento",
    description: "Vigila las peticiones de Cloudflare y los límites gratuitos de Firebase, sin actualizaciones automáticas.",
    href: "/admin/usage",
    icon: "📊",
  },
];

export default function AdminHomePage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading } = useSession();
  const admin = isAdminRole(appUser);
  const superadmin = isSuperadminRole(appUser);
  const role = effectiveAdminRole(appUser);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!admin) router.replace("/marketplace");
  }, [admin, firebaseUser, loading, router]);

  if (loading || !firebaseUser || !admin) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-md">
          Verificando permisos...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-300">
                MercaditoTec3
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Centro de administración</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Seguridad, usuarios, tiendas y trazabilidad administrativa desde un solo lugar.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 text-sm">
              <div className="font-bold">{superadmin ? "Superadmin" : "Subadmin"}</div>
              <div className="mt-0.5 text-slate-300">Nivel efectivo: {role}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-3xl" aria-hidden="true">{card.icon}</span>
                  {!card.href && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      Siguiente fase
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-xl font-black text-gray-900">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.description}</p>
              </>
            );

            return card.href ? (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {body}
              </Link>
            ) : (
              <article
                key={card.title}
                className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-5"
              >
                {body}
              </article>
            );
          })}
        </section>

        <section className="flex flex-wrap gap-3 rounded-2xl bg-white p-5 shadow-sm">
          <Link
            href="/marketplace"
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            Volver al Mercadito
          </Link>
        </section>
      </div>
    </main>
  );
}

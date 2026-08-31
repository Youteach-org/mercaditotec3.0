"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { isAdminRole, type AdminRole } from "@/lib/security/domain";
import { storeApiFetch } from "@/lib/store/client";
import { useSession } from "@/lib/useSession";

interface AuditEntry {
  id: string;
  actorUid: string;
  actorRole: AdminRole;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    "user.student.verify": "Alumno confirmado",
    "user.student.revoke": "Confirmación de alumno revocada",
    "admin.subadmin.assign": "Subadmin asignado",
    "admin.subadmin.remove": "Subadmin retirado",
    "store.approve": "Tienda aprobada",
    "store.changes_required": "Tienda devuelta para cambios",
    "store.suspend": "Tienda suspendida",
    "store.reactivate": "Tienda reactivada",
    "store.status.update": "Estado de tienda actualizado",
  };
  return labels[action] ?? action;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading: sessionLoading } = useSession();
  const isAdmin = isAdminRole(appUser);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/marketplace");
  }, [firebaseUser, isAdmin, router, sessionLoading]);

  const load = useCallback(async () => {
    if (!firebaseUser || !isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const response = await storeApiFetch(firebaseUser, "/api/admin/audit");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el historial.");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, isAdmin]);

  useEffect(() => {
    if (firebaseUser && isAdmin) void load();
  }, [firebaseUser, isAdmin, load]);

  if (sessionLoading || !firebaseUser || !isAdmin) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-md">Verificando permisos...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <Link href="/admin" className="text-sm font-semibold text-blue-700 hover:underline">
            ← Centro de administración
          </Link>
          <h1 className="mt-2 text-3xl font-black text-gray-900">Historial administrativo</h1>
          <p className="mt-1 text-gray-600">
            Registro de acciones sensibles realizadas por Superadmin y Subadmin.
          </p>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <section className="rounded-2xl bg-white p-6 shadow-md">Cargando historial...</section>
        ) : entries.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-md">
            Todavía no hay acciones registradas.
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl bg-white shadow-md">
            <div className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <article key={entry.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-black text-gray-900">{actionLabel(entry.action)}</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {entry.actorRole === "superadmin" ? "Superadmin" : "Subadmin"} · {entry.targetType}
                      </p>
                    </div>
                    <time className="text-xs font-semibold text-gray-500">
                      {new Date(entry.createdAt).toLocaleString("es-MX")}
                    </time>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-2.5 break-all">
                      Actor: <span className="font-mono">{entry.actorUid}</span>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2.5 break-all">
                      Objetivo: <span className="font-mono">{entry.targetId}</span>
                    </div>
                  </div>

                  {Object.keys(entry.metadata ?? {}).length > 0 && (
                    <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                      <summary className="cursor-pointer font-bold text-gray-700">Detalles</summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

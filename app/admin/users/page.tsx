"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  isAdminRole,
  isSuperadminRole,
  type AdminRole,
  type StudentTrustStatus,
} from "@/lib/security/domain";
import { storeApiFetch } from "@/lib/store/client";
import { useSession } from "@/lib/useSession";

interface AdminUserSummary {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  adminRole: AdminRole | null;
  studentStatus: StudentTrustStatus;
  studentEndorsementCount: number;
  isActive: boolean;
  blocked: boolean;
  createdAt: string | null;
}

const TRUST_LABEL: Record<StudentTrustStatus, string> = {
  pending: "Pendiente",
  verified: "Alumno confirmado",
  revoked: "Confirmación revocada",
};

const TRUST_CLASS: Record<StudentTrustStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  verified: "bg-emerald-100 text-emerald-800",
  revoked: "bg-red-100 text-red-800",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading: sessionLoading } = useSession();
  const isAdmin = isAdminRole(appUser);
  const isSuperadmin = isSuperadminRole(appUser);

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingUid, setWorkingUid] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [trustFilter, setTrustFilter] = useState<"all" | StudentTrustStatus>("all");

  useEffect(() => {
    if (sessionLoading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) router.replace("/marketplace");
  }, [firebaseUser, isAdmin, router, sessionLoading]);

  const loadUsers = useCallback(async () => {
    if (!firebaseUser || !isAdmin) return;
    setLoading(true);
    setError("");

    try {
      const response = await storeApiFetch(firebaseUser, "/api/admin/users");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los usuarios.");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "No se pudieron cargar los usuarios.",
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, isAdmin]);

  useEffect(() => {
    if (firebaseUser && isAdmin) void loadUsers();
  }, [firebaseUser, isAdmin, loadUsers]);

  const visibleUsers = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesStatus = trustFilter === "all" || user.studentStatus === trustFilter;
      const matchesQuery =
        !clean ||
        [user.username, user.email, user.displayName, user.uid]
          .join(" ")
          .toLowerCase()
          .includes(clean);
      return matchesStatus && matchesQuery;
    });
  }, [query, trustFilter, users]);

  async function updateTrust(
    user: AdminUserSummary,
    status: "verified" | "revoked",
  ) {
    if (!firebaseUser) return;

    if (status === "verified") {
      const label = user.username ? `@${user.username}` : user.email;
      const confirmed = window.confirm(
        `¿Aprobar manualmente a ${label}? Sus avales reales se conservarán sin convertirlos artificialmente en 2/2.`,
      );
      if (!confirmed) return;
    }

    setWorkingUid(user.uid);
    setError("");
    setMessage("");

    try {
      const response = await storeApiFetch(
        firebaseUser,
        `/api/admin/users/${user.uid}/trust`,
        { method: "POST", body: JSON.stringify({ status }) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar al usuario.");
      setUsers((current) =>
        current.map((item) => (item.uid === user.uid ? (data.user as AdminUserSummary) : item)),
      );
      setMessage(
        status === "verified"
          ? "Alumno aprobado manualmente por Superadmin."
          : "Confirmación de alumno revocada.",
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar al usuario.");
    } finally {
      setWorkingUid(null);
    }
  }

  async function updateRole(user: AdminUserSummary, role: "subadmin" | "user") {
    if (!firebaseUser || !isSuperadmin) return;
    setWorkingUid(user.uid);
    setError("");
    setMessage("");

    try {
      const response = await storeApiFetch(
        firebaseUser,
        `/api/admin/users/${user.uid}/role`,
        { method: "POST", body: JSON.stringify({ role }) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar el administrador.");
      setUsers((current) =>
        current.map((item) => (item.uid === user.uid ? (data.user as AdminUserSummary) : item)),
      );
      setMessage(role === "subadmin" ? "Subadmin asignado." : "Permiso de subadmin retirado.");
      if (role === "subadmin") setSelectedUserUid(null);
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "No se pudo actualizar el administrador.",
      );
    } finally {
      setWorkingUid(null);
    }
  }

  async function deleteUser(user: AdminUserSummary) {
    if (!firebaseUser || !isSuperadmin) return;

    const label = user.username ? `@${user.username}` : user.email || user.uid;
    const confirmed = window.confirm(
      `¿Eliminar definitivamente a ${label}? Se borrarán su acceso de Firebase y su perfil de Mercadito. Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setWorkingUid(user.uid);
    setError("");
    setMessage("");

    try {
      const response = await storeApiFetch(
        firebaseUser,
        `/api/admin/users/${user.uid}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar al usuario.");
      }

      setUsers((current) => current.filter((item) => item.uid !== user.uid));
      setSelectedUserUid((current) => (current === user.uid ? null : current));
      setMessage(`Usuario ${label} eliminado.`);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "No se pudo eliminar al usuario.",
      );
    } finally {
      setWorkingUid(null);
    }
  }

  if (sessionLoading || !firebaseUser || !isAdmin) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-md">
          Verificando permisos...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <Link href="/admin" className="text-sm font-semibold text-blue-700 hover:underline">
            ← Centro de administración
          </Link>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900">Usuarios y aprobaciones</h1>
              <p className="mt-1 text-gray-600">
                Revisa alumnos y avales. La confirmación normal llega con 2 avales; el Superadmin puede aprobar manualmente a un alumno pendiente.
              </p>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar usuario, correo, nombre o ID"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 sm:max-w-sm"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-md">
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "Todos"],
              ["pending", "Pendientes"],
              ["verified", "Confirmados"],
              ["revoked", "Revocados"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTrustFilter(value)}
                className={
                  trustFilter === value
                    ? "rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                    : "rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        <section id="administradores" className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900">Administradores</h2>
              <p className="mt-1 text-sm text-gray-600">
                Solo existen Superadmin y Subadmin. {isSuperadmin ? "Puedes asignar o retirar subadmins." : "Solo el Superadmin puede cambiar estos permisos."}
              </p>
            </div>
            <span className="text-sm font-bold text-gray-500">
              {users.filter((user) => user.adminRole).length} cuenta(s) administrativas
            </span>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl bg-white p-6 shadow-md">Cargando usuarios...</section>
        ) : visibleUsers.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-md">
            No se encontraron usuarios.
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {visibleUsers.map((user) => {
              const working = workingUid === user.uid;
              const isSelf = user.uid === firebaseUser.uid;
              const canExpand = !isSelf;
              const canPromote = isSuperadmin && !isSelf && !user.adminRole;
              const canDelete =
                isSuperadmin && !isSelf && user.adminRole !== "superadmin";
              const selected = selectedUserUid === user.uid;
              return (
                <article
                  key={user.uid}
                  onClick={() => {
                    if (canExpand) {
                      setSelectedUserUid((current) => current === user.uid ? null : user.uid);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!canExpand || (event.key !== "Enter" && event.key !== " ")) return;
                    event.preventDefault();
                    setSelectedUserUid((current) => current === user.uid ? null : user.uid);
                  }}
                  tabIndex={canExpand ? 0 : undefined}
                  className={`rounded-2xl bg-white p-5 shadow-md transition ${canExpand ? "cursor-pointer" : ""} ${selected ? "ring-2 ring-[#174db4] ring-offset-2 ring-offset-[#fff9ee]" : ""}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-gray-900">
                        {user.displayName || user.email || "Usuario"}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        Usuario: {user.username ? `@${user.username}` : "—"}
                      </p>
                      <p className="mt-1 break-all text-sm text-gray-600">{user.email || "Sin correo visible"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TRUST_CLASS[user.studentStatus]}`}>
                        {TRUST_LABEL[user.studentStatus]}
                      </span>
                      {user.adminRole && (
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                          {user.adminRole === "superadmin" ? "Superadmin" : "Subadmin"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-xs font-bold uppercase text-gray-400">Avales</div>
                      <div className="mt-1 font-black text-gray-900">{user.studentEndorsementCount}/2</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-xs font-bold uppercase text-gray-400">Cuenta</div>
                      <div className="mt-1 font-black text-gray-900">{user.isActive ? "Activa" : "Inactiva"}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-xs font-bold uppercase text-gray-400">Bloqueo</div>
                      <div className="mt-1 font-black text-gray-900">{user.blocked ? "Sí" : "No"}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-xs font-bold uppercase text-gray-400">Alta</div>
                      <div className="mt-1 font-black text-gray-900">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("es-MX") : "—"}
                      </div>
                    </div>
                  </div>

                  {selected && (
                  <div
                    className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {!isSelf && (
                      <Link
                        href={`/chat/personal/${user.uid}`}
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
                      >
                        Abrir chat privado
                      </Link>
                    )}
                    {user.studentStatus === "pending" && (
                      <>
                        <span className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm font-bold text-amber-800">
                          Pendiente: se confirmará automáticamente al llegar a 2/2 avales.
                        </span>
                        {isSuperadmin && (
                          <button
                            type="button"
                            disabled={working}
                            onClick={() => void updateTrust(user, "verified")}
                            className="rounded-xl bg-emerald-700 px-3.5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                          >
                            Aprobar manualmente
                          </button>
                        )}
                      </>
                    )}
                    {user.studentStatus === "verified" && (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void updateTrust(user, "revoked")}
                        className="rounded-xl border border-red-200 px-3.5 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"
                      >
                        Revocar confirmación
                      </button>
                    )}
                    {user.studentStatus === "revoked" && (
                      <span className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-bold text-red-800">
                        Confirmación revocada por administración.
                      </span>
                    )}

                    {canPromote && selected && (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void updateRole(user, "subadmin")}
                        className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        Hacer Subadmin
                      </button>
                    )}

                    {isSuperadmin && !isSelf && user.adminRole === "subadmin" && (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void updateRole(user, "user")}
                        className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
                      >
                        Quitar Subadmin
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => void deleteUser(user)}
                        className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        Eliminar usuario
                      </button>
                    )}
                  </div>
                  )}

                  <p className="mt-3 break-all text-[11px] text-gray-400">ID interno: {user.uid}</p>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

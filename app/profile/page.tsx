"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import { uploadImageFile } from "@/lib/imageStorage";
import { isAdministrativeBlockActive } from "@/lib/moderation/domain";
import { isAdminRole, type StudentTrustStatus } from "@/lib/security/domain";
import { useSession } from "@/lib/useSession";

const TRUST_LABEL: Record<StudentTrustStatus, string> = {
  pending: "Pendiente de confirmación",
  verified: "Alumno confirmado",
  revoked: "Confirmación en revisión",
};

function ProfileContent() {
  const { firebaseUser, appUser, logout } = useSession();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(appUser?.displayName ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(appUser?.whatsappNumber ?? "");
  const [photoURL, setPhotoURL] = useState(appUser?.photoURL ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const studentStatus: StudentTrustStatus =
    appUser?.studentStatus === "verified" || appUser?.studentStatus === "revoked"
      ? appUser.studentStatus
      : "pending";
  const isAdmin = isAdminRole(appUser);
  const blocked = Boolean(appUser && isAdministrativeBlockActive(appUser));

  useEffect(() => {
    if (editing) return;
    setDisplayName(appUser?.displayName ?? "");
    setWhatsappNumber(appUser?.whatsappNumber ?? "");
    setPhotoURL(appUser?.photoURL ?? "");
  }, [appUser?.displayName, appUser?.photoURL, appUser?.whatsappNumber, editing]);

  async function saveProfilePatch(payload: {
    displayName?: string;
    photoURL?: string;
    whatsappNumber?: string;
  }) {
    if (!firebaseUser) throw new Error("Debes iniciar sesión.");

    const token = await firebaseUser.getIdToken(true);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo actualizar el perfil.");
    }
  }

  function startEditing() {
    setDisplayName(appUser?.displayName ?? displayName);
    setWhatsappNumber(appUser?.whatsappNumber ?? whatsappNumber);
    setPhotoURL(appUser?.photoURL ?? photoURL);
    setMessage("");
    setEditing(true);
  }

  function cancelEditing() {
    setDisplayName(appUser?.displayName ?? "");
    setWhatsappNumber(appUser?.whatsappNumber ?? "");
    setPhotoURL(appUser?.photoURL ?? "");
    setMessage("");
    setEditing(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveProfile() {
    if (!firebaseUser) return;

    setSaving(true);
    setMessage("");

    try {
      const cleanDisplayName =
        displayName.trim() || (firebaseUser.email?.split("@")[0] ?? "usuario");
      await saveProfilePatch({
        displayName: cleanDisplayName,
        whatsappNumber: whatsappNumber.trim(),
      });
      setDisplayName(cleanDisplayName);
      setMessage("Perfil actualizado.");
      setEditing(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (!firebaseUser) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setMessage("Formato de imagen no permitido.");
      return;
    }

    if (file.size <= 0 || file.size > 1024 * 1024) {
      setMessage("La foto debe pesar como máximo 1 MB.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const prepared = await prepareImageForUpload(file, file.name);
      const extension =
        prepared.type === "image/png"
          ? "png"
          : prepared.type === "image/webp"
            ? "webp"
            : prepared.type === "image/gif"
              ? "gif"
              : "jpg";
      const nextPhotoURL = await uploadImageFile({
        path: `profile-images/${firebaseUser.uid}/${crypto.randomUUID()}.${extension}`,
        file: prepared,
        filename: prepared.name,
      });
      await saveProfilePatch({ photoURL: nextPhotoURL });
      setPhotoURL(nextPhotoURL);
      setMessage("Foto actualizada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la foto.");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!firebaseUser || saving || !photoURL) return;

    setSaving(true);
    setMessage("");
    try {
      await saveProfilePatch({ photoURL: "" });
      setPhotoURL("");
      setMessage("Foto eliminada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar la foto.");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const visibleName =
    displayName || appUser?.displayName || firebaseUser?.email?.split("@")[0] || "Usuario";

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Perfil</h1>
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50"
            >
              Editar perfil
            </button>
          )}
        </div>

        {blocked && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-950">
            <p className="font-black">Cuenta bloqueada temporalmente</p>
            <p className="mt-1 text-sm">
              Puedes consultar tu cuenta, pero no enviar mensajes, reportar ni modificar tiendas hasta que termine el bloqueo.
            </p>
            {appUser?.blockedReason && (
              <p className="mt-2 text-sm"><strong>Motivo:</strong> {appUser.blockedReason}</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-4">
          {photoURL ? (
            <img
              src={photoURL}
              alt="perfil"
              className="w-20 h-20 rounded-full object-cover border border-gray-300"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-300 flex items-center justify-center text-2xl font-bold text-slate-700">
              {visibleName.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900">{visibleName}</p>
            <p className="truncate text-sm text-gray-500">{firebaseUser?.email}</p>
            {editing && (
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  Cambiar foto
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={saving}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadPhoto(file);
                    }}
                  />
                </label>
                {photoURL && (
                  <button
                    type="button"
                    onClick={() => void removePhoto()}
                    disabled={saving}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Quitar foto
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Nombre corto visible en chat
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-gray-900"
                placeholder="Tu nombre visible"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Número de WhatsApp
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-gray-900"
                placeholder="443 123 4567"
                autoComplete="tel"
              />
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                Es opcional mientras no tengas una tienda. Si creas una tienda, será necesario registrar un número para que los clientes puedan contactarte.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold disabled:bg-blue-400"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-1 text-sm text-gray-700">
            <p>WhatsApp: {whatsappNumber ? whatsappNumber : "No registrado"}</p>
            <p>Plan: {appUser?.plan === "premium" ? "Premium" : "Free"}</p>
            <p>Activo: {appUser?.isActive ? "Sí" : "No"}</p>
          </div>
        )}

        <Link
          href="/verify-student"
          className="block rounded-2xl border border-sky-200 bg-sky-50 p-4 hover:bg-sky-100"
        >
          <div className="text-sm font-black text-sky-950">Verificación de alumno</div>
          <div className="mt-1 text-sm text-sky-800">
            {TRUST_LABEL[studentStatus]} · {Math.min(appUser?.studentEndorsementCount ?? 0, 2)}/2 avales
          </div>
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            className="block rounded-2xl border border-slate-300 bg-slate-50 p-4 font-bold text-slate-900 hover:bg-slate-100"
          >
            Centro de administración
          </Link>
        )}

        {message && (
          <p className={message.toLowerCase().includes("no se pudo") || message.toLowerCase().includes("inválid") ? "text-red-700 text-sm" : "text-green-700 text-sm"}>
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <a href="/chat" className="bg-slate-800 text-white px-4 py-3 rounded-xl font-semibold">
            Volver al chat
          </a>
          <button onClick={() => void logout()} className="bg-red-600 text-white px-4 py-3 rounded-xl font-semibold">
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

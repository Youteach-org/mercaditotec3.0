"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { validateNicknameSyntax } from "@/lib/security/nickname";

import AuthGuard from "@/components/AuthGuard";
import { prepareImageForUpload, uploadImageFile } from "@/lib/imageStorage";
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
  const [nickname, setNickname] = useState(appUser?.nickname ?? appUser?.emailLocalPart ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
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
    setNickname(appUser?.nickname ?? appUser?.emailLocalPart ?? "");
    setWhatsappNumber(appUser?.whatsappNumber ?? "");
    setPhotoURL(appUser?.photoURL ?? "");
  }, [appUser?.nickname, appUser?.emailLocalPart, appUser?.photoURL, appUser?.whatsappNumber, editing]);

  async function saveProfilePatch(payload: {
    nickname?: string;
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
    setNickname(appUser?.nickname ?? nickname);
    setWhatsappNumber(appUser?.whatsappNumber ?? whatsappNumber);
    setPhotoURL(appUser?.photoURL ?? photoURL);
    setMessage("");
    setEditing(true);
  }

  function cancelEditing() {
    setNickname(appUser?.nickname ?? appUser?.emailLocalPart ?? "");
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
      const nextNickname = validateNicknameSyntax(nickname);
      if (!nextNickname.valid) throw new Error(nextNickname.reason);
      await saveProfilePatch({
        nickname: nextNickname.nickname,
        whatsappNumber: whatsappNumber.trim(),
      });
      setNickname(nextNickname.nickname);
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

    if (file.size <= 0) {
      setMessage("La foto no es válida.");
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

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseUser?.email || updatingPassword) return;
    setPasswordMessage("");
    if (nextPassword.length < 6) {
      setPasswordMessage("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setPasswordMessage("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (!currentPassword) {
      setPasswordMessage("Escribe tu contraseña actual.");
      return;
    }
    setUpdatingPassword(true);
    try {
      await reauthenticateWithCredential(
        firebaseUser,
        EmailAuthProvider.credential(firebaseUser.email, currentPassword),
      );
      await updatePassword(firebaseUser, nextPassword);
      setPasswordMessage("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      setPasswordMessage(
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "La contraseña actual es incorrecta."
          : code === "auth/too-many-requests"
            ? "Demasiados intentos. Espera unos minutos antes de volver a intentar."
            : code === "auth/weak-password"
              ? "La nueva contraseña no cumple los requisitos de seguridad."
              : "No se pudo cambiar la contraseña. Comprueba tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setUpdatingPassword(false);
    }
  }

  const visibleName =
    (appUser?.nickname ? `@${appUser.nickname}` : "") ||
    (nickname ? `@${nickname}` : "") ||
    firebaseUser?.email?.split("@")[0] || "Usuario";

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
                Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value.toLowerCase())}
                minLength={3}
                maxLength={24}
                autoCapitalize="none"
                spellCheck={false}
                className="w-full border border-gray-300 rounded-xl p-3 text-gray-900"
                placeholder="tu_nickname"
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
            <p>Nickname: <strong>{appUser?.nickname ? `@${appUser.nickname}` : "No registrado"}</strong></p>
            <p>WhatsApp: {whatsappNumber ? whatsappNumber : "No registrado"}</p>
            <p>Plan: {appUser?.plan === "premium" || appUser?.plan === "plus" || (firebaseUser?.emailVerified && firebaseUser.email?.toLowerCase() === "l22121079@morelia.tecnm.mx") ? "Plus" : "Gratis"}</p>
            <p>Activo: {appUser?.isActive ? "Sí" : "No"}</p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <p className="font-bold">Correo institucional (no editable)</p>
          <p className="mt-1 break-all">{firebaseUser?.email ?? "—"}</p>
          <p className="mt-2">La publicación de una tienda requiere aprobación administrativa.</p>
        </div>

        <form onSubmit={(event) => void changePassword(event)}
          className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-bold text-gray-900">Cambiar contraseña</h2>
          <label className="block text-sm font-semibold text-gray-800">
            Contraseña actual
            <input type="password" required autoComplete="current-password"
              value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-gray-900" />
          </label>
          <label className="block text-sm font-semibold text-gray-800">
            Nueva contraseña
            <input type="password" required minLength={6} autoComplete="new-password"
              value={nextPassword} onChange={(event) => setNextPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-gray-900" />
          </label>
          <label className="block text-sm font-semibold text-gray-800">
            Confirmar nueva contraseña
            <input type="password" required minLength={6} autoComplete="new-password"
              value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-gray-900" />
          </label>
          {passwordMessage && <p role="status" className="text-sm text-slate-700">{passwordMessage}</p>}
          <button type="submit" disabled={updatingPassword || !firebaseUser}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">
            {updatingPassword ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>

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

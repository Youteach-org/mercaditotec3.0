"use client";

import { useRef, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import AuthGuard from "@/components/AuthGuard";
import { db, storage } from "@/lib/firebase";
import { useSession } from "@/lib/useSession";

function ProfileContent() {
  const { firebaseUser, appUser, logout } = useSession();
  const [displayName, setDisplayName] = useState(appUser?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function saveProfile() {
    if (!firebaseUser) return;

    setSaving(true);
    setMessage("");

    await setDoc(
      doc(db, "users", firebaseUser.uid),
      {
        displayName: displayName.trim() || (firebaseUser.email?.split("@")[0] ?? "usuario"),
      },
      { merge: true }
    );

    setSaving(false);
    setMessage("Perfil actualizado.");
  }

  async function uploadPhoto(file: File) {
    if (!firebaseUser) return;

    setSaving(true);
    setMessage("");

    const photoRef = ref(storage, `profile-images/${firebaseUser.uid}/${Date.now()}-${file.name}`);
    await uploadBytes(photoRef, file);
    const photoURL = await getDownloadURL(photoRef);

    await setDoc(
      doc(db, "users", firebaseUser.uid),
      {
        photoURL,
      },
      { merge: true }
    );

    setSaving(false);
    setMessage("Foto actualizada.");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md p-6 space-y-5">
        <h1 className="text-3xl font-bold text-gray-900">Perfil</h1>

        <div className="flex items-center gap-4">
          {appUser?.photoURL ? (
            <img
              src={appUser.photoURL}
              alt="perfil"
              className="w-20 h-20 rounded-full object-cover border border-gray-300"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-300 flex items-center justify-center text-2xl font-bold text-slate-700">
              {(appUser?.displayName || firebaseUser?.email?.split("@")[0] || "U").slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="text-sm text-gray-700"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto(file);
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Nombre corto visible en chat
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 text-gray-900"
            placeholder="Tu nombre visible"
          />
        </div>

        <div className="space-y-1 text-sm text-gray-700">
          <p>Correo: {firebaseUser?.email}</p>
          <p>Plan: {appUser?.plan === "premium" ? "Premium" : "Free"}</p>
          <p>Activo: {appUser?.isActive ? "Sí" : "No"}</p>
        </div>

        {message && <p className="text-green-700 text-sm">{message}</p>}

        <div className="flex gap-3">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold disabled:bg-blue-400"
          >
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>

          <a href="/chat" className="bg-slate-800 text-white px-4 py-3 rounded-xl font-semibold">
            Volver al chat
          </a>

          <button onClick={logout} className="bg-red-600 text-white px-4 py-3 rounded-xl font-semibold">
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

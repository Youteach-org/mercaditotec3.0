"use client";

import { useMemo, useState } from "react";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const DOMAIN = "@morelia.tecnm.mx";

function normalizeLocalPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function buildInstitutionalEmail(localPart: string) {
  return `${normalizeLocalPart(localPart)}${DOMAIN}`;
}

function getFriendlyAuthError(code?: string) {
  switch (code) {
    case "auth/invalid-credential":
      return "Usuario o contraseña incorrectos.";
    case "auth/user-not-found":
      return "Ese usuario no existe.";
    case "auth/wrong-password":
      return "Contraseña incorrecta.";
    case "auth/invalid-email":
      return "Usuario inválido.";
    case "auth/user-disabled":
      return "Esta cuenta fue deshabilitada.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo otra vez.";
    case "auth/network-request-failed":
      return "Error de red. Revisa tu conexión.";
    default:
      return "No se pudo iniciar sesión.";
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [localPart, setLocalPart] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingResendVerification, setLoadingResendVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const cleanLocalPart = useMemo(() => normalizeLocalPart(localPart), [localPart]);
  const fullEmail = useMemo(() => buildInstitutionalEmail(cleanLocalPart), [cleanLocalPart]);

  async function syncAccount(user: import("firebase/auth").User): Promise<void> {
    const token = await user.getIdToken(true);
    const response = await fetch("/api/account/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo validar tu cuenta.");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!cleanLocalPart) {
      setError("Escribe tu usuario institucional.");
      return;
    }

    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }

    try {
      setLoadingLogin(true);

      // A prior admin session must never survive an unsuccessful login
      // attempt as though the newly entered credentials were accepted.
      await signOut(auth);
      window.sessionStorage.removeItem("mercadito-profile-sync-pending");
      await setPersistence(auth, browserLocalPersistence);

      const result = await signInWithEmailAndPassword(auth, fullEmail, password);

      if (!result.user.emailVerified) {
        try {
          await sendEmailVerification(result.user);
        } catch {}
        await signOut(auth);
        setError("Tu correo aún no ha sido verificado. Te reenviamos el enlace de confirmación.");
        return;
      }

      // A valid Firebase token does not waive the five-year admission policy.
      // If the server cannot verify a current profile, login fails closed.
      await syncAccount(result.user);
      window.sessionStorage.removeItem("mercadito-profile-sync-pending");

      router.replace("/marketplace");
    } catch (err: any) {
      // If Firebase accepted the credentials but account validation failed
      // for a non-retryable reason, remove that partially signed-in state.
      await signOut(auth).catch(() => undefined);
      console.error("LOGIN_ERROR", err);
      setError(err?.code ? getFriendlyAuthError(err.code) : (err?.message ?? "No se pudo iniciar sesión."));
    } finally {
      setLoadingLogin(false);
    }
  }

  async function handlePasswordReset() {
    setError("");
    setSuccess("");

    if (!cleanLocalPart) {
      setError("Escribe tu usuario institucional para recuperar tu contraseña.");
      return;
    }

    try {
      setLoadingReset(true);
      await sendPasswordResetEmail(auth, fullEmail);
      setSuccess("Se envió un enlace para restablecer tu contraseña a tu correo institucional.");
    } catch {
      setError("No se pudo enviar el correo de recuperación.");
    } finally {
      setLoadingReset(false);
    }
  }

  async function handleResendVerification() {
    setError("");
    setSuccess("");

    if (!cleanLocalPart || !password) {
      setError("Escribe tu usuario y contraseña para reenviar la verificación.");
      return;
    }

    try {
      setLoadingResendVerification(true);

      await signOut(auth);
      window.sessionStorage.removeItem("mercadito-profile-sync-pending");
      await setPersistence(auth, browserLocalPersistence);

      const result = await signInWithEmailAndPassword(auth, fullEmail, password);

      if (result.user.emailVerified) {
        await syncAccount(result.user);
        setSuccess("Tu correo ya estaba verificado. Ya puedes entrar.");
        await signOut(auth);
        return;
      }

      await sendEmailVerification(result.user);
      await signOut(auth);
      setSuccess("Se reenvió el correo de verificación a tu cuenta institucional.");
    } catch (err: any) {
      await signOut(auth).catch(() => undefined);
      console.error("RESEND_ERROR", err);
      setError(getFriendlyAuthError(err?.code));
    } finally {
      setLoadingResendVerification(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6 space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Iniciar sesión</h1>
          <p className="text-sm text-gray-700">
            Escribe solo la parte inicial de tu correo institucional.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800">
              Usuario institucional
            </label>

            <div className="flex rounded-xl border border-gray-300 overflow-hidden">
              <input
                type="text"
                placeholder="ejemplo: a22121079"
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                className="flex-1 p-3 text-gray-900 placeholder:text-gray-500 outline-none"
              />
              <div className="bg-gray-100 px-3 flex items-center text-sm text-gray-700 border-l border-gray-300">
                {DOMAIN}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-800">
              Contraseña
            </label>

            <div className="flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Escribe tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl p-3 text-gray-900 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="px-4 rounded-xl bg-gray-200 text-gray-800 font-medium"
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-600 break-all">
            Correo detectado: <span className="font-semibold">{fullEmail}</span>
          </p>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700 break-words">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-700 break-words">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full bg-blue-600 text-white rounded-xl p-3 font-semibold disabled:bg-blue-400"
          >
            {loadingLogin ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={loadingReset}
            className="w-full bg-slate-800 text-white rounded-xl p-3 font-semibold disabled:bg-slate-500"
          >
            {loadingReset ? "Enviando..." : "Restablecer contraseña"}
          </button>

          <button
            type="button"
            onClick={handleResendVerification}
            disabled={loadingResendVerification}
            className="w-full bg-violet-600 text-white rounded-xl p-3 font-semibold disabled:bg-violet-400"
          >
            {loadingResendVerification ? "Reenviando..." : "Reenviar correo de verificación"}
          </button>

          <a href="/register" className="block text-center text-blue-600 font-medium">
            Crear cuenta nueva
          </a>
        </div>
      </div>
    </main>
  );
}

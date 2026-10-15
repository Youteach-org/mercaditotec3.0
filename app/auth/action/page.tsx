"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

type ActionState = "loading" | "verified" | "recovered" | "reset-ready" | "resetting" | "reset-done" | "error";

function actionFailure(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
    return "Este enlace ya fue utilizado, es inválido o ha caducado. Solicita uno nuevo desde Iniciar sesión.";
  }
  if (code === "auth/weak-password") {
    return "Elige una contraseña más segura de al menos 6 caracteres.";
  }
  if (code === "auth/network-request-failed") {
    return "No hay conexión con el servicio de verificación. Comprueba tu Internet e inténtalo otra vez.";
  }
  return "No se pudo completar la solicitud. Solicita otro enlace desde Iniciar sesión.";
}

function EmailActionContent() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const code = params.get("oobCode") ?? "";
  const [state, setState] = useState<ActionState>("loading");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const processed = useRef("");

  useEffect(() => {
    const key = `${mode ?? ""}:${code}`;
    if (processed.current === key) return;
    processed.current = key;

    if (!code || code.length > 4096) {
      setError("El enlace de confirmación está incompleto.");
      setState("error");
      return;
    }

    let next: Promise<void>;
    if (mode === "verifyEmail" || mode === "verifyAndChangeEmail") {
      next = applyActionCode(auth, code).then(() => setState("verified"));
    } else if (mode === "recoverEmail") {
      next = applyActionCode(auth, code).then(() => setState("recovered"));
    } else if (mode === "resetPassword") {
      next = verifyPasswordResetCode(auth, code).then(() => setState("reset-ready"));
    } else {
      setError("Esta operación no está disponible en MercaditoTec.");
      setState("error");
      return;
    }
    void next.catch((reason: unknown) => {
      setError(actionFailure(reason));
      setState("error");
    });
  }, [code, mode]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state !== "reset-ready") return;
    if (password.length < 6) {
      setError("Tu contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setState("resetting");
    setError("");
    try {
      await confirmPasswordReset(auth, code, password);
      setPassword("");
      setConfirmPassword("");
      setState("reset-done");
    } catch (reason) {
      setError(actionFailure(reason));
      setState("reset-ready");
    }
  }

  const loading = state === "loading" || state === "resetting";
  const success = state === "verified" || state === "recovered" || state === "reset-done";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff9ee] px-4 py-8">
      <section className="w-full max-w-lg rounded-3xl border-2 border-[#ffd54c] bg-white p-6 text-center shadow-xl sm:p-9">
        <Link href="/marketplace" className="text-3xl font-black tracking-tight text-[#173f82]">
          Mercadito<span className="text-[#ef5d33]">Tec</span>
        </Link>
        <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff3d0] text-4xl" aria-hidden="true">
          {loading ? "✉️" : success ? "✅" : state === "reset-ready" ? "🔐" : "⚠️"}
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-900">
          {loading ? "Confirmando tu solicitud…" :
            state === "verified" ? "¡Correo confirmado!" :
            state === "recovered" ? "Correo recuperado" :
            state === "reset-ready" ? "Nueva contraseña" :
            state === "reset-done" ? "Contraseña actualizada" : "No se pudo confirmar"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600" role="status" aria-live="polite">
          {loading ? "Estamos verificando el enlace de forma segura con Firebase." :
            state === "verified" ? "Tu dirección de correo ya está verificada. Puedes iniciar sesión en MercaditoTec." :
            state === "recovered" ? "Se restauró tu dirección de correo. Revisa la seguridad de tu cuenta e inicia sesión." :
            state === "reset-ready" ? "Escribe una contraseña nueva para tu cuenta de MercaditoTec." :
            state === "reset-done" ? "Tu contraseña se cambió correctamente. Ya puedes iniciar sesión." :
            "Comprueba el enlace o solicita un correo nuevo."}
        </p>

        {state === "reset-ready" && (
          <form onSubmit={(event) => void changePassword(event)} className="mt-5 space-y-3 text-left">
            <label className="block text-sm font-bold text-slate-800" htmlFor="new-password">Contraseña nueva</label>
            <input id="new-password" type="password" autoComplete="new-password" required minLength={6}
              value={password} onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-slate-950" />
            <label className="block text-sm font-bold text-slate-800" htmlFor="confirm-password">Confirmar contraseña</label>
            <input id="confirm-password" type="password" autoComplete="new-password" required minLength={6}
              value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-slate-950" />
            <button type="submit" className="w-full rounded-xl bg-[#173f82] px-5 py-3 font-bold text-white">
              Guardar contraseña
            </button>
          </form>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <Link href="/login" className="mt-6 inline-block rounded-xl bg-[#173f82] px-6 py-3 font-bold text-white">
          Ir a iniciar sesión
        </Link>
        <p className="mt-4 text-xs text-slate-500">Por tu seguridad, nunca compartas los enlaces de confirmación.</p>
      </section>
    </main>
  );
}

export default function EmailActionPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#fff9ee] p-8 text-center">Cargando verificación…</main>}>
      <EmailActionContent />
    </Suspense>
  );
}

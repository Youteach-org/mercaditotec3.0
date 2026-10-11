"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function ActivatePage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [activated, setActivated] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setWorking(true);
    try {
      const response = await fetch("/api/account/activate-manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code, password }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "No se pudo activar la cuenta.");
      setPassword("");
      setConfirm("");
      setCode("");
      setActivated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar la cuenta.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-2xl font-black text-gray-900">Activar cuenta de Mercadito</h1>
        {activated ? (
          <div className="mt-6 space-y-4">
            <p className="text-emerald-800 font-semibold">
              Tu cuenta quedó activada. Ya puedes iniciar sesión con la contraseña que acabas de crear.
            </p>
            <Link href="/login" className="block rounded-xl bg-slate-900 px-5 py-3 text-center font-bold text-white">
              Iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Usa el código que te entregó personalmente la administración. No necesitas recibir ningún correo.
            </p>
            <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-gray-800">
                Correo institucional
                <input type="email" autoComplete="username" autoCapitalize="none" required
                  value={email} onChange={(event) => setEmail(event.target.value)}
                  placeholder="a22121079@morelia.tecnm.mx"
                  className="mt-1 w-full rounded-xl border border-gray-300 p-3 font-normal text-gray-900" />
              </label>
              <label className="block text-sm font-semibold text-gray-800">
                Código de activación
                <input type="text" required autoComplete="off" autoCapitalize="none"
                  value={code} onChange={(event) => setCode(event.target.value.trim())}
                  placeholder="Pega aquí el código que recibiste"
                  className="mt-1 w-full rounded-xl border border-gray-300 p-3 font-normal text-gray-900" />
              </label>
              <label className="block text-sm font-semibold text-gray-800">
                Crea tu contraseña
                <input type="password" autoComplete="new-password" required minLength={10} maxLength={128}
                  value={password} onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 10 caracteres, letras y números"
                  className="mt-1 w-full rounded-xl border border-gray-300 p-3 font-normal text-gray-900" />
              </label>
              <label className="block text-sm font-semibold text-gray-800">
                Confirma la contraseña
                <input type="password" autoComplete="new-password" required minLength={10} maxLength={128}
                  value={confirm} onChange={(event) => setConfirm(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 p-3 font-normal text-gray-900" />
              </label>
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <button type="submit" disabled={working}
                className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50">
                {working ? "Activando..." : "Activar mi cuenta"}
              </button>
            </form>
            <p className="mt-4 text-xs text-gray-600">
              Tu código expira después de 48 horas y solo sirve una vez. Si ya venció o se perdió, solicita otro al Superadmin.
            </p>
            <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-slate-800">
              Volver a iniciar sesión
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

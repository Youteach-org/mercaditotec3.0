"use client";

import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl border border-slate-200 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl">
          ✉️
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Verifica tu correo
        </h1>

        <p className="text-slate-700 mb-3">
          Te enviamos un enlace de verificación a tu correo institucional.
        </p>

        <p className="text-sm text-slate-500 mb-6">
          Abre el correo, confirma tu cuenta y después inicia sesión.
          Si no aparece, revisa spam o correo no deseado.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white"
          >
            Ir a iniciar sesión
          </Link>

          <Link
            href="/register"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center font-semibold text-slate-800"
          >
            Crear otra cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}

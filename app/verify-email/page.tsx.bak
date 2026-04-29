"use client";

import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Verifica tu correo</h1>
        <p className="text-slate-700 mb-4">
          Ya enviamos un correo de verificación a tu correo institucional.
          Abre tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
        </p>
        <p className="text-sm text-slate-500 mb-6">
          Si no aparece, revisa spam o correo no deseado.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white"
          >
            Ir a iniciar sesión
          </Link>

          <Link
            href="/register"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center font-medium text-slate-800"
          >
            Volver a registro
          </Link>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

import type { StudentTrustStatus } from "@/lib/security/domain";
import { storeApiFetch } from "@/lib/store/client";
import { useSession } from "@/lib/useSession";

interface TrustRecord {
  status: StudentTrustStatus;
  endorsementCount: number;
  verifiedAt: string | null;
  revokedAt: string | null;
}

const STATUS_COPY: Record<StudentTrustStatus, { title: string; text: string; classes: string }> = {
  pending: {
    title: "Alumno aún no confirmado",
    text: "Necesitas dos avales independientes de alumnos ya confirmados. No pedimos credencial ni fotografías.",
    classes: "border-amber-200 bg-amber-50 text-amber-900",
  },
  verified: {
    title: "Alumno confirmado",
    text: "Tu cuenta forma parte de la red de confianza. Puedes avalar hasta cinco alumnos por periodo.",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  revoked: {
    title: "Confirmación en revisión",
    text: "La confirmación de esta cuenta fue revocada. Un administrador debe revisarla antes de que pueda confirmarse otra vez.",
    classes: "border-red-200 bg-red-50 text-red-900",
  },
};

export default function VerifyStudentPage() {
  const router = useRouter();
  const { firebaseUser, loading: sessionLoading } = useSession();
  const [trust, setTrust] = useState<TrustRecord | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sessionLoading && !firebaseUser) router.replace("/login");
  }, [firebaseUser, router, sessionLoading]);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError("");
    try {
      const response = await storeApiFetch(firebaseUser, "/api/trust/me");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo consultar tu estado.");
      setTrust(data.trust as TrustRecord);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo consultar tu estado.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) void load();
  }, [firebaseUser, load]);

  async function endorse(event: FormEvent) {
    event.preventDefault();
    if (!firebaseUser || trust?.status !== "verified") return;

    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await storeApiFetch(firebaseUser, "/api/trust/endorse", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo registrar el aval.");
      const target = data.trust as TrustRecord;
      setEmail("");
      setMessage(
        target.status === "verified"
          ? "Aval registrado. Ese alumno ya alcanzó los dos avales y quedó confirmado."
          : `Aval registrado. Esa cuenta tiene ${target.endorsementCount} de 2 avales.`,
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo registrar el aval.");
    } finally {
      setWorking(false);
    }
  }

  if (sessionLoading || loading || !firebaseUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-md">Consultando tu verificación...</div>
      </main>
    );
  }

  const status = trust ? STATUS_COPY[trust.status] : null;

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <Link href="/profile" className="text-sm font-semibold text-blue-700 hover:underline">
            ← Perfil
          </Link>
          <h1 className="mt-2 text-3xl font-black text-gray-900">Verificación de alumno</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            MercaditoTec3 usa confianza entre estudiantes. Tu correo institucional confirma que perteneces a la comunidad del Tec; los avales ayudan a distinguir alumnos sin pedir documentos personales.
          </p>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
        )}
        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>
        )}

        {trust && status && (
          <section className={`rounded-2xl border p-6 shadow-sm ${status.classes}`}>
            <h2 className="text-2xl font-black">{status.title}</h2>
            <p className="mt-2 text-sm leading-relaxed">{status.text}</p>
            <div className="mt-5 rounded-xl bg-white/70 p-4">
              <div className="text-xs font-bold uppercase tracking-wide opacity-70">Avales recibidos</div>
              <div className="mt-1 text-3xl font-black">{Math.min(trust.endorsementCount, 2)} / 2</div>
            </div>
          </section>
        )}

        {trust?.status === "verified" && (
          <form onSubmit={endorse} className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-xl font-black text-gray-900">Avalar a un compañero</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Hazlo únicamente si conoces personalmente a esa persona y sabes que actualmente es alumno. Tienes hasta cinco avales por periodo.
            </p>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-bold text-gray-700">Correo institucional del alumno</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="a12345678@morelia.tecnm.mx"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
              />
            </label>
            <button
              type="submit"
              disabled={working}
              className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50 sm:w-auto"
            >
              {working ? "Registrando..." : "Confirmo que es alumno"}
            </button>
          </form>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
          <strong className="text-gray-900">Importante:</strong> esta verificación todavía no bloquea funciones de chat o tiendas durante la etapa de implementación. La activaremos como requisito cuando el sistema de confianza ya esté poblado.
        </section>
      </div>
    </main>
  );
}

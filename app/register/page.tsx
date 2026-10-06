"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import { studentControlEligibility } from "@/lib/security/domain";
import { validateNicknameSyntax } from "@/lib/security/nickname";

const DOMAIN = "@morelia.tecnm.mx";

function normalizeLocalPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function buildInstitutionalEmail(localPart: string) {
  return `${normalizeLocalPart(localPart)}${DOMAIN}`;
}

export default function RegisterPage() {
  const router = useRouter();

  const [localPart, setLocalPart] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const previewEmail = buildInstitutionalEmail(localPart);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanLocalPart = normalizeLocalPart(localPart);
    const cleanEmail = buildInstitutionalEmail(cleanLocalPart);
    const parsedNickname = validateNicknameSyntax(nickname);

    if (!cleanLocalPart) {
      setError("Escribe la parte inicial de tu correo institucional.");
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(cleanLocalPart)) {
      setError("Solo usa letras, números, punto, guion o guion bajo.");
      return;
    }

    const controlEligibility = studentControlEligibility(cleanLocalPart);
    if (!controlEligibility.allowed) {
      setError(controlEligibility.reason);
      return;
    }

    if (!parsedNickname.valid) {
      setError(parsedNickname.reason);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);

      const availabilityResponse = await fetch("/api/account/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: parsedNickname.nickname }),
      });
      const availabilityBody = await availabilityResponse.json().catch(() => ({}));

      if (!availabilityResponse.ok) {
        throw new Error(
          availabilityBody.error ?? "No se pudo comprobar el nickname.",
        );
      }

      if (availabilityBody.available !== true) {
        throw new Error("Ese nickname ya está en uso.");
      }

      const result = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password,
      );

      const token = await result.user.getIdToken(true);
      const bootstrapResponse = await fetch("/api/account/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: parsedNickname.nickname }),
      });
      const bootstrapBody = await bootstrapResponse.json().catch(() => ({}));

      if (!bootstrapResponse.ok) {
        try {
          await deleteUser(result.user);
        } catch {
          // La cuenta recién creada podría requerir limpieza administrativa
          // si Firebase rechaza la eliminación excepcionalmente.
        }

        throw new Error(
          bootstrapBody.error ?? "No se pudo preparar tu cuenta de Mercadito.",
        );
      }

      try {
        await sendEmailVerification(result.user);
        setSuccess(
          "Cuenta creada. Te enviamos un correo de verificación. Revisa tu bandeja o spam.",
        );
      } catch (verifyError: any) {
        if (verifyError?.code === "auth/too-many-requests") {
          setSuccess(
            "Cuenta creada. Firebase limitó temporalmente el envío de correos. Intenta reenviar la verificación más tarde desde login.",
          );
        } else {
          setSuccess(
            "Cuenta creada. Si no recibes correo, intenta reenviar la verificación más tarde desde login.",
          );
        }
      }

      await signOut(auth);

      setLocalPart("");
      setNickname("");
      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        router.push("/verify-email");
      }, 1800);
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        setError("Ese correo institucional ya está registrado.");
      } else if (err?.code === "auth/weak-password") {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else if (err?.code === "auth/too-many-requests") {
        setError(
          "Firebase bloqueó temporalmente los intentos. Espera unos minutos e intenta de nuevo.",
        );
      } else {
        setError(err?.message || "No se pudo crear la cuenta.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <form
        onSubmit={handleRegister}
        className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Correo institucional
          </label>

          <div className="flex rounded-xl border border-gray-300 overflow-hidden">
            <input
              type="text"
              placeholder="ejemplo: a22121079"
              value={localPart}
              onChange={(e) => setLocalPart(e.target.value)}
              className="flex-1 min-w-0 p-3 text-gray-900 placeholder:text-gray-500 outline-none"
            />
            <div className="bg-gray-100 px-3 flex items-center text-sm text-gray-700 border-l border-gray-300">
              {DOMAIN}
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-600 break-all">
            Correo final: <span className="font-semibold">{previewEmail}</span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Nickname
          </label>
          <div className="flex rounded-xl border border-gray-300 overflow-hidden">
            <div className="bg-gray-100 px-3 flex items-center font-black text-gray-500 border-r border-gray-300">
              @
            </div>
            <input
              type="text"
              required
              minLength={3}
              maxLength={24}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="tu_nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.toLowerCase())}
              className="flex-1 min-w-0 p-3 text-gray-900 placeholder:text-gray-500 outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Obligatorio y único. Usa de 3 a 24 caracteres: letras, números y guion bajo.
          </p>
        </div>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 pr-20 text-gray-900 placeholder:text-gray-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600"
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </div>

        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 pr-20 text-gray-900 placeholder:text-gray-500"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600"
          >
            {showConfirmPassword ? "Ocultar" : "Ver"}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm break-all">{error}</p>}
        {success && <p className="text-green-700 text-sm break-all">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl p-3 font-semibold disabled:bg-blue-400"
        >
          {loading ? "Creando..." : "Crear cuenta"}
        </button>

        <a href="/login" className="block text-center text-blue-600">
          Ya tengo cuenta
        </a>
      </form>
    </main>
  );
}

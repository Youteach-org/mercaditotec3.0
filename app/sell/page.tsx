"use client";

import { FormEvent, useEffect, useState } from "react";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

type AppUser = {
  email?: string;
  plan?: "free" | "premium";
  isActive?: boolean;
  blocked?: boolean;
};

const CATEGORIES = [
  "Libros",
  "Electrónica",
  "Ropa",
  "Comida",
  "Accesorios",
  "Servicios",
  "Otros",
];

export default function SellPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAppUser(null);
        setLoadingUser(false);
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setAppUser(snap.data() as AppUser);
      } else {
        setAppUser(null);
      }

      setLoadingUser(false);
    });

    return unsubscribe;
  }, []);

  const canPublish =
    appUser?.plan === "premium" &&
    appUser?.isActive === true &&
    appUser?.blocked !== true;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!auth.currentUser) {
      setError("Debes iniciar sesión.");
      return;
    }

    if (!canPublish) {
      setError("Solo usuarios premium activos pueden publicar.");
      return;
    }

    if (!title.trim() || !description.trim() || !price.trim()) {
      setError("Completa todos los campos.");
      return;
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setError("Ingresa un precio válido.");
      return;
    }

    await addDoc(collection(db, "products"), {
      title: title.trim(),
      description: description.trim(),
      price: numericPrice,
      category,
      sellerEmail: auth.currentUser.email,
      sellerId: auth.currentUser.uid,
      createdAt: Date.now(),
    });

    setTitle("");
    setDescription("");
    setPrice("");
    setCategory(CATEGORIES[0]);
    setSuccess("Producto publicado.");
    router.push("/marketplace");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Publicar producto</h1>
        <p className="text-gray-700 mb-6">
          Solo usuarios premium activos pueden publicar.
        </p>

        {!loadingUser && !canPublish && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4">
            Tu cuenta no tiene permisos para publicar. Debes ser premium y estar activo.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Título del producto"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 placeholder:text-gray-500"
          />

          <textarea
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 placeholder:text-gray-500"
          />

          <input
            type="number"
            placeholder="Precio"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 placeholder:text-gray-500"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 text-gray-900"
          >
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {error && <p className="text-red-600 text-sm break-all">{error}</p>}
          {success && <p className="text-green-700 text-sm">{success}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-xl p-3 font-semibold disabled:bg-gray-400"
            disabled={!canPublish}
          >
            Publicar
          </button>
        </form>
      </div>
    </main>
  );
}

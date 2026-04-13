"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  sellerEmail: string;
  createdAt: number;
};

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Product, "id">),
      }));
      setProducts(items);
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-gray-700">Publicaciones de compra y venta.</p>
          </div>

          <a
            href="/sell"
            className="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold"
          >
            Publicar producto
          </a>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-gray-700">
            Todavía no hay publicaciones.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl shadow-md p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{product.title}</h2>
                  <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                    ${product.price}
                  </span>
                </div>

                <p className="text-sm text-slate-600 font-medium">{product.category}</p>
                <p className="text-gray-800 whitespace-pre-wrap">{product.description}</p>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600 break-all">{product.sellerEmail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

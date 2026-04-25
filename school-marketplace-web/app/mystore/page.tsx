"use client";

export default function MyStorePage() {
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">MyStore</h1>
        <p className="text-gray-700 mb-4">
          Aquí irá la tienda del usuario. El siguiente paso será hacer que desde aquí
          puedas agregar productos de forma simple, sin una página pesada.
        </p>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          Próximamente: crear tienda, subir fotos, precio, descripción y productos rápidos.
        </div>
      </div>
    </main>
  );
}

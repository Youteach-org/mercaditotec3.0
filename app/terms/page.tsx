import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-md sm:p-8">
        <Link href="/mystore" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Volver a Mis tiendas
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Términos y condiciones del Mercadito</h1>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <h2 className="font-bold">Documento en preparación</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Esta página será reemplazada por los términos y condiciones definitivos. Por ahora sirve como destino del enlace de información durante la configuración de una tienda.
          </p>
        </div>
        <section className="mt-6 space-y-3 text-gray-700">
          <h2 className="text-xl font-bold text-gray-900">¿Por qué se revisan las tiendas?</h2>
          <p>
            Antes de publicar una tienda, administración revisa la información básica, las imágenes, el horario, el producto inicial y las categorías propuestas. Esto permite evitar contenido incorrecto y mantener una experiencia consistente dentro del Mercadito.
          </p>
          <p>
            La URL pública de la tienda se asigna únicamente después de que la solicitud haya sido aprobada.
          </p>
        </section>
      </div>
    </main>
  );
}

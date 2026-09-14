import Link from "next/link";

const rules = [
  {
    title: "1. Uso del Mercadito",
    text: "MercaditoTec es un espacio de la comunidad estudiantil para ofrecer y solicitar productos o servicios permitidos. Cada persona es responsable de que la información que publica sea clara, verdadera y actualizada.",
  },
  {
    title: "2. Tiendas y verificación",
    text: "Las tiendas pueden prepararse en borrador, pero solo se publican después de que el propietario esté confirmado como alumno y la tienda haya sido revisada y aprobada por administración.",
  },
  {
    title: "3. Productos y servicios",
    text: "No se permite publicar contenido ilegal, peligroso, engañoso, discriminatorio, sexual, violento o ajeno a un entorno escolar. Tampoco deben ofrecerse armas, drogas, alcohol, tabaco o vapeadores, medicamentos restringidos ni artículos cuya venta esté prohibida.",
  },
  {
    title: "4. Precios y descripción",
    text: "El precio, condición, cantidad, características y disponibilidad deben presentarse de forma honesta. Si el precio es negociable o debe consultarse, debe indicarse claramente.",
  },
  {
    title: "5. Pedidos y entregas",
    text: "MercaditoTec organiza solicitudes y estados de pedido, pero no procesa pagos. Comprador y vendedor acuerdan directamente la entrega y cualquier pago, preferentemente en lugares seguros dentro de la comunidad escolar.",
  },
  {
    title: "6. Chat y convivencia",
    text: "El chat general debe usarse con respeto. No se permite acoso, amenazas, spam, suplantación, fraude ni publicación de datos personales sensibles propios o de otras personas.",
  },
  {
    title: "7. Reportes y moderación",
    text: "Los usuarios pueden reportar tiendas, mensajes o cuentas. Administración puede ocultar mensajes, solicitar cambios, suspender tiendas, bloquear temporalmente cuentas o revocar la confirmación de alumno cuando exista una razón de moderación.",
  },
  {
    title: "8. Responsabilidad de la cuenta",
    text: "Cada usuario debe proteger sus credenciales y utilizar únicamente su propia cuenta. Los avales de alumno deben darse solo a personas que el usuario conoce y reconoce como integrantes actuales de la comunidad.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <Link href="/mystore" className="text-sm font-bold text-sky-300 hover:underline">
            ← Volver a Mis tiendas
          </Link>
          <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-emerald-300">
            MercaditoTec
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Reglas y condiciones de uso
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Estas reglas describen el funcionamiento interno del Mercadito y las condiciones básicas
            para mantener un espacio seguro, útil y adecuado para la comunidad estudiantil.
          </p>
        </header>

        <section className="space-y-4">
          {rules.map((rule) => (
            <article key={rule.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black text-slate-950">{rule.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">{rule.text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
          <strong>Importante:</strong> si una publicación, mensaje o conducta parece incumplir estas reglas,
          utiliza la función de reporte para que administración pueda revisarla. Las decisiones de moderación
          quedan registradas en el historial administrativo del sistema.
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
          >
            Ir al Mercadito
          </Link>
          <Link
            href="/mystore"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800"
          >
            Mis tiendas
          </Link>
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { privacyNoticeRevision } from "@/lib/privacy/publicNotice";

export const metadata: Metadata = {
  title: "Aviso de privacidad | MercaditoTec",
  description: "Información sobre datos personales, derechos ARCO y privacidad en MercaditoTec.",
};

export default function AvisoDePrivacidad() {

  return (
    <main className="min-h-screen bg-[#fff9ee] px-4 py-8 text-[#123d82] sm:px-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/descubre" className="font-semibold text-[#174db4] hover:underline">
          ← Volver a MercaditoTec
        </Link>
        <header className="rounded-3xl bg-[#123d82] p-6 text-white sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-[#ffd54c]">MercaditoTec</p>
          <h1 className="mt-2 text-3xl font-black">Aviso de privacidad</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/90">
            Información sobre qué datos se utilizan y cómo ejercer tus derechos.
            Revisión del documento: {privacyNoticeRevision}.
          </p>
        </header>

        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-xl font-black">Aviso en preparación — no apto para publicación</h2>
          <p className="mt-2 text-sm leading-relaxed">
            La identidad y el domicilio legal del responsable deben incorporarse
            antes de lanzar MercaditoTec como aplicación Android. El domicilio
            particular proporcionado anteriormente no se mostrará en esta versión
            de desarrollo. El contenido de esta página es preliminar y no sustituye
            el aviso de privacidad completo.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">2. Datos tratados</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Para operar la plataforma se utilizan datos de acceso y cuenta (correo institucional,
            identificación de usuario, nombre público, verificación de cuenta y registros de acceso);
            datos opcionales de perfil (fotografía y número de WhatsApp); y los que decidas
            aportar en publicaciones, tiendas, anuncios, fotografías, conversaciones, reportes y
            solicitudes o seguimiento de pedidos. Se generan también datos técnicos esenciales
            para prevenir abuso y mantener las sesiones. Evita compartir datos sensibles de
            salud, contraseñas, documentos de identidad u otra información confidencial en
            publicaciones y chats.
            MercaditoTec no solicita datos personales sensibles para registrar cuentas
            ni para operar el mercado; por favor no los incluyas en tus publicaciones.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">3. Finalidades del tratamiento</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Los datos permiten crear y verificar cuentas, mostrar perfiles y anuncios, publicar y
            moderar tiendas, facilitar conversaciones entre usuarios, organizar solicitudes de
            pedidos, atender reportes, brindar seguridad y procesar solicitudes de privacidad.
            La plataforma no procesa directamente los pagos por productos o servicios.
            Los datos de contacto o fotografías que elijas publicar pueden ser visibles para
            otras personas dentro de las funciones correspondientes. No introduzcas datos
            personales de terceros sin su autorización.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">4. Servicios tecnológicos y destinatarios</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            La aplicación utiliza infraestructura de autenticación, bases de datos, almacenamiento
            de imágenes y alojamiento web. En el código del proyecto se identifican servicios
            de Firebase para autenticación y datos de cuenta, Supabase para almacenamiento
            de imágenes y Cloudflare para alojamiento y seguridad de la aplicación. Estos
            proveedores intervienen para prestar el servicio y proteger la plataforma.
            Los anuncios públicos y los datos de contacto publicados voluntariamente
            pueden ser consultados por sus destinatarios. Cualquier transferencia
            adicional que legalmente requiera consentimiento deberá comunicarse
            y recabarse conforme a la legislación aplicable.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">5. Derechos ARCO y control de tu información</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de
            tus datos. Con una sesión iniciada, utiliza Configuración → Privacidad y derechos
            ARCO para registrar la solicitud, recibir un folio y consultar su respuesta.
            Una solicitud de cancelación no elimina automáticamente tu cuenta: se requiere
            verificar la titularidad y atender las obligaciones aplicables.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/configuracion/privacidad" className="rounded-xl bg-[#174db4] px-4 py-3 text-sm font-bold text-white">
              Mis datos y solicitudes ARCO
            </Link>
            <Link href="/login" className="rounded-xl border border-[#174db4] px-4 py-3 text-sm font-bold">
              Iniciar sesión
            </Link>
          </div>
          <p className="mt-3 text-sm text-amber-900">
            Antes de publicar esta versión se habilitará un canal formal para atender
            a personas que no puedan iniciar sesión.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">6. Conservación, seguridad y límites</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Los datos vinculados a la cuenta, sus publicaciones, transacciones y reportes se
            mantienen según su finalidad, necesidades de seguridad y obligaciones legales.
            Una solicitud de borrado debe contemplar la información de otras personas y los
            registros que legalmente deban conservarse. Los datos se conservan mientras
            sean necesarios para la cuenta y las finalidades descritas, y se eliminan
            o bloquean cuando esas finalidades terminan, de conformidad con las
            obligaciones legales aplicables. Las comunicaciones mediante chat
            no deben considerarse cifradas de extremo a extremo.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">7. Cambios al aviso y limitación del uso</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            La versión vigente se consultará en esta misma dirección y los cambios sustanciales
            deberán comunicarse mediante las funciones de notificaciones o un aviso visible
            en MercaditoTec. Para limitar el uso o divulgación de datos opcionales, puedes
            modificar tu perfil y solicitar revisión por medio del centro ARCO.
            La información publicada por otros usuarios no depende exclusivamente de tu perfil.
          </p>
        </section>

        <footer className="pb-4 text-sm text-slate-700">
          <Link href="/terms" className="font-bold text-blue-700 underline">Condiciones de uso</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/descubre" className="font-bold text-blue-700 underline">Inicio</Link>
        </footer>
      </div>
    </main>
  );
}

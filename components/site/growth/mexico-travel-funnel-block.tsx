import { WaflowCTAButton } from '@/components/site/themes/editorial-v1/waflow/cta-button';

const MEXICO_FUNNEL_SLUGS = new Set([
  'agencia-de-viajes-a-colombia-para-mexicanos',
  'paquetes-a-colombia-todo-incluido-en-9-dias',
  'los-mejores-paquetes-de-viajes-a-colombia',
  'en-cuanto-sale-un-viaje-a-colombia-blog',
]);

const REQUIREMENT_SOURCES = [
  {
    label: 'Migracion Colombia - Check-MIG',
    href: 'https://portal.migracioncolombia.gov.co/tramites-y-servicios/aplicativos/checkmig',
  },
  {
    label: 'Migracion Colombia - requisitos de entrada y salida',
    href: 'https://portal.migracioncolombia.gov.co/tramites-y-servicios/instructivos/requisitos-de-entrada-y-salida-del-pais',
  },
  {
    label: 'Cancilleria - necesito una visa',
    href: 'https://www.cancilleria.gov.co/tramites_servicios/visa/requisitos',
  },
  {
    label: 'DIAN - devolucion de IVA a turistas extranjeros',
    href: 'https://www.dian.gov.co/Viajeros-y-Servicios-aduaneros/Paginas/Devolucion-IVA-a-Turistas-Extranjeros.aspx',
  },
];

export function isMexicoTravelFunnelSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && MEXICO_FUNNEL_SLUGS.has(slug));
}

interface MexicoTravelFunnelBlockProps {
  basePath: string;
  slug?: string | null;
  fallbackWhatsappHref?: string | null;
}

export function MexicoTravelFunnelBlock({
  basePath,
  slug,
  fallbackWhatsappHref,
}: MexicoTravelFunnelBlockProps) {
  if (!isMexicoTravelFunnelSlug(slug)) return null;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Cuanto cuesta viajar a Colombia desde Mexico?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'El costo depende de temporada, ciudad de salida, hoteles y numero de viajeros. Para un viaje armado con planner, ColombiaTours recomienda comparar por ruta, noches, vuelos internos, traslados, experiencias y nivel de hotel antes de cerrar presupuesto.',
        },
      },
      {
        '@type': 'Question',
        name: 'Los mexicanos necesitan visa para viajar a Colombia?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Los requisitos migratorios pueden cambiar. Antes de comprar, valida siempre en Cancilleria de Colombia y Migracion Colombia si tu nacionalidad, documento y motivo de viaje requieren visa o condiciones adicionales.',
        },
      },
      {
        '@type': 'Question',
        name: 'Que debo revisar antes de viajar a Colombia?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Revisa documento de viaje vigente, Check-MIG, tiquetes de salida, reservas, seguro de viaje, requisitos migratorios oficiales y reglas de devolucion de IVA si planeas hacer compras elegibles.',
        },
      },
    ],
  };

  return (
    <section
      className="mx-auto my-14 max-w-6xl px-4"
      data-growth-block="mexico-travel-funnel"
      data-growth-slug={slug ?? undefined}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Viajar a Colombia desde Mexico
            </span>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
              Costos, requisitos y rutas recomendadas para viajar sin improvisar.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Este bloque resume lo que un viajero mexicano necesita validar antes de reservar:
              presupuesto realista, documentos, Check-MIG, vuelos internos, hoteles y una ruta
              que conecte bien Bogota, Medellin, Eje Cafetero y Cartagena.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['9 dias', 'Bogota, cafe y Caribe'],
                ['Desde Mexico', 'Planner local + soporte WhatsApp'],
                ['Checklist', 'Fuentes oficiales antes de pagar'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl bg-emerald-50 p-4">
                  <div className="text-sm font-semibold text-emerald-950">{title}</div>
                  <div className="mt-1 text-sm text-emerald-900/80">{body}</div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <WaflowCTAButton
                variant="A"
                fallbackHref={fallbackWhatsappHref ?? undefined}
                className="inline-flex items-center justify-center rounded-full bg-emerald-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900"
              >
                Cotizar con planner por WhatsApp
              </WaflowCTAButton>
              <a
                href={`${basePath}/paquetes`}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              >
                Ver paquetes a Colombia
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Presupuesto que debe compararse</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <li>Vuelos Mexico - Colombia y vuelos internos si la ruta incluye varias ciudades.</li>
                <li>Hotel por categoria, ubicacion y temporada.</li>
                <li>Traslados privados, tours guiados, entradas y experiencias.</li>
                <li>Seguro de viaje, equipaje, comidas no incluidas y margen para compras.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Checklist oficial antes de pagar</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <li>Documento de viaje vigente y condiciones de ingreso aplicables.</li>
                <li>Pre-registro Check-MIG dentro de la ventana indicada por Migracion Colombia.</li>
                <li>Reserva, tiquete de salida, soporte economico y datos de alojamiento.</li>
                <li>Elegibilidad Tax Free / devolucion de IVA si compras bienes gravados.</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {REQUIREMENT_SOURCES.map((source) => (
                  <a
                    key={source.href}
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                  >
                    {source.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

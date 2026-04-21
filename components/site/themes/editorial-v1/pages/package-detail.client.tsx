'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductData, ProductFAQ, ScheduleEventType } from '@bukeer/website-contract';
import type { WebsiteData } from '@/lib/supabase/get-website';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import { formatPriceOrConsult } from '@/lib/products/format-price';
import { getPackageCircuitStops, withCoords } from '@/lib/products/package-circuit';
import { buildWhatsAppUrl } from '@/components/site/whatsapp-url';
import { MediaLightbox } from '@/components/site/media-lightbox';
import { PackageCircuitMap } from '@/components/site/package-circuit-map';
import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Rating } from '../primitives/rating';
import { Icons } from '../primitives/icons';

interface GoogleReviewProp {
  author_name: string;
  author_photo: string | null;
  rating: number;
  text: string;
  relative_time: string | null;
  images: Array<{ url: string; thumbnail?: string }>;
  response: { text: string; date: string } | null;
}

interface EditorialPackageDetailClientProps {
  website: WebsiteData;
  basePath: string;
  product: ProductData;
  displayName: string;
  displayLocation: string | null;
  resolvedLocale: string;
  googleReviews: GoogleReviewProp[];
  similarProducts: ProductData[];
  faqs: ProductFAQ[];
}

interface TimelineItem {
  day: number;
  time: string;
  label: string;
  title: string;
  note: string | null;
  tone: 'transporte' | 'actividad' | 'comida' | 'alojamiento' | 'libre' | 'vuelo';
}

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return sanitizeProductCopy(item);
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const label = record.label;
          return typeof label === 'string' ? sanitizeProductCopy(label) : '';
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\n|,|;/g)
      .map((entry) => sanitizeProductCopy(entry))
      .filter(Boolean);
  }
  return [];
}

function resolveImages(product: ProductData): string[] {
  const candidates = Array.isArray(product.images) ? product.images : [];
  if (candidates.length > 0) return candidates;
  return product.image ? [product.image] : [];
}

function resolveDuration(product: ProductData): string {
  if (typeof product.duration === 'string' && product.duration.trim().length > 0) return product.duration.trim();
  if (typeof product.duration_days === 'number' && typeof product.duration_nights === 'number') {
    return `${product.duration_days} días / ${product.duration_nights} noches`;
  }
  if (typeof product.duration_days === 'number') return `${product.duration_days} días`;
  return '—';
}

function resolveGroup(product: ProductData): string {
  const options = Array.isArray(product.options) ? product.options : [];
  const max = options
    .map((option) => (typeof option.max_units === 'number' ? option.max_units : null))
    .filter((value): value is number => value !== null);
  if (max.length > 0) return `Hasta ${Math.max(...max)}`;
  return 'Privado o compartido';
}

function mapTone(raw: unknown): TimelineItem['tone'] {
  const event = typeof raw === 'string' ? raw : 'activity';
  if (event === 'transport') return 'transporte';
  if (event === 'meal') return 'comida';
  if (event === 'lodging') return 'alojamiento';
  if (event === 'free_time') return 'libre';
  if (event === 'flight') return 'vuelo';
  return 'actividad';
}

function mapLabel(tone: TimelineItem['tone']): string {
  if (tone === 'transporte') return 'Transporte';
  if (tone === 'comida') return 'Comida';
  if (tone === 'alojamiento') return 'Alojamiento';
  if (tone === 'libre') return 'Tiempo libre';
  if (tone === 'vuelo') return 'Vuelo';
  return 'Actividad';
}

function buildTimeline(product: ProductData): TimelineItem[] {
  const itinerary = Array.isArray(product.itinerary_items)
    ? (product.itinerary_items as Array<Record<string, unknown>>)
    : [];
  const rows = itinerary
    .map((entry, index) => {
      const titleRaw = entry.title;
      const title = typeof titleRaw === 'string' ? sanitizeProductCopy(titleRaw) : '';
      if (!title) return null;
      const tone = mapTone(entry.event_type as ScheduleEventType);
      const dayValue = typeof entry.day === 'number'
        ? entry.day
        : typeof entry.day_number === 'number'
          ? entry.day_number
          : index + 1;
      const timeRaw = typeof entry.time === 'string' ? sanitizeProductCopy(entry.time) : '';
      const noteRaw = typeof entry.description === 'string' ? sanitizeProductCopy(entry.description) : '';
      return {
        day: dayValue > 0 ? dayValue : index + 1,
        time: timeRaw || '—',
        label: mapLabel(tone),
        title,
        note: noteRaw || null,
        tone,
      } satisfies TimelineItem;
    })
    .filter((item): item is TimelineItem => Boolean(item));

  if (rows.length > 0) return rows;

  return [
    {
      day: 1,
      time: 'Llegada',
      label: 'Transporte',
      title: 'Inicio del recorrido',
      note: 'Recepción y coordinación de logística.',
      tone: 'transporte',
    },
    {
      day: 2,
      time: 'Mañana',
      label: 'Actividad',
      title: 'Experiencias destacadas',
      note: 'Recorridos guiados y actividades seleccionadas.',
      tone: 'actividad',
    },
    {
      day: 3,
      time: 'Tarde',
      label: 'Alojamiento',
      title: 'Check-in y descanso',
      note: 'Hospedaje con servicios recomendados.',
      tone: 'alojamiento',
    },
  ];
}

export function EditorialPackageDetailClient({
  website,
  basePath,
  product,
  displayName,
  displayLocation,
  resolvedLocale: _resolvedLocale,
  googleReviews,
  similarProducts,
  faqs,
}: EditorialPackageDetailClientProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string>(() => {
    const option = Array.isArray(product.options) ? product.options[0] : null;
    return option?.id || 'base';
  });
  const [pax, setPax] = useState(2);
  const [datePref, setDatePref] = useState('Próxima disponibilidad');

  const images = useMemo(() => resolveImages(product), [product]);
  const highlights = useMemo(() => normalizeTextList(product.highlights), [product.highlights]);
  const recommendations = useMemo(() => normalizeTextList(product.recommendations), [product.recommendations]);
  const inclusions = useMemo(() => normalizeTextList(product.inclusions), [product.inclusions]);
  const exclusions = useMemo(() => normalizeTextList(product.exclusions), [product.exclusions]);
  const timeline = useMemo(() => buildTimeline(product), [product]);
  const options = useMemo(() => (Array.isArray(product.options) ? product.options : []), [product.options]);

  const reviewRating = useMemo(() => {
    if (typeof product.rating === 'number' && product.rating > 0) return product.rating;
    if (googleReviews.length === 0) return null;
    return googleReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / googleReviews.length;
  }, [googleReviews, product.rating]);
  const reviewCount = typeof product.review_count === 'number' && product.review_count > 0
    ? product.review_count
    : googleReviews.length;

  const sourcePrice = typeof product.price === 'number' ? product.price : null;
  const sourceCurrency = product.currency || 'COP';
  const priceLabel = formatPriceOrConsult(sourcePrice, sourceCurrency);
  const whatsappUrl = buildWhatsAppUrl({
    phone: website.content?.social?.whatsapp,
    productName: displayName,
    location: displayLocation || product.location || product.city || product.country,
    ref: product.id,
    url: website.custom_domain
      ? `https://${website.custom_domain}${basePath}`
      : website.subdomain
        ? `https://${website.subdomain}.bukeer.com${basePath}`
        : undefined,
  });
  const phone = website.content?.account?.phone || website.content?.contact?.phone;
  const phoneHref = phone ? `tel:${phone.replace(/[^0-9+]/g, '')}` : null;

  const breadcrumbItems = [
    { label: 'Inicio', href: `${basePath}/` },
    { label: 'Paquetes', href: `${basePath}/paquetes` },
    { label: displayName },
  ];

  const heroImage = images[0] || product.image || null;
  const optionsForRail = options.length > 0 ? options : [{ id: 'base', name: 'Plan base', prices: [] }];
  const selectedOption = optionsForRail.find((option) => option.id === selectedOptionId) || optionsForRail[0];

  const routeStops = useMemo(() => {
    const itineraryItems = Array.isArray(product.itinerary_items) ? product.itinerary_items : [];
    const destinationHint =
      typeof (product as unknown as Record<string, unknown>).destination === 'string'
        ? String((product as unknown as Record<string, unknown>).destination)
        : product.location ?? null;
    const stops = getPackageCircuitStops({
      itineraryItems,
      name: product.name ?? null,
      destination: destinationHint,
    });
    return withCoords(stops);
  }, [product]);

  const groupedTimeline = useMemo(() => {
    const groups = new Map<number, TimelineItem[]>();
    for (const item of timeline) {
      if (!groups.has(item.day)) groups.set(item.day, []);
      groups.get(item.day)?.push(item);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [timeline]);

  return (
    <>
      <div data-screen-label="PackageDetail">
        <section data-testid="detail-hero" className="relative overflow-hidden rounded-b-[28px]">
          {heroImage ? (
            <div className="relative h-[520px] w-full">
              <Image src={heroImage} alt={displayName} fill sizes="100vw" className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/30 to-black/5" />
            </div>
          ) : (
            <div className="h-[520px] w-full bg-[var(--c-surface-2)]" />
          )}

          <div className="absolute inset-x-0 bottom-8 z-10">
            <div className="mx-auto w-full max-w-7xl px-6">
              <div data-testid="detail-breadcrumb" className="mb-4">
                <Breadcrumbs items={breadcrumbItems} />
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="chip chip-white">Paquetes</span>
                {displayLocation ? <span className="chip chip-white">{displayLocation}</span> : null}
                {reviewRating ? (
                  <span className="chip chip-white">
                    <Rating value={reviewRating} count={reviewCount} size={14} />
                  </span>
                ) : null}
              </div>
              <h1 className="display-lg text-white">{displayName}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white">
                  Desde {priceLabel}
                </span>
                {whatsappUrl ? (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm">
                    <Icons.whatsapp size={14} /> WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto mt-[-28px] w-full max-w-7xl px-6">
          <div className="pkg-meta">
            <div className="ov-item"><small>Duración</small><strong>{resolveDuration(product)}</strong></div>
            <div className="ov-item"><small>Tipo</small><strong>Circuito editorial</strong></div>
            <div className="ov-item"><small>Nivel</small><strong>Moderado</strong></div>
            <div className="ov-item"><small>Idioma</small><strong>ES · EN</strong></div>
            <div className="ov-item"><small>Grupo</small><strong>{resolveGroup(product)}</strong></div>
            <div className="ov-item">
              <small>Reseñas</small>
              <strong>{reviewRating ? `${reviewRating.toFixed(1)} ★ · ${reviewCount}` : '—'}</strong>
            </div>
          </div>

          <div className="pkg-body mt-8">
            <div className="detail-main space-y-10">
              {highlights.length > 0 ? (
                <section data-testid="detail-highlights">
                  <h2 className="text-2xl font-bold">Highlights</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {highlights.slice(0, 6).map((item, index) => (
                      <article key={`${index}-${item}`} className="hl-card">
                        <small className="label">Destacado</small>
                        <p>{item}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {images.length > 0 ? (
                <section data-testid="detail-gallery" className="border-none pt-0">
                  <h2 className="mb-5 text-2xl font-bold">Galería</h2>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      className="group relative aspect-[4/3] overflow-hidden rounded-2xl md:col-span-2"
                      onClick={() => { setActiveImageIndex(0); setLightboxOpen(true); }}
                    >
                      <Image src={images[activeImageIndex] || images[0]} alt={displayName} fill className="object-cover transition-transform group-hover:scale-105" />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      {images.slice(0, 4).map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          className="relative aspect-square overflow-hidden rounded-xl border border-[var(--c-line)]"
                          onClick={() => { setActiveImageIndex(index); setLightboxOpen(true); }}
                        >
                          <Image src={image} alt={`${displayName} ${index + 1}`} fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              <section data-testid="detail-description">
                <h2 className="text-2xl font-bold">Descripción</h2>
                <p className="body-lg mt-4 text-[var(--c-ink-2)]">
                  {product.description || 'Paquete diseñado por expertos locales con logística coordinada y soporte personalizado.'}
                </p>
              </section>

              {routeStops.length > 0 ? (
                <div data-testid="detail-map">
                  <PackageCircuitMap
                    stops={routeStops}
                    analyticsContext={{ product_id: product.id, product_type: 'package' }}
                  />
                </div>
              ) : null}

              <section data-testid="detail-itinerary">
                <h2 className="text-2xl font-bold">Programa <em>día a día</em></h2>
                <div className="act-timeline mt-5">
                  {groupedTimeline.map(([day, entries]) => (
                    <div key={day} data-testid={`timeline-day-${day}`} className="act-timeline-block">
                      <h3 className="mb-3 text-lg font-semibold">Día {day}</h3>
                      {entries.map((event, index) => (
                        <div
                          key={`${day}-${event.title}-${index}`}
                          data-testid={`timeline-event-${event.tone === 'vuelo' ? 'flight' : event.tone === 'transporte' ? 'transport' : event.tone === 'alojamiento' ? 'lodging' : event.tone === 'comida' ? 'meal' : event.tone === 'libre' ? 'free_time' : 'activity'}`}
                          className={`evt evt-${event.tone}`}
                        >
                          <div className="evt-time">{event.time}</div>
                          <div className="evt-dot"><span><Icons.sparkle size={14} /></span></div>
                          <div className="evt-body">
                            <small>{event.label}</small>
                            <b>{event.title}</b>
                            {event.note ? <p>{event.note}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              <section data-testid="detail-options">
                <h2 className="text-2xl font-bold">Opciones <em>disponibles</em></h2>
                <div className="price-table mt-5">
                  {optionsForRail.map((option) => {
                    const basePrice = option.prices?.[0];
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedOptionId(option.id)}
                        className={`price-col text-left ${selectedOptionId === option.id ? 'selected' : ''}`}
                      >
                        <h4>{option.name}</h4>
                        <div className="pr">{formatPriceOrConsult(basePrice?.price ?? sourcePrice, basePrice?.currency ?? sourceCurrency)}</div>
                        <div className="per">{option.pricing_per === 'UNIT' ? 'por persona' : 'por reserva'}</div>
                        <ul>
                          {typeof option.min_units === 'number' ? <li>Mínimo {option.min_units}</li> : null}
                          {typeof option.max_units === 'number' ? <li>Grupo hasta {option.max_units}</li> : null}
                          {Array.isArray(option.start_times) && option.start_times.length > 0 ? <li>{option.start_times.length} salidas</li> : null}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold">Incluye / No incluye</h2>
                <div className="incl-grid mt-5">
                  <div className="incl-col yes">
                    <b>Incluye</b>
                    <ul>
                      {(inclusions.length > 0 ? inclusions : ['Asistencia del equipo durante todo el recorrido']).map((item) => (
                        <li key={item}><span className="mark"><Icons.check size={14} /></span>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="incl-col no">
                    <b>No incluye</b>
                    <ul>
                      {(exclusions.length > 0 ? exclusions : ['Gastos personales', 'Servicios no especificados']).map((item) => (
                        <li key={item}><span className="mark"><Icons.close size={14} /></span>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {recommendations.length > 0 ? (
                <section>
                  <h2 className="text-2xl font-bold">Recomendaciones para el viaje</h2>
                  <div className="recs-grid mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {recommendations.slice(0, 12).map((item, index) => (
                      <div key={`${index}-${item}`} className="rec-card">
                        <small className="label">Tip</small>
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {googleReviews.length > 0 ? (
                <section data-testid="detail-reviews">
                  <h2 className="text-2xl font-bold">Lo que dicen los viajeros</h2>
                  <div className="mt-4 rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] p-5">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Icons.star size={18} />
                        <b className="text-3xl">{reviewRating?.toFixed(1) || '—'}</b>
                        <span className="text-sm text-[var(--c-muted)]">{reviewCount} reseñas</span>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {googleReviews.slice(0, 2).map((review, index) => (
                        <article key={`${review.author_name}-${index}`} className="rounded-xl border border-[var(--c-line)] bg-[var(--c-bg)] p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <b>{review.author_name}</b>
                            <span className="text-sm text-[var(--c-muted)]">{review.rating.toFixed(1)} ★</span>
                          </div>
                          <p className="text-sm text-[var(--c-ink-2)]">{review.text}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              <section data-testid="detail-faq">
                <h2 className="text-3xl font-bold text-center">Preguntas frecuentes</h2>
                <div className="faq-list mt-6">
                  {faqs.map((faq, index) => (
                    <div className={`faq-item ${openFaq === index ? 'open' : ''}`} key={`${faq.question}-${index}`}>
                      <button className="faq-q" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                        <span>{faq.question}</span>
                        <span className="plus"><Icons.plus size={14} /></span>
                      </button>
                      <div className="faq-a">{faq.answer}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section data-testid="detail-trust">
                <h2 className="text-2xl font-bold">Reserva con confianza</h2>
                <div className="trust-row mt-5">
                  <div className="trust-item"><div className="ic"><Icons.shield size={18} /></div><div><b>RNT vigente</b><small>Operador turístico con registro activo</small></div></div>
                  <div className="trust-item"><div className="ic"><Icons.award size={18} /></div><div><b>Afiliados al sector</b><small>Alianzas con proveedores certificados</small></div></div>
                  <div className="trust-item"><div className="ic"><Icons.check size={18} /></div><div><b>Protocolos de seguridad</b><small>Verificados en cada destino</small></div></div>
                  <div className="trust-item"><div className="ic"><Icons.users size={18} /></div><div><b>Guías certificados</b><small>Equipo local y trayectoria comprobada</small></div></div>
                </div>
              </section>

              {similarProducts.length > 0 ? (
                <section data-testid="detail-similares">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Paquetes similares</h2>
                    <Link href={`${basePath}/paquetes`} className="text-xs uppercase tracking-wider text-[var(--c-muted)] hover:text-[var(--c-accent)]">
                      Ver todos
                    </Link>
                  </div>
                  <div className="exp-grid">
                    {similarProducts.slice(0, 3).map((similar) => {
                      const similarImage = resolveImages(similar)[0] || similar.image || null;
                      return (
                        <article key={similar.id} className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] overflow-hidden">
                          <Link href={`${basePath}/paquetes/${similar.slug}`}>
                            <div className="relative aspect-[4/3]">
                              {similarImage ? <Image src={similarImage} alt={similar.name} fill className="object-cover" /> : null}
                            </div>
                            <div className="p-4">
                              <b className="block">{similar.name}</b>
                              <small className="text-[var(--c-muted)]">{similar.location || similar.city || 'Colombia'}</small>
                            </div>
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>

            <aside data-testid="detail-sidebar" className="detail-rail">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--c-muted)]">Desde · por persona</div>
                <div className="text-3xl font-semibold">{priceLabel}</div>
                <div className="mt-1 text-xs text-[var(--c-muted)]">Opción {selectedOption?.name?.toLowerCase() || 'base'}</div>
              </div>

              <div className="rail-form grid gap-3">
                <label className="fld grid gap-1 text-xs text-[var(--c-muted)]">
                  Fecha
                  <select value={datePref} onChange={(event) => setDatePref(event.target.value)}>
                    <option>Próxima disponibilidad</option>
                    <option>Mañana</option>
                    <option>Este fin de semana</option>
                    <option>Próxima semana</option>
                  </select>
                </label>
                <label className="fld grid gap-1 text-xs text-[var(--c-muted)]">
                  Personas
                  <select value={pax} onChange={(event) => setPax(Number(event.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
                      <option key={value} value={value}>{value} {value === 1 ? 'persona' : 'personas'}</option>
                    ))}
                  </select>
                </label>
                <label className="fld grid gap-1 text-xs text-[var(--c-muted)]">
                  Opción
                  <select value={selectedOptionId} onChange={(event) => setSelectedOptionId(event.target.value)}>
                    {optionsForRail.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent" style={{ justifyContent: 'center' }}>
                  Reservar paquete <Icons.arrow size={14} />
                </a>
              ) : null}
              <Link href={`${basePath}/actividades`} className="btn btn-outline" style={{ justifyContent: 'center' }}>
                Agregar experiencias
              </Link>
              <div className="rail-share">
                <button><Icons.heart size={14} /> Guardar</button>
                <button><Icons.arrowUpRight size={14} /> Compartir</button>
              </div>
              <div className="rail-trust">
                <div><Icons.check size={12} /> Confirmación inmediata</div>
                <div><Icons.check size={12} /> Soporte local durante el viaje</div>
                <div><Icons.check size={12} /> Asesoría personalizada</div>
              </div>

              <div className="rounded-2xl border border-[var(--c-line)] p-4">
                <div className="mb-3 text-xs uppercase tracking-wider text-[var(--c-muted)]">Contacto</div>
                {whatsappUrl ? (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm w-full" style={{ justifyContent: 'center' }}>
                    <Icons.whatsapp size={14} /> WhatsApp
                  </a>
                ) : null}
                {phoneHref ? (
                  <a href={phoneHref} className="btn btn-outline btn-sm mt-2 w-full" style={{ justifyContent: 'center' }}>
                    Llamar
                  </a>
                ) : null}
              </div>
            </aside>
          </div>
        </div>

        <section data-testid="detail-cta-final" className="py-16 px-4 bg-primary/5 mt-10 rounded-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">¿Listo para vivir este paquete?</h2>
            <p className="text-muted-foreground mb-8">Te ayudamos a ajustar itinerario, fechas y servicios en minutos.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
                  <Icons.whatsapp size={16} /> WhatsApp
                </a>
              ) : null}
              {phoneHref ? (
                <a href={phoneHref} className="btn btn-outline">
                  Llamar ahora
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {whatsappUrl ? (
        <a
          data-testid="mobile-sticky-bar"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pkg-sticky-wa"
        >
          <Icons.whatsapp size={16} />
          <span>Reservar</span>
        </a>
      ) : null}

      {lightboxOpen && images.length > 0 ? (
        <MediaLightbox
          type="image"
          images={images}
          activeIndex={activeImageIndex}
          altPrefix={displayName}
          onClose={() => setLightboxOpen(false)}
          onNext={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
          onPrev={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
          onThumb={(index) => setActiveImageIndex(index)}
        />
      ) : null}
    </>
  );
}

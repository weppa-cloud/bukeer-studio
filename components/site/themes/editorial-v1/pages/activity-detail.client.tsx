'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductData, ProductFAQ, ScheduleEntry } from '@bukeer/website-contract';
import type { WebsiteData } from '@/lib/supabase/get-website';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import { formatPriceOrConsult } from '@/lib/products/format-price';
import { buildWhatsAppUrl } from '@/components/site/whatsapp-url';
import { MediaLightbox } from '@/components/site/media-lightbox';
import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Eyebrow } from '../primitives/eyebrow';
import { Icons } from '../primitives/icons';
import { Rating } from '../primitives/rating';

interface GoogleReviewProp {
  author_name: string;
  author_photo: string | null;
  rating: number;
  text: string;
  relative_time: string | null;
  images: Array<{ url: string; thumbnail?: string }>;
  response: { text: string; date: string } | null;
}

export interface EditorialActivityDetailClientProps {
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
  time: string;
  label: string;
  title: string;
  note?: string;
  tone: 'transporte' | 'actividad' | 'comida' | 'alojamiento' | 'libre';
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
  if (typeof product.duration_minutes === 'number' && product.duration_minutes > 0) {
    if (product.duration_minutes < 60) return `${product.duration_minutes} min`;
    const h = Math.floor(product.duration_minutes / 60);
    const m = product.duration_minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return '—';
}

function resolveStartTime(product: ProductData): string {
  const options = Array.isArray(product.options) ? product.options : [];
  for (const option of options) {
    if (Array.isArray(option.start_times) && option.start_times.length > 0) {
      return option.start_times[0];
    }
  }
  const schedule = Array.isArray(product.schedule) ? product.schedule : [];
  const first = schedule.find((entry) => typeof entry?.time === 'string' && entry.time.trim().length > 0);
  return first?.time?.trim() || '—';
}

function resolveDifficulty(product: ProductData): string {
  if (typeof product.duration_minutes === 'number' && product.duration_minutes > 0) {
    if (product.duration_minutes <= 240) return 'Fácil';
    if (product.duration_minutes <= 420) return 'Moderada';
    return 'Intensa';
  }
  return 'Fácil';
}

function resolveLanguages(product: ProductData): string {
  const record = product as ProductData & { languages?: unknown };
  if (Array.isArray(record.languages)) {
    const labels = record.languages
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
      .slice(0, 3);
    if (labels.length > 0) return labels.join(' · ');
  }
  return 'ES · EN';
}

function resolveGroup(product: ProductData): string {
  const options = Array.isArray(product.options) ? product.options : [];
  const max = options
    .map((option) => (typeof option.max_units === 'number' ? option.max_units : null))
    .filter((value): value is number => value !== null);
  if (max.length > 0) return `Hasta ${Math.max(...max)}`;
  return 'Hasta 10';
}

function buildTimeline(product: ProductData): TimelineItem[] {
  const schedule = Array.isArray(product.schedule) ? product.schedule : [];
  if (schedule.length > 0) {
    return schedule.slice(0, 8).map((entry): TimelineItem => {
      const tone =
        entry.event_type === 'transport'
          ? 'transporte'
          : entry.event_type === 'meal'
            ? 'comida'
            : entry.event_type === 'lodging'
              ? 'alojamiento'
              : entry.event_type === 'free_time'
                ? 'libre'
                : 'actividad';
      const label =
        tone === 'transporte'
          ? 'Transporte'
          : tone === 'comida'
            ? 'Comida'
            : tone === 'alojamiento'
              ? 'Alojamiento'
              : tone === 'libre'
                ? 'Tiempo libre'
                : 'Actividad';
      return {
        time: entry.time || '—',
        label,
        title: entry.title,
        note: entry.description,
        tone,
      };
    });
  }

  const highlights = normalizeTextList(product.highlights);
  return [
    {
      time: resolveStartTime(product),
      label: 'Transporte',
      title: 'Recogida / meeting point',
      note: 'Encuentro con el guía en el punto acordado.',
      tone: 'transporte',
    },
    {
      time: '+1h',
      label: 'Actividad',
      title: 'Primer segmento',
      note: highlights[0] || 'Inicio del recorrido.',
      tone: 'actividad',
    },
    {
      time: 'Mediodía',
      label: 'Comida',
      title: 'Almuerzo',
      note: 'Incluido — cocina regional.',
      tone: 'comida',
    },
    {
      time: 'Tarde',
      label: 'Actividad',
      title: 'Segmento principal',
      note: highlights[1] || 'Punto destacado de la experiencia.',
      tone: 'actividad',
    },
    {
      time: 'Cierre',
      label: 'Transporte',
      title: 'Regreso',
      note: 'Retorno al punto de encuentro.',
      tone: 'transporte',
    },
  ];
}

export function EditorialActivityDetailClient({
  website,
  basePath,
  product,
  displayName,
  displayLocation,
  resolvedLocale: _resolvedLocale,
  googleReviews,
  similarProducts,
  faqs,
}: EditorialActivityDetailClientProps) {
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
    phone: website.content.social?.whatsapp,
    productName: displayName,
    location: displayLocation || product.location || product.city || product.country,
    ref: product.id,
    url: website.custom_domain
      ? `https://${website.custom_domain}${basePath}`
      : website.subdomain
        ? `https://${website.subdomain}.bukeer.com${basePath}`
        : undefined,
  });
  const phone = website.content.account?.phone || website.content.contact?.phone;
  const phoneHref = phone ? `tel:${phone.replace(/[^0-9+]/g, '')}` : null;

  const breadcrumbItems = [
    { label: 'Inicio', href: `${basePath}/` },
    { label: 'Experiencias', href: `${basePath}/actividades` },
    { label: displayName },
  ];

  const heroImage = images[0] || product.image || null;
  const optionsForRail = options.length > 0 ? options : [{ id: 'base', name: 'Regular', prices: [] }];
  const selectedOption = optionsForRail.find((option) => option.id === selectedOptionId) || optionsForRail[0];

  return (
    <>
      <div data-screen-label="ActivityDetail">
        <section className="relative overflow-hidden rounded-b-[28px]">
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
              <Breadcrumbs items={breadcrumbItems} className="mb-4" />
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="chip chip-white">Experiencias</span>
                {displayLocation ? <span className="chip chip-white">{displayLocation}</span> : null}
                {reviewRating ? (
                  <span className="chip chip-white">
                    <Rating value={reviewRating} count={reviewCount} size={14} />
                  </span>
                ) : null}
              </div>
              <h1 className="display-lg text-white">
                {displayName}
              </h1>
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
            <div className="ov-item"><small>Salida</small><strong>{resolveStartTime(product)}</strong></div>
            <div className="ov-item"><small>Nivel</small><strong>{resolveDifficulty(product)}</strong></div>
            <div className="ov-item"><small>Idiomas</small><strong>{resolveLanguages(product)}</strong></div>
            <div className="ov-item"><small>Grupo</small><strong>{resolveGroup(product)}</strong></div>
            <div className="ov-item">
              <small>Reseñas</small>
              <strong>{reviewRating ? `${reviewRating.toFixed(1)} ★ · ${reviewCount}` : '—'}</strong>
            </div>
          </div>

          <div className="pkg-body mt-8">
            <div className="detail-main space-y-10">
              {images.length > 0 ? (
                <section className="border-none pt-0">
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

              <section>
                <h2 className="text-2xl font-bold">Descripción</h2>
                <p className="body-lg mt-4 text-[var(--c-ink-2)]">
                  {product.description || 'Experiencia diseñada por expertos locales con logística coordinada y asistencia personalizada.'}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold">Programa <em>paso a paso</em></h2>
                <p className="body-md mt-2 text-[var(--c-muted)]">Tiempos aproximados — ajustables por clima y ritmo del grupo.</p>
                <div className="act-timeline mt-5">
                  {timeline.map((event, index) => (
                    <div key={`${event.title}-${index}`} className={`evt evt-${event.tone}`}>
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
              </section>

              <section>
                <h2 className="text-2xl font-bold">Punto de <em>encuentro</em></h2>
                <div className="meeting-map mt-5">
                  <div className="mm-map">
                    {heroImage ? <Image src={heroImage} alt={displayName} fill className="object-cover" /> : null}
                    <div className="mm-pin">
                      <div className="mm-pulse" />
                      <div className="mm-dot"><Icons.pin size={16} /></div>
                    </div>
                    <div className="mm-chip">Meeting point</div>
                  </div>
                  <div className="mm-info">
                    <small className="label">Dirección</small>
                    <b>{displayLocation || product.location || product.city || 'Ubicación por confirmar'}</b>
                    <p>Te enviamos la ubicación exacta con indicaciones al confirmar la reserva.</p>
                    <div className="mm-details">
                      <div><Icons.clock size={14} /> Llegada recomendada: 10 min antes</div>
                      <div><Icons.compass size={14} /> Cómo llegar: taxi, Uber o caminando</div>
                      <div><Icons.users size={14} /> Guía identificado de ColombiaTours</div>
                    </div>
                  </div>
                </div>
              </section>

              {options.length > 0 ? (
                <section>
                  <h2 className="text-2xl font-bold">Opciones <em>disponibles</em></h2>
                  <div className="price-table mt-5">
                    {options.map((option) => {
                      const basePrice = option.prices?.[0];
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedOptionId(option.id)}
                          className={`price-col text-left ${selectedOptionId === option.id ? 'selected' : ''}`}
                        >
                          <h4>{option.name}</h4>
                          <div className="pr">{formatPriceOrConsult(basePrice?.price ?? null, basePrice?.currency ?? sourceCurrency)}</div>
                          <div className="per">{option.pricing_per === 'UNIT' ? 'por persona' : 'por reserva'}</div>
                          <ul>
                            {typeof option.min_units === 'number' ? <li>Mínimo {option.min_units}</li> : null}
                            {typeof option.max_units === 'number' ? <li>Grupo hasta {option.max_units}</li> : null}
                            {Array.isArray(option.start_times) && option.start_times.length > 0 ? <li>{option.start_times.length} horarios</li> : null}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section>
                <h2 className="text-2xl font-bold">Incluye / No incluye</h2>
                <div className="incl-grid mt-5">
                  <div className="incl-col yes">
                    <b>Incluye</b>
                    <ul>
                      {(inclusions.length > 0 ? inclusions : ['Asistencia del equipo durante tu experiencia']).map((item) => (
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
                  <h2 className="text-2xl font-bold">Recomendaciones <em>para el día</em></h2>
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
                <section>
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

              {faqs.length > 0 ? (
                <section>
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
              ) : null}

              <section>
                <h2 className="text-2xl font-bold">Reserva con confianza</h2>
                <div className="trust-row mt-5">
                  <div className="trust-item"><div className="ic"><Icons.shield size={18} /></div><div><b>RNT vigente</b><small>Operador turístico con registro activo</small></div></div>
                  <div className="trust-item"><div className="ic"><Icons.award size={18} /></div><div><b>Afiliados al sector</b><small>Alianzas con proveedores certificados</small></div></div>
                  <div className="trust-item"><div className="ic"><Icons.check size={18} /></div><div><b>Protocolos de seguridad</b><small>Verificados en cada destino</small></div></div>
                  <div className="trust-item"><div className="ic"><Icons.users size={18} /></div><div><b>Guías certificados</b><small>Equipo local y trayectoria comprobada</small></div></div>
                </div>
              </section>

              {similarProducts.length > 0 ? (
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Experiencias similares</h2>
                    <Link href={`${basePath}/actividades`} className="text-xs uppercase tracking-wider text-[var(--c-muted)] hover:text-[var(--c-accent)]">
                      Ver todos
                    </Link>
                  </div>
                  <div className="exp-grid">
                    {similarProducts.slice(0, 3).map((similar) => {
                      const similarImage = resolveImages(similar)[0] || similar.image || null;
                      return (
                        <article key={similar.id} className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-surface)] overflow-hidden">
                          <Link href={`${basePath}/actividades/${similar.slug}`}>
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

            <aside className="detail-rail">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--c-muted)]">Desde · por persona</div>
                <div className="text-3xl font-semibold">{priceLabel}</div>
                <div className="mt-1 text-xs text-[var(--c-muted)]">Opción {selectedOption?.name?.toLowerCase() || 'regular'}</div>
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
                  Reservar experiencia <Icons.arrow size={14} />
                </a>
              ) : null}
              <Link href={`${basePath}/paquetes`} className="btn btn-outline" style={{ justifyContent: 'center' }}>
                Sumar a un paquete
              </Link>
              <div className="rail-share">
                <button><Icons.heart size={14} /> Guardar</button>
                <button><Icons.arrowUpRight size={14} /> Compartir</button>
              </div>
              <div className="rail-trust">
                <div><Icons.check size={12} /> Cancelación hasta 48h antes</div>
                <div><Icons.check size={12} /> Guía bilingüe certificado</div>
                <div><Icons.check size={12} /> Grupos pequeños</div>
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
      </div>

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


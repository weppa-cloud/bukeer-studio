'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import type { ProductData, ProductFAQ, TrustContent } from '@bukeer/website-contract';
import type { WebsiteData } from '@/lib/supabase/get-website';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import { buildWhatsAppUrl } from '@/components/site/whatsapp-url';
import { MediaLightbox } from '@/components/site/media-lightbox';
import { ProductVideoHero } from '@/components/site/product-video-hero';
import { StickyCTABar } from '@/components/site/sticky-cta-bar';
import { ActivityCircuitMap } from '@/components/site/activity-circuit-map';
import { MeetingPointMap } from '@/components/site/meeting-point-map';
import { RelatedCarousel } from '@/components/site/product-detail/p3/related-carousel.client';
import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Icons } from '../primitives/icons';
import { Rating } from '../primitives/rating';
import { EditorialGalleryMosaic } from '../primitives/editorial-gallery-mosaic';
import type { ActivityCircuitStop } from '@/lib/products/activity-circuit';

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
  activityCircuitStops: ActivityCircuitStop[];
}

interface TimelineItem {
  time: string;
  label: string;
  title: string;
  note?: string;
  image?: string;
  tone: 'transporte' | 'actividad' | 'comida' | 'alojamiento' | 'libre';
}

type TrustSignalIcon = 'shield' | 'clock' | 'award' | 'check' | 'users';

interface TrustSignalItem {
  label: string;
  description?: string | null;
  icon: TrustSignalIcon;
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

function resolveProgramGalleryImages(product: ProductData): string[] {
  const gallery = Array.isArray(product.program_gallery) ? product.program_gallery : [];
  const normalized = gallery
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && typeof item.url === 'string') return item.url.trim();
      return '';
    })
    .filter(Boolean);
  return normalized;
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

function getTodayDateInputValue(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatSelectedDate(value: string, locale: string): string {
  if (!value) return 'Próxima disponibilidad';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Próxima disponibilidad';
  return new Intl.DateTimeFormat(locale || 'es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
}

function normalizeInclusionChips(inclusions: string[]): string[] {
  return inclusions
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function formatTravelersCount(count: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(count);
  } catch {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(count);
  }
}

function resolveTrustSignals(website: WebsiteData, locale: string): TrustSignalItem[] {
  const trust = (website.content?.trust ?? null) as TrustContent | null;
  const signals: TrustSignalItem[] = [];

  if (trust?.rnt_number) {
    signals.push({
      label: `RNT ${trust.rnt_number}`,
      description: 'Operador turístico con registro activo',
      icon: 'check',
    });
  }
  if (typeof trust?.years_active === 'number' && trust.years_active > 0) {
    signals.push({
      label: `${trust.years_active} años activos`,
      description: 'Equipo local con trayectoria comprobada',
      icon: 'clock',
    });
  }
  if (typeof trust?.travelers_count === 'number' && trust.travelers_count > 0) {
    signals.push({
      label: `${formatTravelersCount(trust.travelers_count, locale)}+ viajeros`,
      description: 'Viajeros atendidos por nuestro equipo',
      icon: 'users',
    });
  }
  if (trust?.insurance_provider) {
    signals.push({
      label: `Asistencia ${trust.insurance_provider}`,
      description: 'Cobertura y respaldo durante el viaje',
      icon: 'shield',
    });
  }
  if (Array.isArray(trust?.certifications) && trust.certifications.length > 0) {
    signals.push({
      label: trust.certifications.slice(0, 2).map((cert) => cert.label).join(' · '),
      description: 'Alianzas y certificaciones del sector',
      icon: 'award',
    });
  }

  if (signals.length > 0) return signals.slice(0, 4);
  return [
    { label: 'RNT vigente', description: 'Operador turístico con registro activo', icon: 'shield' },
    { label: 'Afiliados al sector', description: 'Alianzas con proveedores certificados', icon: 'award' },
    { label: 'Protocolos de seguridad', description: 'Verificados en cada destino', icon: 'check' },
    { label: 'Guías certificados', description: 'Equipo local y trayectoria comprobada', icon: 'users' },
  ];
}

function buildTimeline(product: ProductData, fallbackImages: string[]): TimelineItem[] {
  const schedule = Array.isArray(product.schedule) ? product.schedule : [];
  const rows = schedule
    .slice(0, 8)
    .map((entry, index): TimelineItem | null => {
      if (!entry || typeof entry.title !== 'string' || entry.title.trim().length === 0) {
        return null;
      }
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
        image: typeof entry.image === 'string' && entry.image.trim().length > 0
          ? entry.image.trim()
          : fallbackImages[index],
        tone,
      };
    })
    .filter((row): row is TimelineItem => Boolean(row));

  return rows;
}

export function EditorialActivityDetailClient({
  website,
  basePath,
  product,
  displayName,
  displayLocation,
  resolvedLocale,
  googleReviews,
  similarProducts,
  faqs,
  activityCircuitStops,
}: EditorialActivityDetailClientProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [pax, setPax] = useState(2);
  const [datePref, setDatePref] = useState('');

  const images = useMemo(() => resolveImages(product), [product]);
  const programGalleryImages = useMemo(() => resolveProgramGalleryImages(product), [product]);
  const highlights = useMemo(() => normalizeTextList(product.highlights), [product.highlights]);
  const recommendations = useMemo(() => normalizeTextList(product.recommendations), [product.recommendations]);
  const inclusions = useMemo(() => normalizeTextList(product.inclusions), [product.inclusions]);
  const exclusions = useMemo(() => normalizeTextList(product.exclusions), [product.exclusions]);
  const inclusionChips = useMemo(() => normalizeInclusionChips(inclusions), [inclusions]);
  const trustSignals = useMemo(() => resolveTrustSignals(website, resolvedLocale), [website, resolvedLocale]);
  const timeline = useMemo(
    () => buildTimeline(product, programGalleryImages.length > 0 ? programGalleryImages : images),
    [product, programGalleryImages, images]
  );

  const reviewRating = useMemo(() => {
    if (typeof product.rating === 'number' && product.rating > 0) return product.rating;
    if (googleReviews.length === 0) return null;
    return googleReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / googleReviews.length;
  }, [googleReviews, product.rating]);
  const reviewCount = typeof product.review_count === 'number' && product.review_count > 0
    ? product.review_count
    : googleReviews.length;

  const productPageUrl = website.custom_domain
    ? `https://${website.custom_domain}${basePath}`
    : website.subdomain
      ? `https://${website.subdomain}.bukeer.com${basePath}`
      : undefined;
  const whatsappUrl = buildWhatsAppUrl({
    phone: website.content?.social?.whatsapp,
    productName: displayName,
    location: displayLocation || product.location || product.city || product.country,
    ref: product.id,
    url: productPageUrl,
  });
  const phone = website.content?.account?.phone || website.content?.contact?.phone;
  const phoneHref = phone ? `tel:${phone.replace(/[^0-9+]/g, '')}` : null;

  const breadcrumbItems = [
    { label: 'Inicio', href: `${basePath}/` },
    { label: 'Experiencias', href: `${basePath}/experiencias` },
    { label: displayName },
  ];
  const heroChips = useMemo(() => {
    const chips: ReactNode[] = [<span key="type" className="chip chip-white">Experiencias</span>];
    const duration = resolveDuration(product);
    if (duration !== '—') chips.push(<span key="duration" className="chip chip-white">{duration}</span>);
    if (displayLocation) chips.push(<span key="location" className="chip chip-white">{displayLocation}</span>);
    if (reviewRating) {
      chips.push(
        <span key="rating" className="chip chip-white">
          <Rating value={reviewRating} count={reviewCount} size={14} />
        </span>
      );
    }
    if (chips.length < 3 && inclusionChips.length > 0) {
      chips.push(
        <span key="inclusion" className="chip chip-white">
          <Icons.check size={13} /> {inclusionChips[0]}
        </span>
      );
    }
    return chips.slice(0, 3);
  }, [product, displayLocation, reviewRating, reviewCount, inclusionChips]);

  const heroImage = images[0] || product.image || null;
  const formattedDatePref = formatSelectedDate(datePref, resolvedLocale);
  const minDate = getTodayDateInputValue();
  const itineraryWhatsappUrl = buildWhatsAppUrl({
    phone: website.content?.social?.whatsapp,
    productName: displayName,
    location: displayLocation || product.location || product.city || product.country,
    ref: product.id,
    url: productPageUrl,
    customMessage: [
      'Hola, quiero *agregar esta actividad a mi viaje*.',
      '',
      `Actividad: *${displayName}*`,
      `Fecha tentativa: ${formattedDatePref}`,
      `Personas: ${pax}`,
      '',
      '¿Me ayudan a construir un itinerario completo en Colombia incluyendo esta experiencia?',
      productPageUrl ? `Enlace: ${productPageUrl}` : '',
    ].filter(Boolean).join('\n'),
  });

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
              <Breadcrumbs items={breadcrumbItems} tone="inverse" className="pkg-hero-breadcrumb mb-3" />
              <div className="hero-chip-row mb-3 flex flex-wrap items-center gap-2">
                {heroChips}
              </div>
              <h1 className="display-lg text-white">
                {displayName}
              </h1>
              <p className="mt-2 max-w-3xl text-base text-white/90">
                {product.description?.slice(0, 150) || 'Experiencia diseñada por expertos locales con logística coordinada.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {whatsappUrl ? (
                  <a href={itineraryWhatsappUrl || whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm">
                    <Icons.whatsapp size={14} /> Armar itinerario
                  </a>
                ) : null}
                {product.video_url ? (
                  <ProductVideoHero
                    videoUrl={product.video_url}
                    videoCaption={product.video_caption}
                    productId={product.id}
                    productName={displayName}
                  />
                ) : null}
                {phoneHref ? (
                  <a href={phoneHref} className="btn btn-outline btn-sm text-white border-white/70 hover:bg-white/10">
                    Llamar
                  </a>
                ) : null}
              </div>
              <div id="detail-sticky-sentinel" className="pointer-events-none mt-4 h-1 w-full" aria-hidden="true" />
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
              <EditorialGalleryMosaic
                images={images}
                displayName={displayName}
                activeImageIndex={activeImageIndex}
                onSelectImage={setActiveImageIndex}
                onOpenLightbox={() => setLightboxOpen(true)}
              />

              <section>
                <h2 className="text-2xl font-bold">Descripción</h2>
                <p className="body-lg mt-4 text-[var(--c-ink-2)]">
                  {product.description || 'Experiencia diseñada por expertos locales con logística coordinada y asistencia personalizada.'}
                </p>
              </section>

              {highlights.length > 0 ? (
                <section>
                  <h2 className="text-2xl font-bold">Qué esperar <em>de esta experiencia</em></h2>
                  <div className="highlights-grid mt-5">
                    {highlights.slice(0, 6).map((item, index) => (
                      <article key={`${item}-${index}`} className="hl-card">
                        <div className="ic"><Icons.sparkle size={18} /></div>
                        <b>{item}</b>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {timeline.length > 0 ? (
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
                          {event.image ? (
                            <div className="evt-media">
                              <Image
                                src={event.image}
                                alt={`${displayName} · ${event.title}`}
                                fill
                                sizes="(max-width: 768px) 100vw, 420px"
                                className="object-cover"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {activityCircuitStops.length >= 2 ? (
                <section>
                  <ActivityCircuitMap
                    stops={activityCircuitStops}
                    analyticsContext={{ product_id: product.id, product_type: 'activity' }}
                  />
                </section>
              ) : (
                <section>
                  <MeetingPointMap
                    meetingPoint={product.meeting_point ?? (
                      product.latitude !== undefined && product.longitude !== undefined
                        ? {
                            latitude: product.latitude,
                            longitude: product.longitude,
                            city: product.city,
                            country: product.country,
                            address: product.location,
                          }
                        : null
                    )}
                    title="Punto de encuentro"
                    locale={resolvedLocale}
                    className="rounded-2xl border border-[var(--c-line)] p-5"
                  />
                </section>
              )}

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
                  {trustSignals.map((signal) => {
                    const Icon = signal.icon === 'award'
                      ? Icons.award
                      : signal.icon === 'check'
                        ? Icons.check
                        : signal.icon === 'users'
                          ? Icons.users
                          : signal.icon === 'clock'
                            ? Icons.clock
                            : Icons.shield;
                    return (
                      <div key={signal.label} className="trust-item">
                        <div className="ic"><Icon size={18} /></div>
                        <div>
                          <b>{signal.label}</b>
                          {signal.description ? <small>{signal.description}</small> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section data-testid="detail-cta-final" className="text-center">
                <h2 className="text-3xl font-bold">¿Listo para sumar esta experiencia a tu viaje?</h2>
                <p className="mt-2 text-[var(--c-muted)]">Te ayudamos por WhatsApp a construir el itinerario completo</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {whatsappUrl ? (
                    <a href={itineraryWhatsappUrl || whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
                      <Icons.whatsapp size={14} /> Agregar a mi viaje
                    </a>
                  ) : null}
                  {phoneHref ? (
                    <a href={phoneHref} className="btn btn-outline">
                      Llamar ahora
                    </a>
                  ) : null}
                </div>
              </section>

              {similarProducts.length > 0 ? (
                <section>
                  <RelatedCarousel
                    title="Experiencias similares"
                    variant="cards-carousel"
                    viewAllHref={`${basePath}/experiencias`}
                    showPrice={false}
                    items={similarProducts.slice(0, 6).map((similar) => ({
                      id: similar.id,
                      href: `${basePath}/actividades/${similar.slug}`,
                      title: similar.name,
                      location: similar.location || similar.city || 'Colombia',
                      image: resolveImages(similar)[0] || similar.image || null,
                    }))}
                  />
                </section>
              ) : null}
            </div>

            <aside className="detail-rail">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--c-muted)]">Itinerario · con asesoría</div>
                <div className="mt-1 text-sm text-[var(--c-muted)]">Cuéntanos tu fecha y número de personas para diseñarlo contigo.</div>
              </div>

              <div className="rail-form grid gap-3">
                <label className="fld grid gap-1 text-xs text-[var(--c-muted)]">
                  Fecha
                  <input
                    type="date"
                    value={datePref}
                    min={minDate}
                    onChange={(event) => setDatePref(event.target.value)}
                    aria-label="Fecha tentativa"
                  />
                </label>
                <label className="fld grid gap-1 text-xs text-[var(--c-muted)]">
                  Personas
                  <select value={pax} onChange={(event) => setPax(Number(event.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
                      <option key={value} value={value}>{value} {value === 1 ? 'persona' : 'personas'}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="text-xs text-[var(--c-muted)]">
                No vendemos esta actividad por separado por ahora. La integramos en un itinerario completo a tu medida.
              </p>

              {itineraryWhatsappUrl || whatsappUrl ? (
                <a href={itineraryWhatsappUrl || whatsappUrl || undefined} target="_blank" rel="noopener noreferrer" className="btn btn-accent" style={{ justifyContent: 'center' }}>
                  Agregar a mi viaje <Icons.arrow size={14} />
                </a>
              ) : null}
              {itineraryWhatsappUrl || whatsappUrl ? (
                <a href={itineraryWhatsappUrl || whatsappUrl || undefined} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                  Hablar con un planner
                </a>
              ) : null}
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
                {itineraryWhatsappUrl || whatsappUrl ? (
                  <a href={itineraryWhatsappUrl || whatsappUrl || undefined} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm w-full" style={{ justifyContent: 'center' }}>
                    <Icons.whatsapp size={14} /> Continuar por WhatsApp
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

      <StickyCTABar
        whatsappUrl={itineraryWhatsappUrl || whatsappUrl}
        whatsappLabel="Agregar a mi viaje"
        hidePrice={true}
        phone={phone || null}
        analyticsContext={{ product_id: product.id, product_type: 'activity', product_name: displayName }}
      />
    </>
  );
}

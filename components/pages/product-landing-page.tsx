'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData, ProductPageCustomization } from '@/lib/supabase/get-pages';
import { getCategoryProducts } from '@/lib/supabase/get-pages';
import { getBasePath } from '@/lib/utils/base-path';
import { normalizeProduct } from '@/lib/products/normalize-product';
import { formatPriceOrConsult } from '@/lib/products/format-price';
import { formatCircuitStops, getPackageCircuitStops } from '@/lib/products/package-circuit';
import { trackEvent } from '@/lib/analytics/track';
import { ProductSchema } from '../seo/product-schema';
import { CalBookingCTA } from '@/components/site/cal-booking-cta';
import { HighlightsGrid } from '@/components/site/highlights-grid';
import { MeetingPointMap } from '@/components/site/meeting-point-map';
import { OptionsTable } from '@/components/site/options-table';
import { ProductFAQ } from '@/components/site/product-faq';
import { ProgramTimeline } from '@/components/site/program-timeline';
import { SectionErrorBoundary } from '@/components/site/section-error-boundary';
import { StickyCTABar } from '@/components/site/sticky-cta-bar';
import { TrustBadges } from '@/components/site/trust-badges';
import { buildWhatsAppUrl } from '@/components/site/whatsapp-url';

interface GoogleReviewProp {
  author_name: string;
  author_photo: string | null;
  rating: number;
  text: string;
  relative_time: string | null;
  images: Array<{ url: string; thumbnail?: string }>;
  response: { text: string; date: string } | null;
}

interface ProductLandingPageProps {
  website: WebsiteData;
  product: ProductData;
  pageCustomization?: ProductPageCustomization;
  productType: string;
  googleReviews?: GoogleReviewProp[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object' && 'label' in item && typeof item.label === 'string') {
          return item.label.trim();
        }
        return '';
      })
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n|,|;/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

type NormalizedProduct = ReturnType<typeof normalizeProduct>;

export function ProductLandingPage({
  website,
  product,
  pageCustomization,
  productType,
  googleReviews = [],
}: ProductLandingPageProps) {
  const normalizedProduct = normalizeProduct(product, { page: pageCustomization });
  const images = normalizedProduct.gallery.length > 0
    ? normalizedProduct.gallery
    : product.images || (product.image ? [product.image] : []);
  const isTransfer = productType === 'transfer';
  const hotelStars = productType === 'hotel' && normalizedProduct.rating
    ? Math.max(1, Math.min(5, Math.round(normalizedProduct.rating)))
    : 0;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = useCallback((index: number) => {
    setActiveImageIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const nextImage = useCallback(() => {
    setActiveImageIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setActiveImageIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);
  const customHero = pageCustomization?.custom_hero;
  const basePath = getBasePath(website.subdomain);
  const primaryPhone = website.content.account?.phone || website.content.contact?.phone || null;
  const whatsappUrl = buildWhatsAppUrl({
    phone: website.content.social?.whatsapp,
    productName: product.name,
    location: product.location || product.city || product.country,
    ref: product.id,
  });
  const bookingLink = (website.content.social as { booking_link?: string } | undefined)?.booking_link;
  const analyticsContext = {
    product_id: product.id,
    product_type: productType,
    product_name: product.name,
    tenant_subdomain: website.subdomain ?? null,
  };
  const handleWhatsAppClick = (location: string) => () => {
    trackEvent('whatsapp_cta_click', { ...analyticsContext, location_context: location });
  };
  const mapMeetingPoint = product.meeting_point ?? (
    product.latitude !== undefined && product.longitude !== undefined
      ? {
          latitude: product.latitude,
          longitude: product.longitude,
          city: product.city,
          country: product.country,
          address: product.location,
        }
      : null
  );
  const highlightSource = (Array.isArray(pageCustomization?.custom_highlights) && pageCustomization.custom_highlights.length > 0)
    ? pageCustomization.custom_highlights
    : normalizedProduct.highlights;
  const faqSource = normalizedProduct.faq ?? pageCustomization?.custom_faq ?? null;
  const websiteUrl = website.custom_domain
    ? `https://${website.custom_domain}${basePath}`
    : website.subdomain
      ? `https://${website.subdomain}.bukeer.com${basePath}`
      : undefined;

  return (
    <>
    <ProductSchema
      product={product}
      productType={productType}
      websiteUrl={websiteUrl}
      language={(website as unknown as { language?: string; locale?: string }).language || (website as unknown as { locale?: string }).locale}
      faqs={pageCustomization?.custom_faq}
    />
    <div className="min-h-screen">
      {/* Hero Section — Gradient fades into page bg */}
      <section
        className="relative flex items-end"
        style={{ height: '70vh', minHeight: 520 }}
      >
        {(customHero?.backgroundImage || images[0]) && (
          <Image
            src={customHero?.backgroundImage || images[0]}
            alt={`${productType === 'hotel' ? 'Hotel' : productType === 'activity' ? 'Actividad' : productType === 'transport' ? 'Transporte' : 'Producto'} ${product.name}${product.location ? ` en ${product.location}` : ''}`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 60%)' }}
        />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-10">
          <div>
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-primary/90">
              {getCategoryLabel(productType)}
            </p>
            {/* Rating stars for hotels */}
            {productType === 'hotel' && hotelStars > 0 && (
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: hotelStars }).map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            )}
            {/* Activity badges */}
            {productType === 'activity' && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {product.duration && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs backdrop-blur-sm bg-background/60 border border-border/50 text-muted-foreground font-mono">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {product.duration}
                  </span>
                )}
                {product.location && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs backdrop-blur-sm bg-background/60 border border-border/50 text-muted-foreground font-mono">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {product.location}
                  </span>
                )}
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              {customHero?.title || product.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {product.price && (
                <span className="inline-flex items-center rounded-full bg-background/70 px-4 py-2 text-sm font-semibold backdrop-blur">
                  Desde {formatPriceOrConsult(product.price, product.currency)}
                </span>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick('hero')}
                  className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  WhatsApp
                </a>
              )}
            </div>
            {productType !== 'activity' && (customHero?.subtitle || product.location) && (
              <p className="text-lg text-muted-foreground flex items-center gap-2 mt-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {customHero?.subtitle || product.location || [product.city, product.country].filter(Boolean).join(', ') || ''}
              </p>
            )}
          </div>
        </div>
      </section>

      <StickyCTABar
        price={normalizedProduct.price}
        currency={product.currency}
        whatsappUrl={whatsappUrl}
        phone={primaryPhone || website.content.social?.whatsapp || null}
      />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground font-mono">
          <Link href={`${basePath}/`} className="hover:underline">
            Inicio
          </Link>
          {product.location && productType !== 'destination' && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`${basePath}/destinos`}
                className="hover:underline"
              >
                Destinos
              </Link>
              <span className="mx-2">/</span>
              <Link
                href={`${basePath}/destinos/${slugify(product.location)}`}
                className="hover:underline"
              >
                {product.location}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <Link
            href={`${basePath}/${getCategorySlug(productType)}`}
            className="hover:underline"
          >
            {getCategoryLabel(productType)}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{product.name}</span>
        </nav>
        <Link
          href={`${basePath}/${getCategorySlug(productType)}`}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider mt-3 text-primary font-mono"
        >
          ← Volver a {getCategoryLabel(productType).toLowerCase()}
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className={`grid gap-10 ${isTransfer ? '' : 'lg:grid-cols-3'}`}>
          {/* Main Content */}
          <div className={isTransfer ? 'space-y-16' : 'lg:col-span-2 space-y-16'}>
            {!isTransfer && (
              <SectionErrorBoundary sectionName="highlights-grid">
                <HighlightsGrid
                  title="Highlights"
                  highlights={highlightSource}
                />
              </SectionErrorBoundary>
            )}

            {/* Gallery */}
            {!isTransfer && images.length > 1 && (
              <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
              >
                <h2 className="text-2xl font-bold mb-6">Galeria</h2>
                <button
                  onClick={() => openLightbox(activeImageIndex)}
                  className="relative aspect-video rounded-xl overflow-hidden mb-4 w-full cursor-zoom-in group"
                >
                  <Image
                    src={images[activeImageIndex]}
                    alt={`${product.name} - imagen ${activeImageIndex + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                      Ver en pantalla completa
                    </span>
                  </div>
                </button>
                <div className="grid grid-cols-2 gap-3">
                  {images.slice(0, 4).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => openLightbox(index)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-colors cursor-zoom-in ${
                        index === activeImageIndex
                          ? 'border-primary'
                          : 'border-transparent hover:border-border'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} - miniatura ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Description */}
            {product.description && (
              <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
              >
                <h2 className="text-2xl font-bold mb-6">
                  {productType === 'hotel' ? 'Sobre el Hotel' : productType === 'transfer' ? 'Sobre el traslado' : 'Descripcion'}
                </h2>
                <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed">
                  <p>{product.description}</p>
                </div>
              </motion.section>
            )}

            {/* Product Type Specific Sections */}
            {productType === 'destination' && <DestinationSections />}
            {productType === 'hotel' && (
              <SectionErrorBoundary sectionName="hotel-sections">
                <HotelSections product={product} normalized={normalizedProduct} />
              </SectionErrorBoundary>
            )}
            {productType === 'activity' && (
              <SectionErrorBoundary sectionName="activity-sections">
                <ActivitySections product={product} normalized={normalizedProduct} />
              </SectionErrorBoundary>
            )}
            {productType === 'package' && (
              <SectionErrorBoundary sectionName="package-sections">
                <PackageSections product={product} normalized={normalizedProduct} />
              </SectionErrorBoundary>
            )}
            {productType === 'transfer' && <TransferSections product={product} />}

            {!isTransfer && (
              <SectionErrorBoundary sectionName="program-timeline">
                <ProgramTimeline
                  title="Programa"
                  schedule={normalizedProduct.schedule as Array<{ day?: number; title: string; description?: string; image?: string; time?: string }> | null}
                />
              </SectionErrorBoundary>
            )}

            {!isTransfer && (
              <SectionErrorBoundary sectionName="include-exclude">
                <IncludeExcludeSection
                  inclusions={normalizedProduct.inclusions}
                  exclusions={normalizedProduct.exclusions}
                />
              </SectionErrorBoundary>
            )}

            {!isTransfer && (
              <SectionErrorBoundary sectionName="meeting-point-map">
                <MeetingPointMap
                  title="Punto de encuentro"
                  meetingPoint={mapMeetingPoint}
                />
              </SectionErrorBoundary>
            )}

            {!isTransfer && (
              <SectionErrorBoundary sectionName="options-table">
                <OptionsTable
                  title="Opciones disponibles"
                  options={product.options}
                />
              </SectionErrorBoundary>
            )}
          </div>

          {!isTransfer && (
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-28">
                <SummarySidebar
                  product={product}
                  normalized={normalizedProduct}
                  productType={productType}
                  whatsappUrl={whatsappUrl}
                  bookingLink={bookingLink}
                  onWhatsAppClick={handleWhatsAppClick('sidebar')}
                  analyticsContext={analyticsContext}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Reviews Section */}
      {!isTransfer && googleReviews.length > 0 && (
        <GoogleReviewsSection reviews={googleReviews} />
      )}

      {!isTransfer && (
        <div className="max-w-7xl mx-auto px-6 pb-16 space-y-16">
          <SectionErrorBoundary sectionName="product-faq">
            <ProductFAQ
              title="Preguntas frecuentes"
              faqs={faqSource}
              website={website}
            />
          </SectionErrorBoundary>

          <SectionErrorBoundary sectionName="trust-badges">
            <TrustBadges
              title="Reserva con confianza"
              website={website}
            />
          </SectionErrorBoundary>
        </div>
      )}

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            ¿Listo para vivir esta experiencia?
          </h2>
          <p className="text-muted-foreground mb-8">
            Contactanos y te ayudamos a planificar tu viaje ideal
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick('cta_section')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            )}
            <Link
              href={`${basePath}/contacto`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              Solicitar cotizacion
            </Link>
            <CalBookingCTA
              bookingLink={bookingLink}
              className="px-8 py-4"
              label="Agendar llamada"
              analyticsLocation="cta_section"
              analyticsContext={analyticsContext}
            />
          </div>
        </div>
      </section>

      {!isTransfer && (
        <SimilarProducts
          website={website}
          product={product}
          productType={productType}
          basePath={basePath}
        />
      )}
    </div>

    {/* Lightbox */}
    <AnimatePresence>
      {lightboxOpen && images.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/60 text-sm font-mono">
            {activeImageIndex + 1} / {images.length}
          </div>

          {/* Previous */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <motion.div
            key={activeImageIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-[90vw] h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[activeImageIndex]}
              alt={`${product.name} - imagen ${activeImageIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </motion.div>

          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActiveImageIndex(i); }}
                  className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                    i === activeImageIndex ? 'border-white' : 'border-white/20 hover:border-white/50'
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

// --- Type-Specific Sections ---

function DestinationSections() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
    >
      <h2 className="text-2xl font-bold mb-6">Puntos Destacados</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {['Cultura local', 'Gastronomia', 'Paisajes', 'Aventura'].map((highlight, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span>✨</span>
            </div>
            <span className="font-medium">{highlight}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function HotelSections({ product, normalized }: { product: ProductData; normalized: NormalizedProduct }) {
  const amenities = normalizeTextList(product.amenities);
  const rating = normalized.rating;
  const reviewCount = typeof product.review_count === 'number'
    ? product.review_count
    : typeof product.review_count === 'string'
      ? Number(product.review_count)
      : null;
  const hasSummary = rating !== null || (reviewCount !== null && Number.isFinite(reviewCount) && reviewCount > 0);

  if (!hasSummary && amenities.length === 0) {
    return null;
  }

  return (
    <>
      {hasSummary && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="rounded-xl border border-border bg-card p-6"
        >
          <h2 className="text-2xl font-bold mb-2">Calificacion de viajeros</h2>
          {rating !== null && (
            <p className="text-3xl font-bold text-primary mb-1">{rating.toFixed(1)} / 5</p>
          )}
          {reviewCount !== null && Number.isFinite(reviewCount) && reviewCount > 0 && (
            <p className="text-sm text-muted-foreground">{reviewCount} resenas verificadas</p>
          )}
        </motion.section>
      )}

      {amenities.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl font-bold mb-6">Amenidades</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {amenities.map((label) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </>
  );
}

function ActivitySections({ product, normalized }: { product: ProductData; normalized: NormalizedProduct }) {
  const recommendations = normalizeTextList(product.recommendations);

  if (recommendations.length === 0 && normalized.price === null) {
    return null;
  }

  return (
    <>
      {recommendations.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl font-bold mb-6">Recomendaciones</h2>
          <ul className="space-y-3">
            {recommendations.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {normalized.price !== null && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl font-bold mb-6">Tarifa base</h2>
          <div className="rounded-xl overflow-hidden border border-border bg-card px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Desde</span>
              <span className="text-xl font-bold text-primary">{formatPriceOrConsult(normalized.price, product.currency)}</span>
            </div>
          </div>
        </motion.section>
      )}
    </>
  );
}

function TransferSections({ product }: { product: ProductData }) {
  const transferProduct = product as ProductData & {
    vehicle_type?: string;
    max_passengers?: number;
  };
  const transferDetails = [
    { label: 'Origen', value: product.from_location || null },
    { label: 'Destino', value: product.to_location || product.location || null },
    { label: 'Duracion estimada', value: product.duration || null },
    { label: 'Vehiculo', value: transferProduct.vehicle_type || null },
    { label: 'Capacidad', value: transferProduct.max_passengers ? `${transferProduct.max_passengers} pasajeros` : null },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  if (transferDetails.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
      className="rounded-xl border border-border bg-card p-6"
    >
      <h2 className="text-2xl font-bold mb-6">Detalles del traslado</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        {transferDetails.map((item) => (
          <div key={item.label}>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-base font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
    </motion.section>
  );
}

function PackageSections({ product, normalized }: { product: ProductData; normalized: NormalizedProduct }) {
  const itineraryItems = Array.isArray(product.itinerary_items) ? product.itinerary_items : [];
  const productData = product as unknown as Record<string, unknown>;
  const destinationHint = typeof productData.destination === 'string'
    ? String(productData.destination)
    : product.location;
  const circuitStops = getPackageCircuitStops({
    itineraryItems,
    name: product.name,
    destination: destinationHint,
  });
  const circuitLabel = formatCircuitStops(circuitStops, 4);
  const normalizedSchedule = Array.isArray(normalized.schedule) ? normalized.schedule : [];
  const itinerary = normalizedSchedule
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const source = entry as Record<string, unknown>;
      const title = typeof source.title === 'string' ? source.title.trim() : '';
      if (!title) return null;
      return {
        key: `${index + 1}-${title}`,
        day: typeof source.day === 'number' ? source.day : index + 1,
        title,
        description: typeof source.description === 'string' ? source.description.trim() : '',
      };
    })
    .filter((row): row is { key: string; day: number; title: string; description: string } => Boolean(row));

  if (circuitStops.length === 0 && itinerary.length === 0) {
    return null;
  }

  return (
    <>
      {circuitStops.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl font-bold mb-4">Circuito del viaje</h2>
          <p className="text-sm mb-4 text-muted-foreground">{circuitLabel}</p>
          <div className="flex flex-wrap gap-2">
            {circuitStops.map((city, index) => (
              <span
                key={`${city}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                {city}
              </span>
            ))}
          </div>
        </motion.section>
      )}

      {itinerary.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl font-bold mb-6">Itinerario</h2>
          <div className="space-y-4">
            {itinerary.map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {item.day}
                </div>
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}
    </>
  );
}

function IncludeExcludeSection({
  inclusions,
  exclusions,
}: {
  inclusions: NormalizedProduct['inclusions'];
  exclusions: NormalizedProduct['exclusions'];
}) {
  const includeItems = normalizeTextList(inclusions);
  const excludeItems = normalizeTextList(exclusions);

  if (includeItems.length === 0 && excludeItems.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
    >
      <h2 className="text-2xl font-bold mb-6">Incluye / No incluye</h2>
      <div className="grid sm:grid-cols-2 gap-8">
        {includeItems.length > 0 && (
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider mb-4">Incluye</h3>
            <ul className="space-y-3">
              {includeItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {excludeItems.length > 0 && (
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider mb-4">No incluye</h3>
            <ul className="space-y-3">
              {excludeItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function SummarySidebar({
  product,
  normalized,
  productType,
  whatsappUrl,
  bookingLink,
  onWhatsAppClick,
  analyticsContext,
}: {
  product: ProductData;
  normalized: NormalizedProduct;
  productType: string;
  whatsappUrl: string | null;
  bookingLink?: string;
  onWhatsAppClick?: () => void;
  analyticsContext?: Record<string, string | number | boolean | null | undefined>;
}) {
  const quickFacts = [
    { label: 'Tipo', value: getCategoryLabel(productType) },
    { label: 'Ubicacion', value: product.location || [product.city, product.country].filter(Boolean).join(', ') || null },
    { label: 'Duracion', value: product.duration || null },
    { label: 'Rating', value: normalized.rating !== null ? `${normalized.rating.toFixed(1)} / 5` : null },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <aside className="rounded-2xl border border-border bg-card p-6 space-y-5">
      {normalized.price !== null && (
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Desde</span>
          <p className="text-3xl mt-1 font-bold text-primary">{formatPriceOrConsult(normalized.price, product.currency)}</p>
        </div>
      )}

      {quickFacts.length > 0 && (
        <dl className="space-y-3">
          {quickFacts.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4 border-b border-border/60 pb-2">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{item.label}</dt>
              <dd className="text-sm text-right">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="space-y-3">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onWhatsAppClick}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            WhatsApp
          </a>
        )}
        <CalBookingCTA
          bookingLink={bookingLink}
          className="w-full py-3 text-sm"
          label="Agendar llamada"
          analyticsLocation="sidebar"
          analyticsContext={analyticsContext}
        />
      </div>
    </aside>
  );
}

// --- Google Reviews Section (Booking.com-level design) ---

function GoogleReviewsSection({ reviews }: { reviews: GoogleReviewProp[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const avgRating = reviews.length > 0
    ? +(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDist = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
    return { stars, count, pct: reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0 };
  });

  const openLightbox = (images: Array<{ url: string }>, startIdx: number) => {
    setLightboxImages(images.map((i) => i.url));
    setLightboxIdx(startIdx);
  };

  return (
    <>
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header with Google branding */}
          <div className="flex items-center gap-3 mb-6">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <h2 className="text-2xl font-bold">Lo que dicen los viajeros</h2>
          </div>

          {/* Rating Summary Bar (Booking.com style) */}
          <div className="flex items-center gap-8 mb-10 p-6 rounded-xl bg-card border">
            <div className="text-center shrink-0">
              <div className="text-5xl font-bold text-primary">{avgRating}</div>
              <div className="flex gap-0.5 mt-1 justify-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={`text-sm ${i <= Math.round(avgRating) ? 'text-yellow-400' : 'text-muted'}`}>★</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{reviews.length} opiniones</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Google Reviews</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingDist.map((row) => (
                <div key={row.stars} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-muted-foreground">{row.stars}</span>
                  <span className="text-yellow-400 text-xs">★</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review, idx) => {
              const isExpanded = expandedIdx === idx;
              const needsTruncation = review.text.length > 200;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-card border rounded-xl p-6 flex flex-col"
                >
                  {/* Author + Stars header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {review.author_photo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={review.author_photo}
                          alt={review.author_name}
                          className="w-10 h-10 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {review.author_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold">{review.author_name}</p>
                        {review.relative_time && (
                          <p className="text-xs text-muted-foreground">{review.relative_time}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <span key={i} className="text-yellow-400 text-sm">★</span>
                      ))}
                    </div>
                  </div>

                  {/* Text with "Leer más" */}
                  <div className="flex-1 mb-4">
                    <p className={`text-sm text-muted-foreground leading-relaxed ${!isExpanded && needsTruncation ? 'line-clamp-4' : ''}`}>
                      &ldquo;{review.text}&rdquo;
                    </p>
                    {needsTruncation && (
                      <button
                        onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                        className="text-xs font-medium text-primary hover:underline mt-1"
                      >
                        {isExpanded ? 'Mostrar menos' : 'Leer más'}
                      </button>
                    )}
                  </div>

                  {/* Review images — clickable for lightbox */}
                  {review.images.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {review.images.slice(0, 3).map((img, imgIdx) => (
                        <button
                          key={imgIdx}
                          onClick={() => openLightbox(review.images, imgIdx)}
                          className="relative w-16 h-16 rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={`Foto ${imgIdx + 1} de ${review.author_name}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                      {review.images.length > 3 && (
                        <button
                          onClick={() => openLightbox(review.images, 3)}
                          className="w-16 h-16 rounded-lg bg-muted/80 flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          +{review.images.length - 3}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Owner response */}
                  {review.response && (
                    <div className="pt-3 mt-auto border-t border-border/50">
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        <span className="not-italic font-medium text-foreground/70">Respuesta: </span>
                        {review.response.text}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxImages([])}
          >
            <button
              onClick={() => setLightboxImages([])}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl z-10"
            >
              ✕
            </button>
            {lightboxIdx > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => i - 1); }}
                className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl"
              >
                ‹
              </button>
            )}
            {lightboxIdx < lightboxImages.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => i + 1); }}
                className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-2xl"
              >
                ›
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImages[lightboxIdx]}
              alt={`Foto ${lightboxIdx + 1} de ${lightboxImages.length}`}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 text-white/70 text-sm">
              {lightboxIdx + 1} / {lightboxImages.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Similar Products ---

function SimilarProducts({ website, product, productType, basePath }: { website: WebsiteData; product: ProductData; productType: string; basePath: string }) {
  const [similar, setSimilar] = useState<ProductData[]>([]);
  const similarLabel = productType === 'hotel' ? 'Hoteles similares' : productType === 'activity' ? 'Experiencias similares' : 'Tambien te puede interesar';
  const categorySlug = getCategorySlug(productType);

  useEffect(() => {
    getCategoryProducts(website.subdomain, productType, { limit: 4 }).then(({ items }) => {
      // Exclude current product, take 3
      setSimilar(items.filter(p => p.id !== product.id).slice(0, 3));
    });
  }, [website.subdomain, productType, product.id]);

  if (similar.length === 0) return null;

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-8"
        >
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>{similarLabel}</h2>
          <Link
            href={`${basePath}/${categorySlug}`}
            className="font-mono text-xs uppercase tracking-wider"
            style={{ color: 'var(--accent)' }}
          >
            Ver todos →
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {similar.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <Link
                href={`${basePath}/${categorySlug}/${item.slug}`}
                className="group block rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: '16/10' }}>
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-3xl">{productType === 'hotel' ? '🏨' : '🎯'}</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold line-clamp-1 mb-1" style={{ color: 'var(--text-heading)' }}>{item.name}</h3>
                  <div className="flex items-center justify-between">
                    {item.location && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.location}</span>
                    )}
                    {item.price && (
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{formatPriceOrConsult(item.price, item.currency)}</span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Helpers ---

function getCategorySlug(type: string): string {
  const mapping: Record<string, string> = {
    destination: 'destinos',
    hotel: 'hoteles',
    activity: 'actividades',
    transfer: 'traslados',
    package: 'paquetes',
  };
  return mapping[type] || type;
}

function getCategoryLabel(type: string): string {
  const mapping: Record<string, string> = {
    destination: 'Destinos',
    hotel: 'Hoteles',
    activity: 'Actividades',
    transfer: 'Traslados',
    package: 'Paquetes',
  };
  return mapping[type] || type;
}

/** Converts a destination name to a URL-safe slug (lowercase, no accents, hyphens). */
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

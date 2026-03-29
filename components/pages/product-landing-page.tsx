'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData, ProductPageCustomization } from '@/lib/supabase/get-pages';
import { getBasePath } from '@/lib/utils/base-path';
import { ProductSchema } from '../seo/product-schema';

interface ProductLandingPageProps {
  website: WebsiteData;
  product: ProductData;
  pageCustomization?: ProductPageCustomization;
  productType: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function ProductLandingPage({
  website,
  product,
  pageCustomization,
  productType,
}: ProductLandingPageProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = product.images || (product.image ? [product.image] : []);
  const customHero = pageCustomization?.custom_hero;
  const basePath = getBasePath(website.subdomain);
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
    />
    <div className="min-h-screen">
      {/* Hero Section — Gradient fades into page bg */}
      <section
        className="relative flex items-end"
        style={{ height: '50vh', minHeight: 400 }}
      >
        {(customHero?.backgroundImage || images[0]) && (
          <Image
            src={customHero?.backgroundImage || images[0]}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 60%)' }}
        />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            {/* Rating stars for hotels */}
            {productType === 'hotel' && product.rating && product.rating > 0 && (
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: product.rating }).map((_, i) => (
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
            {productType !== 'activity' && (customHero?.subtitle || product.location) && (
              <p className="text-lg text-muted-foreground flex items-center gap-2 mt-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {customHero?.subtitle || product.location || [product.city, product.country].filter(Boolean).join(', ') || ''}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="text-xs text-muted-foreground font-mono">
          <Link href={`${basePath}/`} className="hover:underline">
            Inicio
          </Link>
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
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-16">
            {/* Gallery */}
            {images.length > 1 && (
              <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
              >
                <h2 className="text-2xl font-bold mb-6">Galeria</h2>
                <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
                  <Image
                    src={images[activeImageIndex]}
                    alt={`${product.name} - imagen ${activeImageIndex + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {images.slice(0, 4).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-colors ${
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
                  {productType === 'hotel' ? 'Sobre el Hotel' : 'Descripcion'}
                </h2>
                <div className="prose prose-lg max-w-none text-muted-foreground leading-relaxed">
                  <p>{product.description}</p>
                </div>
              </motion.section>
            )}

            {/* Product Type Specific Sections */}
            {productType === 'destination' && <DestinationSections />}
            {productType === 'hotel' && <HotelSections product={product} />}
            {productType === 'activity' && <ActivitySections product={product} />}
            {productType === 'package' && <PackageSections />}
            {productType === 'transfer' && <TransferSections />}
          </div>

          {/* Sidebar - Quote Form */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-28">
              <QuoteForm website={website} product={product} productType={productType} />
            </div>
          </div>
        </div>
      </div>

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
            {website.content.social?.whatsapp && (
              <a
                href={`https://wa.me/${website.content.social.whatsapp}?text=Hola! Me interesa ${product.name}`}
                target="_blank"
                rel="noopener noreferrer"
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
          </div>
        </div>
      </section>
    </div>
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

function HotelSections({ product }: { product: ProductData }) {
  const amenities = product.amenities || [
    { emoji: '🏊', label: 'Piscina' },
    { emoji: '📶', label: 'WiFi' },
    { emoji: '🅿️', label: 'Parking' },
    { emoji: '🍽️', label: 'Restaurante' },
    { emoji: '💆', label: 'Spa' },
    { emoji: '🍸', label: 'Bar' },
    { emoji: '🏋️', label: 'Gimnasio' },
    { emoji: '🛎️', label: 'Room Service' },
  ];

  const includes = product.includes || ['Desayuno buffet', 'Acceso a piscina', 'WiFi alta velocidad', 'Servicio concierge'];
  const excludes = product.excludes || ['Traslado aeropuerto', 'Excursiones externas', 'Minibar'];

  return (
    <>
      {/* Amenities */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={fadeUp}
      >
        <h2 className="text-2xl font-bold mb-6">Amenidades</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {amenities.map((a: { emoji: string; label: string }) => (
            <div
              key={a.label}
              className="flex flex-col items-center gap-2 py-5 rounded-xl text-center bg-card border border-border"
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-sm text-muted-foreground">{a.label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Includes / Excludes */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={fadeUp}
      >
        <h2 className="text-2xl font-bold mb-6">Incluye / No incluye</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider mb-4">Incluye</h3>
            <ul className="space-y-3">
              {(includes as string[]).map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider mb-4">No incluye</h3>
            <ul className="space-y-3">
              {(excludes as string[]).map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>
    </>
  );
}

function ActivitySections({ product }: { product: ProductData }) {
  const includes = product.includes || ['Guia experto', 'Transporte', 'Equipo necesario'];
  const excludes = product.excludes || ['Comidas', 'Propinas', 'Seguro de viaje'];
  const recommendations = product.recommendations || [
    'Ropa comoda y calzado para caminar',
    'Protector solar y gorra',
    'Llegar 15 minutos antes del horario',
  ];

  return (
    <>
      {/* What's Included */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={fadeUp}
      >
        <h2 className="text-2xl font-bold mb-6">Que incluye</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider mb-4">Incluye</h3>
            <ul className="space-y-3">
              {(includes as string[]).map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider mb-4">No incluye</h3>
            <ul className="space-y-3">
              {(excludes as string[]).map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Recommendations */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={fadeUp}
      >
        <h2 className="text-2xl font-bold mb-6">Recomendaciones</h2>
        <ul className="space-y-3">
          {(recommendations as string[]).map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* Rates table */}
      {product.price && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
        >
          <h2 className="text-2xl font-bold mb-6">Tarifas</h2>
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="flex items-center justify-between px-6 py-4 bg-card">
              <span className="text-sm text-muted-foreground">Precio por persona</span>
              <span className="text-xl font-bold text-primary">{product.price}</span>
            </div>
          </div>
        </motion.section>
      )}
    </>
  );
}

function TransferSections() {
  return (
    <>
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={fadeUp}
      >
        <h2 className="text-2xl font-bold mb-6">Detalles del Traslado</h2>
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider mb-4">Incluye</h3>
            <ul className="space-y-3">
              {['Vehiculo privado', 'Conductor bilingue', 'Asistencia en aeropuerto'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-sm uppercase tracking-wider mb-4">No incluye</h3>
            <ul className="space-y-3">
              {['Propinas', 'Peajes adicionales', 'Paradas no programadas'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={fadeUp}
      >
        <h2 className="text-2xl font-bold mb-6">Recomendaciones</h2>
        <ul className="space-y-3">
          {[
            'Confirma tu vuelo con anticipacion para coordinar el horario de recogida',
            'Ten a la mano tu confirmacion de reserva',
            'Indica el numero de maletas al momento de reservar',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </motion.section>
    </>
  );
}

function PackageSections() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
    >
      <h2 className="text-2xl font-bold mb-6">Itinerario</h2>
      <div className="space-y-4">
        {['Dia 1: Llegada', 'Dia 2: Exploracion', 'Dia 3: Aventura', 'Dia 4: Regreso'].map(
          (day, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl"
            >
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold shrink-0">
                {index + 1}
              </div>
              <div>
                <h3 className="font-medium">{day}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Descripcion de las actividades del dia...
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </motion.section>
  );
}

// --- Quote Form ---

function QuoteForm({
  website,
  product,
  productType,
}: {
  website: WebsiteData;
  product: ProductData;
  productType: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: website.subdomain,
          productType,
          productId: product.id,
          productName: product.name,
          customerName: formData.get('name'),
          customerEmail: formData.get('email'),
          customerPhone: formData.get('phone'),
          travelDates: { checkIn: formData.get('dates') },
          adults: parseInt(formData.get('adults') as string) || 2,
          children: parseInt(formData.get('children') as string) || 0,
          notes: formData.get('notes'),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsSubmitted(true);
      } else {
        setError(data.error || 'Error al enviar la solicitud');
      }
    } catch {
      setError('Error de conexion. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        className="rounded-2xl p-6 bg-card border border-border text-center"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">Solicitud Enviada</h3>
        <p className="text-muted-foreground mb-4">
          Nos pondremos en contacto contigo pronto para darte mas informacion sobre {product.name}.
        </p>
        {website.content.social?.whatsapp && (
          <a
            href={`https://wa.me/${website.content.social.whatsapp}?text=Hola! Acabo de enviar una solicitud de cotizacion para ${product.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
          >
            Continuar por WhatsApp
          </a>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      className="rounded-2xl p-6 space-y-5"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Price header */}
      {product.price && (
        <>
          <div>
            <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Desde</span>
            <div className="text-3xl mt-1" style={{ color: 'var(--accent)' }}>
              {product.price}
              {productType === 'hotel' && (
                <span className="text-base" style={{ color: 'var(--text-muted)' }}>/noche</span>
              )}
            </div>
          </div>

          {/* Rating for hotels */}
          {productType === 'hotel' && product.rating && product.rating > 0 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: product.rating }).map((_, i) => (
                <svg key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          )}

          <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
        </>
      )}

      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>Solicitar Cotizacion</h3>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="dates" className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider font-mono">
            Fechas de viaje
          </label>
          <input
            type="text"
            id="dates"
            name="dates"
            placeholder="Selecciona fechas"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="adults" className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider font-mono">
              Adultos
            </label>
            <select
              id="adults"
              name="adults"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="children" className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider font-mono">
              Ninos
            </label>
            <select
              id="children"
              name="children"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider font-mono">
            Nombre
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider font-mono">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider font-mono">
            Telefono / WhatsApp
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider font-mono">
            Comentarios (opcional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl font-medium text-sm tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          {isSubmitting ? 'Enviando...' : 'Solicitar cotizacion'}
        </button>

        <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

        {/* Trust badges */}
        <ul className="space-y-3">
          <li className="flex items-center gap-3">
            <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs text-muted-foreground">Pago seguro</span>
          </li>
          <li className="flex items-center gap-3">
            <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-muted-foreground">Cancelacion 48h</span>
          </li>
          <li className="flex items-center gap-3">
            <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-xs text-muted-foreground">Soporte 24/7</span>
          </li>
        </ul>

        {website.content.social?.whatsapp && (
          <a
            href={`https://wa.me/${website.content.social.whatsapp}?text=Hola! Me interesa ${product.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Escribir por WhatsApp
          </a>
        )}
      </form>
    </motion.div>
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

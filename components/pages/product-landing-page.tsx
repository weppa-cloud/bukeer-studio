'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData, ProductPageCustomization } from '@/lib/supabase/get-pages';

interface ProductLandingPageProps {
  website: WebsiteData;
  product: ProductData;
  pageCustomization?: ProductPageCustomization;
  productType: string;
}

export function ProductLandingPage({
  website,
  product,
  pageCustomization,
  productType,
}: ProductLandingPageProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = product.images || (product.image ? [product.image] : []);
  const customHero = pageCustomization?.custom_hero;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative h-[50vh] min-h-[400px] flex items-end"
        style={{
          backgroundColor: 'var(--md-sys-color-primary-container)',
        }}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 pb-8">
          <div className="flex items-center gap-2 text-white/80 mb-2">
            <Link href="/" className="hover:text-white">
              Inicio
            </Link>
            <span>/</span>
            <Link
              href={`/${getCategorySlug(productType)}`}
              className="hover:text-white"
            >
              {getCategoryLabel(productType)}
            </Link>
            <span>/</span>
            <span className="text-white">{product.name}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            {customHero?.title || product.name}
          </h1>
          {(customHero?.subtitle || product.location) && (
            <p className="text-lg text-white/80 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {customHero?.subtitle || product.location || `${product.city}, ${product.country}`}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8 py-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            {images.length > 1 && (
              <section className="bg-surface-container rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-on-surface mb-4">
                  Galería
                </h2>
                <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
                  <Image
                    src={images[activeImageIndex]}
                    alt={`${product.name} - imagen ${activeImageIndex + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                        index === activeImageIndex
                          ? 'border-primary'
                          : 'border-transparent hover:border-outline-variant'
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
              </section>
            )}

            {/* Description */}
            {product.description && (
              <section className="bg-surface-container rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-on-surface mb-4">
                  Descripción
                </h2>
                <div className="prose prose-lg max-w-none text-on-surface-variant">
                  <p>{product.description}</p>
                </div>
              </section>
            )}

            {/* Product Type Specific Sections */}
            {productType === 'destination' && (
              <DestinationSections product={product} />
            )}
            {productType === 'hotel' && (
              <HotelSections product={product} />
            )}
            {productType === 'activity' && (
              <ActivitySections product={product} />
            )}
            {productType === 'package' && (
              <PackageSections product={product} />
            )}
          </div>

          {/* Sidebar - Quote Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <QuoteForm website={website} product={product} productType={productType} />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary-container">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-on-primary-container mb-4">
            ¿Listo para vivir esta experiencia?
          </h2>
          <p className="text-on-primary-container/80 mb-8">
            Contáctanos y te ayudamos a planificar tu viaje ideal
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
              href="/contacto"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              Solicitar cotización
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Components

function DestinationSections({ product }: { product: ProductData }) {
  return (
    <>
      {/* Highlights Section - Placeholder */}
      <section className="bg-surface-container rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-on-surface mb-4">
          Puntos Destacados
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {['Cultura local', 'Gastronomía', 'Paisajes', 'Aventura'].map(
            (highlight, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-surface rounded-lg"
              >
                <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center">
                  <span>✨</span>
                </div>
                <span className="text-on-surface">{highlight}</span>
              </div>
            )
          )}
        </div>
      </section>
    </>
  );
}

function HotelSections({ product }: { product: ProductData }) {
  return (
    <>
      {/* Amenities Section - Placeholder */}
      <section className="bg-surface-container rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-on-surface mb-4">
          Servicios y Amenidades
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {['WiFi', 'Piscina', 'Restaurante', 'Spa', 'Gimnasio', 'Bar'].map(
            (amenity, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-surface rounded-lg"
              >
                <span className="text-primary">✓</span>
                <span className="text-on-surface-variant">{amenity}</span>
              </div>
            )
          )}
        </div>
      </section>
    </>
  );
}

function ActivitySections({ product }: { product: ProductData }) {
  return (
    <>
      {/* What's Included Section - Placeholder */}
      <section className="bg-surface-container rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-on-surface mb-4">
          ¿Qué incluye?
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-on-surface mb-2">Incluye:</h3>
            <ul className="space-y-2 text-on-surface-variant">
              {['Guía experto', 'Transporte', 'Equipo necesario'].map(
                (item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-on-surface mb-2">No incluye:</h3>
            <ul className="space-y-2 text-on-surface-variant">
              {['Comidas', 'Propinas', 'Seguro de viaje'].map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-red-600">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function PackageSections({ product }: { product: ProductData }) {
  return (
    <>
      {/* Itinerary Section - Placeholder */}
      <section className="bg-surface-container rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-on-surface mb-4">
          Itinerario
        </h2>
        <div className="space-y-4">
          {['Día 1: Llegada', 'Día 2: Exploración', 'Día 3: Aventura', 'Día 4: Regreso'].map(
            (day, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-surface rounded-lg"
              >
                <div className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold shrink-0">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-medium text-on-surface">{day}</h3>
                  <p className="text-on-surface-variant mt-1">
                    Descripción de las actividades del día...
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </>
  );
}

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain: website.subdomain,
          productType,
          productId: product.id,
          productName: product.name,
          customerName: formData.get('name'),
          customerEmail: formData.get('email'),
          customerPhone: formData.get('phone'),
          travelDates: {
            checkIn: formData.get('dates'),
          },
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
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-surface-container rounded-2xl p-6 shadow-lg text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-on-surface mb-2">
          Solicitud Enviada
        </h3>
        <p className="text-on-surface-variant mb-4">
          Nos pondremos en contacto contigo pronto para darte más información sobre {product.name}.
        </p>
        {website.content.social?.whatsapp && (
          <a
            href={`https://wa.me/${website.content.social.whatsapp}?text=Hola! Acabo de enviar una solicitud de cotización para ${product.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Continuar por WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-container rounded-2xl p-6 shadow-lg">
      <h3 className="text-xl font-semibold text-on-surface mb-4">
        Solicitar Cotización
      </h3>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label
            htmlFor="dates"
            className="block text-sm text-on-surface-variant mb-1"
          >
            Fechas de viaje
          </label>
          <input
            type="text"
            id="dates"
            placeholder="Selecciona fechas"
            className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="adults"
              className="block text-sm text-on-surface-variant mb-1"
            >
              Adultos
            </label>
            <select
              id="adults"
              className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="children"
              className="block text-sm text-on-surface-variant mb-1"
            >
              Niños
            </label>
            <select
              id="children"
              className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm text-on-surface-variant mb-1"
          >
            Nombre
          </label>
          <input
            type="text"
            id="name"
            className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm text-on-surface-variant mb-1"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm text-on-surface-variant mb-1"
          >
            Teléfono / WhatsApp
          </label>
          <input
            type="tel"
            id="phone"
            className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-sm text-on-surface-variant mb-1"
          >
            Comentarios (opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-4 bg-primary text-on-primary rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enviando...' : 'Solicitar cotización'}
        </button>

        {website.content.social?.whatsapp && (
          <a
            href={`https://wa.me/${website.content.social.whatsapp}?text=Hola! Me interesa ${product.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Escribir por WhatsApp
          </a>
        )}
      </form>
    </div>
  );
}

// Helper functions
function getCategorySlug(type: string): string {
  const mapping: Record<string, string> = {
    destination: 'destinos',
    hotel: 'hoteles',
    activity: 'actividades',
    package: 'paquetes',
  };
  return mapping[type] || type;
}

function getCategoryLabel(type: string): string {
  const mapping: Record<string, string> = {
    destination: 'Destinos',
    hotel: 'Hoteles',
    activity: 'Actividades',
    package: 'Paquetes',
  };
  return mapping[type] || type;
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { WebsitePage, PageSection } from '@/lib/supabase/get-pages';

interface StaticPageProps {
  website: WebsiteData;
  page: WebsitePage;
}

export function StaticPage({ website, page }: StaticPageProps) {
  const heroConfig = page.hero_config || {};
  const sections = page.sections || [];
  const ctaConfig = page.cta_config || {};

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative h-[40vh] min-h-[300px] flex items-center justify-center"
        style={{
          backgroundColor: 'var(--md-sys-color-primary-container)',
        }}
      >
        {heroConfig.backgroundImage && (
          <Image
            src={heroConfig.backgroundImage}
            alt={heroConfig.title || page.title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {heroConfig.title || page.title}
          </h1>
          {heroConfig.subtitle && (
            <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90">
              {heroConfig.subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Dynamic Sections */}
      {sections.map((section, index) => (
        <SectionRenderer key={section.id || index} section={section} website={website} />
      ))}

      {/* CTA Section */}
      {ctaConfig.title && (
        <section className="py-16 px-4 bg-primary-container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-on-primary-container mb-4">
              {ctaConfig.title}
            </h2>
            {ctaConfig.subtitle && (
              <p className="text-on-primary-container/80 mb-8">
                {ctaConfig.subtitle}
              </p>
            )}
            {ctaConfig.buttonText && (
              <Link
                href={ctaConfig.buttonLink || '/contacto'}
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                {ctaConfig.buttonText}
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

interface SectionRendererProps {
  section: PageSection;
  website: WebsiteData;
}

function SectionRenderer({ section, website }: SectionRendererProps) {
  const { type, variant, content, config } = section;

  // Render based on section type
  switch (type) {
    case 'text':
      return <TextSection content={content} config={config} />;
    case 'features':
      return <FeaturesSection content={content} config={config} />;
    case 'gallery':
      return <GallerySection content={content} config={config} />;
    case 'testimonials':
      return <TestimonialsSection content={content} config={config} />;
    case 'contact':
      return <ContactSection website={website} content={content} config={config} />;
    case 'faq':
      return <FaqSection content={content} config={config} />;
    default:
      return null;
  }
}

// Section Components

function TextSection({ content, config }: { content: Record<string, unknown>; config: Record<string, unknown> }) {
  const title = content.title as string | undefined;
  const text = content.text as string | undefined;
  const alignment = (config.alignment as string) || 'center';

  return (
    <section className="py-16 px-4 bg-surface">
      <div className={`max-w-4xl mx-auto text-${alignment}`}>
        {title && (
          <h2 className="text-3xl font-bold text-on-surface mb-6">{title}</h2>
        )}
        {text && (
          <div
            className="prose prose-lg max-w-none text-on-surface-variant"
            dangerouslySetInnerHTML={{ __html: text }}
          />
        )}
      </div>
    </section>
  );
}

function FeaturesSection({ content, config }: { content: Record<string, unknown>; config: Record<string, unknown> }) {
  const title = content.title as string | undefined;
  const features = (content.features as Array<{ title: string; description: string; icon?: string }>) || [];

  return (
    <section className="py-16 px-4 bg-surface-container-low">
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2 className="text-3xl font-bold text-on-surface text-center mb-12">
            {title}
          </h2>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-surface rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {feature.icon && (
                <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
              )}
              <h3 className="text-xl font-semibold text-on-surface mb-2">
                {feature.title}
              </h3>
              <p className="text-on-surface-variant">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ content, config }: { content: Record<string, unknown>; config: Record<string, unknown> }) {
  const title = content.title as string | undefined;
  const images = (content.images as Array<{ url: string; alt?: string }>) || [];

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-3xl font-bold text-on-surface text-center mb-12">
            {title}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={image.url}
                alt={image.alt || `Imagen ${index + 1}`}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ content, config }: { content: Record<string, unknown>; config: Record<string, unknown> }) {
  const title = content.title as string | undefined;
  const testimonials = (content.testimonials as Array<{
    text: string;
    author: string;
    role?: string;
    avatar?: string;
  }>) || [];

  return (
    <section className="py-16 px-4 bg-secondary-container">
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2 className="text-3xl font-bold text-on-secondary-container text-center mb-12">
            {title}
          </h2>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-surface rounded-2xl p-6 shadow-sm"
            >
              <p className="text-on-surface-variant italic mb-4">
                "{testimonial.text}"
              </p>
              <div className="flex items-center gap-3">
                {testimonial.avatar ? (
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
                    <span className="text-on-primary-container font-bold">
                      {testimonial.author.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-on-surface">
                    {testimonial.author}
                  </p>
                  {testimonial.role && (
                    <p className="text-sm text-on-surface-variant">
                      {testimonial.role}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({
  website,
  content,
  config,
}: {
  website: WebsiteData;
  content: Record<string, unknown>;
  config: Record<string, unknown>;
}) {
  const title = (content.title as string) || 'Contáctanos';
  const { contact, social } = website.content;

  return (
    <section className="py-16 px-4 bg-surface-container-low">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-on-surface text-center mb-12">
          {title}
        </h2>
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-6">
            {contact.email && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-on-primary-container"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">Email</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-primary hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-on-primary-container"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">Teléfono</p>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-primary hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              </div>
            )}
            {contact.address && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-on-primary-container"
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
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">Dirección</p>
                  <p className="text-on-surface">{contact.address}</p>
                </div>
              </div>
            )}

            {/* Social Links */}
            {Object.values(social).some(Boolean) && (
              <div className="pt-6 border-t border-outline-variant">
                <p className="text-sm text-on-surface-variant mb-4">
                  Síguenos en redes sociales
                </p>
                <div className="flex gap-4">
                  {social.facebook && (
                    <a
                      href={social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors"
                    >
                      <span className="sr-only">Facebook</span>
                      📘
                    </a>
                  )}
                  {social.instagram && (
                    <a
                      href={social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors"
                    >
                      <span className="sr-only">Instagram</span>
                      📷
                    </a>
                  )}
                  {social.whatsapp && (
                    <a
                      href={`https://wa.me/${social.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors"
                    >
                      <span className="sr-only">WhatsApp</span>
                      💬
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contact Form Placeholder */}
          <div className="bg-surface rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-on-surface mb-4">
              Envíanos un mensaje
            </h3>
            <form className="space-y-4">
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
                  htmlFor="message"
                  className="block text-sm text-on-surface-variant mb-1"
                >
                  Mensaje
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-primary text-on-primary rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Enviar mensaje
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ content, config }: { content: Record<string, unknown>; config: Record<string, unknown> }) {
  const title = content.title as string | undefined;
  const faqs = (content.faqs as Array<{ question: string; answer: string }>) || [];

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-4xl mx-auto">
        {title && (
          <h2 className="text-3xl font-bold text-on-surface text-center mb-12">
            {title}
          </h2>
        )}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group bg-surface-container rounded-lg overflow-hidden"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-surface-container-high transition-colors">
                <span className="font-medium text-on-surface">{faq.question}</span>
                <svg
                  className="w-5 h-5 text-on-surface-variant group-open:rotate-180 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-4 pb-4 text-on-surface-variant">{faq.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

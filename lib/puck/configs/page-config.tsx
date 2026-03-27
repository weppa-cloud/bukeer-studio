/**
 * @deprecated Use lib/studio/section-fields.ts instead.
 * This file is kept for the legacy Puck editor (app/editor/[websiteId]/page.tsx).
 * Will be removed when Flutter SSO redirect replaces the iframe editor.
 *
 * Puck Config — Homepage Page Config
 *
 * Defines 16 components (15 existing section adapters + RichText)
 * organized into categories for the Puck sidebar.
 *
 * Each component wraps an existing Bukeer section component via
 * createSectionAdapter(), so the preview matches the public site exactly.
 */

import type { Config } from '@puckeditor/core';
import { createSectionAdapter } from '../section-adapter';
import { createImagePickerField } from '../fields/image-picker-field';

// Import section components directly (not lazy — Puck handles rendering)
import { HeroSection } from '@/components/site/sections/hero-section';
import { DestinationsSection } from '@/components/site/sections/destinations-section';
import { HotelsSection } from '@/components/site/sections/hotels-section';
import { ActivitiesSection } from '@/components/site/sections/activities-section';
import { TestimonialsSection } from '@/components/site/sections/testimonials-section';
import { AboutSection } from '@/components/site/sections/about-section';
import { ContactSection } from '@/components/site/sections/contact-section';
import { CtaSection } from '@/components/site/sections/cta-section';
import { StatsSection } from '@/components/site/sections/stats-section';
import { PartnersSection } from '@/components/site/sections/partners-section';
import { FaqSection } from '@/components/site/sections/faq-section';
import { BlogSection } from '@/components/site/sections/blog-section';
import { TextImageSection } from '@/components/site/sections/text-image-section';
import { FeaturesGridSection } from '@/components/site/sections/features-grid-section';
import { GallerySection } from '@/components/site/sections/gallery-section';
import { NewsletterSection } from '@/components/site/sections/newsletter-section';

// ============================================================================
// Puck Field Definitions (shared across components)
// ============================================================================

const textField = (label: string) =>
  ({ type: 'text' as const, label });

const textareaField = (label: string) =>
  ({ type: 'textarea' as const, label });

const selectField = (label: string, options: { label: string; value: string }[]) =>
  ({ type: 'select' as const, label, options });

// ============================================================================
// Page Config
// ============================================================================

export const pageConfig: Config = {
  categories: {
    hero: {
      title: 'Hero',
      components: ['Hero'],
    },
    products: {
      title: 'Productos',
      components: ['Hotels', 'Activities', 'Destinations'],
    },
    content: {
      title: 'Contenido',
      components: ['About', 'TextImage', 'FeaturesGrid', 'RichText'],
    },
    social_proof: {
      title: 'Social Proof',
      components: ['Testimonials', 'Partners', 'Stats'],
    },
    conversion: {
      title: 'Conversion',
      components: ['CTA', 'Newsletter', 'Contact'],
    },
    media: {
      title: 'Media',
      components: ['Gallery'],
    },
    blog: {
      title: 'Blog',
      components: ['Blog'],
    },
    info: {
      title: 'Informacion',
      components: ['FAQ'],
    },
  },

  components: {
    Hero: {
      label: 'Hero',
      render: createSectionAdapter(HeroSection, 'hero'),
      defaultProps: {
        id: '',
        title: 'Tu Agencia de Viajes',
        subtitle: 'Descubre destinos increibles',
        ctaText: 'Explorar',
        ctaUrl: '#',
        backgroundImage: '',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
        ctaText: textField('Texto del boton'),
        ctaUrl: textField('URL del boton'),
        backgroundImage: createImagePickerField('Imagen de fondo'),
        variant: selectField('Variante', [
          { label: 'Default', value: 'default' },
          { label: 'Imagen', value: 'image' },
          { label: 'Video', value: 'video' },
          { label: 'Minimal', value: 'minimal' },
        ]),
      },
    },

    Hotels: {
      label: 'Hoteles',
      render: createSectionAdapter(HotelsSection, 'hotels'),
      defaultProps: {
        id: '',
        title: 'Nuestros Hoteles',
        subtitle: 'Los mejores alojamientos seleccionados',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
      },
      resolveData: async (data: Record<string, unknown>, { metadata }: { metadata: Record<string, unknown> }) => {
        const website = metadata?.website as Record<string, unknown> | undefined;
        const fp = website?.featured_products as Record<string, unknown[]> | undefined;
        const hotels = fp?.hotels || [];
        return { props: { ...data.props as Record<string, unknown>, hotels } };
      },
    },

    Activities: {
      label: 'Actividades',
      render: createSectionAdapter(ActivitiesSection, 'activities'),
      defaultProps: {
        id: '',
        title: 'Actividades',
        subtitle: 'Experiencias unicas',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
      },
      resolveData: async (data: Record<string, unknown>, { metadata }: { metadata: Record<string, unknown> }) => {
        const website = metadata?.website as Record<string, unknown> | undefined;
        const fp = website?.featured_products as Record<string, unknown[]> | undefined;
        const activities = fp?.activities || [];
        return { props: { ...data.props as Record<string, unknown>, activities } };
      },
    },

    Destinations: {
      label: 'Destinos',
      render: createSectionAdapter(DestinationsSection, 'destinations'),
      defaultProps: {
        id: '',
        title: 'Destinos',
        subtitle: 'Explora nuestros destinos',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
      },
      resolveData: async (data: Record<string, unknown>, { metadata }: { metadata: Record<string, unknown> }) => {
        const website = metadata?.website as Record<string, unknown> | undefined;
        const fp = website?.featured_products as Record<string, unknown[]> | undefined;
        const destinations = fp?.destinations || [];
        return { props: { ...data.props as Record<string, unknown>, destinations } };
      },
    },

    About: {
      label: 'Nosotros',
      render: createSectionAdapter(AboutSection, 'about'),
      defaultProps: {
        id: '',
        title: 'Sobre Nosotros',
        subtitle: '',
        description: '',
        featuredImage: '',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
        description: textareaField('Descripcion'),
        featuredImage: createImagePickerField('Imagen destacada'),
      },
    },

    TextImage: {
      label: 'Texto + Imagen',
      render: createSectionAdapter(TextImageSection, 'text_image'),
      defaultProps: {
        id: '',
        title: '',
        text: '',
        featuredImage: '',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        text: textareaField('Contenido'),
        featuredImage: createImagePickerField('Imagen'),
      },
    },

    FeaturesGrid: {
      label: 'Grid de Caracteristicas',
      render: createSectionAdapter(FeaturesGridSection, 'features_grid'),
      defaultProps: {
        id: '',
        title: 'Caracteristicas',
        subtitle: '',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
      },
    },

    RichText: {
      label: 'Texto Enriquecido',
      defaultProps: {
        id: '',
        content: '<p>Escribe aqui tu contenido...</p>',
      },
      fields: {
        content: textareaField('Contenido HTML'),
      },
      render: ({ content }: { content?: string; id?: string; puck?: unknown }) => {
        return (
          <div className="section-padding">
            <div className="container">
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: content || '' }}
              />
            </div>
          </div>
        );
      },
    },

    Testimonials: {
      label: 'Testimonios',
      render: createSectionAdapter(TestimonialsSection, 'testimonials'),
      defaultProps: {
        id: '',
        title: 'Lo que dicen nuestros clientes',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
      },
    },

    Partners: {
      label: 'Partners',
      render: createSectionAdapter(PartnersSection, 'partners'),
      defaultProps: {
        id: '',
        title: 'Nuestros Partners',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
      },
    },

    Stats: {
      label: 'Estadisticas',
      render: createSectionAdapter(StatsSection, 'stats'),
      defaultProps: {
        id: '',
        title: 'En Numeros',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
      },
    },

    CTA: {
      label: 'Call to Action',
      render: createSectionAdapter(CtaSection, 'cta'),
      defaultProps: {
        id: '',
        title: 'Listo para tu proximo viaje?',
        subtitle: 'Contactanos hoy',
        ctaText: 'Contactar',
        ctaUrl: '#contacto',
        backgroundImage: '',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
        ctaText: textField('Texto del boton'),
        ctaUrl: textField('URL del boton'),
        backgroundImage: createImagePickerField('Imagen de fondo'),
      },
    },

    Newsletter: {
      label: 'Newsletter',
      render: createSectionAdapter(NewsletterSection, 'newsletter'),
      defaultProps: {
        id: '',
        title: 'Suscribete',
        subtitle: 'Recibe ofertas exclusivas',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
      },
    },

    Contact: {
      label: 'Contacto',
      render: createSectionAdapter(ContactSection, 'contact'),
      defaultProps: {
        id: '',
        title: 'Contactanos',
        subtitle: '',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
      },
    },

    Gallery: {
      label: 'Galeria',
      render: createSectionAdapter(GallerySection, 'gallery'),
      defaultProps: {
        id: '',
        title: 'Galeria',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
      },
    },

    Blog: {
      label: 'Blog',
      render: createSectionAdapter(BlogSection, 'blog'),
      defaultProps: {
        id: '',
        title: 'Blog',
        subtitle: 'Ultimas publicaciones',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
        subtitle: textareaField('Subtitulo'),
      },
    },

    FAQ: {
      label: 'Preguntas Frecuentes',
      render: createSectionAdapter(FaqSection, 'faq'),
      defaultProps: {
        id: '',
        title: 'Preguntas Frecuentes',
        variant: 'default',
      },
      fields: {
        title: textField('Titulo'),
      },
    },
  },
};

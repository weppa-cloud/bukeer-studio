import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

// Section components
import { HeroSection } from './sections/hero-section';
import { DestinationsSection } from './sections/destinations-section';
import { HotelsSection } from './sections/hotels-section';
import { ActivitiesSection } from './sections/activities-section';
import { TestimonialsSection } from './sections/testimonials-section';
import { AboutSection } from './sections/about-section';
import { ContactSection } from './sections/contact-section';
import { CtaSection } from './sections/cta-section';
import { StatsSection } from './sections/stats-section';
import { PartnersSection } from './sections/partners-section';
import { FaqSection } from './sections/faq-section';
import { BlogSection } from './sections/blog-section';

// Page Builder section components
import { TextImageSection } from './sections/text-image-section';
import { FeaturesGridSection } from './sections/features-grid-section';
import { GallerySection } from './sections/gallery-section';
import { NewsletterSection } from './sections/newsletter-section';

interface SectionRendererProps {
  section: WebsiteSection;
  website: WebsiteData;
}

// Map section types to components
const sectionComponents: Record<string, React.ComponentType<{
  section: WebsiteSection;
  website: WebsiteData;
}>> = {
  // Homepage sections
  hero: HeroSection,
  destinations: DestinationsSection,
  hotels: HotelsSection,
  activities: ActivitiesSection,
  testimonials: TestimonialsSection,
  about: AboutSection,
  contact: ContactSection,
  cta: CtaSection,
  stats: StatsSection,
  partners: PartnersSection,
  faq: FaqSection,
  blog: BlogSection,

  // Page Builder sections - Hero variants
  hero_image: HeroSection,
  hero_video: HeroSection,
  hero_minimal: HeroSection,

  // Page Builder sections - Content
  text_image: TextImageSection,
  features_grid: FeaturesGridSection,
  faq_accordion: FaqSection,

  // Page Builder sections - Gallery
  gallery_grid: GallerySection,
  gallery_carousel: GallerySection,
  gallery_masonry: GallerySection,

  // Page Builder sections - Social Proof
  testimonials_carousel: TestimonialsSection,
  logos_partners: PartnersSection,
  stats_counters: StatsSection,

  // Page Builder sections - Conversion
  cta_banner: CtaSection,
  contact_form: ContactSection,
  newsletter: NewsletterSection,
};

export function SectionRenderer({ section, website }: SectionRendererProps) {
  const Component = sectionComponents[section.section_type];

  if (!Component) {
    // Unknown section type - render placeholder in development
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="section-padding bg-muted/50">
          <div className="container text-center">
            <p className="text-muted-foreground">
              Sección desconocida: {section.section_type}
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <section id={section.section_type}>
      <Component section={section} website={website} />
    </section>
  );
}

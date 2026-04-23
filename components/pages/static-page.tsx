import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { WebsitePage, PageSection, DestinationData } from '@/lib/supabase/get-pages';
import { renderSection } from '@/lib/sections/render-section';
import { SECTION_TYPES } from '@bukeer/website-contract';
import { LandingPageSchema } from '@/components/seo/landing-page-schema';
import { StickyCTABar } from '@/components/site/sticky-cta-bar';
import { buildWhatsAppUrl } from '@/components/site/whatsapp-url';
import { WhatsAppIntentButton } from '@/components/site/whatsapp-intent-button';

const HERO_SECTION_TYPES = SECTION_TYPES.filter((t) => t.startsWith('hero'));

interface StaticPageProps {
  website: WebsiteData;
  page: WebsitePage;
  dynamicDestinations?: DestinationData[];
}

/**
 * Adapts PageSection to WebsiteSection format.
 *
 * DB sections may use different key names depending on how they were created:
 * - `type`         — PageSection interface (contract types)
 * - `sectionType`  — Template contract blueprints (camelCase, stored by apply_template RPC)
 * - `section_type` — Flutter page builder (snake_case)
 *
 * We normalise all three to `section_type` for the unified renderer.
 */
function adaptPageSectionToWebsiteSection(
  section: PageSection,
  index: number
): WebsiteSection {
  const raw = section as unknown as Record<string, unknown>;
  const sectionType =
    section.type ||
    (raw.sectionType as string) ||
    (raw.section_type as string) ||
    'text'; // safe fallback — text renders gracefully with any content

  return {
    id: section.id,
    section_type: sectionType,
    variant: section.variant || (raw.variant as string) || '',
    display_order: index,
    is_enabled: true,
    config: section.config || (raw.config as Record<string, unknown>) || {},
    content: section.content || {},
  };
}

export function StaticPage({ website, page, dynamicDestinations = [] }: StaticPageProps) {
  const heroConfig = page.hero_config || {};
  const sections = page.sections || [];
  const ctaConfig = page.cta_config || {};
  const curatedDynamicDestinations = dynamicDestinations.filter((d) => d.total > 1);
  const sectionDynamicDestinations = (
    curatedDynamicDestinations.length > 0 ? curatedDynamicDestinations : dynamicDestinations
  ).slice(0, 8);
  const hasDynamicDestinations = sectionDynamicDestinations.length > 0;

  // Skip the hardcoded fallback hero when sections already include a hero-type section
  const sectionsHaveHero = sections.some((s) => {
    const raw = s as unknown as Record<string, unknown>;
    const t = s.type || (raw.sectionType as string) || (raw.section_type as string) || '';
    return HERO_SECTION_TYPES.includes(t as typeof HERO_SECTION_TYPES[number]);
  });

  const baseUrl = (website as unknown as Record<string, unknown>).custom_domain
    ? `https://${(website as unknown as Record<string, unknown>).custom_domain}`
    : `https://${(website as unknown as Record<string, unknown>).subdomain || ''}.bukeer.com`;
  const pageUrl = `${baseUrl}/${page.slug || ''}`;
  const websiteLocale =
    (website as WebsiteData & { default_locale?: string; defaultLocale?: string }).default_locale ??
    (website as WebsiteData & { default_locale?: string; defaultLocale?: string }).defaultLocale ??
    website.content?.locale ??
    'es-CO';

  // Contact channels for sticky mobile CTA + hero CTA
  const websiteContent = (website.content ?? {}) as {
    social?: { whatsapp?: string };
    contact?: { phone?: string };
    account?: { phone?: string | null; phone2?: string | null };
  };
  const rawWhatsApp =
    websiteContent.social?.whatsapp ||
    websiteContent.contact?.phone ||
    websiteContent.account?.phone ||
    null;
  const heroWhatsappUrl =
    heroConfig.ctaUrl && /^https?:\/\//.test(heroConfig.ctaUrl)
      ? heroConfig.ctaUrl
      : buildWhatsAppUrl({
          phone: rawWhatsApp,
          productName: heroConfig.title || page.title,
          location: 'Colombia',
          ref: page.slug,
        });
  const primaryCtaHref = heroConfig.ctaUrl || heroWhatsappUrl || '#contact';
  const secondaryCtaHref = heroConfig.secondaryCtaUrl || '#pricing';
  const primaryCtaIsWhatsApp = Boolean(
    rawWhatsApp && (
      (heroConfig.ctaUrl && /wa\.me|whatsapp/i.test(heroConfig.ctaUrl))
      || (!heroConfig.ctaUrl && heroWhatsappUrl)
    )
  );

  // Extract first pricing section's numeric price + currency for the sticky bar.
  const firstPricing = sections.find((s) => {
    const raw = s as unknown as Record<string, unknown>;
    const t = s.type || (raw.sectionType as string) || (raw.section_type as string) || '';
    return t === 'pricing';
  });
  const pricingContent = (firstPricing?.content ?? {}) as {
    tiers?: Array<{ price?: string | number; currency?: string }>;
    currency?: string;
  };
  const firstTier = pricingContent.tiers?.[0];
  const stickyPrice = firstTier?.price ?? null;
  const stickyCurrency = firstTier?.currency ?? pricingContent.currency ?? 'USD';

  return (
    <div className="min-h-screen">
      {/* Landing page structured data (TouristTrip, FAQPage, AggregateRating, BreadcrumbList) */}
      <LandingPageSchema
        sections={sections}
        pageTitle={page.seo_title || page.title}
        pageUrl={pageUrl}
        inLanguage={websiteLocale}
      />

      {/* Fallback Hero — only when sections don't include their own hero */}
      {!sectionsHaveHero && (
        <section
          className="relative flex items-center justify-center min-h-[420px] md:min-h-[520px] py-16 md:py-24"
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
              fetchPriority="high"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/65" />
          <div className="relative z-10 text-center text-white px-4 max-w-4xl">
            {heroConfig.eyebrow && (
              <span className="inline-block mb-3 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-xs font-semibold tracking-widest uppercase">
                {heroConfig.eyebrow}
              </span>
            )}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-5 drop-shadow-sm">
              {heroConfig.title || page.title}
            </h1>
            {heroConfig.subtitle && (
              <p className="text-base md:text-xl max-w-3xl mx-auto opacity-95 mb-7 leading-relaxed">
                {heroConfig.subtitle}
              </p>
            )}
            {(heroConfig.ctaText || heroConfig.secondaryCtaText) && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                {heroConfig.ctaText && primaryCtaHref && (
                  primaryCtaIsWhatsApp ? (
                    <WhatsAppIntentButton
                      phone={rawWhatsApp}
                      productName={heroConfig.title || page.title}
                      location="Colombia"
                      refCode={page.slug}
                      label={heroConfig.ctaText}
                      analyticsLocation="hero_primary"
                      analyticsContext={{ page_slug: page.slug || '', context: 'static_landing' }}
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 md:text-base"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                      </svg>
                      {heroConfig.ctaText}
                    </WhatsAppIntentButton>
                  ) : (
                    <a
                      href={primaryCtaHref}
                      target={primaryCtaHref.startsWith('http') ? '_blank' : undefined}
                      rel={primaryCtaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 md:text-base"
                      style={{ background: 'var(--accent)' }}
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                      </svg>
                      {heroConfig.ctaText}
                    </a>
                  )
                )}
                {heroConfig.secondaryCtaText && (
                  <a
                    href={secondaryCtaHref}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm md:text-base font-semibold text-white bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/30"
                  >
                    {heroConfig.secondaryCtaText}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Dynamic Sections - Using unified renderer */}
      {sections.map((section, index) => {
        const adaptedSection = adaptPageSectionToWebsiteSection(section, index);
        const content = (adaptedSection.content as Record<string, unknown>) || {};
        const source = content.source === 'manual' ? 'manual' : 'dynamic';
        const shouldUseDynamic =
          adaptedSection.section_type === 'destinations' &&
          hasDynamicDestinations &&
          source !== 'manual';

        const hydratedSection = shouldUseDynamic
            ? ({
                ...adaptedSection,
                content: {
                  ...content,
                  destinations: sectionDynamicDestinations,
                },
              } as WebsiteSection)
            : adaptedSection;

        return (
          <div key={section.id || index}>
            {renderSection({ section: hydratedSection, website })}
          </div>
        );
      })}

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

      {/* Mobile sticky CTA (appears after 200px scroll) */}
      {rawWhatsApp && (
        <StickyCTABar
          price={stickyPrice}
          currency={stickyCurrency}
          whatsappUrl={heroWhatsappUrl}
          phone={rawWhatsApp}
          openWhatsappAsModal={true}
          whatsappProductName={heroConfig.title || page.title}
          whatsappLocation="Colombia"
          whatsappRefCode={page.slug}
          analyticsContext={{ page_slug: page.slug || '', context: 'static_landing' }}
        />
      )}

      {/* Floating WhatsApp FAB — persistent */}
      {rawWhatsApp && (
        <div className="fixed bottom-5 right-5 z-40 hidden sm:block">
          <WhatsAppIntentButton
            phone={rawWhatsApp}
            productName={heroConfig.title || page.title}
            location="Colombia"
            refCode={page.slug}
            label="WhatsApp"
            analyticsLocation="floating-fab"
            analyticsContext={{ page_slug: page.slug || '', context: 'static_landing' }}
            className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold shadow-xl transition-opacity hover:opacity-90"
            >
              WhatsApp
          </WhatsAppIntentButton>
        </div>
      )}
    </div>
  );
}

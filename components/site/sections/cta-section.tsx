'use client';

import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { WhatsAppIntentButton } from '@/components/site/whatsapp-intent-button';
import { useWebsiteLocale } from '@/lib/hooks/use-website-locale';
import { ContextualCtaLink } from '@/components/site/contextual-cta-link';

interface CtaSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function CtaSection({ section, website }: CtaSectionProps) {
  const locale = useWebsiteLocale();
  const text = getPublicUiExtraTextGetter(locale);
  const { content } = website;
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaUrl?: string;
    backgroundImage?: string;
  };

  const title = sectionContent.title || text('sectionCtaTitle');

  return (
    <div className="relative py-24 overflow-hidden">
      {/* Animated background beams effect */}
      {sectionContent.backgroundImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${sectionContent.backgroundImage})` }}
          />
          <div className="absolute inset-0" style={{ backgroundColor: 'var(--accent)', opacity: 0.85 }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, var(--accent) 0%, hsl(var(--primary) / 0.7) 100%)` }} />
      )}

      {/* Animated beam lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px opacity-20"
            style={{
              width: '120%',
              left: '-10%',
              top: `${20 + i * 15}%`,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: `beam-sweep ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
        <style>{`
          @keyframes beam-sweep {
            0%, 100% { transform: translateX(-30%); opacity: 0; }
            50% { transform: translateX(30%); opacity: 0.3; }
          }
        `}</style>
      </div>

      <div className="container relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <BlurFade delay={0} blur="8px">
            <h2
              className="section-title"
              style={{ color: 'var(--accent-text)' }}
            >
              {title}
            </h2>
          </BlurFade>

          {sectionContent.subtitle && (
            <BlurFade delay={0.15}>
              <p className="section-subtitle mt-6" style={{ color: 'var(--accent-text)', opacity: 0.9 }}>
                {sectionContent.subtitle}
              </p>
            </BlurFade>
          )}

          <BlurFade delay={0.3}>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              {sectionContent.ctaText && sectionContent.ctaUrl && (
                <ContextualCtaLink
                  href={sectionContent.ctaUrl}
                  phone={content.social?.whatsapp || content.contact?.phone || (content as { account?: { phone?: string | null } })?.account?.phone || null}
                  productName={title}
                  label={sectionContent.ctaText}
                  analyticsLocation="cta_section_primary"
                  className="group relative px-8 py-4 font-semibold rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
                  style={{ backgroundColor: 'var(--bg)', color: 'var(--accent)' }}
                >
                  {/* Pulsing ring */}
                  <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: 'var(--bg)' }} />
                  <span className="relative">{sectionContent.ctaText}</span>
                </ContextualCtaLink>
              )}
              {(() => {
                const rawWhatsApp =
                  content.social?.whatsapp ||
                  content.contact?.phone ||
                  (content as { account?: { phone?: string | null } })?.account?.phone ||
                  null;
                if (!rawWhatsApp) return null;
                return (
                  <WhatsAppIntentButton
                    phone={rawWhatsApp}
                    productName={title}
                    analyticsLocation="cta_section"
                    label={text('sectionWhatsapp')}
                    className="px-8 py-4 border-2 font-semibold rounded-full hover:bg-white/10 transition-all duration-300 text-[var(--accent-text)] border-[var(--accent-text)]"
                  />
                );
              })()}
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  );
}

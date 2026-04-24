'use client';

import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { useWebsiteLocale } from '@/lib/hooks/use-website-locale';
import { NewsletterSignupForm } from '@/components/site/newsletter-signup-form';

interface NewsletterSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function NewsletterSection({ section, website }: NewsletterSectionProps) {
  const locale = useWebsiteLocale();
  const text = getPublicUiExtraTextGetter(locale);
  const content = (section.content as {
    title?: string;
    subtitle?: string;
    buttonText?: string;
  } | null) || {};
  const title = content.title || text('sectionNewsletterTitle');
  const subtitle = content.subtitle || text('sectionNewsletterSubtitle');
  const buttonText = content.buttonText || text('sectionNewsletterButton');

  return (
    <section className="section-padding bg-primary text-primary-foreground">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-primary-foreground/80 mb-8">{subtitle}</p>

          <NewsletterSignupForm
            subdomain={website.subdomain}
            locale={locale}
            placement="section"
            formClassName="mx-auto flex max-w-md flex-col gap-4 sm:flex-row"
            inputId={`newsletter-section-email-${section.id}`}
            inputClassName="flex-1 rounded-lg bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
            buttonClassName="rounded-lg bg-primary-foreground px-6 py-3 font-semibold text-primary transition-colors hover:bg-primary-foreground/90 disabled:opacity-50"
            successClassName="mt-4 text-primary-foreground/90 animate-fade-in"
            errorClassName="mt-4 text-red-100"
            placeholder={text('sectionNewsletterEmailPlaceholder')}
            emailLabel={text('sectionNewsletterTitle')}
            submitLabel={buttonText}
            submittingLabel={text('sectionNewsletterSending')}
            successLabel={text('sectionNewsletterSuccess')}
          />
        </div>
      </div>
    </section>
  );
}

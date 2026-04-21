import type { WebsiteData } from "@/lib/supabase/get-website";

import { ProductFAQAccordion, type ProductFAQItem } from "./product-faq-accordion.client";

export interface ProductFAQWebsite extends Pick<WebsiteData, "content"> {
  language?: string | null;
  locale?: string | null;
}

export interface ProductFAQProps {
  faqs: ProductFAQItem[] | null | undefined;
  website: ProductFAQWebsite;
  title?: string;
  className?: string;
}

function resolveLang(website: ProductFAQWebsite): string | undefined {
  const language = website.language?.trim();
  if (language) return language;

  const locale = website.locale?.trim();
  if (locale) return locale;

  const contentLocale = website.content?.locale?.trim();
  if (contentLocale) return contentLocale;

  return undefined;
}

export function ProductFAQ({ faqs, website, title, className }: ProductFAQProps) {
  if (!faqs || faqs.length === 0) {
    return null;
  }

  const lang = resolveLang(website);

  return (
    <ProductFAQAccordion
      faqs={faqs}
      title={title}
      lang={lang}
      className={className}
    />
  );
}

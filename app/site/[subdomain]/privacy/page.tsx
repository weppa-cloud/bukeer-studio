import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { SafeHtml } from '@/lib/sanitize';
import { getBasePath } from '@/lib/utils/base-path';
import { getDefaultLegalContent } from '@/lib/legal-defaults';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';
import { resolvePublicMetadataLocale } from '@/lib/seo/public-metadata';

interface PrivacyPageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return { title: getPublicUiMessages(undefined).legalPages.siteNotFoundTitle };
  }

  const siteName = website.content.account?.name || website.content.siteName;
  const localeContext = await resolvePublicMetadataLocale(website, '/privacy');
  const messages = getPublicUiMessages(localeContext.resolvedLocale);
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const canonical = `${baseUrl}${localeContext.localizedPathname}`;

  return {
    title: messages.legalPages.privacyTitle,
    description: `${messages.legalPages.privacyDescriptionPrefix} ${siteName}`,
    alternates: { canonical },
    robots: { index: false, follow: false },
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const basePath = getBasePath(subdomain);
  const siteName = website.content.account?.name || website.content.siteName;
  const localeContext = await resolvePublicMetadataLocale(website, '/privacy');
  const messages = getPublicUiMessages(localeContext.resolvedLocale);
  const customContent = website.content.account?.legal?.privacy_policy;

  // If content is a URL, redirect to it
  if (customContent?.startsWith('http://') || customContent?.startsWith('https://')) {
    redirect(customContent);
  }

  // Use custom content if available, otherwise show default placeholder
  const legalContent = customContent || getDefaultLegalContent('privacy', siteName, localeContext.resolvedLocale);

  return (
    <article className="section-padding">
      <div className="container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href={`${basePath}/`} className="hover:text-foreground transition-colors">
                {messages.legalPages.breadcrumbHome}
              </Link>
            </li>
            <li>/</li>
            <li className="text-foreground">{messages.legalPages.privacyTitle}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">{messages.legalPages.privacyTitle}</h1>
          <p className="mt-2 text-muted-foreground">{siteName}</p>
        </header>

        <SafeHtml
          content={legalContent}
          className="prose prose-lg max-w-none dark:prose-invert
            prose-headings:font-bold
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          "
        />

        <div className="mt-12 pt-8 border-t">
          <Link
            href={`${basePath}/`}
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {messages.legalPages.backHome}
          </Link>
        </div>
      </div>
    </article>
  );
}

export const revalidate = 300;

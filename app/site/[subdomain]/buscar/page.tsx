import { Metadata } from 'next';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { SearchPageClient } from './search-client';

interface SearchPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  const siteName = website?.content?.account?.name || subdomain;

  return {
    title: `Buscar | ${siteName}`,
    description: `Busca destinos, hoteles, actividades y paquetes en ${siteName}`,
  };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { subdomain } = await params;
  const { q } = await searchParams;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) return null;

  return <SearchPageClient subdomain={subdomain} initialQuery={q || ''} website={website} />;
}

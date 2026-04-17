import { StudioPage, StudioSectionHeader, StudioBadge } from '@/components/studio/ui/primitives';
import { GlossaryTable } from '@/components/admin/glossary-table';

// Filters live in searchParams — keep this route fully dynamic.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Supported locales shown in the form/filter. Mirrored from seo-locale-settings.
const SUPPORTED_LOCALES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'es-CO', label: 'es-CO — Español (Colombia)' },
  { value: 'es-MX', label: 'es-MX — Español (México)' },
  { value: 'es-ES', label: 'es-ES — Español (España)' },
  { value: 'es-AR', label: 'es-AR — Español (Argentina)' },
  { value: 'es-PE', label: 'es-PE — Español (Perú)' },
  { value: 'es-CL', label: 'es-CL — Español (Chile)' },
  { value: 'en-US', label: 'en-US — English (United States)' },
  { value: 'en-GB', label: 'en-GB — English (United Kingdom)' },
  { value: 'pt-BR', label: 'pt-BR — Português (Brasil)' },
];

export interface GlossaryPageFilters {
  locale: string;
  type: 'all' | 'brand' | 'destination' | 'generic';
  q: string;
}

interface GlossaryPageProps {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{
    locale?: string;
    type?: string;
    q?: string;
  }>;
}

function normalizeFilters(input: Awaited<GlossaryPageProps['searchParams']>): GlossaryPageFilters {
  const rawType = input.type?.trim() ?? '';
  const type: GlossaryPageFilters['type'] =
    rawType === 'brand' || rawType === 'destination' || rawType === 'generic' ? rawType : 'all';
  return {
    locale: input.locale?.trim() || '',
    type,
    q: input.q?.trim() || '',
  };
}

export default async function GlossaryPage({ params, searchParams }: GlossaryPageProps) {
  const { websiteId } = await params;
  const resolvedSearch = await searchParams;
  const filters = normalizeFilters(resolvedSearch);

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Glosario de términos"
        subtitle="Marcas, destinos y términos genéricos que guían la transcreación multi-locale. Las entradas sin traducción quedan marcadas como “no traducir”."
        actions={<StudioBadge tone="info">Transcreación</StudioBadge>}
      />
      <GlossaryTable
        websiteId={websiteId}
        filters={filters}
        supportedLocales={SUPPORTED_LOCALES}
      />
    </StudioPage>
  );
}

import {
  CATEGORY_CANONICAL_SEGMENT,
  localeToLanguage,
  normalizeLocale,
} from '@/lib/seo/locale-routing';

export interface PackagesListingCopy {
  title: string;
  description: string;
  packagesSegment: string;
  packagesLabel: string;
  homeLabel: string;
}

const COPY_BY_LANGUAGE: Record<
  string,
  Omit<PackagesListingCopy, 'packagesSegment'>
> = {
  es: {
    title: 'Paquetes de Viaje',
    description:
      'Descubre los paquetes de viaje curados por {siteName}. Experiencias únicas todo incluido.',
    packagesLabel: 'Paquetes',
    homeLabel: 'Inicio',
  },
  en: {
    title: 'Travel Packages',
    description:
      'Discover curated travel packages by {siteName}. All-in-one unique experiences.',
    packagesLabel: 'Packages',
    homeLabel: 'Home',
  },
  pt: {
    title: 'Pacotes de Viagem',
    description:
      'Descubra pacotes de viagem selecionados por {siteName}. Experiências completas e personalizadas.',
    packagesLabel: 'Pacotes',
    homeLabel: 'Início',
  },
  fr: {
    title: 'Forfaits voyage',
    description:
      'Découvrez les forfaits voyage sélectionnés par {siteName}. Des séjours complets et personnalisés.',
    packagesLabel: 'Forfaits',
    homeLabel: 'Accueil',
  },
  de: {
    title: 'Reisepakete',
    description:
      'Entdecken Sie von {siteName} kuratierte Reisepakete. Vollständige und individuell anpassbare Reisen.',
    packagesLabel: 'Pakete',
    homeLabel: 'Startseite',
  },
};

export function getPackagesListingCopy(
  siteName: string,
  localeLike?: string | null,
): PackagesListingCopy {
  const normalizedLocale = normalizeLocale(localeLike ?? 'es-CO', 'es-CO');
  const language = localeToLanguage(normalizedLocale);
  const copy = COPY_BY_LANGUAGE[language] ?? COPY_BY_LANGUAGE.es;
  const segment =
    CATEGORY_CANONICAL_SEGMENT.package[
      language as keyof typeof CATEGORY_CANONICAL_SEGMENT.package
    ] ?? CATEGORY_CANONICAL_SEGMENT.package.es;

  return {
    title: copy.title,
    description: copy.description.replace('{siteName}', siteName),
    packagesSegment: segment,
    packagesLabel: copy.packagesLabel,
    homeLabel: copy.homeLabel,
  };
}

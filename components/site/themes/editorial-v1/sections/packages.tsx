/**
 * editorial-v1 — <PackagesSection />
 *
 * Editorial variant of the packages section. Renders section header
 * (eyebrow + title + subtitle) on the server and delegates the tab
 * filter + card grid/carousel to a tiny client leaf so analytics CTA
 * clicks can fire.
 *
 * Contract:
 *  - `section.content` is snake_case-normalized by the section-registry
 *    dispatcher before it reaches this component.
 *  - `packages[]` is hydrated by `lib/sections/hydrate-sections.ts` —
 *    this component MUST NOT trigger DB reads.
 *
 * Opt-in: mounted only when the website's theme profile declares
 * `metadata.templateSet = 'editorial-v1'`.
 */

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

import { Eyebrow } from '@/components/site/themes/editorial-v1/primitives/eyebrow';
import { editorialHtml } from '@/components/site/themes/editorial-v1/primitives/rich-heading';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

import {
  PackagesFilters,
  type EditorialFilterTab,
  type EditorialPackageItem,
} from './packages-filters.client';

const editorialText = getPublicUiExtraTextGetter('es-CO');

interface PackagesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

type PackagesSectionContent = {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  packages?: EditorialPackageItem[] | null;
  filters?: {
    enabled?: boolean | null;
    tabs?: EditorialFilterTab[] | null;
  } | null;
  layout?: 'grid' | 'carousel' | null;
};

const DEFAULT_EYEBROW = editorialText('editorialPackagesEyebrowFallback');
const DEFAULT_TITLE = editorialText('editorialPackagesTitleFallback');

const LABELS = {
  allTab: editorialText('editorialPackagesAllTab'),
  popularBadge: editorialText('editorialPackagesPopular'),
  fromPrefix: editorialText('editorialPackagesFromPrefix'),
  consultPrice: editorialText('editorialPackagesConsultPrice'),
  viewPackage: editorialText('editorialPackagesCtaFallback'),
  emptyFallback: editorialText('editorialPackagesEmpty'),
} as const;

export function PackagesSection({ section, website }: PackagesSectionProps) {
  const raw = (section.content ?? {}) as PackagesSectionContent;

  const eyebrow = (raw.eyebrow ?? '').toString().trim() || DEFAULT_EYEBROW;
  const title = (raw.title ?? '').toString().trim() || DEFAULT_TITLE;
  const subtitle = (raw.subtitle ?? '').toString().trim();
  const packages = Array.isArray(raw.packages) ? raw.packages : [];

  const filtersConfig = raw.filters ?? null;
  const filtersEnabled = filtersConfig?.enabled !== false; // default on
  const rawTabs = Array.isArray(filtersConfig?.tabs) ? filtersConfig!.tabs! : [];
  const safeTabs: EditorialFilterTab[] = rawTabs
    .filter(
      (t): t is EditorialFilterTab =>
        !!t &&
        typeof t.label === 'string' &&
        t.label.trim().length > 0 &&
        typeof t.filterKey === 'string' &&
        t.filterKey.trim().length > 0,
    )
    .map((t) => ({
      label: t.label.trim(),
      filterKey: t.filterKey.trim(),
      count: typeof t.count === 'number' ? t.count : undefined,
    }));

  const derivedTabs: EditorialFilterTab[] =
    safeTabs.length === 0
      ? deriveTabsFromPackages(packages)
      : [];
  const effectiveTabs = safeTabs.length > 0 ? safeTabs : derivedTabs;

  const basePath = `/site/${website.subdomain}`;

  return (
    <section
      className="ev-section ev-packages"
      data-screen-label="packages"
      style={{ background: 'var(--c-surface)' }}
    >
      <div className="ev-container">
        <header
          className="ev-packages-head"
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            className="display-md"
            style={{ margin: '12px auto 0', maxWidth: '18ch' }}
            dangerouslySetInnerHTML={editorialHtml(title) ?? undefined}
          />
          {subtitle && (
            <p
              className="body-md"
              style={{
                margin: '16px auto 0',
                maxWidth: '52ch',
                fontSize: 16,
              }}
              dangerouslySetInnerHTML={editorialHtml(subtitle) ?? undefined}
            />
          )}
        </header>

        <PackagesFilters
          packages={packages}
          tabs={effectiveTabs}
          enableFilters={filtersEnabled && effectiveTabs.length > 0}
          basePath={basePath}
          labels={LABELS}
        />
      </div>
    </section>
  );
}

function deriveTabsFromPackages(
  packages: EditorialPackageItem[],
): EditorialFilterTab[] {
  const acc = new Map<string, { label: string; count: number }>();

  const add = (raw: string | null | undefined) => {
    const label = (raw ?? '').toString().trim();
    if (!label) return;
    const key = label.toLowerCase();
    const current = acc.get(key);
    if (current) {
      current.count += 1;
      return;
    }
    acc.set(key, { label, count: 1 });
  };

  for (const pkg of packages) {
    const tags = [
      ...(pkg.tags ?? []),
      ...(pkg.categoryKeys ?? []),
    ];
    if (tags.length > 0) {
      for (const tag of tags) add(tag);
      continue;
    }
    add(pkg.country ?? pkg.destination ?? null);
  }

  return Array.from(acc.entries())
    .slice(0, 5)
    .map(([filterKey, value]) => ({
      label: value.label,
      filterKey,
      count: value.count,
    }));
}

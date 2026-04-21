/**
 * editorial-v1 — <EditorialExperiencesPage />
 *
 * Port of designer `ExperiencesPage` from
 *   themes/references/claude design 1/project/experiences.jsx
 * + copy catalog section "Activities / Experiences section".
 *
 * The page is driven by an activity list fed from the hydrated `activities`
 * section of the website (see `lib/sections/hydrate-sections.ts`), plus an
 * optional override at `section.content.activities[]` (editorial seed). The
 * filter bar is a tiny client leaf so hero + grid shell stay server-rendered.
 */

import type { WebsiteData } from '@/lib/supabase/get-website';
import { Eyebrow } from '@/components/site/themes/editorial-v1/primitives/eyebrow';
import { Breadcrumbs } from '@/components/site/themes/editorial-v1/primitives/breadcrumbs';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

import {
  ExperiencesGrid,
  type ExperienceItem,
  type ExperiencesInitialFilters,
} from './experiences-grid.client';

export interface EditorialExperiencesPageProps {
  website: WebsiteData;
  subdomain: string;
  locale: string;
  activities: ExperienceItem[];
  initialFilters?: ExperiencesInitialFilters;
}

export function EditorialExperiencesPage({
  website,
  subdomain,
  locale,
  activities,
  initialFilters,
}: EditorialExperiencesPageProps) {
  const resolvedLocale =
    locale
    || (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale
    || 'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const basePath = `/site/${subdomain}`;
  const siteTitleTrail = website.content?.siteName || subdomain;

  return (
    <div data-screen-label="Experiences" data-testid="editorial-experiences">
      <section className="section ev-experiences-hero" style={{ paddingTop: 72 }}>
        <div className="ev-container">
          <Breadcrumbs
            items={[
              { label: siteTitleTrail, href: basePath },
              { label: editorialText('editorialBreadcrumbActivities') },
            ]}
          />
          <div style={{ marginTop: 24, maxWidth: '52ch' }}>
            <Eyebrow>{editorialText('editorialExperiencesEyebrow')}</Eyebrow>
            <h1 className="display-lg" style={{ margin: '12px 0 12px' }}>
              {editorialText('editorialExperiencesTitle')}{' '}
              <em
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  color: 'var(--c-accent)',
                  fontWeight: 400,
                }}
              >
                {editorialText('editorialExperiencesEmphasis')}
              </em>
            </h1>
            <p className="body-lg">{editorialText('editorialExperiencesSubtitle')}</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48 }}>
        <div className="ev-container">
          <ExperiencesGrid
            activities={activities}
            basePath={basePath}
            initialFilters={initialFilters}
            locale={resolvedLocale}
          />
        </div>
      </section>
    </div>
  );
}

export default EditorialExperiencesPage;

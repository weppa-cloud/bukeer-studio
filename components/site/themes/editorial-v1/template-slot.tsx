/**
 * TemplateSlot — dispatcher for editorial page variants.
 *
 * Wraps a page body and, when the website opts into `editorial-v1`, allows
 * an editorial variant (e.g. `pages/package-detail.tsx`) to layer editorial
 * chrome (breadcrumbs, ItineraryMap, hotel grid, flights, FAQ header) on
 * top of the generic body. Variants receive `children` (the generic body)
 * and are responsible for rendering them so SEO schemas, ISR data-fetching
 * and currency/pricing state stay in the generic component.
 *
 * Usage (from a detail route):
 *   ```tsx
 *   <TemplateSlot name="package-detail" website={website} payload={payload}>
 *     <GenericPackagePage ... />
 *   </TemplateSlot>
 *   ```
 */

import type { ReactNode } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import { resolveTemplateSet } from '@/lib/sections/template-set';
import { EditorialPackageDetail } from './pages/package-detail';
import { EditorialActivityDetail } from './pages/activity-detail';
import { EditorialHotelDetail } from './pages/hotel-detail';
import {
  EditorialPlannerDetailPage,
  type EditorialPlannerDetailPageProps,
} from './pages/planner-detail';
import {
  EditorialPlannersListPage,
  type EditorialPlannersListPageProps,
} from './pages/planners-list';
import {
  EditorialBlogListPage,
  type EditorialBlogListPageProps,
} from './pages/blog-list';
import {
  EditorialBlogDetailPage,
  type EditorialBlogDetailPageProps,
} from './pages/blog-detail';
import {
  EditorialExperiencesPage,
  type EditorialExperiencesPageProps,
} from './pages/experiences';
import {
  EditorialDestinosListPage,
  type EditorialDestinosListPagePayload,
} from './pages/destinos-list';
import {
  EditorialDestinoDetailPage,
  type EditorialDestinoDetailPayload,
} from './pages/destino-detail';
import {
  EditorialPaquetesListPage,
  type EditorialPaquetesListPagePayload,
} from './pages/paquetes-list';
import {
  EditorialHotelesListPage,
  type EditorialHotelesListPagePayload,
} from './pages/hoteles-list';

export type TemplateSlotName =
  | 'package-detail'
  | 'activity-detail'
  | 'hotel-detail'
  | 'blog-list'
  | 'blog-detail'
  | 'planner-detail'
  | 'planners-list'
  | 'experiences-page'
  | 'destinos-list'
  | 'destino-detail'
  | 'paquetes-list'
  | 'hoteles-list';

export interface TemplateSlotProps {
  name: TemplateSlotName;
  website: WebsiteData | null | undefined;
  children: ReactNode;
  /**
   * Additional payload passed to an editorial page variant. Typed as
   * `unknown` here so each variant can narrow it — we avoid coupling the
   * slot to any specific page's props shape.
   */
  payload?: unknown;
}

type EditorialVariantComponent = React.ComponentType<{
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}>;

/**
 * Planner-detail variant adapter — unwraps the typed payload and renders
 * the standalone editorial page (ignores `children` because the editorial
 * planner detail is a full-page replacement, not a chrome wrap).
 */
function PlannerDetailAdapter({
  website,
  payload,
}: {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}) {
  // `payload` is narrowed at the call site; if it's malformed we skip the
  // editorial variant and the `TemplateSlot` fallback returns `children`.
  const typed = payload as
    | Omit<EditorialPlannerDetailPageProps, 'website'>
    | undefined;
  if (!typed || !typed.planner) return null;
  return (
    <EditorialPlannerDetailPage
      website={website}
      planner={typed.planner}
      payload={typed.payload}
      reviews={typed.reviews}
      relatedPackages={typed.relatedPackages}
      otherPlanners={typed.otherPlanners}
    />
  );
}

function PlannersListAdapter({
  website,
  payload,
}: {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}) {
  const typed = payload as
    | Omit<EditorialPlannersListPageProps, 'website'>
    | undefined;
  if (!typed) return null;
  return (
    <EditorialPlannersListPage
      website={website}
      dbPlanners={typed.dbPlanners ?? []}
      brandClaims={typed.brandClaims}
    />
  );
}

function BlogListAdapter({
  website,
  payload,
}: {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}) {
  const typed = payload as
    | Omit<EditorialBlogListPageProps, 'website'>
    | undefined;
  if (!typed) return null;
  return <EditorialBlogListPage website={website} {...typed} />;
}

function BlogDetailAdapter({
  website,
  payload,
}: {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}) {
  const typed = payload as
    | Omit<EditorialBlogDetailPageProps, 'website'>
    | undefined;
  if (!typed || !typed.post) return null;
  return <EditorialBlogDetailPage website={website} {...typed} />;
}

function ExperiencesPageAdapter({
  website,
  payload,
}: {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}) {
  const typed = payload as
    | Omit<EditorialExperiencesPageProps, 'website'>
    | undefined;
  if (!typed) return null;
  return <EditorialExperiencesPage website={website} {...typed} />;
}

function DestinosListAdapter({
  website,
  payload,
}: {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}) {
  const typed = payload as EditorialDestinosListPagePayload | undefined;
  if (!typed || !Array.isArray(typed.destinations)) return null;
  return <EditorialDestinosListPage website={website} payload={typed} />;
}

function DestinoDetailAdapter({
  website,
  payload,
}: {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}) {
  const typed = payload as EditorialDestinoDetailPayload | undefined;
  if (!typed || !typed.destination) return null;
  return <EditorialDestinoDetailPage website={website} payload={typed} />;
}

function PaquetesListAdapter({
  website,
  payload,
}: {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}) {
  const typed = payload as EditorialPaquetesListPagePayload | undefined;
  if (!typed || !Array.isArray(typed.packages)) return null;
  return <EditorialPaquetesListPage website={website} packages={typed.packages} />;
}

function HotelesListAdapter({
  website,
  payload,
}: {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}) {
  const typed = payload as EditorialHotelesListPagePayload | undefined;
  if (!typed || !Array.isArray(typed.hotels)) return null;
  return <EditorialHotelesListPage website={website} hotels={typed.hotels} />;
}

/**
 * Registry of editorial-v1 page variants. Each variant receives
 * `children` (the generic page body rendered by the fallback) and either
 * wraps it (package/activity/hotel detail) or fully replaces it
 * (planner-detail / planners-list).
 */
const EDITORIAL_V1_PAGE_COMPONENTS: Partial<
  Record<TemplateSlotName, EditorialVariantComponent>
> = {
  'package-detail': EditorialPackageDetail,
  'activity-detail': EditorialActivityDetail,
  'hotel-detail': EditorialHotelDetail,
  'planner-detail': PlannerDetailAdapter,
  'planners-list': PlannersListAdapter,
  'blog-list': BlogListAdapter,
  'blog-detail': BlogDetailAdapter,
  'experiences-page': ExperiencesPageAdapter,
  'destinos-list': DestinosListAdapter,
  'destino-detail': DestinoDetailAdapter,
  'paquetes-list': PaquetesListAdapter,
  'hoteles-list': HotelesListAdapter,
};

export function TemplateSlot({
  name,
  website,
  children,
  payload,
}: TemplateSlotProps) {
  const templateSet = resolveTemplateSet(website);

  if (templateSet === 'editorial-v1') {
    const EditorialVariant = EDITORIAL_V1_PAGE_COMPONENTS[name];
    if (EditorialVariant && website) {
      // Pre-gate the "replace" variants (planner-detail, planners-list):
      // if the caller didn't pass a planner payload, fall through to the
      // generic body instead of rendering an empty editorial shell.
      const needsPayload =
        name === 'activity-detail' ||
        name === 'planner-detail' ||
        name === 'planners-list' ||
        name === 'blog-list' ||
        name === 'blog-detail' ||
        name === 'experiences-page' ||
        name === 'destinos-list' ||
        name === 'destino-detail' ||
        name === 'paquetes-list' ||
        name === 'hoteles-list';
      if (needsPayload && !payload) {
        return <>{children}</>;
      }
      return (
        <EditorialVariant website={website} payload={payload}>
          {children}
        </EditorialVariant>
      );
    }
  }

  return <>{children}</>;
}

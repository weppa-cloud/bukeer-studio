/**
 * editorial-v1 barrel — public exports for the template set.
 *
 * Importing from this barrel keeps call sites independent from the internal
 * file layout; re-org inside the `themes/editorial-v1` tree does not ripple.
 */

export { EditorialSiteHeader } from './layout/site-header';
export { EditorialSiteFooter } from './layout/site-footer';
export { TemplateSlot } from './template-slot';
export type { TemplateSlotName, TemplateSlotProps } from './template-slot';

export { Icons } from './primitives/icons';
export type { IconName, IconProps } from './primitives/icons';
export { Rating } from './primitives/rating';
export { Breadcrumbs } from './primitives/breadcrumbs';
export type { BreadcrumbItem, BreadcrumbsProps } from './primitives/breadcrumbs';
export { Eyebrow } from './primitives/eyebrow';
export { Logo } from './primitives/logo';
export { Scenic } from './primitives/scenic';
export type { ScenicScene, ScenicProps } from './primitives/scenic';

export {
  editorialV1SectionComponents,
  getEditorialSectionComponent,
} from './section-registry';
export type {
  EditorialSectionComponent,
  EditorialSectionComponentProps,
} from './section-registry';

export { ColombiaMap } from './maps/colombia-map';
export type {
  ColombiaMapProps,
  ColombiaMapPin,
} from './maps/colombia-map';
export { ColombiaMapClient } from './maps/colombia-map.client';
export type { ColombiaMapClientProps } from './maps/colombia-map.client';
export { RegionalMiniMap } from './maps/regional-mini-map';
export type { RegionalMiniMapProps } from './maps/regional-mini-map';
export { CountryChip } from './maps/country-chip';
export type { CountryChipProps } from './maps/country-chip';
export type { EditorialRegion } from './maps/colombia-map-shared';

// Editorial page variants + listing map primitive
export { EditorialBlogListPage } from './pages/blog-list';
export type { EditorialBlogListPageProps } from './pages/blog-list';
export { EditorialBlogDetailPage } from './pages/blog-detail';
export type { EditorialBlogDetailPageProps } from './pages/blog-detail';
export { EditorialExperiencesPage } from './pages/experiences';
export type { EditorialExperiencesPageProps } from './pages/experiences';

export { BlogSection } from './sections/blog';
export type { BlogTeaserPost } from './sections/blog';
export { ListingMap } from './sections/listing-map';
export type { ListingMapItem, ListingMapProps } from './sections/listing-map';
export type {
  ExperienceItem,
  ExperiencesInitialFilters,
} from './pages/experiences-grid.client';

// WhatsApp Flow — Variants A/B/D (Wave 2 port).
export {
  WaflowProvider,
  WaflowFab,
  WaflowDrawer,
  WaflowCTAButton,
  useWaflow,
} from './waflow';
export type {
  WaflowProviderProps,
  WaflowConfig,
  WaflowContextValue,
  WaflowCTAButtonProps,
  WaflowDestinationContext,
  WaflowPackageContext,
  WaflowState,
  WaflowStep,
  WaflowVariant,
} from './waflow';

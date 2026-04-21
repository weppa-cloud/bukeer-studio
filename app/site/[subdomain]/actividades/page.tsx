/**
 * /site/[subdomain]/actividades — legacy listing URL.
 *
 * editorial-v1 renames the listing to `/experiencias`. To keep inbound links
 * (nav items, SEO backlinks, email templates, etc.) working and unify on a
 * single canonical URL, this route permanently redirects `/actividades` →
 * `/experiencias`, preserving any query string (filters like `?region=`,
 * `?category=`, `?q=`, etc.).
 *
 * Individual activity detail URLs `/actividades/<slug>` are **not** handled
 * here — they continue to resolve via the `[...slug]` catch-all route so
 * deep links and breadcrumbs keep working unchanged.
 */

import { permanentRedirect } from 'next/navigation';

interface ActividadesPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toSearchString(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const entries: Array<[string, string]> = [];
  for (const [key, raw] of Object.entries(searchParams)) {
    if (raw === undefined) continue;
    if (Array.isArray(raw)) {
      for (const v of raw) entries.push([key, v]);
    } else {
      entries.push([key, raw]);
    }
  }
  if (entries.length === 0) return '';
  const usp = new URLSearchParams(entries);
  return `?${usp.toString()}`;
}

export default async function ActividadesRedirectPage({
  params,
  searchParams,
}: ActividadesPageProps) {
  const { subdomain } = await params;
  const sp = await searchParams;
  const qs = toSearchString(sp);
  permanentRedirect(`/site/${subdomain}/experiencias${qs}`);
}

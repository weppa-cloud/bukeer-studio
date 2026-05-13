import { isEnBlogQualityBlocked } from "@/lib/seo/en-quality-gate";

export interface BlogSitemapRow {
  id: string;
  slug: string;
  locale: string | null;
  translation_group_id: string | null;
  published_at: string | null;
  updated_at: string | null;
}

export interface BlogSitemapGroup {
  pathname: string;
  lastmod?: string;
  translatedLocales: string[];
}

export function groupBlogRowsForSitemap(
  rows: BlogSitemapRow[],
): BlogSitemapGroup[] {
  const groups = new Map<string, BlogSitemapRow[]>();

  for (const row of rows) {
    if (!row.slug) continue;
    const key = row.translation_group_id || row.id;
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  const out: BlogSitemapGroup[] = [];
  for (const groupRows of groups.values()) {
    const indexableRows = groupRows.filter(isBlogSitemapRowIndexable);
    if (indexableRows.length === 0) continue;

    const defaultRow = indexableRows.find((row) =>
      isDefaultBlogLocale(row.locale),
    );
    const canonicalRow = defaultRow ?? indexableRows[0];
    if (!canonicalRow?.slug) continue;
    const canonicalLocale = normalizeBlogLocaleForSitemap(canonicalRow.locale);
    const pathname =
      defaultRow || !canonicalLocale
        ? `/blog/${canonicalRow.slug}`
        : `/${canonicalLocale.split("-")[0].toLowerCase()}/blog/${canonicalRow.slug}`;

    const translatedLocales = indexableRows
      .map((row) => normalizeBlogLocaleForSitemap(row.locale))
      .filter((locale): locale is string => Boolean(locale));

    const lastmodSource = indexableRows
      .map((row) => row.published_at ?? row.updated_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    out.push({
      pathname,
      lastmod: lastmodSource?.split("T")[0],
      translatedLocales: [...new Set(translatedLocales)],
    });
  }

  return out.sort((a, b) => a.pathname.localeCompare(b.pathname));
}

function isBlogSitemapRowIndexable(row: BlogSitemapRow): boolean {
  const normalizedLocale = normalizeBlogLocaleForSitemap(row.locale);
  return !(
    normalizedLocale &&
    isEnBlogQualityBlocked(normalizedLocale, row.slug)
  );
}

function normalizeBlogLocaleForSitemap(
  locale: string | null | undefined,
): string | null {
  if (!locale) return null;
  if (locale === "es") return "es-CO";
  if (locale === "en") return "en-US";
  return locale;
}

function isDefaultBlogLocale(locale: string | null | undefined): boolean {
  return ["es", "es-CO", null, undefined].includes(locale);
}

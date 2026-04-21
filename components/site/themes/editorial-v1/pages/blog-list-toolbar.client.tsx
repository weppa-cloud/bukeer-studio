'use client';

/**
 * Blog list toolbar — category chips + search input. URL-synced: selecting
 * a chip or submitting the search navigates to `/blog?category=...&q=...`
 * so SSR handles the filter. Keeping it a client leaf isolates hydration
 * cost and lets us highlight the active state without a full JS app.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, type FormEvent } from 'react';

import { Icons } from '@/components/site/themes/editorial-v1/primitives/icons';
import type { BlogCategory } from '@/lib/supabase/get-website';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export interface BlogListToolbarProps {
  basePath: string;
  locale: string;
  categories: BlogCategory[];
  activeCategorySlug: string | null;
  initialQuery: string;
  allLabel: string;
}

export function BlogListToolbar({
  basePath,
  locale,
  categories,
  activeCategorySlug,
  initialQuery,
  allLabel,
}: BlogListToolbarProps) {
  const editorialText = getPublicUiExtraTextGetter(locale || 'es-CO');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  const navigate = useCallback(
    (overrides: { category?: string | null; q?: string | null }) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      // Reset page on any filter change.
      params.delete('page');
      if ('category' in overrides) {
        if (overrides.category) params.set('category', overrides.category);
        else params.delete('category');
      }
      if ('q' in overrides) {
        const q = (overrides.q ?? '').trim();
        if (q) params.set('q', q);
        else params.delete('q');
      }
      const qs = params.toString();
      router.push(qs ? `${basePath}/blog?${qs}` : `${basePath}/blog`);
    },
    [router, searchParams, basePath],
  );

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      navigate({ q: query });
    },
    [navigate, query],
  );

  return (
    <div className="blog-toolbar" role="toolbar" aria-label={editorialText('editorialBlogToolbarAria')}>
      <div className="blog-cats" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!activeCategorySlug}
          className={`filter-tab${!activeCategorySlug ? ' active' : ''}`}
          onClick={() => navigate({ category: null })}
        >
          {allLabel}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategorySlug === cat.slug}
            className={`filter-tab${activeCategorySlug === cat.slug ? ' active' : ''}`}
            onClick={() => navigate({ category: cat.slug })}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="blog-search" role="search">
        <Icons.search size={16} aria-hidden />
        <input
          type="search"
          aria-label={editorialText('editorialBlogSearchAria')}
          placeholder={editorialText('editorialBlogSearchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
    </div>
  );
}

export default BlogListToolbar;

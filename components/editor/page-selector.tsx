'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { StudioBadge, StudioButton } from '@/components/studio/ui/primitives';

interface PageItem {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  isPublished: boolean;
}

interface PageSelectorProps {
  websiteId: string;
  currentPageId: string | null; // null = homepage
  onPageChange: (pageId: string | null) => void;
  token: string | null;
  isDirty?: boolean;
}

export function PageSelector({
  websiteId,
  currentPageId,
  onPageChange,
  token,
  isDirty = false,
}: PageSelectorProps) {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadPages = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        }
      );

      const { data } = await supabase.rpc('get_website_pages', { p_website_id: websiteId });
      const result = data as { pages?: Array<Record<string, unknown>> } | null;
      const pageList = (result?.pages || []) as Array<Record<string, unknown>>;

      setPages(
        pageList.map((page) => ({
          id: page.id as string,
          title: page.title as string,
          slug: page.slug as string,
          pageType: (page.page_type || page.pageType || 'custom') as string,
          isPublished: (page.is_published ?? page.isPublished ?? true) as boolean,
        }))
      );
    } catch (err) {
      console.error('[PageSelector] Failed to load pages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [websiteId, token]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', onClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [isOpen]);

  const currentLabel = currentPageId
    ? pages.find((page) => page.id === currentPageId)?.title || 'Pagina'
    : 'Inicio';

  const handleSelect = (pageId: string | null) => {
    if (pageId === currentPageId) {
      setIsOpen(false);
      return;
    }

    if (isDirty) {
      const confirmed = window.confirm(
        'Tienes cambios sin guardar. ¿Deseas cambiar de pagina sin guardar?'
      );
      if (!confirmed) {
        setIsOpen(false);
        return;
      }
    }

    onPageChange(pageId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <StudioButton
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className="max-w-[220px]"
      >
        <span className="truncate">{currentLabel}</span>
        <span className="text-[10px] text-[var(--studio-text-muted)]">{isOpen ? '▲' : '▼'}</span>
      </StudioButton>

      {isOpen ? (
        <div className="studio-panel absolute right-0 top-[calc(100%+6px)] min-w-[260px] max-h-[360px] overflow-y-auto z-[99999] p-1">
          <button
            className={`w-full text-left p-2 rounded-lg transition-colors ${
              currentPageId === null
                ? 'bg-[color-mix(in_srgb,var(--studio-primary)_12%,transparent)]'
                : 'hover:bg-[var(--studio-panel)]'
            }`}
            onClick={() => handleSelect(null)}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--studio-text)]">Inicio</span>
              <StudioBadge tone="info">homepage</StudioBadge>
            </div>
          </button>

          <div className="border-t border-[var(--studio-border)] my-1" />

          {isLoading ? (
            <p className="text-xs text-[var(--studio-text-muted)] py-4 text-center">Cargando...</p>
          ) : pages.length === 0 ? (
            <p className="text-xs text-[var(--studio-text-muted)] py-4 text-center">Sin paginas</p>
          ) : (
            pages.map((page) => (
              <button
                key={page.id}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  currentPageId === page.id
                    ? 'bg-[color-mix(in_srgb,var(--studio-primary)_12%,transparent)]'
                    : 'hover:bg-[var(--studio-panel)]'
                }`}
                onClick={() => handleSelect(page.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--studio-text)] truncate">{page.title}</span>
                  <StudioBadge tone={page.isPublished ? 'success' : 'warning'}>
                    {page.pageType}
                  </StudioBadge>
                </div>
                <p className="text-xs text-[var(--studio-text-muted)] mt-1 truncate">/{page.slug}</p>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

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

      const { data } = await supabase.rpc('get_website_pages', {
        p_website_id: websiteId,
      });

      const result = data as { pages?: Array<Record<string, unknown>> } | null;
      const pageList = (result?.pages || []) as unknown as Array<Record<string, unknown>>;

      setPages(
        pageList.map((p) => ({
          id: p.id as string,
          title: p.title as string,
          slug: p.slug as string,
          pageType: (p.page_type || p.pageType) as string,
          isPublished: (p.is_published ?? p.isPublished ?? true) as boolean,
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

  const currentLabel = currentPageId
    ? pages.find((p) => p.id === currentPageId)?.title || 'Pagina'
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
    <div style={styles.container}>
      <button
        style={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span style={styles.label}>{currentLabel}</span>
        <span style={styles.chevron}>{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          {/* Homepage option */}
          <button
            style={{
              ...styles.option,
              ...(currentPageId === null ? styles.optionActive : {}),
            }}
            onClick={() => handleSelect(null)}
            type="button"
          >
            <span style={styles.optionTitle}>Inicio</span>
            <span style={styles.optionBadge}>homepage</span>
          </button>

          {/* Divider */}
          <div style={styles.divider} />

          {/* Pages */}
          {isLoading ? (
            <div style={styles.loading}>Cargando...</div>
          ) : pages.length === 0 ? (
            <div style={styles.loading}>Sin paginas</div>
          ) : (
            pages.map((page) => (
              <button
                key={page.id}
                style={{
                  ...styles.option,
                  ...(currentPageId === page.id ? styles.optionActive : {}),
                }}
                onClick={() => handleSelect(page.id)}
                type="button"
              >
                <span style={styles.optionTitle}>{page.title}</span>
                <span style={styles.optionBadge}>
                  {page.pageType}
                  {!page.isPublished && ' (borrador)'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    background: 'white',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
    color: '#4B5563',
  },
  label: {
    maxWidth: 150,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chevron: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    minWidth: 220,
    maxHeight: 320,
    overflowY: 'auto',
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 100,
  },
  option: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
    color: '#4B5563',
    textAlign: 'left',
  },
  optionActive: {
    background: '#f5f3ff',
    color: '#7c57b3',
    fontWeight: 500,
  },
  optionTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  optionBadge: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    background: '#F3F4F6',
    margin: '4px 0',
  },
  loading: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
};

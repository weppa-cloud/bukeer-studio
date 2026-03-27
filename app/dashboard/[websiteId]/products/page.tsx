'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useWebsite } from '@/lib/admin/website-context';
import { EmptyState } from '@/components/admin/empty-state';
import { getDashboardUserContext } from '@/lib/admin/user-context';
import { StudioPage, StudioSectionHeader, StudioInput, StudioTabs } from '@/components/studio/ui/primitives';

type ProductType = 'hotels' | 'activities' | 'transfers';

interface ProductRow {
  id: string;
  name: string;
  main_image?: string;
  location?: string;
}

export default function ProductsTab() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const { website, save } = useWebsite();
  const supabase = createSupabaseBrowserClient();

  const [activeType, setActiveType] = useState<ProductType>('hotels');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accessError, setAccessError] = useState<string | null>(null);

  const featured = website?.featured_products || { hotels: [], activities: [], transfers: [], destinations: [] };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setAccessError(null);
    try {
      const context = await getDashboardUserContext(supabase);
      if (context.status === 'unauthenticated') {
        setAccessError('Tu sesión expiró. Inicia sesión nuevamente.');
        setProducts([]);
        return;
      }
      if (context.status === 'missing_role') {
        setAccessError('No tienes un rol activo para ver productos.');
        setProducts([]);
        return;
      }

      let query = supabase
        .from(activeType)
        .select('id, name, main_image, location')
        .eq('account_id', context.accountId)
        .order('name')
        .limit(50);

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) {
        setAccessError('No se pudieron cargar los productos.');
        setProducts([]);
        return;
      }

      setProducts((data || []) as ProductRow[]);
    } finally {
      setLoading(false);
    }
  }, [activeType, search, supabase]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const isFeatured = (id: string) => {
    return (featured[activeType] as string[] || []).includes(id);
  };

  const toggleFeatured = async (id: string) => {
    const current = (featured[activeType] as string[]) || [];
    const updated = current.includes(id)
      ? current.filter((x: string) => x !== id)
      : [...current, id];

    await save({
      featured_products: { ...featured, [activeType]: updated },
    } as any);
  };

  const TYPES: { id: ProductType; label: string }[] = [
    { id: 'hotels', label: 'Hotels' },
    { id: 'activities', label: 'Activities' },
    { id: 'transfers', label: 'Transfers' },
  ];

  return (
    <StudioPage className="max-w-4xl">
      <StudioSectionHeader
        title="Featured Products"
        subtitle="Selecciona productos para destacar en la web publica."
      />

      <StudioTabs
        value={activeType}
        options={TYPES.map((t) => ({ id: t.id, label: t.label }))}
        onChange={(value) => {
          setActiveType(value as ProductType);
          setSearch('');
        }}
        className="mb-6"
      />

      {/* Search */}
      <div className="mb-4">
        <StudioInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          placeholder="Search products..."
        />
      </div>

      {/* Products list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[var(--studio-panel)] rounded-xl animate-pulse border border-[var(--studio-border)]" />
          ))}
        </div>
      ) : accessError ? (
        <EmptyState title="Access unavailable" description={accessError} />
      ) : products.length === 0 ? (
        <EmptyState title="No products found" description="Add products in your CRM to feature them here." />
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="studio-card flex items-center gap-4 p-3"
            >
              {product.main_image ? (
                <img src={product.main_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[var(--studio-panel)] border border-[var(--studio-border)]" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[var(--studio-text)] truncate">
                  {product.name}
                </div>
                {product.location && (
                  <div className="text-xs text-[var(--studio-text-muted)]">{product.location}</div>
                )}
              </div>
              <button
                onClick={() => toggleFeatured(product.id)}
                className={`p-2 rounded-lg transition-all ${
                  isFeatured(product.id)
                    ? 'text-[#f59e0b] hover:text-[#d97706]'
                    : 'text-[var(--studio-text-muted)] hover:text-[#f59e0b]'
                }`}
                title={isFeatured(product.id) ? 'Remove from featured' : 'Add to featured'}
              >
                <svg className="w-5 h-5" fill={isFeatured(product.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </StudioPage>
  );
}

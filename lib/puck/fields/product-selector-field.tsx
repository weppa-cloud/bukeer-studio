/**
 * Product Selector Field for Puck Editor
 *
 * Dropdown that loads products (hotels, activities, destinations)
 * from the account's catalog via Supabase.
 *
 * Used in Puck configs for sections like Hotels, Activities, Destinations
 * to let editors pick which products to feature.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

type ProductType = 'hotels' | 'activities' | 'destinations';

interface ProductOption {
  id: string;
  name: string;
  image?: string;
  city?: string;
}

interface ProductSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  productType: ProductType;
  /** Auth token for Supabase queries */
  token?: string;
  /** Max products selectable */
  max?: number;
}

// ============================================================================
// Product table mapping
// ============================================================================

const TABLE_MAP: Record<
  ProductType,
  { table: string; nameField: string; imageField: string; cityField?: string }
> = {
  hotels: {
    table: 'hotels',
    nameField: 'name',
    imageField: 'image',
    cityField: 'city',
  },
  activities: {
    table: 'activities',
    nameField: 'name',
    imageField: 'image',
    cityField: 'city',
  },
  destinations: {
    table: 'destinations',
    nameField: 'name',
    imageField: 'image',
  },
};

// ============================================================================
// Component
// ============================================================================

export function ProductSelectorField({
  value = [],
  onChange,
  productType,
  token,
  max = 12,
}: ProductSelectorProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadProducts = useCallback(async () => {
    const config = TABLE_MAP[productType];
    if (!config) return;

    setIsLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        token
          ? {
              global: {
                headers: { Authorization: `Bearer ${token}` },
              },
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
              },
            }
          : undefined
      );

      const selectFields = [
        'id',
        config.nameField,
        config.imageField,
        config.cityField,
      ]
        .filter(Boolean)
        .join(',');

      const { data, error } = await supabase
        .from(config.table)
        .select(selectFields)
        .order(config.nameField, { ascending: true })
        .limit(50);

      if (error) throw error;

      const items = (data || []) as unknown as Array<Record<string, unknown>>;
      setProducts(
        items.map((item) => ({
          id: item.id as string,
          name: item[config.nameField] as string,
          image: item[config.imageField] as string | undefined,
          city: config.cityField
            ? (item[config.cityField] as string | undefined)
            : undefined,
        }))
      );
    } catch (err) {
      console.error('[ProductSelector] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [productType, token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleProduct = useCallback(
    (productId: string) => {
      if (value.includes(productId)) {
        onChange(value.filter((id) => id !== productId));
      } else if (value.length < max) {
        onChange([...value, productId]);
      }
    },
    [value, onChange, max]
  );

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.city?.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.count}>
          {value.length}/{max} seleccionados
        </span>
      </div>

      <input
        type="text"
        placeholder={`Buscar ${productType}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={styles.search}
      />

      <div style={styles.list}>
        {isLoading ? (
          <p style={styles.loading}>Cargando...</p>
        ) : filtered.length === 0 ? (
          <p style={styles.loading}>Sin resultados</p>
        ) : (
          filtered.map((product) => {
            const isSelected = value.includes(product.id);
            return (
              <div
                key={product.id}
                style={{
                  ...styles.item,
                  ...(isSelected ? styles.itemSelected : {}),
                }}
                onClick={() => toggleProduct(product.id)}
              >
                {product.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image}
                    alt={product.name}
                    style={styles.itemImage}
                  />
                )}
                <div style={styles.itemInfo}>
                  <span style={styles.itemName}>{product.name}</span>
                  {product.city && (
                    <span style={styles.itemCity}>{product.city}</span>
                  )}
                </div>
                <span style={styles.checkbox}>
                  {isSelected ? '\u2611' : '\u2610'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Inline styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    fontSize: 12,
    color: '#6b7280',
  },
  search: {
    padding: '6px 10px',
    fontSize: 13,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    outline: 'none',
  },
  list: {
    maxHeight: 240,
    overflowY: 'auto' as const,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
  },
  loading: {
    padding: 16,
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#9ca3af',
    margin: 0,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background 100ms',
  },
  itemSelected: {
    background: '#f5f3ff',
  },
  itemImage: {
    width: 36,
    height: 36,
    borderRadius: 4,
    objectFit: 'cover' as const,
  },
  itemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#111827',
  },
  itemCity: {
    fontSize: 11,
    color: '#9ca3af',
  },
  checkbox: {
    fontSize: 16,
    color: '#6d28d9',
  },
};

// ============================================================================
// Puck Custom Field Factory
// ============================================================================

/**
 * Creates a Puck custom field for selecting products.
 */
export function createProductSelectorField(
  label: string,
  productType: ProductType,
  max = 12
) {
  return {
    type: 'custom' as const,
    label,
    render: ({
      value,
      onChange,
    }: {
      value: string[];
      onChange: (val: string[]) => void;
    }) => (
      <ProductSelectorField
        value={value || []}
        onChange={onChange}
        productType={productType}
        max={max}
      />
    ),
  };
}

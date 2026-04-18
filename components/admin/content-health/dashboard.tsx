'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ContentHealthList, ContentHealthListItem } from '@bukeer/website-contract';
import { ContentHealthScore } from './score';

export interface ContentHealthDashboardProps {
  websiteId: string;
  initial: ContentHealthList;
  productBasePath: string;
}

type Filter = 'all' | 'low' | 'high';

export function ContentHealthDashboard({ websiteId, initial, productBasePath }: ContentHealthDashboardProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<'score_asc' | 'score_desc' | 'name' | 'ghosts'>('score_asc');

  const filtered = useMemo(() => {
    let items = [...initial.items];
    if (filter === 'low') items = items.filter((i) => i.score < 60);
    if (filter === 'high') items = items.filter((i) => i.score >= 80);

    switch (sortBy) {
      case 'score_asc':
        items.sort((a, b) => a.score - b.score);
        break;
      case 'score_desc':
        items.sort((a, b) => b.score - a.score);
        break;
      case 'name':
        items.sort((a, b) => a.product_name.localeCompare(b.product_name));
        break;
      case 'ghosts':
        items.sort((a, b) => b.ghosts_count - a.ghosts_count);
        break;
    }
    return items;
  }, [initial.items, filter, sortBy]);

  if (initial.items.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-border bg-card p-8 text-center"
        role="region"
        aria-label="Sin productos"
      >
        <p className="text-sm text-muted-foreground">
          Este website aún no tiene productos. Crea el primero desde el catálogo.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Salud del contenido por producto" data-website-id={websiteId}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Salud del contenido</h1>
          <p className="text-sm text-muted-foreground">
            {initial.total} producto{initial.total === 1 ? '' : 's'} · mostrando {filtered.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground">
            Filtrar:
            <select
              className="ml-1 h-8 rounded border border-input bg-background px-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              aria-label="Filtrar por score"
            >
              <option value="all">Todos</option>
              <option value="low">Score &lt; 60</option>
              <option value="high">Score ≥ 80</option>
            </select>
          </label>

          <label className="text-xs text-muted-foreground">
            Ordenar:
            <select
              className="ml-1 h-8 rounded border border-input bg-background px-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Ordenar"
            >
              <option value="score_asc">Score ↑</option>
              <option value="score_desc">Score ↓</option>
              <option value="name">Nombre A-Z</option>
              <option value="ghosts">Vacías ↓</option>
            </select>
          </label>
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm" role="table">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 text-left">Producto</th>
              <th scope="col" className="px-4 py-2 text-left">Tipo</th>
              <th scope="col" className="px-4 py-2 text-center">Score</th>
              <th scope="col" className="px-4 py-2 text-center">Vacías</th>
              <th scope="col" className="px-4 py-2 text-center">IA 🔓</th>
              <th scope="col" className="px-4 py-2 text-center">Defaults</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((item) => (
              <DashboardRow key={item.product_id} item={item} productBasePath={productBasePath} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DashboardRow({ item, productBasePath }: { item: ContentHealthListItem; productBasePath: string }) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-2">
        <Link
          href={`${productBasePath}/${item.product_slug}/content`}
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {item.product_name}
        </Link>
      </td>
      <td className="px-4 py-2 text-xs text-muted-foreground">{item.product_type}</td>
      <td className="px-4 py-2 text-center">
        <ContentHealthScore score={item.score} variant="inline" ghostsCount={item.ghosts_count} />
      </td>
      <td className="px-4 py-2 text-center">{item.ghosts_count}</td>
      <td className="px-4 py-2 text-center">{item.ai_unlocked_count}</td>
      <td className="px-4 py-2 text-center">{item.fallbacks_count}</td>
    </tr>
  );
}

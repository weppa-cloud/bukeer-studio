'use client';

import { useState, useMemo } from 'react';
import type { ScoredItem } from '@/app/dashboard/[websiteId]/seo/page';

type SeoGrade = 'A' | 'B' | 'C' | 'D' | 'F';

interface SeoOverviewTableProps {
  items: ScoredItem[];
}

const GRADE_COLORS: Record<SeoGrade, string> = {
  A: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  C: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  D: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  F: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const ITEMS_PER_PAGE = 20;

type SortField = 'score' | 'name';
type SortDir = 'asc' | 'desc';

export function SeoOverviewTable({ items }: SeoOverviewTableProps) {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<SeoGrade | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = items;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }

    if (gradeFilter !== 'all') {
      result = result.filter((item) => item.result.grade === gradeFilter);
    }

    result = [...result].sort((a, b) => {
      if (sortField === 'score') {
        return sortDir === 'asc' ? a.result.overall - b.result.overall : b.result.overall - a.result.overall;
      }
      const cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [items, search, gradeFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="studio-input flex-1 px-3 py-2 text-sm rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg)] text-[var(--studio-text)] placeholder:text-[var(--studio-text-muted)]"
        />
        <select
          value={gradeFilter}
          onChange={(e) => { setGradeFilter(e.target.value as SeoGrade | 'all'); setPage(0); }}
          className="studio-input px-3 py-2 text-sm rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg)] text-[var(--studio-text)]"
        >
          <option value="all">Todos los grados</option>
          <option value="A">Grado A</option>
          <option value="B">Grado B</option>
          <option value="C">Grado C</option>
          <option value="D">Grado D</option>
          <option value="F">Grado F</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--studio-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--studio-border)] bg-[var(--studio-bg-elevated)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--studio-text-muted)] w-10"></th>
              <th className="px-3 py-2 text-left font-medium text-[var(--studio-text-muted)] cursor-pointer select-none" onClick={() => toggleSort('name')}>
                Nombre {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--studio-text-muted)]">Tipo</th>
              <th className="px-3 py-2 text-center font-medium text-[var(--studio-text-muted)] cursor-pointer select-none" onClick={() => toggleSort('score')}>
                Score {sortField === 'score' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2 text-left font-medium text-[var(--studio-text-muted)]">Issues</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[var(--studio-text-muted)]">
                  No se encontraron items.
                </td>
              </tr>
            ) : (
              paginated.map((item) => (
                <tr key={item.id} className="border-b border-[var(--studio-border)] hover:bg-[var(--studio-bg-elevated)] transition-colors">
                  <td className="px-3 py-2">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-[var(--studio-border)] flex items-center justify-center">
                        <svg className="w-4 h-4 text-[var(--studio-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-[var(--studio-text)] truncate block max-w-[200px]">{item.name}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-[var(--studio-text-muted)] capitalize">{item.type}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${GRADE_COLORS[item.result.grade]}`}>
                      {item.result.grade} <span className="font-normal">({item.result.overall})</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {item.issues.map((issue) => (
                        <span key={issue} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                          {issue}
                        </span>
                      ))}
                      {item.issues.length === 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400">OK</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-[var(--studio-text-muted)]">&rarr;</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--studio-text-muted)]">{filtered.length} items totales</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-2 py-1 text-xs rounded border border-[var(--studio-border)] text-[var(--studio-text)] disabled:opacity-40">Anterior</button>
            <span className="text-xs text-[var(--studio-text-muted)] px-2">{page + 1} / {totalPages}</span>
            <button type="button" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 text-xs rounded border border-[var(--studio-border)] text-[var(--studio-text)] disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}

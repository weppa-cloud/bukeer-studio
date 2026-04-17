'use client';

import { useState, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import type { ScoredItem } from '@/lib/seo/scored-item';
import type { SeoItemType } from '@/lib/seo/unified-scorer';

// ============================================================================
// Types
// ============================================================================

type ModalState = 'config' | 'processing' | 'review' | 'applied';
type FilterType = 'missing_title' | 'missing_description' | 'low_score';

interface GeneratedItem {
  id: string;
  type: SeoItemType;
  name: string;
  before: { seoTitle?: string; seoDescription?: string; score: number };
  after: { seoTitle: string; seoDescription: string; targetKeyword: string; reasoning?: string; score: number };
  accepted: boolean;
}

interface BulkSeoModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  items: ScoredItem[];
  onApplied: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/** Products (hotel/activity/transfer/package) save SEO to website_product_pages via upsert. */
const PRODUCT_TYPES: SeoItemType[] = ['hotel', 'activity', 'transfer', 'package'];

function getTableForType(type: SeoItemType): string {
  switch (type) {
    case 'hotel': return 'hotels';
    case 'activity': return 'activities';
    case 'transfer': return 'transfers';
    case 'package': return 'package_kits';
    case 'destination': return 'destinations';
    case 'page': return 'website_pages';
    case 'blog': return 'website_blog_posts';
    default: return 'hotels';
  }
}

// ============================================================================
// Component
// ============================================================================

export function BulkSeoModal({ isOpen, onClose, websiteId, items, onApplied }: BulkSeoModalProps) {
  const [state, setState] = useState<ModalState>('config');
  const [filter, setFilter] = useState<FilterType>('missing_title');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [generated, setGenerated] = useState<GeneratedItem[]>([]);
  const [summary, setSummary] = useState<{ processed: number; avgScoreBefore: number; avgScoreAfter: number; totalCost: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Item counts per filter
  const counts = {
    missing_title: items.filter((i) => !i.input.seoTitle).length,
    missing_description: items.filter((i) => !i.input.seoDescription).length,
    low_score: items.filter((i) => i.result.overall < 60).length,
  };

  const selectedCount = counts[filter];
  const estimatedCost = (selectedCount * 0.003).toFixed(3);

  const handleStart = useCallback(async () => {
    setState('processing');
    setGenerated([]);
    setProgress({ current: 0, total: selectedCount });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/ai/seo/generate-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ websiteId, filter, scoreThreshold: 60 }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setState('config');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'progress') {
              setProgress({ current: event.current, total: event.total });
            } else if (event.type === 'item_complete') {
              setProgress({ current: event.current, total: event.total });
              setGenerated((prev) => [
                ...prev,
                {
                  id: event.item.id,
                  type: event.item.type,
                  name: event.item.name,
                  before: event.item.before,
                  after: event.item.after,
                  accepted: true,
                },
              ]);
            } else if (event.type === 'done') {
              setSummary(event.summary);
              setState('review');
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setState('config');
    }
  }, [websiteId, filter, selectedCount]);

  const handleApply = useCallback(async () => {
    const accepted = generated.filter((g) => g.accepted);
    if (accepted.length === 0) return;

    setApplying(true);
    const supabase = createSupabaseBrowserClient();

    for (const item of accepted) {
      if (PRODUCT_TYPES.includes(item.type)) {
        // Products: upsert SEO to website_product_pages with legacy ID
        await supabase
          .from('website_product_pages')
          .upsert({
            website_id: websiteId,
            product_id: item.id,
            product_type: item.type,
            custom_seo_title: item.after.seoTitle,
            custom_seo_description: item.after.seoDescription,
            target_keyword: item.after.targetKeyword,
          }, { onConflict: 'website_id,product_id' });
      } else {
        // Pages, blogs, destinations: update source table directly
        const table = getTableForType(item.type);
        const updateData: Record<string, unknown> = {
          seo_title: item.after.seoTitle,
          seo_description: item.after.seoDescription,
        };
        if (item.type === 'blog') {
          updateData.seo_keywords = item.after.targetKeyword ? [item.after.targetKeyword] : [];
        } else {
          updateData.target_keyword = item.after.targetKeyword;
        }
        await supabase.from(table).update(updateData).eq('id', item.id);
      }
    }

    setApplying(false);
    setState('applied');
    onApplied();
  }, [generated, onApplied, websiteId]);

  const handleClose = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState('config');
    setGenerated([]);
    setSummary(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {state === 'config' && 'Optimizar con IA'}
            {state === 'processing' && 'Generando sugerencias...'}
            {state === 'review' && 'Revisar sugerencias'}
            {state === 'applied' && 'Aplicado'}
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* CONFIG STATE */}
          {state === 'config' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Selecciona que items quieres optimizar con IA. Se generaran titulo SEO, meta description y keyword para cada uno.
              </p>

              <div className="space-y-2">
                {([
                  { value: 'missing_title' as FilterType, label: 'Sin titulo SEO', count: counts.missing_title },
                  { value: 'missing_description' as FilterType, label: 'Sin meta description', count: counts.missing_description },
                  { value: 'low_score' as FilterType, label: 'Score menor a C (< 60)', count: counts.low_score },
                ]).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      filter === opt.value
                        ? 'border-violet-300 bg-violet-50 dark:border-violet-600 dark:bg-violet-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="filter"
                      checked={filter === opt.value}
                      onChange={() => setFilter(opt.value)}
                      className="text-violet-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{opt.label}</span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      {opt.count} items
                    </span>
                  </label>
                ))}
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Items a procesar:</span>
                  <span className="font-medium">{selectedCount}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Costo estimado:</span>
                  <span className="font-medium">${estimatedCost} USD</span>
                </div>
              </div>
            </div>
          )}

          {/* PROCESSING STATE */}
          {state === 'processing' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Procesando {progress.current} de {progress.total} items...
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mt-3">
                  <div
                    className="bg-violet-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}% completado
                </p>
              </div>

              {/* Live results */}
              {generated.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {generated.slice(-5).map((g) => (
                    <div key={g.id} className="text-xs bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-slate-500 ml-2">
                        {g.before.score} → {g.after.score}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVIEW STATE */}
          {state === 'review' && (
            <div className="space-y-3">
              {summary && (
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-sm">
                  <p className="font-medium text-violet-700 dark:text-violet-300">
                    {summary.processed} items procesados — Score promedio: {summary.avgScoreBefore} → {summary.avgScoreAfter}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Costo: ${summary.totalCost.toFixed(3)} USD</p>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {generated.map((g, i) => (
                  <div
                    key={g.id}
                    className={`rounded-lg border p-3 text-sm transition-colors ${
                      g.accepted
                        ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                        : 'border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={g.accepted}
                          onChange={() => {
                            setGenerated((prev) =>
                              prev.map((item, j) =>
                                j === i ? { ...item, accepted: !item.accepted } : item
                              )
                            );
                          }}
                          className="text-emerald-600 rounded"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">
                          {g.name}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">{g.type}</span>
                      </div>
                      <span className="text-xs font-medium">
                        <span className="text-slate-400">{g.before.score}</span>
                        <span className="text-slate-300 mx-1">→</span>
                        <span className="text-emerald-600">{g.after.score}</span>
                      </span>
                    </div>
                    {g.accepted && (
                      <div className="pl-6 space-y-1">
                        <p className="text-xs">
                          <span className="text-slate-500">Titulo:</span>{' '}
                          <span className="text-emerald-700 dark:text-emerald-400">{g.after.seoTitle}</span>
                        </p>
                        <p className="text-xs">
                          <span className="text-slate-500">Desc:</span>{' '}
                          <span className="text-emerald-700 dark:text-emerald-400 line-clamp-2">{g.after.seoDescription}</span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* APPLIED STATE */}
          {state === 'applied' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Cambios aplicados</p>
              <p className="text-sm text-slate-500 mt-1">
                {generated.filter((g) => g.accepted).length} items actualizados exitosamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
          {state === 'config' && (
            <>
              <button onClick={handleClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={handleStart}
                disabled={selectedCount === 0}
                className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                Iniciar ({selectedCount} items)
              </button>
            </>
          )}

          {state === 'processing' && (
            <button onClick={handleClose} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
              Cancelar
            </button>
          )}

          {state === 'review' && (
            <>
              <button onClick={handleClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                Descartar
              </button>
              <button
                onClick={handleApply}
                disabled={applying || generated.filter((g) => g.accepted).length === 0}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {applying ? 'Aplicando...' : `Aplicar ${generated.filter((g) => g.accepted).length} seleccionados`}
              </button>
            </>
          )}

          {state === 'applied' && (
            <button onClick={handleClose} className="px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

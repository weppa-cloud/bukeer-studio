'use client';

import { useState } from 'react';
import type { KeywordResearchDTO } from '@/lib/seo/dto';
import {
  StudioButton,
  StudioInput,
  StudioBadge,
  StudioSelect,
} from '@/components/studio/ui/primitives';

interface SeoKeywordResearchProps {
  websiteId: string;
}

type ContentType = 'hotel' | 'actividad' | 'paquete' | 'destino' | 'blog';

const CONTENT_TYPE_OPTIONS: Array<{ value: ContentType; label: string }> = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'actividad', label: 'Actividad' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'destino', label: 'Destino' },
  { value: 'blog', label: 'Blog' },
];

function deriveIntentBadge(contentBrief: string[]): string {
  const text = contentBrief.join(' ').toLowerCase();
  if (text.includes('compra') || text.includes('reserva') || text.includes('precio') || text.includes('oferta')) {
    return 'BOFU';
  }
  if (text.includes('comparar') || text.includes('mejor') || text.includes('vs ') || text.includes('recomienda')) {
    return 'MOFU';
  }
  return 'TOFU';
}

function intentBadgeTone(intent: string): 'info' | 'warning' | 'success' {
  if (intent === 'BOFU') return 'success';
  if (intent === 'MOFU') return 'warning';
  return 'info';
}

interface ToastState {
  message: string;
  visible: boolean;
}

export function SeoKeywordResearch({ websiteId }: SeoKeywordResearchProps) {
  const [contentType, setContentType] = useState<ContentType>('destino');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [seeds, setSeeds] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<KeywordResearchDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  function showToast(message: string) {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  }

  async function handleGenerate() {
    const seedList = seeds
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (seedList.length === 0) {
      setError('Ingresa al menos una keyword semilla.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setBriefOpen(false);

    try {
      const response = await fetch('/api/seo/keywords/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          keyword: seedList[0],
          itemType: contentType,
          itemName: seedList[0],
          itemDescription: seedList.slice(1).join(', ') || undefined,
          itemContext:
            country || language
              ? { country: country || undefined, language: language || undefined }
              : undefined,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'Error generando keywords');
      }

      setResult(body as KeywordResearchDTO);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsGenerating(false);
    }
  }

  const allKeywords: string[] = result
    ? [result.recommendation.primaryKeyword, ...result.recommendation.secondaryKeywords]
    : [];

  const intent = result ? deriveIntentBadge(result.recommendation.contentBrief) : 'TOFU';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-4 right-4 z-50 studio-panel border border-[var(--studio-success)]/40 text-[var(--studio-success)] px-4 py-2 text-sm shadow-lg">
          {toast.message}
        </div>
      )}

      {/* Keyword Universe Builder */}
      <div className="studio-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">Keyword Universe Builder</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Tipo de contenido</label>
            <StudioSelect
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              options={CONTENT_TYPE_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Pais</label>
            <StudioInput
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Colombia"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Idioma</label>
            <StudioInput
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="es"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Keywords semilla</label>
          <textarea
            value={seeds}
            onChange={(e) => setSeeds(e.target.value)}
            placeholder="tours Colombia, viajes aventura..."
            rows={3}
            className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-surface)] text-[var(--studio-text)] text-sm px-3 py-2 placeholder:text-[var(--studio-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--studio-primary)] resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-[var(--studio-danger)]">{error}</p>
        )}

        <StudioButton onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generando...' : 'Generar keywords'}
        </StudioButton>

        {result?.message && (
          <p className="text-xs text-[var(--studio-text-muted)] italic">{result.message}</p>
        )}
      </div>

      {/* Results Table */}
      {result && (
        <div className="studio-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">
              Keywords generadas
              <span className="ml-2 text-xs text-[var(--studio-text-muted)] font-normal">
                modo: {result.mode}
              </span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--studio-border)]">
                  <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium text-xs">Keyword</th>
                  <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium text-xs">Tipo</th>
                  <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium text-xs">Dificultad</th>
                  <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium text-xs">Busquedas/mes</th>
                  <th className="py-2 text-[var(--studio-text-muted)] font-medium text-xs">Accion</th>
                </tr>
              </thead>
              <tbody>
                {allKeywords.map((kw, index) => {
                  const isPrimary = index === 0;
                  const searchVolume =
                    isPrimary && result.searchConsoleData
                      ? result.searchConsoleData.impressions
                      : null;

                  return (
                    <tr key={kw} className="border-b border-[var(--studio-border)]/50">
                      <td className="py-2 pr-4">
                        <span className="text-[var(--studio-text)]">{kw}</span>
                        {isPrimary && (
                          <span className="ml-1 text-[10px] text-[var(--studio-text-muted)]">(principal)</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <StudioBadge tone={intentBadgeTone(intent)}>
                          {intent}
                        </StudioBadge>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          title="Requiere DataForSEO bulk_keyword_difficulty"
                          className="inline-flex items-center cursor-help"
                        >
                          <StudioBadge tone="neutral">N/A</StudioBadge>
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-[var(--studio-text)]">
                        {searchVolume != null ? searchVolume.toLocaleString() : '—'}
                      </td>
                      <td className="py-2">
                        <StudioButton
                          size="sm"
                          variant="outline"
                          onClick={() => showToast(`Keyword "${kw}" anadida al universo`)}
                        >
                          Anadir
                        </StudioButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Related queries (GSC data) */}
          {result.relatedQueries.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--studio-text-muted)] mb-2 uppercase tracking-wide">
                Queries relacionadas (Search Console)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-[var(--studio-border)]">
                      <th className="py-1 pr-3 text-[var(--studio-text-muted)]">Query</th>
                      <th className="py-1 pr-3 text-[var(--studio-text-muted)]">Impresiones</th>
                      <th className="py-1 pr-3 text-[var(--studio-text-muted)]">Clics</th>
                      <th className="py-1 pr-3 text-[var(--studio-text-muted)]">CTR</th>
                      <th className="py-1 text-[var(--studio-text-muted)]">Posicion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.relatedQueries.map((rq) => (
                      <tr key={rq.query} className="border-b border-[var(--studio-border)]/30">
                        <td className="py-1 pr-3 text-[var(--studio-text)]">{rq.query}</td>
                        <td className="py-1 pr-3 text-[var(--studio-text)]">{rq.impressions.toLocaleString()}</td>
                        <td className="py-1 pr-3 text-[var(--studio-text)]">{rq.clicks.toLocaleString()}</td>
                        <td className="py-1 pr-3 text-[var(--studio-text)]">{(rq.ctr * 100).toFixed(1)}%</td>
                        <td className="py-1 text-[var(--studio-text)]">{rq.position.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Content Brief (collapsible) */}
          {result.recommendation.contentBrief.length > 0 && (
            <div className="border border-[var(--studio-border)] rounded">
              <button
                type="button"
                onClick={() => setBriefOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-[var(--studio-text)] hover:bg-[var(--studio-surface-hover)] transition-colors"
              >
                <span>Brief de contenido</span>
                <span className="text-[var(--studio-text-muted)] text-xs">{briefOpen ? '▲' : '▼'}</span>
              </button>
              {briefOpen && (
                <div className="px-4 pb-4 pt-1">
                  <ul className="list-disc list-inside space-y-1">
                    {result.recommendation.contentBrief.map((item, i) => (
                      <li key={i} className="text-sm text-[var(--studio-text)]">
                        {item}
                      </li>
                    ))}
                  </ul>
                  {result.recommendation.reasoning && (
                    <p className="mt-3 text-xs text-[var(--studio-text-muted)] italic">
                      Razonamiento: {result.recommendation.reasoning}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

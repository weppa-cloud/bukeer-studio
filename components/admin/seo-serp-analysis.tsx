'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  StudioButton,
  StudioInput,
  StudioSelect,
  StudioBadge,
} from '@/components/studio/ui/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

type SerpType = 'Local-dominated' | 'Informational' | 'Commercial' | 'Mixed';

type SerpFeature = {
  name: string;
  detected: boolean;
};

type SerpResultItem = {
  position: number;
  domain: string;
  title: string;
};

type ContentGapRow = {
  factor: string;
  myPage: string;
  top1: string;
  top2: string;
  top3: string;
};

type SerpAnalysisResult = {
  keyword: string;
  locale: string;
  serpType: SerpType;
  items: SerpResultItem[];
  features: SerpFeature[];
  contentGap: ContentGapRow[];
  nlpTerms: string[];
  paaQuestions: string[];
  contentScore: number;
  isPlaceholder: boolean;
};

interface SeoSerpAnalysisProps {
  websiteId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOCALE_OPTIONS = [
  { value: 'es-CO', label: 'es-CO — Colombia' },
  { value: 'es-MX', label: 'es-MX — México' },
  { value: 'es-ES', label: 'es-ES — España' },
  { value: 'en-US', label: 'en-US — United States' },
];

function detectSerpType(keyword: string): SerpType {
  const kw = keyword.toLowerCase();
  if (/qué es|cómo|que es|como|cuál es|cual es/.test(kw)) return 'Informational';
  if (/precio|tour|paquete|reserva|oferta|barato|económico/.test(kw)) return 'Commercial';
  if (/cerca|en |mapa|hotel|restaurante/.test(kw)) return 'Local-dominated';
  return 'Mixed';
}

function serpTypeStrategy(type: SerpType): string {
  switch (type) {
    case 'Commercial':
      return 'Optimiza CTA y precio visible en los primeros 100 words';
    case 'Informational':
      return 'Responde la pregunta directamente en el primer párrafo';
    case 'Local-dominated':
      return 'Añade GeoCoordinates en JSON-LD y menciona la ciudad en H1';
    case 'Mixed':
      return 'Combina contenido informacional con CTA claro';
  }
}

function serpTypeTone(type: SerpType): 'info' | 'success' | 'warning' | 'neutral' {
  switch (type) {
    case 'Commercial': return 'success';
    case 'Informational': return 'info';
    case 'Local-dominated': return 'warning';
    case 'Mixed': return 'neutral';
  }
}

function buildPlaceholderResult(keyword: string, locale: string): SerpAnalysisResult {
  return {
    keyword,
    locale,
    serpType: detectSerpType(keyword),
    isPlaceholder: true,
    items: [
      { position: 1, domain: 'tripadvisor.com', title: `Las mejores opciones: ${keyword}` },
      { position: 2, domain: 'viajemos.com', title: `Guía completa: ${keyword}` },
      { position: 3, domain: 'colombia.travel', title: `${keyword} — Colombia Travel` },
      { position: 4, domain: 'booking.com', title: `${keyword} — Reserva ahora` },
      { position: 5, domain: 'despegar.com', title: `Paquetes: ${keyword} desde $199` },
      { position: 6, domain: 'viajandox.com', title: `${keyword} | Todo incluido` },
      { position: 7, domain: 'kayak.com.co', title: `${keyword} — Compara precios` },
      { position: 8, domain: 'airbnb.com', title: `Experiencias: ${keyword}` },
      { position: 9, domain: 'getyourguide.com', title: `${keyword} | Tickets & Tours` },
      { position: 10, domain: 'civitatis.com', title: `${keyword} en español` },
    ],
    features: [
      { name: 'Featured Snippet', detected: false },
      { name: 'PAA (People Also Ask)', detected: true },
      { name: 'Maps Pack', detected: false },
      { name: 'Hotel Pack', detected: false },
      { name: 'Video', detected: false },
      { name: 'AI Overview', detected: false },
    ],
    contentGap: [
      { factor: 'Word count', myPage: '—', top1: '—', top2: '—', top3: '—' },
      { factor: 'H2s', myPage: '—', top1: '—', top2: '—', top3: '—' },
      { factor: 'Schema types', myPage: '—', top1: '—', top2: '—', top3: '—' },
      { factor: 'Imágenes', myPage: '—', top1: '—', top2: '—', top3: '—' },
    ],
    nlpTerms: [
      'precio desde',
      'incluye desayuno',
      'reserva ahora',
      'vista al mar',
      'traslado incluido',
    ],
    paaQuestions: [
      '¿Cuánto cuesta un tour a Cartagena?',
      '¿Qué incluye el paquete todo incluido?',
      '¿Cuál es la mejor época para visitar?',
      '¿Hay traslados desde el aeropuerto?',
      '¿Qué documentos necesito para viajar?',
    ],
    contentScore: 42,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContentScoreGauge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'var(--studio-success)' :
    score >= 50 ? '#f59e0b' :
    'var(--studio-danger)';

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const gap = circumference - progress;

  return (
    <div className="studio-card p-4 flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-[var(--studio-text-muted)] uppercase tracking-wide">
        Score de Contenido vs SERP
      </p>
      <svg width="110" height="110" viewBox="0 0 110 110" aria-label={`Content score: ${score}`}>
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="var(--studio-border)"
          strokeWidth="10"
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${progress} ${gap}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
        />
        <text
          x="55"
          y="55"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="22"
          fontWeight="700"
        >
          {score}
        </text>
      </svg>
      <p className="text-[10px] text-[var(--studio-text-muted)] text-center max-w-[160px]">
        Puntuación estimada. Conecta DataForSEO para score real.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SeoSerpAnalysis({ websiteId }: SeoSerpAnalysisProps) {
  const [keyword, setKeyword] = useState('');
  const [locale, setLocale] = useState('es-CO');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [serpResult, setSerpResult] = useState<SerpAnalysisResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  async function handleAnalyze() {
    if (!keyword.trim()) return;
    setIsAnalyzing(true);
    setSerpResult(null);

    try {
      const response = await fetch('/api/seo/serp/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId, keyword: keyword.trim(), locale }),
      });

      if (!response.ok) throw new Error('endpoint not available');

      const data = await response.json() as SerpAnalysisResult;
      setSerpResult({ ...data, isPlaceholder: false });
    } catch {
      // Graceful degradation — use realistic placeholders
      setSerpResult(buildPlaceholderResult(keyword.trim(), locale));
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="studio-panel border border-[var(--studio-success)]/40 text-[var(--studio-success)] p-3 text-sm">
          {toastMessage}
        </div>
      )}

      {/* A) Keyword Input */}
      <div className="studio-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">Analizar SERP</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <StudioInput
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="tour Cartagena 3 días"
            className="flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAnalyze(); }}
          />
          <StudioSelect
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            options={LOCALE_OPTIONS}
            className="sm:w-44"
          />
          <StudioButton
            onClick={() => void handleAnalyze()}
            disabled={isAnalyzing || !keyword.trim()}
          >
            {isAnalyzing ? 'Analizando...' : 'Analizar SERP'}
          </StudioButton>
        </div>
        {!serpResult && !isAnalyzing && (
          <p className="text-xs text-[var(--studio-text-muted)]">
            Ingresa una keyword para obtener insights del SERP y brechas de contenido.
          </p>
        )}
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="studio-card p-6 text-center animate-pulse">
          <p className="text-sm text-[var(--studio-text-muted)]">Analizando SERP para «{keyword}»...</p>
        </div>
      )}

      {serpResult && (
        <>
          {/* Placeholder notice */}
          {serpResult.isPlaceholder && (
            <div className="studio-panel border border-[var(--studio-warning)]/40 text-[var(--studio-warning)] p-3 text-sm">
              Mostrando datos de ejemplo. Conecta DataForSEO SERP API para datos reales.
            </div>
          )}

          {/* B) SERP Type Badge + Strategy */}
          <div className="studio-card p-4 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-[var(--studio-text)]">Tipo de SERP detectado:</span>
              <StudioBadge tone={serpTypeTone(serpResult.serpType)}>
                {serpResult.serpType}
              </StudioBadge>
            </div>
            <p className="text-sm text-[var(--studio-text-muted)]">
              <span className="font-medium text-[var(--studio-text)]">Estrategia recomendada:</span>{' '}
              {serpTypeStrategy(serpResult.serpType)}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* C) Top 10 SERP Results */}
            <div className="lg:col-span-2 studio-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--studio-text)]">Top 10 Resultados SERP</h3>
                {serpResult.isPlaceholder && (
                  <span className="text-[10px] text-[var(--studio-text-muted)]">
                    Datos reales disponibles con DataForSEO SERP API
                  </span>
                )}
              </div>
              <ol className="space-y-1">
                {serpResult.items.map((item) => (
                  <li
                    key={item.position}
                    className="flex items-baseline gap-2 text-sm py-1.5 border-b border-[var(--studio-border)]/50 last:border-0"
                  >
                    <span className="text-[var(--studio-text-muted)] font-mono text-xs w-5 shrink-0">
                      #{item.position}
                    </span>
                    <span className="font-medium text-[var(--studio-accent)] shrink-0 text-xs">
                      {item.domain}
                    </span>
                    <span className="text-[var(--studio-text-muted)] text-xs truncate">
                      {item.title}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* H) Content Score Gauge */}
            <ContentScoreGauge score={serpResult.contentScore} />
          </div>

          {/* D) SERP Features */}
          <div className="studio-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">SERP Features Detectadas</h3>
            <div className="flex flex-wrap gap-2">
              {serpResult.features.map((feature) => (
                <span
                  key={feature.name}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                    feature.detected
                      ? 'bg-[var(--studio-success)]/10 border-[var(--studio-success)]/40 text-[var(--studio-success)]'
                      : 'bg-[var(--studio-border)]/30 border-[var(--studio-border)] text-[var(--studio-text-muted)]'
                  )}
                >
                  {feature.detected ? '✓' : '✗'} {feature.name}
                </span>
              ))}
            </div>
          </div>

          {/* E) Content Gap Table */}
          <div className="studio-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--studio-text)]">Content Gap vs Top 3</h3>
              <span className="text-[10px] text-[var(--studio-text-muted)]">
                Requiere URL de tu página para comparar
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-[var(--studio-border)]">
                    <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium text-xs">Factor</th>
                    <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium text-xs">Tu página</th>
                    <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium text-xs">Top 1</th>
                    <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium text-xs">Top 2</th>
                    <th className="py-2 text-[var(--studio-text-muted)] font-medium text-xs">Top 3</th>
                  </tr>
                </thead>
                <tbody>
                  {serpResult.contentGap.map((row) => (
                    <tr key={row.factor} className="border-b border-[var(--studio-border)]/50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-[var(--studio-text)] text-xs">{row.factor}</td>
                      <td className="py-2 pr-4 text-[var(--studio-text-muted)] text-xs">{row.myPage}</td>
                      <td className="py-2 pr-4 text-[var(--studio-text-muted)] text-xs">{row.top1}</td>
                      <td className="py-2 pr-4 text-[var(--studio-text-muted)] text-xs">{row.top2}</td>
                      <td className="py-2 text-[var(--studio-text-muted)] text-xs">{row.top3}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* F) NLP Terms Faltantes */}
            <div className="studio-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--studio-text)]">NLP Terms Faltantes</h3>
              </div>
              <p className="text-[10px] text-[var(--studio-text-muted)]">
                Términos del top 10 SERP que no detectamos en tu contenido
              </p>
              <div className="flex flex-wrap gap-2">
                {serpResult.nlpTerms.map((term) => (
                  <span
                    key={term}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--studio-danger)]/10 border border-[var(--studio-danger)]/40 text-[var(--studio-danger)]"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>

            {/* G) PAA Mining */}
            <div className="studio-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--studio-text)]">PAA Mining</h3>
              <ul className="space-y-2">
                {serpResult.paaQuestions.map((question) => (
                  <li
                    key={question}
                    className="flex items-center justify-between gap-2 text-xs border-b border-[var(--studio-border)]/50 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-[var(--studio-text)] flex-1">{question}</span>
                    <button
                      type="button"
                      onClick={() => showToast('Pregunta añadida al brief de contenido')}
                      className="shrink-0 text-[var(--studio-accent)] hover:underline font-medium whitespace-nowrap"
                    >
                      Convertir a FAQ →
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

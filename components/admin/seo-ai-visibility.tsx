'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudioButton } from '@/components/studio/ui/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoAiVisibilityProps {
  websiteId: string;
}

interface AiOverviewRow {
  keyword: string;
  aiOverview: 'detected' | 'not_detected';
  domainCited: boolean | null;
  source: string;
}

interface LlmReferralCard {
  name: string;
  domains: string[];
  sessions: number | null;
}

interface GeoStrategy {
  id: string;
  status: 'ok' | 'error' | 'warning';
  label: string;
  note?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLE_AI_OVERVIEW_ROWS: AiOverviewRow[] = [
  { keyword: 'tour Cartagena 3 días', aiOverview: 'detected', domainCited: false, source: 'DataForSEO' },
  { keyword: 'hotel boutique Medellín', aiOverview: 'not_detected', domainCited: null, source: 'DataForSEO' },
  { keyword: 'actividades Eje Cafetero', aiOverview: 'detected', domainCited: true, source: 'DataForSEO' },
];

const LLM_REFERRAL_CARDS: LlmReferralCard[] = [
  { name: 'ChatGPT', domains: ['chat.openai.com', 'chatgpt.com'], sessions: null },
  { name: 'Perplexity', domains: ['perplexity.ai'], sessions: null },
  { name: 'Gemini', domains: ['gemini.google.com'], sessions: null },
  { name: 'Claude', domains: ['claude.ai'], sessions: null },
];

const GEO_STRATEGIES: GeoStrategy[] = [
  { id: 'json-ld', status: 'ok', label: 'JSON-LD con author y publisher definidos' },
  { id: 'llms-txt', status: 'error', label: 'llms.txt configurado', note: 'Botón para configurar en settings' },
  { id: 'faq', status: 'warning', label: 'Contenido en formato pregunta-respuesta (FAQ)', note: 'Añade FAQPage schema' },
  { id: 'citations', status: 'error', label: 'Citations en recursos de autoridad (Wikipedia, .gov, .edu)' },
  { id: 'schema', status: 'ok', label: 'Schema.org completo y validado' },
];

// ─── Helper: status icon ──────────────────────────────────────────────────────

function StatusIcon({ status }: { status: GeoStrategy['status'] }) {
  if (status === 'ok') return <span className="text-green-600 font-bold">✅</span>;
  if (status === 'warning') return <span className="text-yellow-600 font-bold">⚠️</span>;
  return <span className="text-red-600 font-bold">❌</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SeoAiVisibility({ websiteId }: SeoAiVisibilityProps) {
  const router = useRouter();

  const [overviewRows, setOverviewRows] = useState<AiOverviewRow[]>(EXAMPLE_AI_OVERVIEW_ROWS);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewIsExample, setOverviewIsExample] = useState(true);

  const [referralCards, setReferralCards] = useState<LlmReferralCard[]>(LLM_REFERRAL_CARDS);
  const [referralsLoading, setReferralsLoading] = useState(false);

  async function handleAnalyzeOverview() {
    setOverviewLoading(true);
    try {
      const response = await fetch(
        `/api/seo/ai-visibility/overview?websiteId=${websiteId}`,
        { cache: 'no-store' }
      );
      if (!response.ok) {
        setOverviewIsExample(true);
        return;
      }
      const data = (await response.json()) as { rows: AiOverviewRow[] };
      if (data.rows?.length) {
        setOverviewRows(data.rows);
        setOverviewIsExample(false);
      } else {
        setOverviewIsExample(true);
      }
    } catch {
      setOverviewIsExample(true);
    } finally {
      setOverviewLoading(false);
    }
  }

  async function handleLoadReferrals() {
    setReferralsLoading(true);
    try {
      const response = await fetch(
        `/api/seo/ai-visibility/referrals?websiteId=${websiteId}`,
        { cache: 'no-store' }
      );
      if (!response.ok) return;
      const data = (await response.json()) as { cards: LlmReferralCard[] };
      if (data.cards?.length) {
        setReferralCards(data.cards);
      }
    } catch {
      // keep defaults — graceful degradation
    } finally {
      setReferralsLoading(false);
    }
  }

  function handleConfigureLlmsTxt() {
    router.push(`/dashboard/${websiteId}/analytics?tab=config`);
  }

  return (
    <div className="space-y-6">
      {/* ── A) AI Overview Presence Tracker ── */}
      <div className="studio-card p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">
              Presencia en AI Overviews de Google
            </h3>
            <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">
              ¿Aparece tu sitio como fuente citada en las respuestas de Google AI?
            </p>
          </div>
          <StudioButton size="sm" onClick={handleAnalyzeOverview} disabled={overviewLoading}>
            {overviewLoading ? 'Analizando...' : 'Analizar keywords'}
          </StudioButton>
        </div>

        {overviewIsExample && (
          <div className="rounded-lg p-3 mb-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs">
            Datos de ejemplo. Conecta DataForSEO para análisis real de AI Overviews.
          </div>
        )}

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--studio-border)]">
                <th className="py-2 font-medium text-[var(--studio-text-muted)]">Keyword</th>
                <th className="py-2 font-medium text-[var(--studio-text-muted)]">AI Overview</th>
                <th className="py-2 font-medium text-[var(--studio-text-muted)]">Tu dominio citado</th>
                <th className="py-2 font-medium text-[var(--studio-text-muted)]">Fuente SERP</th>
              </tr>
            </thead>
            <tbody>
              {overviewRows.map((row) => (
                <tr key={row.keyword} className="border-b border-[var(--studio-border)]/50">
                  <td className="py-2 text-[var(--studio-text)]">{row.keyword}</td>
                  <td className="py-2">
                    {row.aiOverview === 'detected' ? (
                      <span className="text-green-600 text-xs font-medium">✅ Detectado</span>
                    ) : (
                      <span className="text-gray-400 text-xs">❌ No detectado</span>
                    )}
                  </td>
                  <td className="py-2">
                    {row.domainCited === null ? (
                      <span className="text-[var(--studio-text-muted)] text-xs">—</span>
                    ) : row.domainCited ? (
                      <span className="text-green-600 text-xs font-medium">✅ Citado</span>
                    ) : (
                      <span className="text-red-500 text-xs">❌ No citado</span>
                    )}
                  </td>
                  <td className="py-2 text-[var(--studio-text-muted)] text-xs">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── B) LLM Referral Segments ── */}
      <div className="studio-card p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">
              Tráfico desde Asistentes de IA
            </h3>
            <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">
              GA4 muestra tráfico desde LLMs cuando los usuarios hacen clic en enlaces citados
            </p>
          </div>
          <StudioButton size="sm" onClick={handleLoadReferrals} disabled={referralsLoading}>
            {referralsLoading ? 'Cargando...' : 'Cargar desde GA4'}
          </StudioButton>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {referralCards.map((card) => (
            <div key={card.name} className="studio-panel p-3 rounded-lg">
              <p className="text-xs font-semibold text-[var(--studio-text)]">{card.name}</p>
              <p className="text-xs text-[var(--studio-text-muted)] mt-0.5 truncate">
                {card.domains.join(', ')}
              </p>
              <p className="text-lg font-bold text-[var(--studio-text)] mt-2">
                {card.sessions != null ? card.sessions : '—'}
              </p>
              {card.sessions == null ? (
                <span className="inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-500 border border-gray-200">
                  Sin tráfico detectado
                </span>
              ) : (
                <span className="inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200">
                  sessions
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── C) GEO Strategies ── */}
      <div className="studio-card p-4">
        <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-3">
          Estrategias GEO (Generative Engine Optimization)
        </h3>
        <ul className="space-y-3">
          {GEO_STRATEGIES.map((strategy) => (
            <li key={strategy.id} className="flex items-start gap-3">
              <StatusIcon status={strategy.status} />
              <div className="flex-1">
                <span className="text-sm text-[var(--studio-text)]">{strategy.label}</span>
                {strategy.note && (
                  <span className="ml-2 text-xs text-[var(--studio-text-muted)]">
                    — {strategy.note}
                  </span>
                )}
              </div>
              {strategy.id === 'llms-txt' && (
                <StudioButton size="sm" variant="outline" onClick={handleConfigureLlmsTxt}>
                  Configurar
                </StudioButton>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ── D) GEO Recommendations ── */}
      <div className="studio-card p-4">
        <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-3">
          Recomendaciones GEO
        </h3>
        <div className="space-y-3">
          {/* Card 1: FAQPage JSON-LD */}
          <div className="studio-panel rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--studio-text)]">
                  Añade FAQPage JSON-LD
                </p>
                <p className="text-xs text-[var(--studio-text-muted)] mt-1">
                  Estructura tus respuestas como Q&amp;A para que los LLMs las citen directamente.
                </p>
                <pre className="mt-2 text-xs bg-[var(--studio-surface)] rounded p-2 overflow-x-auto text-[var(--studio-text-muted)]">
{`{
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "¿Cuánto cuesta un tour a Cartagena?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Los tours salen desde $150 USD..."
    }
  }]
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Card 2: llms.txt */}
          <div className="studio-panel rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--studio-text)]">
                  Crea llms.txt con tu catálogo de productos
                </p>
                <p className="text-xs text-[var(--studio-text-muted)] mt-1">
                  Un archivo <code className="font-mono">/llms.txt</code> ayuda a los modelos de IA a indexar tu contenido estructuradamente.
                </p>
              </div>
              <a
                href="https://llmstxt.org"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-[var(--studio-primary)] underline"
              >
                Ver docs
              </a>
            </div>
          </div>

          {/* Card 3: Colombia.travel mention */}
          <div className="studio-panel rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--studio-text)]">
                  Solicita mención en Colombia.travel
                </p>
                <p className="text-xs text-[var(--studio-text-muted)] mt-1">
                  Una citation en un recurso de autoridad (.gov, .co oficial) mejora significativamente la citabilidad en LLMs.
                </p>
              </div>
              <a
                href="https://colombia.travel/es/agencias"
                target="_blank"
                rel="noopener noreferrer"
              >
                <StudioButton size="sm" variant="outline">
                  Ver guía
                </StudioButton>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

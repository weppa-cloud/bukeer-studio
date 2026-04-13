'use client';

import { useState, useMemo } from 'react';
import {
  scoreItemSeo,
  type SeoScoringInput,
  type SeoScoringResult,
  type SeoCheck,
  type SeoItemType,
} from '@/lib/seo/unified-scorer';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';

// ============================================================================
// Types
// ============================================================================

interface SeoItemDetailProps {
  item: {
    id: string;
    type: SeoItemType;
    name: string;
    slug: string;
    image?: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    targetKeyword?: string;
    wordCount?: number;
    robotsNoindex?: boolean;
    // type-specific
    amenities?: string[];
    starRating?: number;
    duration?: number;
    inclusions?: string;
    itineraryItems?: number;
    latitude?: number;
    longitude?: number;
    images?: string[];
    // Extended legacy content (Surfer mode)
    descriptionShort?: string;
    exclusions?: string;
    recommendations?: string;
    instructions?: string;
    experienceType?: string;
    checkInTime?: string;
    checkOutTime?: string;
    userRating?: number;
    vehicleType?: string;
    maxPassengers?: number;
    fromLocation?: string;
    toLocation?: string;
    policies?: string;
    destination?: string;
    durationDays?: number;
    durationNights?: number;
    programHighlights?: unknown[];
    programInclusions?: unknown[];
    programExclusions?: unknown[];
    // V2 enrichment
    v2?: {
      city?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      userRating?: number;
      reviewsCount?: number;
    } | null;
  };
  websiteId: string;
  baseUrl: string;
  subdomain?: string;
  onBack: () => void;
  onSave: (fields: {
    seoTitle?: string;
    seoDescription?: string;
    targetKeyword?: string;
    robotsNoindex?: boolean;
  }) => Promise<void>;
}

// ============================================================================
// Grade color utilities
// ============================================================================

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  B: 'text-blue-600 bg-blue-50 border-blue-200',
  C: 'text-amber-600 bg-amber-50 border-amber-200',
  D: 'text-orange-600 bg-orange-50 border-orange-200',
  F: 'text-red-600 bg-red-50 border-red-200',
};

const GRADE_BG: Record<string, string> = {
  A: 'bg-emerald-500',
  B: 'bg-blue-500',
  C: 'bg-amber-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
};

// ============================================================================
// Component
// ============================================================================

export function SeoItemDetail({
  item,
  websiteId,
  baseUrl,
  subdomain,
  onBack,
  onSave,
}: SeoItemDetailProps) {
  const [seoTitle, setSeoTitle] = useState(item.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(item.seoDescription ?? '');
  const [targetKeyword, setTargetKeyword] = useState(item.targetKeyword ?? '');
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // F2: Noindex toggle
  const [robotsNoindex, setRobotsNoindex] = useState(item.robotsNoindex ?? false);
  const [showNoindexDialog, setShowNoindexDialog] = useState(false);

  // F1: AI generation
  type AiState = 'idle' | 'generating' | 'preview' | 'error';
  const [aiState, setAiState] = useState<AiState>('idle');
  const [aiSuggestion, setAiSuggestion] = useState<{
    seoTitle: string;
    seoDescription: string;
    targetKeyword: string;
    reasoning: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Build the scoring input with live editable values
  const scoringInput: SeoScoringInput = useMemo(
    () => ({
      type: item.type,
      name: item.name,
      slug: item.slug,
      description: item.description,
      image: item.image,
      images: item.images,
      wordCount: item.wordCount,
      amenities: item.amenities,
      starRating: item.starRating,
      duration: item.duration,
      inclusions: item.inclusions,
      itineraryItems: item.itineraryItems,
      latitude: item.latitude,
      longitude: item.longitude,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      targetKeyword: targetKeyword || undefined,
      hasJsonLd: true,
      hasCanonical: true,
      hasHreflang: true,
      hasOgTags: true,
      hasTwitterCard: true,
    }),
    [item, seoTitle, seoDescription, targetKeyword]
  );

  const result: SeoScoringResult = useMemo(
    () => scoreItemSeo(scoringInput),
    [scoringInput]
  );

  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': item.type === 'hotel' ? 'Hotel' : item.type === 'destination' ? 'TouristDestination' : item.type === 'blog' ? 'Article' : 'Product',
      name: seoTitle || item.name,
      description: seoDescription || item.description,
      image: item.image,
      url: `${baseUrl}/${item.slug}`,
    }),
    [item, seoTitle, seoDescription, baseUrl]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        targetKeyword: targetKeyword || undefined,
        robotsNoindex,
      });
    } finally {
      setSaving(false);
    }
  };

  // F1: AI generation handler
  const handleGenerateAi = async () => {
    setAiState('generating');
    setAiError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/seo/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          itemType: item.type,
          name: item.name,
          slug: item.slug,
          description: item.description?.substring(0, 4000),
          existingTitle: seoTitle || undefined,
          existingDescription: seoDescription || undefined,
          targetKeyword: targetKeyword || undefined,
          locale: 'es',
          context: {
            // Legacy
            amenities: item.amenities,
            starRating: item.starRating,
            duration: item.duration,
            inclusions: item.inclusions?.substring(0, 500),
            exclusions: item.exclusions?.substring(0, 300),
            recommendations: item.recommendations?.substring(0, 300),
            experienceType: item.experienceType,
            vehicleType: item.vehicleType,
            fromLocation: item.fromLocation,
            toLocation: item.toLocation,
            destination: item.destination,
            durationDays: item.durationDays,
            durationNights: item.durationNights,
            galleryCount: item.images?.length,
            // V2 enrichment (when bridge exists)
            city: item.v2?.city,
            country: item.v2?.country,
            userRating: item.v2?.userRating,
            reviewsCount: item.v2?.reviewsCount,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al generar' }));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setAiSuggestion(data);
      setAiState('preview');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Error desconocido');
      setAiState('error');
    }
  };

  const applyAiAll = () => {
    if (!aiSuggestion) return;
    setSeoTitle(aiSuggestion.seoTitle);
    setSeoDescription(aiSuggestion.seoDescription);
    setTargetKeyword(aiSuggestion.targetKeyword);
    setAiState('idle');
    setAiSuggestion(null);
  };

  const applyAiTitle = () => {
    if (aiSuggestion) setSeoTitle(aiSuggestion.seoTitle);
  };

  const applyAiDesc = () => {
    if (aiSuggestion) setSeoDescription(aiSuggestion.seoDescription);
  };

  // Keyword density calculation
  const keywordDensity = useMemo(() => {
    if (!targetKeyword || !item.description) return 0;
    const words = item.description.toLowerCase().split(/\s+/).filter(Boolean);
    const kw = targetKeyword.toLowerCase();
    const occurrences = words.filter((w) => w.includes(kw)).length;
    return words.length > 0 ? (occurrences / words.length) * 100 : 0;
  }, [targetKeyword, item.description]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Volver
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {item.name}
            </h1>
            <p className="text-sm text-slate-500 capitalize">{item.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Score badge */}
          <div className={`px-3 py-1 rounded-full border font-semibold text-sm ${GRADE_COLORS[result.grade]}`}>
            {result.grade} — {result.overall}/100
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Section 1: Product Content (read-only — Surfer mode) */}
      <Section title="1. Contenido del Producto">
        <ProductContentZone item={item} />
      </Section>

      {/* Section 2: Gallery */}
      <Section title={`2. Galeria${item.images?.length ? ` (${item.images.length} fotos)` : ''}`}>
        <GalleryZone item={item} />
      </Section>

      {/* Section 3: V2 Enrichment (optional) */}
      {item.v2 && (
        <Section title="3. Datos Enriquecidos (Catalogo V2)">
          <V2EnrichmentZone v2={item.v2} />
        </Section>
      )}

      {/* Content Available Grid */}
      <Section title="Contenido Disponible">
        <ContentAvailableGrid item={item} />
      </Section>

      {/* Keyword Target */}
      <Section title="Keyword Objetivo">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Target Keyword
            </label>
            <input
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="e.g. hotel boutique cancun"
            />
          </div>
          {targetKeyword && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricCard
                label="Densidad en descripcion"
                value={`${keywordDensity.toFixed(1)}%`}
                pass={keywordDensity >= 1 && keywordDensity <= 3}
                ideal="1-3%"
              />
              <MetricCard
                label="En titulo SEO"
                value={seoTitle.toLowerCase().includes(targetKeyword.toLowerCase()) ? 'Si' : 'No'}
                pass={seoTitle.toLowerCase().includes(targetKeyword.toLowerCase())}
              />
              <MetricCard
                label="En meta descripcion"
                value={seoDescription.toLowerCase().includes(targetKeyword.toLowerCase()) ? 'Si' : 'No'}
                pass={seoDescription.toLowerCase().includes(targetKeyword.toLowerCase())}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Indexation Toggle */}
      <Section title="Indexacion">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Visible en buscadores
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {robotsNoindex
                ? 'Esta pagina esta oculta de Google y excluida del sitemap'
                : 'Esta pagina es indexable por Google y aparece en el sitemap'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!robotsNoindex}
            onClick={() => {
              if (!robotsNoindex) {
                setShowNoindexDialog(true);
              } else {
                setRobotsNoindex(false);
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              !robotsNoindex ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                !robotsNoindex ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Noindex confirmation dialog */}
        {showNoindexDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                Ocultar de buscadores
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Esta pagina dejara de aparecer en Google y sera excluida del sitemap. Los enlaces entrantes seguiran funcionando.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNoindexDialog(false)}
                  className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setRobotsNoindex(true);
                    setShowNoindexDialog(false);
                  }}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Meta Editors */}
      <Section title="Meta Tags SEO">
        {/* AI Generate button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleGenerateAi}
            disabled={aiState === 'generating'}
            className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {aiState === 'generating' ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generando...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.799L9 4.323V3a1 1 0 011-1z" />
                </svg>
                Generar con IA
              </>
            )}
          </button>
        </div>

        {/* AI error */}
        {aiState === 'error' && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg flex items-center justify-between">
            <span>{aiError || 'Error al generar sugerencias'}</span>
            <button onClick={() => setAiState('idle')} className="text-red-500 hover:text-red-700 underline text-xs ml-2">
              Cerrar
            </button>
          </div>
        )}

        {/* AI preview panel */}
        {aiState === 'preview' && aiSuggestion && (
          <div className="mb-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-700 space-y-3">
            <h4 className="text-sm font-medium text-violet-700 dark:text-violet-300">Sugerencia IA</h4>
            <DiffRow label="Titulo" current={seoTitle} suggested={aiSuggestion.seoTitle} />
            <DiffRow label="Descripcion" current={seoDescription} suggested={aiSuggestion.seoDescription} />
            <DiffRow label="Keyword" current={targetKeyword} suggested={aiSuggestion.targetKeyword} />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">{aiSuggestion.reasoning}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={applyAiAll} className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700">
                Aplicar todo
              </button>
              <button onClick={applyAiTitle} className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">
                Solo titulo
              </button>
              <button onClick={applyAiDesc} className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">
                Solo descripcion
              </button>
              <button onClick={handleGenerateAi} className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">
                Regenerar
              </button>
              <button
                onClick={() => { setAiState('idle'); setAiSuggestion(null); }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              SEO Title{' '}
              <span className={`text-xs ${seoTitle.length > 60 ? 'text-amber-500' : 'text-slate-400'}`}>
                {seoTitle.length}/70
              </span>
            </label>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                seoTitle.length > 70
                  ? 'border-red-300'
                  : seoTitle.length > 60
                    ? 'border-amber-300'
                    : 'border-slate-200 dark:border-slate-600'
              }`}
              maxLength={80}
              placeholder={item.name}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Meta Description{' '}
              <span className={`text-xs ${seoDescription.length > 150 ? 'text-amber-500' : 'text-slate-400'}`}>
                {seoDescription.length}/160
              </span>
            </label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none ${
                seoDescription.length > 160
                  ? 'border-red-300'
                  : seoDescription.length > 150
                    ? 'border-amber-300'
                    : 'border-slate-200 dark:border-slate-600'
              }`}
              rows={3}
              maxLength={170}
              placeholder="Describe this item for search engines..."
            />
          </div>
        </div>
      </Section>

      {/* Google Preview */}
      <Section title="Google Preview">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-blue-700 dark:text-blue-400 text-lg hover:underline cursor-pointer truncate font-medium">
            {seoTitle || item.name}
          </div>
          <div className="text-green-700 dark:text-green-400 text-sm truncate">
            {baseUrl}/{item.type === 'blog' ? 'blog' : item.type === 'page' ? '' : item.type + 's'}/{item.slug}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
            {seoDescription || item.description || 'No description available.'}
          </div>
        </div>
      </Section>

      {/* Social Preview */}
      <Section title="Social Preview (Open Graph)">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-w-md">
          {item.image ? (
            <div className="w-full h-48 bg-slate-100 dark:bg-slate-700 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
              Sin imagen
            </div>
          )}
          <div className="p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              {baseUrl.replace(/https?:\/\//, '')}
            </p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm mt-1 line-clamp-2">
              {seoTitle || item.name}
            </p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {seoDescription || item.description || ''}
            </p>
          </div>
        </div>
      </Section>

      {/* JSON-LD Preview */}
      <Section title="JSON-LD Schema Preview">
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
          <code>{JSON.stringify(jsonLd, null, 2)}</code>
        </pre>
      </Section>

      {/* SEO Checklist */}
      <Section title="SEO Checklist">
        <div className="space-y-4">
          {/* Score bars */}
          <div className="grid grid-cols-3 gap-4">
            <ScoreBar label="Meta" score={result.dimensions.meta} grade={result.grade} />
            <ScoreBar label="Content" score={result.dimensions.content} grade={result.grade} />
            <ScoreBar label="Technical" score={result.dimensions.technical} grade={result.grade} />
          </div>

          {/* Checks grouped by dimension */}
          {(['meta', 'content', 'technical'] as const).map((dim) => {
            const dimChecks = result.checks.filter((c) => c.dimension === dim);
            return (
              <div key={dim} className="space-y-2">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                  {dim}
                </h4>
                <div className="space-y-1">
                  {dimChecks.map((check) => (
                    <CheckRow key={check.id} check={check} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Live Preview Iframe (#57) */}
      {item.slug && ['hotel', 'activity', 'transfer', 'package', 'destination'].includes(item.type) && (
        <Section title="Vista Previa del Sitio">
          <PreviewIframe item={item} baseUrl={baseUrl} subdomain={subdomain} />
        </Section>
      )}

      {/* AI Suggestions */}
      <Section title="Sugerencias">
        {!showSuggestions ? (
          <button
            onClick={() => setShowSuggestions(true)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Generar sugerencias
          </button>
        ) : result.recommendations.length > 0 ? (
          <ul className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </span>
                {rec}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            No hay sugerencias pendientes. El SEO de este item esta optimizado.
          </p>
        )}
      </Section>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function ContentAvailableGrid({ item }: { item: SeoItemDetailProps['item'] }) {
  const baseFields = [
    { label: 'Nombre', has: !!item.name },
    { label: 'Slug', has: !!item.slug },
    { label: 'Descripcion', has: !!item.description },
    { label: 'Imagen principal', has: !!item.image },
    { label: 'Galeria (3+)', has: (item.images?.length ?? 0) >= 3 },
    { label: 'SEO Title', has: !!item.seoTitle },
    { label: 'Meta Description', has: !!item.seoDescription },
    { label: 'Target Keyword', has: !!item.targetKeyword },
  ];

  const typeFields = getTypeFields(item);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {[...baseFields, ...typeFields].map((f) => (
        <div
          key={f.label}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            f.has
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}
        >
          <span>{f.has ? '\u2705' : '\u274C'}</span>
          {f.label}
        </div>
      ))}
    </div>
  );
}

function getTypeFields(item: SeoItemDetailProps['item']) {
  switch (item.type) {
    case 'hotel':
      return [
        { label: 'Amenidades (3+)', has: (item.amenities?.length ?? 0) >= 3 },
        { label: 'Estrellas', has: !!item.starRating },
        { label: 'Incluye', has: !!item.inclusions },
        { label: 'No incluye', has: !!item.exclusions },
        { label: 'Recomendaciones', has: !!item.recommendations },
        { label: 'Instrucciones', has: !!item.instructions },
        { label: 'Check-in/out', has: !!(item.checkInTime || item.checkOutTime) },
        { label: 'Coordenadas', has: !!(item.latitude && item.longitude) || !!(item.v2?.latitude) },
      ];
    case 'activity':
      return [
        { label: 'Duracion', has: !!item.duration },
        { label: 'Tipo experiencia', has: !!item.experienceType },
        { label: 'Incluye', has: !!item.inclusions },
        { label: 'No incluye', has: !!item.exclusions },
        { label: 'Recomendaciones', has: !!item.recommendations },
        { label: 'Instrucciones', has: !!item.instructions },
      ];
    case 'transfer':
      return [
        { label: 'Tipo vehiculo', has: !!item.vehicleType },
        { label: 'Max pasajeros', has: !!item.maxPassengers },
        { label: 'Origen/Destino', has: !!(item.fromLocation || item.toLocation) },
        { label: 'Incluye', has: !!item.inclusions },
        { label: 'Politicas', has: !!item.policies },
      ];
    case 'package':
      return [
        { label: 'Destino', has: !!item.destination },
        { label: 'Duracion', has: !!(item.durationDays || item.durationNights) },
        { label: 'Highlights', has: (item.programHighlights?.length ?? 0) > 0 },
        { label: 'Inclusiones', has: (item.programInclusions?.length ?? 0) > 0 },
        { label: 'Items itinerario (2+)', has: (item.itineraryItems ?? 0) >= 2 },
      ];
    case 'destination':
      return [
        { label: 'Coordenadas', has: !!(item.latitude && item.longitude) },
      ];
    default:
      return [
        { label: 'Word Count (100+)', has: (item.wordCount ?? 0) >= 100 },
      ];
  }
}

function MetricCard({
  label,
  value,
  pass,
  ideal,
}: {
  label: string;
  value: string;
  pass: boolean;
  ideal?: string;
}) {
  return (
    <div
      className={`p-3 rounded-lg border text-center ${
        pass
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
      }`}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${pass ? 'text-emerald-600' : 'text-red-600'}`}>
        {value}
      </p>
      {ideal && <p className="text-xs text-slate-400">Ideal: {ideal}</p>}
    </div>
  );
}

function ScoreBar({ label, score, grade }: { label: string; score: number; grade: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-medium text-slate-900 dark:text-white">{score}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${GRADE_BG[grade]}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: SeoCheck }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
        check.pass
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
          : 'bg-red-100 dark:bg-red-900/30 text-red-600'
      }`}>
        {check.pass ? '\u2713' : '\u2717'}
      </span>
      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{check.message}</span>
      <span className="text-xs text-slate-500">{check.dimension}</span>
    </div>
  );
}

function DiffRow({ label, current, suggested }: { label: string; current: string; suggested: string }) {
  const changed = current !== suggested;
  return (
    <div className="text-sm">
      <span className="font-medium text-slate-600 dark:text-slate-400">{label}:</span>
      {changed ? (
        <div className="mt-1 space-y-1">
          {current && <div className="line-through text-red-400 text-xs">{current}</div>}
          <div className="text-emerald-700 dark:text-emerald-400">{suggested}</div>
        </div>
      ) : (
        <span className="text-slate-500 text-xs ml-2">Sin cambios</span>
      )}
    </div>
  );
}

// ============================================================================
// Surfer mode zones (#56, #57)
// ============================================================================

function ContentFieldRow({ label, value, charCount }: { label: string; value?: string | null; charCount?: boolean }) {
  if (!value) {
    return (
      <div className="flex items-start gap-3 py-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-36 flex-shrink-0">{label}</span>
        <span className="text-xs text-slate-400 italic">No disponible</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-36 flex-shrink-0">
        {label}
        {charCount && <span className="text-slate-400 ml-1">({value.length} chars)</span>}
      </span>
      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-4 whitespace-pre-line">{value}</p>
    </div>
  );
}

function ProductContentZone({ item }: { item: SeoItemDetailProps['item'] }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <span className="text-xs text-slate-500 dark:text-slate-400">Solo lectura — editar en Bukeer Admin</span>
      </div>

      <ContentFieldRow label="Descripcion" value={item.description} charCount />
      {item.descriptionShort && <ContentFieldRow label="Descripcion corta" value={item.descriptionShort} charCount />}
      <ContentFieldRow label="Incluye" value={item.inclusions} charCount />
      <ContentFieldRow label="No incluye" value={item.exclusions} charCount />
      {item.recommendations && <ContentFieldRow label="Recomendaciones" value={item.recommendations} charCount />}
      {item.instructions && <ContentFieldRow label="Instrucciones" value={item.instructions} charCount />}

      {/* Type-specific fields */}
      {item.type === 'hotel' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          {item.starRating && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Estrellas</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{'*'.repeat(item.starRating)}</p>
            </div>
          )}
          {item.amenities && item.amenities.length > 0 && (
            <div className="col-span-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Amenidades ({item.amenities.length})</p>
              <div className="flex flex-wrap gap-1">
                {item.amenities.slice(0, 8).map((a, i) => (
                  <span key={i} className="text-xs bg-white dark:bg-slate-600 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-500">{a}</span>
                ))}
                {item.amenities.length > 8 && <span className="text-xs text-slate-400">+{item.amenities.length - 8}</span>}
              </div>
            </div>
          )}
          {(item.checkInTime || item.checkOutTime) && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Check-in / out</p>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.checkInTime ?? '—'} / {item.checkOutTime ?? '—'}</p>
            </div>
          )}
        </div>
      )}

      {item.type === 'activity' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          {item.experienceType && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Tipo</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.experienceType}</p>
            </div>
          )}
          {item.duration && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Duracion</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.duration} min</p>
            </div>
          )}
        </div>
      )}

      {item.type === 'transfer' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          {item.vehicleType && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Vehiculo</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.vehicleType}</p>
            </div>
          )}
          {item.maxPassengers && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Max pasajeros</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.maxPassengers}</p>
            </div>
          )}
          {(item.fromLocation || item.toLocation) && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Ruta</p>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.fromLocation ?? '—'} → {item.toLocation ?? '—'}</p>
            </div>
          )}
          <ContentFieldRow label="Politicas" value={item.policies} />
        </div>
      )}

      {item.type === 'package' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          {item.destination && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Destino</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.destination}</p>
            </div>
          )}
          {(item.durationDays || item.durationNights) && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Duracion</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.durationDays ?? 0}D / {item.durationNights ?? 0}N</p>
            </div>
          )}
          {item.itineraryItems != null && item.itineraryItems > 0 && (
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-slate-500">Items itinerario</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.itineraryItems}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GalleryZone({ item }: { item: SeoItemDetailProps['item'] }) {
  const allImages = [
    ...(item.image ? [item.image] : []),
    ...(item.images ?? []).filter((img) => img && img !== item.image),
  ];

  if (allImages.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-lg">
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        Sin galeria — impacta score de contenido
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      {allImages.slice(0, 16).map((url, i) => (
        <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          {i === 0 && item.image && (
            <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white px-1 rounded">main</span>
          )}
        </div>
      ))}
      {allImages.length > 16 && (
        <div className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500">
          +{allImages.length - 16}
        </div>
      )}
    </div>
  );
}

function V2EnrichmentZone({ v2 }: { v2: NonNullable<SeoItemDetailProps['item']['v2']> }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <span className="text-xs text-blue-600 dark:text-blue-400">Datos del catalogo maestro — no editables aqui</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {v2.city && (
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500">Ciudad</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{v2.city}</p>
          </div>
        )}
        {v2.country && (
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500">Pais</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{v2.country}</p>
          </div>
        )}
        {v2.latitude != null && v2.longitude != null && (
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500">Geo</p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{v2.latitude.toFixed(4)}, {v2.longitude.toFixed(4)}</p>
          </div>
        )}
        {v2.userRating != null && (
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500">Rating</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {v2.userRating.toFixed(1)}/5
              {v2.reviewsCount != null && <span className="text-xs text-slate-400 ml-1">({v2.reviewsCount})</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewIframe({ item, baseUrl, subdomain }: { item: SeoItemDetailProps['item']; baseUrl: string; subdomain?: string }) {
  const categorySlug: Record<string, string> = {
    hotel: 'hoteles',
    activity: 'actividades',
    transfer: 'traslados',
    package: 'paquetes',
    destination: 'destinos',
  };
  const cat = categorySlug[item.type] ?? item.type;
  const publicUrl = `${baseUrl}/${cat}/${item.slug}`;
  // Use Studio's own rendering route for the iframe preview (avoids loading external/WordPress domain)
  const previewUrl = subdomain
    ? `/site/${subdomain}/${cat}/${item.slug}`
    : publicUrl;

  return (
    <div>
      <div className="flex justify-end gap-3 mb-2">
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          Abrir sitio publico
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>
      <iframe
        src={previewUrl}
        className="w-full h-96 rounded-lg border border-slate-200 dark:border-slate-700"
        sandbox="allow-same-origin allow-scripts"
        title={`Preview: ${item.name}`}
      />
    </div>
  );
}

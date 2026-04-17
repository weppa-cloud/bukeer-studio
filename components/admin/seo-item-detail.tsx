'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { StudioTabs, StudioButton, StudioBadge, StudioInput, StudioSelect, StudioTextarea } from '@/components/studio/ui/primitives';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import {
  scoreItemSeo,
  type SeoCheck,
  type SeoItemType,
  type SeoScoringInput,
  type SeoScoringResult,
} from '@/lib/seo/unified-scorer';
import type { KeywordResearchDTO } from '@/lib/seo/dto';
import { SeoContentScore } from '@/components/admin/seo-content-score';
import { SeoNlpScorePanel } from '@/components/admin/seo-nlp-score-panel';
import { SeoTrustState } from '@/components/admin/seo-trust-state';

type DetailTab =
  | 'meta'
  | 'brief'
  | 'optimize'
  | 'translate'
  | 'track'
  | 'research'
  | 'audit'
  | 'technical'
  | 'preview'
  | 'score';

const TAB_OPTIONS: ReadonlyArray<{ id: DetailTab; label: string }> = [
  { id: 'meta', label: 'Meta & Keywords' },
  { id: 'brief', label: 'Brief' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'translate', label: 'Translate' },
  { id: 'track', label: 'Track' },
  { id: 'research', label: 'Keyword Research' },
  { id: 'audit', label: 'Content Audit' },
  { id: 'technical', label: 'Technical' },
  { id: 'preview', label: 'Preview' },
  { id: 'score', label: 'Content Score' },
];

const GRADE_TONE: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  A: 'success',
  B: 'info',
  C: 'warning',
  D: 'danger',
  F: 'danger',
};

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
    customFaq?: Array<{ question: string; answer: string }>;
    customHighlights?: string[];
    amenities?: string[];
    starRating?: number;
    duration?: number;
    inclusions?: string;
    itineraryItems?: number;
    latitude?: number;
    longitude?: number;
    images?: string[];
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
    v2?: {
      city?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      userRating?: number;
      reviewsCount?: number;
    } | null;
    hasPublicPage?: boolean;
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
    customFaq?: Array<{ question: string; answer: string }>;
    customHighlights?: string[];
  }) => Promise<void>;
}

type SourceMeta = {
  source: string;
  fetchedAt: string;
  confidence: 'live' | 'partial' | 'exploratory';
};

type BriefVersion = {
  version: number;
  change_reason: string | null;
  created_at: string;
};

type BriefRow = {
  id: string;
  locale: string;
  contentType: string;
  pageType: SeoItemType;
  pageId: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  brief: Record<string, unknown>;
  status: 'draft' | 'approved' | 'archived';
  versions: BriefVersion[];
  source: string;
  fetchedAt: string;
  confidence: 'live' | 'partial' | 'exploratory';
};

type OptimizeSuggestion = {
  id: string;
  field: string;
  before: string;
  after: string;
  rationale: string;
  scoreBefore: number;
  scoreAfter: number;
};

type TrackPageMetric = {
  metric_date: string;
  locale: string;
  page_type: string;
  page_id: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number | null;
  sessions: number;
  conversions: number;
};

type TrackClusterMetric = {
  metric_date: string;
  locale: string;
  cluster_id: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number | null;
  pages_tracked: number;
};

type TargetCatalogRow = {
  pageType: 'page' | 'blog' | 'destination';
  pageId: string;
  label: string;
  slug: string;
  url: string;
};

function safeNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function buildPackageContext(item: SeoItemDetailProps['item']) {
  if (item.type !== 'package') return undefined;
  return {
    destination: item.destination,
    durationDays: item.durationDays,
    durationNights: item.durationNights,
    highlights: item.programHighlights ?? [],
    inclusions: item.programInclusions ?? [],
    exclusions: item.programExclusions ?? [],
    itineraryItems: item.itineraryItems ?? 0,
  };
}

function toContentType(itemType: SeoItemType): 'blog' | 'destination' | 'package' | 'activity' | 'page' | null {
  if (itemType === 'blog') return 'blog';
  if (itemType === 'destination') return 'destination';
  if (itemType === 'package') return 'package';
  if (itemType === 'activity') return 'activity';
  if (itemType === 'page') return 'page';
  return null;
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function SeoItemDetail({
  item,
  websiteId,
  baseUrl,
  subdomain,
  onBack,
  onSave,
}: SeoItemDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('meta');
  const [locale, setLocale] = useState('es-CO');
  const [seoTitle, setSeoTitle] = useState(item.seoTitle ?? '');
  const [seoDescription, setSeoDescription] = useState(item.seoDescription ?? '');
  const [targetKeyword, setTargetKeyword] = useState(item.targetKeyword ?? '');
  const [robotsNoindex, setRobotsNoindex] = useState(item.robotsNoindex ?? false);
  const [customFaq, setCustomFaq] = useState<Array<{ question: string; answer: string }>>(
    Array.isArray(item.customFaq) ? item.customFaq.slice(0, 10) : []
  );
  const [customHighlights, setCustomHighlights] = useState<string[]>(
    Array.isArray(item.customHighlights) ? item.customHighlights.slice(0, 6) : []
  );
  const [saving, setSaving] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    seoTitle: string;
    seoDescription: string;
    targetKeyword: string;
    reasoning: string;
  } | null>(null);

  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchResult, setResearchResult] = useState<KeywordResearchDTO | null>(null);

  const [briefRows, setBriefRows] = useState<BriefRow[]>([]);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefSourceMeta, setBriefSourceMeta] = useState<SourceMeta | null>(null);
  const [briefPrimaryKeyword, setBriefPrimaryKeyword] = useState(item.targetKeyword ?? '');
  const [briefSecondaryKeywords, setBriefSecondaryKeywords] = useState('');
  const [briefSummary, setBriefSummary] = useState(item.seoDescription ?? item.descriptionShort ?? '');
  const [briefActionLoading, setBriefActionLoading] = useState(false);

  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [optimizeSourceMeta, setOptimizeSourceMeta] = useState<SourceMeta | null>(null);
  const [optimizeSuggestions, setOptimizeSuggestions] = useState<OptimizeSuggestion[]>([]);
  const [optimizeApplyResult, setOptimizeApplyResult] = useState<{
    actionId: string;
    scoreBefore: number | null;
    scoreAfter: number | null;
    createdAt: string;
  } | null>(null);
  const [seoIntro, setSeoIntro] = useState('');
  const [seoHighlights, setSeoHighlights] = useState('');
  const [seoFaq, setSeoFaq] = useState('');

  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateSourceMeta, setTranslateSourceMeta] = useState<SourceMeta | null>(null);
  const [translateStatus, setTranslateStatus] = useState<'draft' | 'reviewed' | 'applied' | null>(null);
  const [translateJobId, setTranslateJobId] = useState('');
  const [targetLocale, setTargetLocale] = useState('en-US');
  const [targetCountry, setTargetCountry] = useState('United States');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [targetContentId, setTargetContentId] = useState('');
  const [translateTitle, setTranslateTitle] = useState(item.name);
  const [translateSeoTitle, setTranslateSeoTitle] = useState(item.seoTitle ?? '');
  const [translateSeoDescription, setTranslateSeoDescription] = useState(item.seoDescription ?? '');
  const [variantStatus, setVariantStatus] = useState<string | null>(null);
  const [variantSourceMeta, setVariantSourceMeta] = useState<SourceMeta | null>(null);
  const [targetCatalogRows, setTargetCatalogRows] = useState<TargetCatalogRow[]>([]);
  const [targetCatalogLoading, setTargetCatalogLoading] = useState(false);
  const [targetCatalogSearch, setTargetCatalogSearch] = useState('');
  const [translateAdvancedOpen, setTranslateAdvancedOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const [trackFrom, setTrackFrom] = useState(formatDateInput(new Date(today.getTime() - 1000 * 60 * 60 * 24 * 30)));
  const [trackTo, setTrackTo] = useState(formatDateInput(today));
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackDecisionGradeOnly, setTrackDecisionGradeOnly] = useState(true);
  const [trackSourceMeta, setTrackSourceMeta] = useState<SourceMeta | null>(null);
  const [trackWarning, setTrackWarning] = useState<{ code: string; message: string } | null>(null);
  const [trackWarningDetails, setTrackWarningDetails] = useState<unknown>(null);
  const [trackSyncing, setTrackSyncing] = useState(false);
  const [trackPageMetrics, setTrackPageMetrics] = useState<TrackPageMetric[]>([]);
  const [trackClusterMetrics, setTrackClusterMetrics] = useState<TrackClusterMetric[]>([]);

  const contentType = useMemo(() => toContentType(item.type), [item.type]);
  const translateEnabled = item.type === 'blog' || item.type === 'page' || item.type === 'destination';
  const optimizeEnabled = item.type === 'blog' || item.type === 'destination' || item.type === 'package' || item.type === 'activity' || item.type === 'page';
  const transactionalType = item.type === 'package' || item.type === 'activity';
  const tabOptions = useMemo(
    () => TAB_OPTIONS.filter((tab) => (tab.id === 'translate' ? translateEnabled : true)),
    [translateEnabled],
  );
  const activeBrief = briefRows[0] ?? null;
  const nlpScoreContent = useMemo(() => {
    const parts = [
      item.description ?? '',
      seoDescription,
      seoIntro,
      seoHighlights,
      seoFaq,
    ]
      .map((value) => value.trim())
      .filter(Boolean);
    return parts.join('\n\n');
  }, [item.description, seoDescription, seoFaq, seoHighlights, seoIntro]);

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
      // B7: hasJsonLd computed from real content signals — true when item has name + at least one enriching field
      hasJsonLd: Boolean(item.name) && (Boolean(item.description) || Boolean(seoTitle) || Boolean(item.image)),
      // B7: hasCanonical/hasHreflang set to false — cannot verify without live page fetch
      hasCanonical: false,
      hasHreflang: false,
      hasOgTags: true,
      hasTwitterCard: true,
    }),
    [item, seoTitle, seoDescription, targetKeyword]
  );

  const result: SeoScoringResult = useMemo(
    () => scoreItemSeo(scoringInput),
    [scoringInput]
  );

  useEffect(() => {
    if (activeTab !== 'brief') return;
    loadBriefs().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, locale, item.id, item.type, contentType]);

  useEffect(() => {
    if (!translateEnabled) return;
    loadVariantStatus().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateEnabled, targetLocale, item.id, item.type, websiteId]);

  useEffect(() => {
    if (!translateEnabled || activeTab !== 'translate') return;
    loadTargetCatalog().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateEnabled, activeTab, targetLocale, item.type, websiteId]);

  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': item.type === 'hotel'
        ? 'Hotel'
        : item.type === 'destination'
          ? 'TouristDestination'
          : item.type === 'blog'
            ? 'Article'
            : 'Product',
      name: seoTitle || item.name,
      description: seoDescription || item.description,
      image: item.image,
      url: `${baseUrl}/${item.slug}`,
    }),
    [item, seoTitle, seoDescription, baseUrl]
  );

  async function handleSave() {
    setSaving(true);
    try {
      const sanitizedFaq = customFaq
        .map((entry) => ({
          question: entry.question.trim(),
          answer: entry.answer.trim(),
        }))
        .filter((entry) => entry.question.length > 0 && entry.answer.length > 0)
        .slice(0, 10);

      const sanitizedHighlights = customHighlights
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 6);

      await onSave({
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        targetKeyword: targetKeyword || undefined,
        robotsNoindex,
        customFaq: sanitizedFaq,
        customHighlights: sanitizedHighlights,
      });

      setCustomFaq(sanitizedFaq);
      setCustomHighlights(sanitizedHighlights);
    } finally {
      setSaving(false);
    }
  }

  const isProductType = item.type === 'hotel' || item.type === 'activity' || item.type === 'transfer' || item.type === 'package';

  function moveFaq(index: number, direction: -1 | 1) {
    const next = [...customFaq];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCustomFaq(next);
  }

  function moveHighlight(index: number, direction: -1 | 1) {
    const next = [...customHighlights];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCustomHighlights(next);
  }

  async function handleGenerateAi() {
    setAiError(null);
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/ai/seo/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          itemType: item.type,
          name: item.name,
          slug: item.slug,
          description: item.description?.slice(0, 4500),
          existingTitle: seoTitle || undefined,
          existingDescription: seoDescription || undefined,
          targetKeyword: targetKeyword || undefined,
          locale: 'es',
          context: {
            city: item.v2?.city,
            country: item.v2?.country,
            amenities: item.amenities,
            starRating: item.starRating,
            duration: item.duration,
            userRating: item.v2?.userRating ?? item.userRating,
            reviewsCount: item.v2?.reviewsCount,
            inclusions: item.inclusions,
            exclusions: item.exclusions,
            recommendations: item.recommendations,
            experienceType: item.experienceType,
            vehicleType: item.vehicleType,
            fromLocation: item.fromLocation,
            toLocation: item.toLocation,
            destination: item.destination,
            durationDays: item.durationDays,
            durationNights: item.durationNights,
            galleryCount: item.images?.length,
            packageContextJson: buildPackageContext(item),
          },
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'AI generation failed');
      }

      setAiSuggestion({
        seoTitle: String(body.seoTitle || ''),
        seoDescription: String(body.seoDescription || ''),
        targetKeyword: String(body.targetKeyword || ''),
        reasoning: String(body.reasoning || ''),
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleResearch() {
    setResearchError(null);
    setResearchLoading(true);
    try {
      const response = await fetch('/api/seo/keywords/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          keyword: targetKeyword || item.name,
          itemType: item.type,
          itemName: item.name,
          itemDescription: item.description?.slice(0, 3000),
          itemContext: {
            packageContextJson: buildPackageContext(item),
            duration: safeNumber(item.duration),
            durationDays: safeNumber(item.durationDays),
            durationNights: safeNumber(item.durationNights),
            destination: item.destination,
            amenities: item.amenities,
            inclusions: item.inclusions,
            exclusions: item.exclusions,
          },
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || 'Keyword research failed');
      }
      setResearchResult(body as KeywordResearchDTO);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : 'Keyword research failed');
    } finally {
      setResearchLoading(false);
    }
  }

  async function loadBriefs() {
    if (!contentType) return;
    setBriefLoading(true);
    setBriefError(null);
    try {
      const params = new URLSearchParams({
        websiteId,
        pageType: item.type,
        pageId: item.id,
        locale,
      });
      const response = await fetch(`/api/seo/content-intelligence/briefs?${params.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'No se pudo cargar briefs');
      }
      const payload = body.data as {
        rows: BriefRow[];
        sourceMeta?: SourceMeta;
      };
      setBriefRows(payload.rows ?? []);
      setBriefSourceMeta(payload.sourceMeta ?? null);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'No se pudo cargar briefs');
    } finally {
      setBriefLoading(false);
    }
  }

  async function handleCreateBrief() {
    if (!contentType) {
      setBriefError('Brief no habilitado para este tipo de item');
      return;
    }
    setBriefActionLoading(true);
    setBriefError(null);
    try {
      const secondary = briefSecondaryKeywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean);
      const response = await fetch('/api/seo/content-intelligence/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          websiteId,
          locale,
          contentType,
          pageType: item.type,
          pageId: item.id,
          primaryKeyword: briefPrimaryKeyword || targetKeyword || item.name,
          secondaryKeywords: secondary,
          brief: {
            summary: briefSummary,
            objective: `Optimizar ${item.type} para intención SEO`,
            sourceTitle: item.name,
          },
          changeReason: 'manual-create',
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'No se pudo crear brief');
      }
      await loadBriefs();
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'No se pudo crear brief');
    } finally {
      setBriefActionLoading(false);
    }
  }

  async function handleBriefTransition(action: 'approve' | 'archive') {
    if (!activeBrief) {
      setBriefError('No hay brief para cambiar estado');
      return;
    }
    setBriefActionLoading(true);
    setBriefError(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          websiteId,
          briefId: activeBrief.id,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || `No se pudo ejecutar ${action}`);
      }
      await loadBriefs();
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : `No se pudo ejecutar ${action}`);
    } finally {
      setBriefActionLoading(false);
    }
  }

  async function handleBriefRollback(version: number) {
    if (!activeBrief) {
      setBriefError('No hay brief para rollback');
      return;
    }
    setBriefActionLoading(true);
    setBriefError(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rollback',
          websiteId,
          briefId: activeBrief.id,
          version,
          changeReason: 'manual-rollback',
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'No se pudo hacer rollback');
      }
      await loadBriefs();
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'No se pudo hacer rollback');
    } finally {
      setBriefActionLoading(false);
    }
  }

  function buildOptimizePatch() {
    const patch: Record<string, unknown> = {};
    if (seoTitle.trim()) patch.seoTitle = seoTitle.trim();
    if (seoDescription.trim()) patch.seoDescription = seoDescription.trim();
    if (targetKeyword.trim()) patch.targetKeyword = targetKeyword.trim();

    if (transactionalType) {
      if (seoIntro.trim()) patch.seo_intro = seoIntro.trim();
      const highlights = seoHighlights
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (highlights.length > 0) patch.seo_highlights = highlights;
      const faq = seoFaq
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ question: line, answer: '' }));
      if (faq.length > 0) patch.seo_faq = faq;
    }

    return patch;
  }

  async function runOptimize(mode: 'suggest' | 'apply') {
    if (!optimizeEnabled) {
      setOptimizeError('Optimize no habilitado para este tipo de item');
      return;
    }
    setOptimizeLoading(true);
    setOptimizeError(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          itemType: item.type,
          itemId: item.id,
          locale,
          mode,
          briefId: activeBrief?.id ?? undefined,
          patch: buildOptimizePatch(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || `No se pudo ${mode === 'suggest' ? 'sugerir' : 'aplicar'} optimize`);
      }
      const payload = body.data as {
        suggestions?: OptimizeSuggestion[];
        action?: {
          id: string;
          score_before: number | null;
          score_after: number | null;
          created_at: string;
        };
        sourceMeta?: SourceMeta;
      };
      setOptimizeSourceMeta(payload.sourceMeta ?? null);
      if (mode === 'suggest') {
        setOptimizeSuggestions(payload.suggestions ?? []);
        setOptimizeApplyResult(null);
      } else {
        setOptimizeSuggestions([]);
        if (payload.action) {
          setOptimizeApplyResult({
            actionId: payload.action.id,
            scoreBefore: payload.action.score_before,
            scoreAfter: payload.action.score_after,
            createdAt: payload.action.created_at,
          });
        } else {
          setOptimizeApplyResult(null);
        }
      }
    } catch (err) {
      setOptimizeError(err instanceof Error ? err.message : 'Optimize falló');
    } finally {
      setOptimizeLoading(false);
    }
  }

  async function loadVariantStatus() {
    if (!translateEnabled) return;
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('seo_localized_variants')
      .select('status, source, fetched_at, confidence')
      .eq('website_id', websiteId)
      .eq('page_type', item.type)
      .eq('source_entity_id', item.id)
      .eq('target_locale', targetLocale)
      .maybeSingle();
    if (!data) {
      setVariantStatus(null);
      setVariantSourceMeta(null);
      return;
    }
    setVariantStatus((data.status as string) ?? null);
    setVariantSourceMeta({
      source: String(data.source ?? 'database'),
      fetchedAt: String(data.fetched_at ?? new Date().toISOString()),
      confidence: (data.confidence as SourceMeta['confidence']) ?? 'partial',
    });
  }

  async function loadTargetCatalog() {
    if (!translateEnabled) return;
    setTargetCatalogLoading(true);
    try {
      const params = new URLSearchParams({
        websiteId,
        pageType: item.type,
        locale: targetLocale,
        limit: '120',
      });
      if (targetCatalogSearch.trim()) {
        params.set('search', targetCatalogSearch.trim());
      }
      const response = await fetch(`/api/seo/content-intelligence/page-catalog?${params.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'Unable to load target content catalog');
      }
      const payload = body.data as { rows: TargetCatalogRow[] };
      setTargetCatalogRows(payload.rows ?? []);
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Unable to load target content catalog');
    } finally {
      setTargetCatalogLoading(false);
    }
  }

  function nextTranslateAction(): 'create_draft' | 'review' | 'apply' | null {
    if (translateStatus === 'applied') return null;
    if (translateStatus === 'reviewed') return 'apply';
    if (translateStatus === 'draft') return 'review';
    return 'create_draft';
  }

  function nextTranslateActionLabel(): string {
    const action = nextTranslateAction();
    if (action === 'review') return 'Step 2: Mark Reviewed';
    if (action === 'apply') return 'Step 3: Apply';
    if (action === 'create_draft') return 'Step 1: Create Draft';
    return 'Completed';
  }

  async function queueDecisionSync() {
    setTrackSyncing(true);
    try {
      const response = await fetch('/api/seo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          includeDataForSeo: true,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error?.message || body?.error || 'Unable to queue sync');
      }
      setTrackWarning({
        code: 'SYNC_QUEUED',
        message: body?.requestId ? `Sync requested (${body.requestId})` : 'Sync requested',
      });
      setTrackWarningDetails(body ?? null);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : 'Unable to queue sync');
    } finally {
      setTrackSyncing(false);
    }
  }

  async function handleTranscreateAction(action: 'create_draft' | 'review' | 'apply') {
    if (!translateEnabled) {
      setTranslateError('Translate no habilitado para este tipo de item');
      return;
    }
    setTranslateLoading(true);
    setTranslateError(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/transcreate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          websiteId,
          sourceContentId: item.id,
          targetContentId: targetContentId || undefined,
          pageType: item.type,
          sourceLocale: locale,
          targetLocale,
          country: targetCountry,
          language: targetLanguage,
          sourceKeyword: targetKeyword || undefined,
          targetKeyword: targetKeyword || undefined,
          draft: {
            title: translateTitle,
            seoTitle: translateSeoTitle,
            seoDescription: translateSeoDescription,
          },
          jobId: translateJobId || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || `No se pudo ejecutar ${action}`);
      }
      const payload = body.data as {
        job?: { id: string; status: 'draft' | 'reviewed' | 'applied' };
        sourceMeta?: SourceMeta;
      };
      if (payload.job?.id) setTranslateJobId(payload.job.id);
      if (payload.job?.status) setTranslateStatus(payload.job.status);
      setTranslateSourceMeta(payload.sourceMeta ?? null);
      await loadVariantStatus();
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : `No se pudo ejecutar ${action}`);
    } finally {
      setTranslateLoading(false);
    }
  }

  async function loadTrack() {
    setTrackLoading(true);
    setTrackError(null);
    setTrackWarning(null);
    setTrackWarningDetails(null);
    try {
      const params = new URLSearchParams({
        websiteId,
        from: trackFrom,
        to: trackTo,
        locale,
        decisionGradeOnly: trackDecisionGradeOnly ? 'true' : 'false',
      });
      if (contentType) params.set('contentType', contentType);
      const response = await fetch(`/api/seo/content-intelligence/track?${params.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        const errorCode = body?.error?.code as string | undefined;
        const errorMessage = body?.error?.message as string | undefined;
        const errorDetails = body?.error?.details;
        if (errorCode) {
          setTrackWarning({ code: errorCode, message: errorMessage ?? 'Tracking blocked' });
          setTrackWarningDetails(errorDetails ?? null);
        }
        setTrackPageMetrics([]);
        setTrackClusterMetrics([]);
        setTrackSourceMeta(null);
        if (errorCode === 'DECISION_GRADE_BLOCKED' || errorCode === 'AUTHORITATIVE_SOURCE_REQUIRED') {
          return;
        }
        throw new Error(errorMessage || 'No se pudo cargar tracking');
      }
      const payload = body.data as {
        pageMetrics: TrackPageMetric[];
        clusterMetrics: TrackClusterMetric[];
        sourceMeta?: SourceMeta;
        warning?: { code: string; message: string } | null;
      };
      setTrackSourceMeta(payload.sourceMeta ?? null);
      setTrackWarning(payload.warning ?? null);
      setTrackPageMetrics(
        (payload.pageMetrics ?? []).filter((metric) => metric.page_id === item.id && metric.page_type === item.type),
      );
      setTrackClusterMetrics(payload.clusterMetrics ?? []);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : 'No se pudo cargar tracking');
    } finally {
      setTrackLoading(false);
    }
  }

  function renderCheckGroup(title: string, checks: SeoCheck[]) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-[var(--studio-text)]">{title}</h4>
        <div className="space-y-1">
          {checks.map((check) => (
            <div key={check.id} className="flex items-center justify-between p-2 rounded border border-[var(--studio-border)]">
              <span className="text-sm text-[var(--studio-text)]">{check.message}</span>
              <StudioBadge tone={check.pass ? 'success' : 'danger'}>
                {check.pass ? 'OK' : 'Issue'}
              </StudioBadge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-sm text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
          >
            Volver
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--studio-text)]">{item.name}</h1>
            <p className="text-sm text-[var(--studio-text-muted)] capitalize">{item.type}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {['es-CO', 'es-MX', 'en-US'].map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocale(loc)}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded border',
                    locale === loc
                      ? 'bg-[var(--studio-accent)] text-white border-[var(--studio-accent)]'
                      : 'border-[var(--studio-border)] text-[var(--studio-text-muted)]'
                  )}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StudioBadge tone={GRADE_TONE[result.grade] || 'warning'}>
            {result.grade} ({result.overall}/100)
          </StudioBadge>
          <StudioButton onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </StudioButton>
        </div>
      </div>

      <StudioTabs value={activeTab} onChange={(value) => setActiveTab(value as DetailTab)} options={tabOptions} />

      {activeTab === 'meta' && (
        <div className="space-y-4 studio-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">Meta fields</h3>
            <StudioButton size="sm" variant="outline" onClick={handleGenerateAi} disabled={aiLoading}>
              {aiLoading ? 'Generando...' : 'Generar con IA'}
            </StudioButton>
          </div>

          {aiError && (
            <div className="text-sm text-[var(--studio-danger)] border border-[var(--studio-danger)]/30 rounded p-2">
              {aiError}
            </div>
          )}

          {aiSuggestion && (
            <div className="space-y-2 border border-[var(--studio-border)] rounded p-3">
              <p className="text-xs text-[var(--studio-text-muted)]">Sugerencia IA</p>
              <p className="text-sm text-[var(--studio-text)]"><strong>Title:</strong> {aiSuggestion.seoTitle}</p>
              <p className="text-sm text-[var(--studio-text)]"><strong>Description:</strong> {aiSuggestion.seoDescription}</p>
              <p className="text-sm text-[var(--studio-text)]"><strong>Keyword:</strong> {aiSuggestion.targetKeyword}</p>
              <p className="text-xs text-[var(--studio-text-muted)]">{aiSuggestion.reasoning}</p>
              <div className="flex gap-2">
                <StudioButton
                  size="sm"
                  onClick={() => {
                    setSeoTitle(aiSuggestion.seoTitle);
                    setSeoDescription(aiSuggestion.seoDescription);
                    setTargetKeyword(aiSuggestion.targetKeyword);
                  }}
                >
                  Aplicar todo
                </StudioButton>
                <StudioButton size="sm" variant="outline" onClick={() => setAiSuggestion(null)}>
                  Descartar
                </StudioButton>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-[var(--studio-text-muted)]">SEO Title ({seoTitle.length}/70)</label>
            <StudioInput value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--studio-text-muted)]">Meta Description ({seoDescription.length}/160)</label>
            <StudioTextarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={4} maxLength={170} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--studio-text-muted)]">Target Keyword</label>
            <StudioInput value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)} />
          </div>

          {isProductType && (
            <>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[var(--studio-text-muted)]">Custom highlights ({customHighlights.length}/6)</label>
                  <StudioButton
                    size="sm"
                    variant="outline"
                    disabled={customHighlights.length >= 6}
                    onClick={() => setCustomHighlights((prev) => [...prev, ''])}
                  >
                    Agregar
                  </StudioButton>
                </div>
                {customHighlights.map((highlight, index) => (
                  <div key={`highlight-${index}`} className="flex items-center gap-2">
                    <StudioInput
                      value={highlight}
                      onChange={(event) => {
                        const next = [...customHighlights];
                        next[index] = event.target.value;
                        setCustomHighlights(next);
                      }}
                    />
                    <StudioButton size="sm" variant="outline" disabled={index === 0} onClick={() => moveHighlight(index, -1)}>
                      ↑
                    </StudioButton>
                    <StudioButton
                      size="sm"
                      variant="outline"
                      disabled={index === customHighlights.length - 1}
                      onClick={() => moveHighlight(index, 1)}
                    >
                      ↓
                    </StudioButton>
                    <StudioButton
                      size="sm"
                      variant="outline"
                      onClick={() => setCustomHighlights((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Eliminar
                    </StudioButton>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[var(--studio-text-muted)]">Custom FAQ ({customFaq.length}/10)</label>
                  <StudioButton
                    size="sm"
                    variant="outline"
                    disabled={customFaq.length >= 10}
                    onClick={() => setCustomFaq((prev) => [...prev, { question: '', answer: '' }])}
                  >
                    Agregar
                  </StudioButton>
                </div>
                {customFaq.map((faq, index) => (
                  <div key={`faq-${index}`} className="space-y-2 rounded border border-[var(--studio-border)] p-3">
                    <StudioInput
                      value={faq.question}
                      placeholder="Pregunta"
                      onChange={(event) => {
                        const next = [...customFaq];
                        next[index] = { ...next[index], question: event.target.value };
                        setCustomFaq(next);
                      }}
                    />
                    <StudioTextarea
                      value={faq.answer}
                      placeholder="Respuesta"
                      rows={3}
                      onChange={(event) => {
                        const next = [...customFaq];
                        next[index] = { ...next[index], answer: event.target.value };
                        setCustomFaq(next);
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <StudioButton size="sm" variant="outline" disabled={index === 0} onClick={() => moveFaq(index, -1)}>
                        Subir
                      </StudioButton>
                      <StudioButton
                        size="sm"
                        variant="outline"
                        disabled={index === customFaq.length - 1}
                        onClick={() => moveFaq(index, 1)}
                      >
                        Bajar
                      </StudioButton>
                      <StudioButton
                        size="sm"
                        variant="outline"
                        onClick={() => setCustomFaq((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Eliminar
                      </StudioButton>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'brief' && (
        <div className="space-y-4 studio-card p-4">
          {!contentType ? (
            <p className="text-sm text-[var(--studio-text-muted)]">
              Brief no está habilitado para este tipo de item.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--studio-text)]">Brief workflow</h3>
                <div className="flex items-center gap-2">
                  <StudioButton size="sm" variant="outline" onClick={() => void loadBriefs()} disabled={briefLoading}>
                    {briefLoading ? 'Cargando...' : 'Refresh'}
                  </StudioButton>
                  <StudioButton size="sm" onClick={handleCreateBrief} disabled={briefActionLoading}>
                    {briefActionLoading ? 'Guardando...' : 'Create Draft'}
                  </StudioButton>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">Primary keyword</label>
                  <StudioInput value={briefPrimaryKeyword} onChange={(event) => setBriefPrimaryKeyword(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">Secondary keywords (comma separated)</label>
                  <StudioInput value={briefSecondaryKeywords} onChange={(event) => setBriefSecondaryKeywords(event.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--studio-text-muted)]">Brief summary</label>
                <StudioTextarea value={briefSummary} onChange={(event) => setBriefSummary(event.target.value)} rows={4} />
              </div>

              {briefSourceMeta ? (
                <SeoTrustState source={briefSourceMeta.source} fetchedAt={briefSourceMeta.fetchedAt} confidence={briefSourceMeta.confidence} />
              ) : null}

              {briefError ? (
                <p className="text-sm text-[var(--studio-danger)]">{briefError}</p>
              ) : null}

              {activeBrief ? (
                <div className="space-y-3">
                  <div className="border border-[var(--studio-border)] rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <StudioBadge tone={activeBrief.status === 'approved' ? 'success' : activeBrief.status === 'archived' ? 'neutral' : 'warning'}>
                        {activeBrief.status}
                      </StudioBadge>
                      <span className="text-xs text-[var(--studio-text-muted)]">Brief ID {activeBrief.id}</span>
                    </div>
                    <pre className="text-xs bg-slate-950 text-slate-100 p-3 rounded overflow-x-auto">
                      {JSON.stringify(activeBrief.brief, null, 2)}
                    </pre>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StudioButton
                      size="sm"
                      onClick={() => void handleBriefTransition('approve')}
                      disabled={briefActionLoading || activeBrief.status === 'approved'}
                    >
                      Approve
                    </StudioButton>
                    <StudioButton
                      size="sm"
                      variant="outline"
                      onClick={() => void handleBriefTransition('archive')}
                      disabled={briefActionLoading || activeBrief.status === 'archived'}
                    >
                      Archive
                    </StudioButton>
                  </div>

                  <div className="border border-[var(--studio-border)] rounded p-3">
                    <p className="text-xs text-[var(--studio-text-muted)] mb-2">Version history</p>
                    <div className="space-y-2">
                      {(activeBrief.versions ?? []).map((version) => (
                        <div key={version.version} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[var(--studio-text)]">v{version.version}</p>
                            <p className="text-xs text-[var(--studio-text-muted)]">
                              {version.change_reason || 'n/a'} · {new Date(version.created_at).toLocaleString()}
                            </p>
                          </div>
                          <StudioButton
                            size="sm"
                            variant="outline"
                            onClick={() => void handleBriefRollback(version.version)}
                            disabled={briefActionLoading}
                          >
                            Rollback
                          </StudioButton>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--studio-text-muted)]">
                  Aún no hay briefs para este item/locale.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'optimize' && (
        <div className="space-y-4 studio-card p-4">
          {!optimizeEnabled ? (
            <p className="text-sm text-[var(--studio-text-muted)]">
              Optimize no está habilitado para este tipo de item.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--studio-text)]">Optimize</h3>
                <div className="flex items-center gap-2">
                  <StudioButton
                    size="sm"
                    variant="outline"
                    onClick={() => void runOptimize('suggest')}
                    disabled={optimizeLoading}
                  >
                    {optimizeLoading ? 'Procesando...' : 'Suggest'}
                  </StudioButton>
                  <StudioButton
                    size="sm"
                    onClick={() => void runOptimize('apply')}
                    disabled={optimizeLoading}
                  >
                    Apply
                  </StudioButton>
                </div>
              </div>

              {!activeBrief || activeBrief.status !== 'approved' ? (
                <p className="text-xs text-[var(--studio-warning)]">
                  Requiere brief aprobado para ejecutar optimize.
                </p>
              ) : null}

              {transactionalType ? (
                <div className="text-xs text-[var(--studio-text-muted)] border border-[var(--studio-border)] rounded p-2">
                  Guardrail activo: `package/activity` solo permite SEO layer (title/description/keyword + intro/highlights/faq).
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">SEO title</label>
                  <StudioInput value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">Target keyword</label>
                  <StudioInput value={targetKeyword} onChange={(event) => setTargetKeyword(event.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--studio-text-muted)]">SEO description</label>
                <StudioTextarea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} rows={3} />
              </div>

              {transactionalType ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--studio-text-muted)]">SEO intro</label>
                    <StudioTextarea value={seoIntro} onChange={(event) => setSeoIntro(event.target.value)} rows={3} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--studio-text-muted)]">SEO highlights (one per line)</label>
                    <StudioTextarea value={seoHighlights} onChange={(event) => setSeoHighlights(event.target.value)} rows={4} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--studio-text-muted)]">SEO FAQ questions (one per line)</label>
                    <StudioTextarea value={seoFaq} onChange={(event) => setSeoFaq(event.target.value)} rows={4} />
                  </div>
                </>
              ) : null}

              <SeoNlpScorePanel
                active={activeTab === 'optimize'}
                websiteId={websiteId}
                itemType={item.type}
                locale={locale}
                keyword={targetKeyword || item.name}
                content={nlpScoreContent}
              />

              {optimizeSourceMeta ? (
                <SeoTrustState source={optimizeSourceMeta.source} fetchedAt={optimizeSourceMeta.fetchedAt} confidence={optimizeSourceMeta.confidence} />
              ) : null}

              {optimizeError ? (
                <p className="text-sm text-[var(--studio-danger)]">{optimizeError}</p>
              ) : null}

              {optimizeSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {optimizeSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="border border-[var(--studio-border)] rounded p-3">
                      <p className="text-sm font-medium text-[var(--studio-text)]">{suggestion.field}</p>
                      <p className="text-xs text-[var(--studio-text-muted)]">Before: {suggestion.before || 'n/a'}</p>
                      <p className="text-xs text-[var(--studio-text)]">After: {suggestion.after}</p>
                      <p className="text-xs text-[var(--studio-text-muted)]">
                        Score {suggestion.scoreBefore} → {suggestion.scoreAfter}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {optimizeApplyResult ? (
                <div className="border border-[var(--studio-border)] rounded p-3">
                  <p className="text-sm font-medium text-[var(--studio-text)]">Apply result</p>
                  <p className="text-xs text-[var(--studio-text-muted)]">
                    Score {optimizeApplyResult.scoreBefore ?? 'n/a'} → {optimizeApplyResult.scoreAfter ?? 'n/a'}
                  </p>
                  <p className="text-xs text-[var(--studio-text-muted)]">
                    Action {optimizeApplyResult.actionId} · {new Date(optimizeApplyResult.createdAt).toLocaleString()}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {activeTab === 'translate' && (
        <div className="space-y-4 studio-card p-4">
          {!translateEnabled ? (
            <p className="text-sm text-[var(--studio-text-muted)]">
              Translate está disponible para blog/page/destination.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">Source locale</label>
                  <StudioInput value={locale} disabled />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">Target locale</label>
                  <StudioInput value={targetLocale} onChange={(event) => setTargetLocale(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">Country</label>
                  <StudioInput value={targetCountry} onChange={(event) => setTargetCountry(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">Language</label>
                  <StudioInput value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} />
                </div>
              </div>

              <div className="space-y-2 border border-[var(--studio-border)] rounded p-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-[var(--studio-text-muted)]">Target content (optional)</label>
                  <StudioButton size="sm" variant="outline" onClick={() => void loadTargetCatalog()} disabled={targetCatalogLoading}>
                    {targetCatalogLoading ? 'Loading...' : 'Refresh catalog'}
                  </StudioButton>
                </div>
                <StudioInput
                  value={targetCatalogSearch}
                  onChange={(event) => setTargetCatalogSearch(event.target.value)}
                  placeholder="Search target content by title or slug"
                />
                <StudioSelect
                  value={targetContentId}
                  onChange={(event: { target: { value: string } }) => setTargetContentId(event.target.value)}
                  options={[
                    { value: '', label: targetCatalogRows.length ? 'Create/update from source without direct target binding' : 'No target content found' },
                    ...targetCatalogRows.map((row) => ({
                      value: row.pageId,
                      label: `${row.label} (${row.slug || row.pageId.slice(0, 8)})`,
                    })),
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">Draft title</label>
                  <StudioInput value={translateTitle} onChange={(event) => setTranslateTitle(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--studio-text-muted)]">Draft SEO title</label>
                  <StudioInput value={translateSeoTitle} onChange={(event) => setTranslateSeoTitle(event.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--studio-text-muted)]">Draft SEO description</label>
                <StudioTextarea value={translateSeoDescription} onChange={(event) => setTranslateSeoDescription(event.target.value)} rows={3} />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StudioBadge tone={translateStatus === 'applied' ? 'success' : translateStatus === 'reviewed' ? 'info' : 'warning'}>
                    {translateStatus ?? 'not-started'}
                  </StudioBadge>
                  {variantStatus ? (
                    <StudioBadge tone={variantStatus === 'applied' ? 'success' : variantStatus === 'reviewed' ? 'info' : 'warning'}>
                      Variant: {variantStatus}
                    </StudioBadge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <StudioButton
                    onClick={() => {
                      const action = nextTranslateAction();
                      if (!action) return;
                      void handleTranscreateAction(action);
                    }}
                    disabled={translateLoading || !nextTranslateAction()}
                  >
                    {translateLoading ? 'Procesando...' : nextTranslateActionLabel()}
                  </StudioButton>
                  <StudioButton
                    variant="outline"
                    onClick={() => setTranslateAdvancedOpen((prev) => !prev)}
                  >
                    {translateAdvancedOpen ? 'Hide advanced details' : 'Advanced details'}
                  </StudioButton>
                </div>
                {translateAdvancedOpen ? (
                  <div className="space-y-2 border border-[var(--studio-border)] rounded p-3">
                    <p className="text-xs text-[var(--studio-text-muted)]">
                      Advanced mode (for operators): direct transitions and manual job id fallback.
                    </p>
                    <StudioInput
                      value={translateJobId}
                      onChange={(event) => setTranslateJobId(event.target.value)}
                      placeholder="Job ID (optional)"
                    />
                    <div className="flex flex-wrap gap-2">
                      <StudioButton variant="outline" onClick={() => void handleTranscreateAction('create_draft')} disabled={translateLoading}>
                        Force Create Draft
                      </StudioButton>
                      <StudioButton variant="outline" onClick={() => void handleTranscreateAction('review')} disabled={translateLoading}>
                        Force Review
                      </StudioButton>
                      <StudioButton variant="outline" onClick={() => void handleTranscreateAction('apply')} disabled={translateLoading}>
                        Force Apply
                      </StudioButton>
                    </div>
                  </div>
                ) : null}
              </div>

              {variantStatus ? (
                <div className="space-y-1">
                  <StudioBadge tone={variantStatus === 'applied' ? 'success' : variantStatus === 'reviewed' ? 'info' : 'warning'}>
                    Variant: {variantStatus}
                  </StudioBadge>
                  {variantSourceMeta ? (
                    <SeoTrustState source={variantSourceMeta.source} fetchedAt={variantSourceMeta.fetchedAt} confidence={variantSourceMeta.confidence} />
                  ) : null}
                </div>
              ) : null}

              {translateSourceMeta ? (
                <SeoTrustState source={translateSourceMeta.source} fetchedAt={translateSourceMeta.fetchedAt} confidence={translateSourceMeta.confidence} />
              ) : null}

              {translateError ? (
                <p className="text-sm text-[var(--studio-danger)]">{translateError}</p>
              ) : null}
            </>
          )}
        </div>
      )}

      {activeTab === 'track' && (
        <div className="space-y-4 studio-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[var(--studio-text-muted)]">From</label>
              <StudioInput type="date" value={trackFrom} onChange={(event) => setTrackFrom(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--studio-text-muted)]">To</label>
              <StudioInput type="date" value={trackTo} onChange={(event) => setTrackTo(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--studio-text-muted)]">Locale</label>
              <StudioInput value={locale} onChange={(event) => setLocale(event.target.value)} />
            </div>
            <div className="flex items-end">
              <StudioButton onClick={() => void loadTrack()} disabled={trackLoading}>
                {trackLoading ? 'Loading...' : 'Load Track'}
              </StudioButton>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-[var(--studio-text-muted)]">
            <input
              type="checkbox"
              checked={trackDecisionGradeOnly}
              onChange={(event) => setTrackDecisionGradeOnly(event.target.checked)}
            />
            Decision-grade only (live + authoritative)
          </label>

          {trackWarning ? (
            <div className="text-xs text-[var(--studio-warning)] border border-[var(--studio-warning)]/30 rounded p-2 space-y-2">
              <p>{trackWarning.code}: {trackWarning.message}</p>
              <div className="flex flex-wrap gap-2">
                <StudioButton size="sm" variant="outline" onClick={() => void queueDecisionSync()} disabled={trackSyncing}>
                  {trackSyncing ? 'Queueing sync...' : 'Sync now'}
                </StudioButton>
                <StudioButton size="sm" variant="outline" onClick={() => void loadTrack()} disabled={trackLoading}>
                  Retry
                </StudioButton>
              </div>
              {trackWarningDetails ? (
                <pre className="text-[10px] bg-slate-950 text-slate-100 rounded p-2 overflow-x-auto">
                  {JSON.stringify(trackWarningDetails, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
          {trackError ? (
            <p className="text-sm text-[var(--studio-danger)]">{trackError}</p>
          ) : null}
          {trackSourceMeta ? (
            <SeoTrustState source={trackSourceMeta.source} fetchedAt={trackSourceMeta.fetchedAt} confidence={trackSourceMeta.confidence} />
          ) : null}

          <div className="border border-[var(--studio-border)] rounded p-3 overflow-x-auto">
            <p className="text-xs text-[var(--studio-text-muted)] mb-2">Page metrics (item scoped)</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-[var(--studio-border)]">
                  <th className="py-1">Date</th>
                  <th className="py-1">Clicks</th>
                  <th className="py-1">Impressions</th>
                  <th className="py-1">CTR</th>
                  <th className="py-1">Avg pos</th>
                  <th className="py-1">Sessions</th>
                  <th className="py-1">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {trackPageMetrics.map((metric) => (
                  <tr key={`${metric.metric_date}-${metric.page_id}`} className="border-b border-[var(--studio-border)]/40">
                    <td className="py-1">{metric.metric_date}</td>
                    <td className="py-1">{metric.clicks}</td>
                    <td className="py-1">{metric.impressions}</td>
                    <td className="py-1">{(metric.ctr * 100).toFixed(2)}%</td>
                    <td className="py-1">{metric.avg_position ?? '-'}</td>
                    <td className="py-1">{metric.sessions}</td>
                    <td className="py-1">{metric.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trackPageMetrics.length === 0 ? (
              <p className="text-xs text-[var(--studio-text-muted)] mt-2">No page metrics for selected range.</p>
            ) : null}
          </div>

          <div className="border border-[var(--studio-border)] rounded p-3 overflow-x-auto">
            <p className="text-xs text-[var(--studio-text-muted)] mb-2">Cluster metrics (locale scoped)</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-[var(--studio-border)]">
                  <th className="py-1">Date</th>
                  <th className="py-1">Cluster</th>
                  <th className="py-1">Clicks</th>
                  <th className="py-1">Impressions</th>
                  <th className="py-1">CTR</th>
                  <th className="py-1">Avg pos</th>
                  <th className="py-1">Pages tracked</th>
                </tr>
              </thead>
              <tbody>
                {trackClusterMetrics.map((metric) => (
                  <tr key={`${metric.metric_date}-${metric.cluster_id}`} className="border-b border-[var(--studio-border)]/40">
                    <td className="py-1">{metric.metric_date}</td>
                    <td className="py-1">{metric.cluster_id}</td>
                    <td className="py-1">{metric.clicks}</td>
                    <td className="py-1">{metric.impressions}</td>
                    <td className="py-1">{(metric.ctr * 100).toFixed(2)}%</td>
                    <td className="py-1">{metric.avg_position ?? '-'}</td>
                    <td className="py-1">{metric.pages_tracked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trackClusterMetrics.length === 0 ? (
              <p className="text-xs text-[var(--studio-text-muted)] mt-2">No cluster metrics for selected range.</p>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === 'research' && (
        <div className="space-y-4 studio-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">Keyword Research</h3>
            <StudioButton size="sm" onClick={handleResearch} disabled={researchLoading}>
              {researchLoading ? 'Investigando...' : 'Run research'}
            </StudioButton>
          </div>

          {researchError && (
            <div className="text-sm text-[var(--studio-danger)] border border-[var(--studio-danger)]/30 rounded p-2">
              {researchError}
            </div>
          )}

          {researchResult ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-[var(--studio-border)] rounded p-3">
                  <p className="text-xs text-[var(--studio-text-muted)]">Mode</p>
                  <p className="text-sm text-[var(--studio-text)]">{researchResult.mode}</p>
                </div>
                <div className="border border-[var(--studio-border)] rounded p-3">
                  <p className="text-xs text-[var(--studio-text-muted)]">Primary keyword</p>
                  <p className="text-sm text-[var(--studio-text)]">{researchResult.recommendation.primaryKeyword}</p>
                </div>
              </div>

              {researchResult.searchConsoleData && (
                <div className="border border-[var(--studio-border)] rounded p-3">
                  <p className="text-xs text-[var(--studio-text-muted)] mb-2">Search Console data</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>Impressions: {researchResult.searchConsoleData.impressions}</div>
                    <div>Clicks: {researchResult.searchConsoleData.clicks}</div>
                    <div>CTR: {(researchResult.searchConsoleData.ctr * 100).toFixed(2)}%</div>
                    <div>Avg Position: {researchResult.searchConsoleData.avgPosition.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {researchResult.relatedQueries.length > 0 && (
                <div className="border border-[var(--studio-border)] rounded p-3">
                  <p className="text-xs text-[var(--studio-text-muted)] mb-2">Related queries</p>
                  <div className="space-y-1 text-sm">
                    {researchResult.relatedQueries.map((query) => (
                      <div key={`${query.query}-${query.position}`} className="flex items-center justify-between">
                        <span>{query.query}</span>
                        <span className="text-[var(--studio-text-muted)]">Pos {query.position.toFixed(1)} · {query.impressions} imp</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-[var(--studio-border)] rounded p-3">
                <p className="text-xs text-[var(--studio-text-muted)] mb-2">Content brief</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-[var(--studio-text)]">
                  {researchResult.recommendation.contentBrief.map((brief) => (
                    <li key={brief}>{brief}</li>
                  ))}
                </ul>
                <p className="text-xs text-[var(--studio-text-muted)] mt-2">{researchResult.recommendation.reasoning}</p>
              </div>

              {researchResult.message && (
                <div className="text-xs text-[var(--studio-text-muted)]">{researchResult.message}</div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--studio-text-muted)]">
              Ejecuta el research para combinar GSC + IA. Si no hay GSC conectado, usa fallback IA con contexto del contenido.
            </p>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4 studio-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border border-[var(--studio-border)] rounded p-3">
              <p className="text-xs text-[var(--studio-text-muted)]">Meta score</p>
              <p className="text-xl font-semibold text-[var(--studio-text)]">{result.dimensions.meta}</p>
            </div>
            <div className="border border-[var(--studio-border)] rounded p-3">
              <p className="text-xs text-[var(--studio-text-muted)]">Content score</p>
              <p className="text-xl font-semibold text-[var(--studio-text)]">{result.dimensions.content}</p>
            </div>
            <div className="border border-[var(--studio-border)] rounded p-3">
              <p className="text-xs text-[var(--studio-text-muted)]">Technical score</p>
              <p className="text-xl font-semibold text-[var(--studio-text)]">{result.dimensions.technical}</p>
            </div>
          </div>

          <div className="border border-[var(--studio-border)] rounded p-3">
            <p className="text-xs text-[var(--studio-text-muted)] mb-2">Source content</p>
            <p className="text-sm text-[var(--studio-text)] whitespace-pre-line">{item.description || 'No content available'}</p>
          </div>

          {renderCheckGroup('Meta checks', result.checks.filter((c) => c.dimension === 'meta'))}
          {renderCheckGroup('Content checks', result.checks.filter((c) => c.dimension === 'content'))}
        </div>
      )}

      {activeTab === 'technical' && (
        <div className="space-y-4 studio-card p-4">
          {renderCheckGroup('Technical checks', result.checks.filter((c) => c.dimension === 'technical'))}

          <div className="border border-[var(--studio-border)] rounded p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--studio-text)] font-medium">Indexable page</p>
              <p className="text-xs text-[var(--studio-text-muted)]">
                {robotsNoindex ? 'Hidden from search engines' : 'Visible for search engines'}
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!robotsNoindex}
                onChange={(e) => setRobotsNoindex(!e.target.checked)}
              />
              {!robotsNoindex ? 'ON' : 'OFF'}
            </label>
          </div>

          <div className="border border-[var(--studio-border)] rounded p-3">
            <p className="text-xs text-[var(--studio-text-muted)] mb-2">JSON-LD preview</p>
            <pre className="text-xs bg-slate-950 text-slate-100 p-3 rounded overflow-x-auto">
              {JSON.stringify(jsonLd, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="space-y-4 studio-card p-4">
          <div className="border border-[var(--studio-border)] rounded p-3">
            <p className="text-sm text-blue-700 truncate">{seoTitle || item.name}</p>
            <p className="text-xs text-emerald-700 truncate">
              {baseUrl}/{item.type === 'blog' ? 'blog' : item.type === 'page' ? '' : `${item.type}s`}/{item.slug}
            </p>
            <p className="text-sm text-[var(--studio-text-muted)] mt-1">
              {seoDescription || item.description || 'No description'}
            </p>
          </div>

          <div className="border border-[var(--studio-border)] rounded overflow-hidden max-w-lg">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                width={640}
                height={192}
                unoptimized
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-[var(--studio-border)] flex items-center justify-center text-[var(--studio-text-muted)] text-sm">
                No image
              </div>
            )}
            <div className="p-3">
              <p className="text-xs text-[var(--studio-text-muted)]">{baseUrl.replace(/^https?:\/\//, '')}</p>
              <p className="text-sm font-semibold text-[var(--studio-text)]">{seoTitle || item.name}</p>
              <p className="text-xs text-[var(--studio-text-muted)]">{seoDescription || item.description || ''}</p>
            </div>
          </div>

          {item.slug && ['hotel', 'activity', 'transfer', 'package', 'destination'].includes(item.type) && (
            <div className="border border-[var(--studio-border)] rounded p-3">
              <p className="text-xs text-[var(--studio-text-muted)] mb-2">Live page preview</p>
              <iframe
                src={subdomain ? `/site/${subdomain}/${item.type === 'destination' ? 'destinos' : `${item.type}s`}/${item.slug}` : undefined}
                className="w-full h-[420px] rounded border border-[var(--studio-border)]"
                title="Live preview"
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'score' && (
        <SeoContentScore item={{ id: item.id, type: item.type, websiteId }} />
      )}
    </div>
  );
}

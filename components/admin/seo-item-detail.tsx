'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { StudioTabs, StudioButton, StudioBadge, StudioInput, StudioTextarea } from '@/components/studio/ui/primitives';
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

  const today = useMemo(() => new Date(), []);
  const [trackFrom, setTrackFrom] = useState(formatDateInput(new Date(today.getTime() - 1000 * 60 * 60 * 24 * 30)));
  const [trackTo, setTrackTo] = useState(formatDateInput(today));
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackSourceMeta, setTrackSourceMeta] = useState<SourceMeta | null>(null);
  const [trackWarning, setTrackWarning] = useState<{ code: string; message: string } | null>(null);
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
      await onSave({
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        targetKeyword: targetKeyword || undefined,
        robotsNoindex,
      });
    } finally {
      setSaving(false);
    }
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
        sourceMeta?: SourceMeta;
      };
      setOptimizeSourceMeta(payload.sourceMeta ?? null);
      if (mode === 'suggest') {
        setOptimizeSuggestions(payload.suggestions ?? []);
      } else {
        setOptimizeSuggestions([]);
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

  async function handleTranscreateAction(action: 'create_draft' | 'review' | 'apply') {
    if (!translateEnabled) {
      setTranslateError('Translate no habilitado para este tipo de item');
      return;
    }
    if (action !== 'create_draft' && !translateJobId) {
      setTranslateError('Debes crear draft primero');
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
    try {
      const params = new URLSearchParams({
        websiteId,
        from: trackFrom,
        to: trackTo,
        locale,
      });
      if (contentType) params.set('contentType', contentType);
      const response = await fetch(`/api/seo/content-intelligence/track?${params.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'No se pudo cargar tracking');
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
              <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
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

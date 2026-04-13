'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import {
  StudioPage,
  StudioSectionHeader,
  StudioTabs,
} from '@/components/studio/ui/primitives';
import { SeoOverviewTable } from '@/components/admin/seo-overview-table';
import { BulkSeoModal } from '@/components/admin/bulk-seo-modal';
import {
  scoreItemSeo,
  detectDuplicates,
  type SeoScoringInput,
  type SeoScoringResult,
  type SeoItemType,
} from '@/lib/seo/unified-scorer';

type SeoGrade = 'A' | 'B' | 'C' | 'D' | 'F';
type FilterTab = 'all' | SeoItemType;

const TAB_OPTIONS: ReadonlyArray<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'hotel', label: 'Hoteles' },
  { id: 'activity', label: 'Actividades' },
  { id: 'transfer', label: 'Traslados' },
  { id: 'package', label: 'Paquetes' },
  { id: 'destination', label: 'Destinos' },
  { id: 'page', label: 'Páginas' },
  { id: 'blog', label: 'Blog' },
];

export interface ScoredItem {
  id: string;
  name: string;
  type: SeoItemType;
  image?: string;
  slug: string;
  input: SeoScoringInput;
  result: SeoScoringResult;
  issues: string[];
}

interface SeoOverride {
  product_id: string;
  product_type: string;
  custom_seo_title?: string | null;
  custom_seo_description?: string | null;
  target_keyword?: string | null;
  robots_noindex?: boolean | null;
}

function countWords(text?: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeCsvValue(value: string | number | boolean | undefined | null): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCsv(items: ScoredItem[], filename: string): void {
  const headers = [
    'name', 'type', 'slug', 'seoTitle', 'seoDescription', 'targetKeyword',
    'score', 'grade', 'metaScore', 'contentScore', 'technicalScore',
    'issues', 'wordCount', 'hasImage',
  ];

  const rows = items.map(item => [
    escapeCsvValue(item.name),
    escapeCsvValue(item.type),
    escapeCsvValue(item.slug),
    escapeCsvValue(item.input.seoTitle),
    escapeCsvValue(item.input.seoDescription),
    escapeCsvValue(item.input.targetKeyword),
    escapeCsvValue(item.result.overall),
    escapeCsvValue(item.result.grade),
    escapeCsvValue(item.result.dimensions.meta),
    escapeCsvValue(item.result.dimensions.content),
    escapeCsvValue(item.result.dimensions.technical),
    escapeCsvValue(item.issues.join('; ')),
    escapeCsvValue(item.input.wordCount ?? 0),
    escapeCsvValue(!!item.input.image),
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  // UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildIssues(input: SeoScoringInput, result: SeoScoringResult): string[] {
  const issues: string[] = [];
  if (!input.seoTitle) issues.push('Sin título');
  if (!input.seoDescription) issues.push('Sin descripción');
  if (!input.image) issues.push('Sin imagen');
  if (input.wordCount != null && input.wordCount < 100) issues.push('Thin content');
  if (!input.hasJsonLd) issues.push('Sin schema');
  return issues;
}

export default function SeoDashboardPage() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const [loading, setLoading] = useState(true);
  const [rawItems, setRawItems] = useState<Array<{ id: string; name: string; type: SeoItemType; image?: string; slug: string; input: SeoScoringInput }>>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let active = true;

    async function fetchData() {
      setLoading(true);
      const items: typeof rawItems = [];

      const { data: website } = await supabase
        .from('websites')
        .select('id, account_id, subdomain')
        .eq('id', websiteId)
        .single();

      if (!website || !active) { setLoading(false); return; }

      const accountId = website.account_id;

      // ── Legacy product queries (parallel) ──────────────────────────
      const [hotelsRes, activitiesRes, transfersRes, packagesRes, overridesRes, galleryRes, hotelBridgesRes] = await Promise.all([
        supabase
          .from('hotels')
          .select('id, name, slug, main_image, description, description_short, star_rating, amenities, user_rating, inclutions, exclutions, recomendations, instructions')
          .eq('account_id', accountId)
          .is('deleted_at', null),
        supabase
          .from('activities')
          .select('id, name, slug, main_image, description, description_short, duration_minutes, experience_type, inclutions, exclutions, recomendations, instructions')
          .eq('account_id', accountId)
          .is('deleted_at', null),
        supabase
          .from('transfers')
          .select('id, name, slug, main_image, description, vehicle_type, max_passengers, from_location, to_location, inclutions, exclutions, policies')
          .eq('account_id', accountId)
          .is('deleted_at', null),
        supabase
          .from('package_kits')
          .select('id, name, description, cover_image_url, destination, duration_days, duration_nights, program_highlights, program_inclusions, program_exclusions, program_gallery')
          .eq('account_id', accountId),
        // SEO overrides
        supabase
          .from('website_product_pages')
          .select('product_id, product_type, custom_seo_title, custom_seo_description, target_keyword, robots_noindex')
          .eq('website_id', websiteId),
        // Gallery counts
        supabase
          .from('images')
          .select('entity_id')
          .eq('account_id', accountId),
        // V2 bridge for hotels
        supabase
          .from('account_hotels')
          .select('legacy_hotel_id, master_hotels!inner(city, country, star_rating, user_rating, reviews_count, latitude, longitude)')
          .eq('account_id', accountId)
          .eq('is_active', true)
          .not('legacy_hotel_id', 'is', null),
      ]);

      // Handle errors gracefully (ADR-002)
      if (hotelsRes.error) console.error('[seo.dashboard.hotels]', hotelsRes.error);
      if (activitiesRes.error) console.error('[seo.dashboard.activities]', activitiesRes.error);
      if (transfersRes.error) console.error('[seo.dashboard.transfers]', transfersRes.error);
      if (packagesRes.error) console.error('[seo.dashboard.packages]', packagesRes.error);
      if (overridesRes.error) console.error('[seo.dashboard.overrides]', overridesRes.error);
      if (galleryRes.error) console.error('[seo.dashboard.gallery]', galleryRes.error);
      if (hotelBridgesRes.error) console.error('[seo.dashboard.v2bridge]', hotelBridgesRes.error);

      const hotels = hotelsRes.data ?? [];
      const activitiesData = activitiesRes.data ?? [];
      const transfersData = transfersRes.data ?? [];
      const packagesData = packagesRes.data ?? [];

      // Build override map: "type:legacyId" → override
      const overrideMap = new Map<string, SeoOverride>(
        (overridesRes.data ?? []).map((o: SeoOverride) => [`${o.product_type}:${o.product_id}`, o])
      );

      // Build gallery count map: entityId → count
      const galleryMap = new Map<string, number>();
      for (const img of galleryRes.data ?? []) {
        galleryMap.set(img.entity_id, (galleryMap.get(img.entity_id) ?? 0) + 1);
      }

      // Build V2 hotel bridge map: legacyHotelId → master data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hotelV2Map = new Map<string, any>(
        (hotelBridgesRes.data ?? []).map((b: { legacy_hotel_id: string; master_hotels: unknown }) => [b.legacy_hotel_id, b.master_hotels])
      );

      // ── Merge hotels ─────────────────────────────────────────────────
      for (const h of hotels) {
        const override = overrideMap.get(`hotel:${h.id}`);
        const v2 = hotelV2Map.get(h.id);
        const slug = h.slug || slugify(h.name || '');
        const galleryCount = galleryMap.get(h.id) ?? 0;
        items.push({
          id: h.id,
          name: h.name || 'Sin nombre',
          type: 'hotel',
          image: h.main_image || undefined,
          slug,
          input: {
            type: 'hotel',
            name: h.name || 'Sin nombre',
            slug,
            seoTitle: override?.custom_seo_title || undefined,
            seoDescription: override?.custom_seo_description || undefined,
            targetKeyword: override?.target_keyword || undefined,
            description: h.description || undefined,
            image: h.main_image || undefined,
            images: galleryCount > 0 ? Array(galleryCount).fill('') : undefined,
            amenities: h.amenities,
            starRating: v2?.star_rating ?? h.star_rating,
            latitude: v2?.latitude ?? undefined,
            longitude: v2?.longitude ?? undefined,
            enrichmentRating: v2?.user_rating ?? undefined,
            hasJsonLd: true,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
            wordCount: countWords(h.description),
          },
        });
      }

      // ── Merge activities ──────────────────────────────────────────────
      for (const a of activitiesData) {
        const override = overrideMap.get(`activity:${a.id}`);
        const slug = a.slug || slugify(a.name || '');
        const galleryCount = galleryMap.get(a.id) ?? 0;
        items.push({
          id: a.id,
          name: a.name || 'Sin nombre',
          type: 'activity',
          image: a.main_image || undefined,
          slug,
          input: {
            type: 'activity',
            name: a.name || 'Sin nombre',
            slug,
            seoTitle: override?.custom_seo_title || undefined,
            seoDescription: override?.custom_seo_description || undefined,
            targetKeyword: override?.target_keyword || undefined,
            description: a.description || undefined,
            image: a.main_image || undefined,
            images: galleryCount > 0 ? Array(galleryCount).fill('') : undefined,
            duration: a.duration_minutes,
            inclusions: a.inclutions || undefined,
            hasJsonLd: true,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
            wordCount: countWords(a.description),
          },
        });
      }

      // ── Merge transfers ───────────────────────────────────────────────
      for (const t of transfersData) {
        const override = overrideMap.get(`transfer:${t.id}`);
        const slug = t.slug || slugify(t.name || '');
        const galleryCount = galleryMap.get(t.id) ?? 0;
        items.push({
          id: t.id,
          name: t.name || 'Sin nombre',
          type: 'transfer',
          image: t.main_image || undefined,
          slug,
          input: {
            type: 'transfer',
            name: t.name || 'Sin nombre',
            slug,
            seoTitle: override?.custom_seo_title || undefined,
            seoDescription: override?.custom_seo_description || undefined,
            targetKeyword: override?.target_keyword || undefined,
            description: t.description || undefined,
            image: t.main_image || undefined,
            images: galleryCount > 0 ? Array(galleryCount).fill('') : undefined,
            inclusions: t.inclutions || undefined,
            hasJsonLd: true,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
            wordCount: countWords(t.description),
          },
        });
      }

      // ── Merge packages ────────────────────────────────────────────────
      for (const pk of packagesData) {
        const override = overrideMap.get(`package:${pk.id}`);
        const slug = slugify(pk.name || '');
        const programGallery = Array.isArray(pk.program_gallery) ? pk.program_gallery : [];
        items.push({
          id: pk.id,
          name: pk.name || 'Sin nombre',
          type: 'package',
          image: pk.cover_image_url || undefined,
          slug,
          input: {
            type: 'package',
            name: pk.name || 'Sin nombre',
            slug,
            seoTitle: override?.custom_seo_title || undefined,
            seoDescription: override?.custom_seo_description || undefined,
            targetKeyword: override?.target_keyword || undefined,
            description: pk.description || undefined,
            image: pk.cover_image_url || undefined,
            images: programGallery.length > 0 ? programGallery : undefined,
            hasJsonLd: true,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
            wordCount: countWords(pk.description),
          },
        });
      }

      console.log('[seo.dashboard.load]', {
        websiteId,
        counts: { hotels: hotels.length, activities: activitiesData.length, transfers: transfersData.length, packages: packagesData.length },
        v2Enriched: { hotels: hotelBridgesRes.data?.length ?? 0 },
        overrides: overridesRes.data?.length ?? 0,
      });

      // Destinations
      const { data: destinations } = await supabase
        .from('destinations')
        .select('id, name, main_image, description, seo_title, seo_description')
        .eq('account_id', accountId)
        .is('deleted_at', null);

      if (destinations) {
        for (const d of destinations as any[]) {
          const slug = slugify(d.name || '');
          items.push({
            id: d.id,
            name: d.name || 'Sin nombre',
            type: 'destination',
            image: d.main_image || undefined,
            slug,
            input: {
              type: 'destination',
              name: d.name || 'Sin nombre',
              slug,
              seoTitle: d.seo_title || undefined,
              seoDescription: d.seo_description || undefined,
              description: d.description || undefined,
              image: d.main_image || undefined,
              hasJsonLd: true,
              hasCanonical: true,
              hasHreflang: true,
              hasOgTags: true,
              hasTwitterCard: true,
              wordCount: countWords(d.description),
            },
          });
        }
      }

      // Blog posts
      const { data: posts } = await supabase
        .from('website_blog_posts')
        .select('id, title, featured_image, excerpt, content, seo_title, seo_description, slug')
        .eq('website_id', websiteId);

      if (posts) {
        for (const p of posts as any[]) {
          items.push({
            id: p.id,
            name: p.title || 'Sin título',
            type: 'blog',
            image: p.featured_image || undefined,
            slug: p.slug || slugify(p.title || ''),
            input: {
              type: 'blog',
              name: p.title || 'Sin título',
              slug: p.slug || slugify(p.title || ''),
              seoTitle: p.seo_title || p.title || undefined,
              seoDescription: p.seo_description || p.excerpt || undefined,
              description: p.content || undefined,
              image: p.featured_image || undefined,
              hasJsonLd: true,
              hasCanonical: true,
              hasHreflang: true,
              hasOgTags: true,
              hasTwitterCard: true,
              wordCount: countWords(p.content),
            },
          });
        }
      }

      // Pages
      const { data: pages } = await supabase
        .from('website_pages')
        .select('id, title, slug, seo_title, seo_description')
        .eq('website_id', websiteId);

      if (pages) {
        for (const pg of pages as any[]) {
          items.push({
            id: pg.id,
            name: pg.title || 'Sin título',
            type: 'page',
            image: undefined,
            slug: pg.slug || slugify(pg.title || ''),
            input: {
              type: 'page',
              name: pg.title || 'Sin título',
              slug: pg.slug || slugify(pg.title || ''),
              seoTitle: pg.seo_title || pg.title || undefined,
              seoDescription: pg.seo_description || undefined,
              hasJsonLd: false,
              hasCanonical: true,
              hasHreflang: true,
              hasOgTags: true,
              hasTwitterCard: true,
            },
          });
        }
      }

      if (active) { setRawItems(items); setLoading(false); }
    }

    fetchData();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId, supabase, refreshKey]);

  // Score and detect duplicates
  const scoredItems: ScoredItem[] = useMemo(() => {
    const duplicateGroups = detectDuplicates(
      rawItems.map(i => ({ id: i.id, type: i.type, seoTitle: i.input.seoTitle, seoDescription: i.input.seoDescription }))
    );

    const duplicateIds = new Set<string>();
    for (const ids of duplicateGroups.values()) {
      for (const id of ids) duplicateIds.add(id);
    }

    return rawItems.map(item => {
      const result = scoreItemSeo(item.input);
      const issues = buildIssues(item.input, result);
      if (duplicateIds.has(item.id)) issues.push('Duplicado');
      return { ...item, result, issues };
    });
  }, [rawItems]);

  // Filter by active tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return scoredItems;
    return scoredItems.filter(item => item.type === activeTab);
  }, [scoredItems, activeTab]);

  // Summary stats
  const stats = useMemo(() => {
    if (scoredItems.length === 0) {
      return { avgScore: 0, avgGrade: 'F' as SeoGrade, okCount: 0, issueCount: 0, noSchemaCount: 0 };
    }

    const totalScore = scoredItems.reduce((sum, i) => sum + i.result.overall, 0);
    const avgScore = Math.round(totalScore / scoredItems.length);
    const avgGrade: SeoGrade =
      avgScore >= 90 ? 'A' : avgScore >= 75 ? 'B' : avgScore >= 60 ? 'C' : avgScore >= 40 ? 'D' : 'F';

    const okCount = scoredItems.filter(i => i.result.grade === 'A' || i.result.grade === 'B').length;
    const issueCount = scoredItems.filter(i => i.result.grade === 'C' || i.result.grade === 'D' || i.result.grade === 'F').length;
    const noSchemaCount = scoredItems.filter(i => !i.input.hasJsonLd).length;

    return { avgScore, avgGrade, okCount, issueCount, noSchemaCount };
  }, [scoredItems]);

  if (loading) {
    return (
      <StudioPage className="max-w-6xl">
        <StudioSectionHeader title="SEO Audit" subtitle="Evalúa y optimiza el SEO de todo tu sitio" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="studio-card p-4 animate-pulse">
              <div className="h-4 w-20 bg-[var(--studio-border)] rounded mb-2" />
              <div className="h-8 w-16 bg-[var(--studio-border)] rounded" />
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[var(--studio-border)] rounded animate-pulse" />
          ))}
        </div>
      </StudioPage>
    );
  }

  return (
    <StudioPage className="max-w-6xl">
      <div className="flex items-center justify-between">
        <StudioSectionHeader title="SEO Audit" subtitle="Evalúa y optimiza el SEO de todo tu sitio" />
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => exportToCsv(filteredItems, `seo-audit-${activeTab}.csv`)}
            disabled={filteredItems.length === 0}
            className="px-4 py-2 bg-[var(--studio-bg-secondary)] text-[var(--studio-text)] text-sm font-medium rounded-lg border border-[var(--studio-border)] hover:bg-[var(--studio-bg-tertiary)] disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            disabled={scoredItems.length === 0}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.799L9 4.323V3a1 1 0 011-1z" />
            </svg>
            Optimizar con IA
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <SummaryCard
          label="Score promedio"
          value={`${stats.avgGrade} / ${stats.avgScore}`}
          tone={stats.avgGrade === 'A' || stats.avgGrade === 'B' ? 'success' : stats.avgGrade === 'C' ? 'warning' : 'danger'}
        />
        <SummaryCard label="Items OK" value={`${stats.okCount} / ${scoredItems.length}`} tone="success" />
        <SummaryCard label="Con issues" value={`${stats.issueCount}`} tone={stats.issueCount > 0 ? 'warning' : 'success'} />
        <SummaryCard label="Sin schema" value={`${stats.noSchemaCount}`} tone={stats.noSchemaCount > 0 ? 'warning' : 'success'} />
      </div>

      {/* Type filter tabs */}
      <div className="mt-8">
        <StudioTabs value={activeTab} options={TAB_OPTIONS} onChange={setActiveTab} />
      </div>

      {/* Table */}
      <div className="mt-6">
        <SeoOverviewTable items={filteredItems} />
      </div>

      {/* Bulk AI Modal */}
      {showBulkModal && (
        <BulkSeoModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          websiteId={websiteId}
          items={scoredItems}
          onApplied={() => {
            setShowBulkModal(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </StudioPage>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'success' | 'warning' | 'danger' }) {
  const borderColor =
    tone === 'success' ? 'border-green-200 dark:border-green-800'
    : tone === 'warning' ? 'border-yellow-200 dark:border-yellow-800'
    : 'border-red-200 dark:border-red-800';

  return (
    <div className={`studio-card p-4 border-l-4 ${borderColor}`}>
      <p className="text-xs text-[var(--studio-text-muted)] font-medium">{label}</p>
      <p className="text-lg font-bold text-[var(--studio-text)] mt-1">{value}</p>
    </div>
  );
}

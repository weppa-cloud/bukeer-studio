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

interface RawProduct {
  id: string;
  name: string;
  product_type: string;
  main_image?: string | null;
  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

function mapProductType(dbType: string): SeoItemType {
  const lower = dbType.toLowerCase();
  if (lower === 'hoteles' || lower === 'hotels') return 'hotel';
  if (lower === 'servicios' || lower === 'activities' || lower === 'actividades') return 'activity';
  if (lower === 'transporte' || lower === 'transfers' || lower === 'traslados') return 'transfer';
  if (lower === 'vuelos') return 'transfer';
  if (lower === 'packages' || lower === 'paquetes') return 'package';
  return 'activity';
}

function countWords(text?: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

      // Products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, product_type, main_image, description, seo_title, seo_description')
        .eq('account_id', accountId)
        .is('deleted_at', null);

      if (products) {
        for (const p of products as RawProduct[]) {
          const type = mapProductType(p.product_type || '');
          const slug = slugify(p.name || '');
          items.push({
            id: p.id,
            name: p.name || 'Sin nombre',
            type,
            image: p.main_image || undefined,
            slug,
            input: {
              type,
              name: p.name || 'Sin nombre',
              slug,
              seoTitle: p.seo_title || undefined,
              seoDescription: p.seo_description || undefined,
              description: p.description || undefined,
              image: p.main_image || undefined,
              hasJsonLd: false,
              hasCanonical: true,
              hasHreflang: true,
              hasOgTags: true,
              hasTwitterCard: true,
              wordCount: countWords(p.description),
            },
          });
        }
      }

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
  }, [websiteId, supabase]);

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
      <StudioSectionHeader title="SEO Audit" subtitle="Evalúa y optimiza el SEO de todo tu sitio" />

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

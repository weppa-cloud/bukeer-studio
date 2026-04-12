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
  type SeoGrade,
} from '@/lib/seo/unified-scorer';

type FilterTab = 'all' | 'hotel' | 'activity' | 'transfer' | 'package' | 'destination' | 'page' | 'blog';

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
  if (lower === 'vuelos') return 'transfer'; // flights mapped to transfer
  if (lower === 'packages' || lower === 'paquetes') return 'package';
  return 'activity';
}

function countWords(text?: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function SeoDashboardPage() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const [loading, setLoading] = useState(true);
  const [scoringInputs, setScoringInputs] = useState<SeoScoringInput[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let active = true;

    async function fetchData() {
      setLoading(true);
      const inputs: SeoScoringInput[] = [];

      // Get the website's account_id first
      const { data: website } = await supabase
        .from('websites')
        .select('id, account_id, subdomain')
        .eq('id', websiteId)
        .single();

      if (!website || !active) {
        setLoading(false);
        return;
      }

      const accountId = website.account_id;

      // Fetch products (hotels, activities, transfers, packages)
      const { data: products } = await supabase
        .from('products')
        .select('id, name, product_type, main_image, description, seo_title, seo_description')
        .eq('account_id', accountId)
        .is('deleted_at', null);

      if (products) {
        for (const p of products as RawProduct[]) {
          inputs.push({
            id: p.id,
            name: p.name || 'Sin nombre',
            type: mapProductType(p.product_type || ''),
            seoTitle: p.seo_title || null,
            seoDescription: p.seo_description || null,
            image: p.main_image || null,
            wordCount: countWords(p.description),
            hasSchema: false, // products don't have schema by default
            slug: null,
          });
        }
      }

      // Fetch destinations
      const { data: destinations } = await supabase
        .from('destinations')
        .select('id, name, main_image, description, seo_title, seo_description')
        .eq('account_id', accountId)
        .is('deleted_at', null);

      if (destinations) {
        for (const d of destinations as any[]) {
          inputs.push({
            id: d.id,
            name: d.name || 'Sin nombre',
            type: 'destination',
            seoTitle: d.seo_title || null,
            seoDescription: d.seo_description || null,
            image: d.main_image || null,
            wordCount: countWords(d.description),
            hasSchema: false,
            slug: null,
          });
        }
      }

      // Fetch blog posts
      const { data: posts } = await supabase
        .from('website_blog_posts')
        .select('id, title, featured_image, excerpt, content, seo_title, seo_description, slug')
        .eq('website_id', websiteId);

      if (posts) {
        for (const p of posts as any[]) {
          inputs.push({
            id: p.id,
            name: p.title || 'Sin título',
            type: 'blog',
            seoTitle: p.seo_title || p.title || null,
            seoDescription: p.seo_description || p.excerpt || null,
            image: p.featured_image || null,
            wordCount: countWords(p.content),
            hasSchema: true, // blog posts get Article schema
            slug: p.slug,
          });
        }
      }

      // Fetch pages
      const { data: pages } = await supabase
        .from('website_pages')
        .select('id, title, slug, seo_title, seo_description')
        .eq('website_id', websiteId);

      if (pages) {
        for (const pg of pages as any[]) {
          inputs.push({
            id: pg.id,
            name: pg.title || 'Sin título',
            type: 'page',
            seoTitle: pg.seo_title || pg.title || null,
            seoDescription: pg.seo_description || null,
            image: null,
            wordCount: undefined,
            hasSchema: false,
            slug: pg.slug,
          });
        }
      }

      if (active) {
        setScoringInputs(inputs);
        setLoading(false);
      }
    }

    fetchData();
    return () => { active = false; };
  }, [websiteId, supabase]);

  // Score all items
  const scoredItems = useMemo(() => {
    const results = scoringInputs.map(scoreItemSeo);

    // Detect duplicates and add "Duplicado" issue
    const duplicateIds = detectDuplicates(scoringInputs);
    return results.map((r) => {
      if (duplicateIds.has(r.id) && !r.issues.includes('Duplicado')) {
        return { ...r, issues: [...r.issues, 'Duplicado'] };
      }
      return r;
    });
  }, [scoringInputs]);

  // Filter by active tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return scoredItems;
    return scoredItems.filter((item) => item.type === activeTab);
  }, [scoredItems, activeTab]);

  // Summary stats
  const stats = useMemo(() => {
    if (scoredItems.length === 0) {
      return { avgScore: 0, avgGrade: 'F' as SeoGrade, okCount: 0, issueCount: 0, noSchemaCount: 0 };
    }

    const totalScore = scoredItems.reduce((sum, i) => sum + i.score, 0);
    const avgScore = Math.round(totalScore / scoredItems.length);
    const avgGrade: SeoGrade =
      avgScore >= 90 ? 'A' : avgScore >= 75 ? 'B' : avgScore >= 55 ? 'C' : avgScore >= 35 ? 'D' : 'F';

    const okCount = scoredItems.filter((i) => i.grade === 'A' || i.grade === 'B').length;
    const issueCount = scoredItems.filter((i) => i.grade === 'C' || i.grade === 'D' || i.grade === 'F').length;
    const noSchemaCount = scoringInputs.filter((i) => !i.hasSchema).length;

    return { avgScore, avgGrade, okCount, issueCount, noSchemaCount };
  }, [scoredItems, scoringInputs]);

  if (loading) {
    return (
      <StudioPage className="max-w-6xl">
        <StudioSectionHeader
          title="SEO Audit"
          subtitle="Evalúa y optimiza el SEO de todo tu sitio"
        />
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
      <StudioSectionHeader
        title="SEO Audit"
        subtitle="Evalúa y optimiza el SEO de todo tu sitio"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <SummaryCard
          label="Score promedio"
          value={`${stats.avgGrade} / ${stats.avgScore}`}
          tone={stats.avgGrade === 'A' || stats.avgGrade === 'B' ? 'success' : stats.avgGrade === 'C' ? 'warning' : 'danger'}
        />
        <SummaryCard
          label="Items OK"
          value={`${stats.okCount} / ${scoredItems.length}`}
          tone="success"
        />
        <SummaryCard
          label="Con issues"
          value={`${stats.issueCount}`}
          tone={stats.issueCount > 0 ? 'warning' : 'success'}
        />
        <SummaryCard
          label="Sin schema"
          value={`${stats.noSchemaCount}`}
          tone={stats.noSchemaCount > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Type filter tabs */}
      <div className="mt-8">
        <StudioTabs
          value={activeTab}
          options={TAB_OPTIONS}
          onChange={setActiveTab}
        />
      </div>

      {/* Table */}
      <div className="mt-6">
        <SeoOverviewTable items={filteredItems} />
      </div>
    </StudioPage>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger';
}) {
  const borderColor =
    tone === 'success'
      ? 'border-green-200 dark:border-green-800'
      : tone === 'warning'
        ? 'border-yellow-200 dark:border-yellow-800'
        : 'border-red-200 dark:border-red-800';

  return (
    <div className={`studio-card p-4 border-l-4 ${borderColor}`}>
      <p className="text-xs text-[var(--studio-text-muted)] font-medium">{label}</p>
      <p className="text-lg font-bold text-[var(--studio-text)] mt-1">{value}</p>
    </div>
  );
}

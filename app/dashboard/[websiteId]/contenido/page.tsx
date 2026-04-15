'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { SeoHotelWorkflow } from '@/components/admin/seo-hotel-workflow';
import { SeoActivityWorkflow } from '@/components/admin/seo-activity-workflow';
import { SeoPackageWorkflow } from '@/components/admin/seo-package-workflow';
import { SeoDestinationWorkflow } from '@/components/admin/seo-destination-workflow';
import { SeoBlogWorkflow } from '@/components/admin/seo-blog-workflow';
import { SeoPageWorkflow } from '@/components/admin/seo-page-workflow';
import { SeoBacklog } from '@/components/admin/seo-backlog';
import {
  scoreItemSeo,
  type SeoItemType,
  type SeoScoringInput,
  type SeoScoringResult,
} from '@/lib/seo/unified-scorer';
import {
  StudioPage,
  StudioSectionHeader,
  StudioSearch,
  StudioSelect,
  StudioButton,
  StudioBadgeStatus,
  StudioBadge,
} from '@/components/studio/ui/primitives';

type SeoGrade = 'A' | 'B' | 'C' | 'D' | 'F';
type Completeness = 'complete' | 'partial' | 'missing';
type PublishStatus = 'published' | 'draft';

interface UnifiedContentRow {
  id: string;
  type: SeoItemType;
  name: string;
  slug: string;
  url: string;
  locale: string;
  image?: string;
  seoPath: string;
  status: PublishStatus;
  completeness: Completeness;
  score: number;
  grade: SeoGrade;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function wordCount(text?: string | null) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function computeCompleteness(result: SeoScoringResult): Completeness {
  const passed = result.checks.filter((c) => c.pass).length;
  const total = result.checks.length || 1;
  const ratio = passed / total;
  if (ratio >= 0.85) return 'complete';
  if (ratio >= 0.45) return 'partial';
  return 'missing';
}

function gradeTone(grade: SeoGrade): 'success' | 'info' | 'warning' | 'danger' {
  if (grade === 'A') return 'success';
  if (grade === 'B') return 'info';
  if (grade === 'C') return 'warning';
  return 'danger';
}

function resolveWebsiteLocale(content: unknown): string {
  if (!content || typeof content !== 'object') return 'es-CO';
  const record = content as Record<string, unknown>;
  const candidates = [record.locale, record.language, record.siteLocale];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return 'es-CO';
}

function buildWorkflowUrl(type: SeoItemType, slug: string, subdomain?: string | null): string {
  const root = subdomain ? `/site/${subdomain}` : '';
  const segmentMap: Record<SeoItemType, string> = {
    hotel: 'hoteles',
    activity: 'actividades',
    transfer: 'traslados',
    package: 'paquetes',
    destination: 'destinos',
    blog: 'blog',
    page: '',
  };

  const segment = segmentMap[type];
  const encodedSlug = encodeURIComponent(slug);
  if (!segment) return `${root}/${encodedSlug}`;
  return `${root}/${segment}/${encodedSlug}`;
}

export default function ContenidoPage() {
  const routeParams = useParams<{ websiteId: string }>();
  const websiteId = routeParams?.websiteId ?? '';
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [rows, setRows] = useState<UnifiedContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SeoItemType>('all');
  const [gradeFilter, setGradeFilter] = useState<'all' | SeoGrade>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PublishStatus>('all');
  const [completenessFilter, setCompletenessFilter] = useState<'all' | Completeness>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [workflowItem, setWorkflowItem] = useState<UnifiedContentRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const destinationsUnavailableRef = useRef(false);

  async function loadRows() {
    if (!websiteId) {
      setRows([]);
      setError('Missing website context');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('id, account_id, subdomain, custom_domain, content')
        .eq('id', websiteId)
        .single();

      if (websiteError || !website) {
        throw new Error('Website not found');
      }

      const accountId = website.account_id;
      const websiteLocale = resolveWebsiteLocale(website.content);
      const websiteSubdomain = website.subdomain || '';

      const [overridesRes, hotelsRes, activitiesRes, transfersRes, packagesRes, pagesRes, blogsRes] =
        await Promise.all([
          supabase
            .from('website_product_pages')
            .select('product_id, product_type, custom_seo_title, custom_seo_description, target_keyword, robots_noindex')
            .eq('website_id', websiteId),
          supabase
            .from('hotels')
            .select('id, name, slug, main_image, description')
            .eq('account_id', accountId)
            .is('deleted_at', null),
          supabase
            .from('activities')
            .select('id, name, slug, main_image, description')
            .eq('account_id', accountId)
            .is('deleted_at', null),
          supabase
            .from('transfers')
            .select('id, name, slug, main_image, description')
            .eq('account_id', accountId)
            .is('deleted_at', null),
          supabase
            .from('package_kits')
            .select('id, name, description, cover_image_url')
            .eq('account_id', accountId),
          supabase
            .from('website_pages')
            .select('id, title, slug, seo_title, seo_description, target_keyword, is_published')
            .eq('website_id', websiteId),
          supabase
            .from('website_blog_posts')
            .select('id, title, slug, excerpt, content, featured_image, seo_title, seo_description, seo_keywords, status')
            .eq('website_id', websiteId),
        ]);

      const overrideMap = new Map<string, {
        custom_seo_title?: string | null;
        custom_seo_description?: string | null;
        target_keyword?: string | null;
        robots_noindex?: boolean | null;
      }>();

      for (const row of overridesRes.data || []) {
        overrideMap.set(`${row.product_type}:${row.product_id}`, row);
      }

      const builtRows: UnifiedContentRow[] = [];

      const addScoredRow = (
        data: {
          id: string;
          type: SeoItemType;
          name: string;
          slug: string;
          url: string;
          locale: string;
          image?: string;
          status: PublishStatus;
        },
        input: SeoScoringInput
      ) => {
        const result = scoreItemSeo(input);
        builtRows.push({
          id: data.id,
          type: data.type,
          name: data.name,
          slug: data.slug,
          url: data.url,
          locale: data.locale,
          image: data.image,
          seoPath: `/dashboard/${websiteId}/seo/${data.type}/${data.id}`,
          status: data.status,
          score: result.overall,
          grade: result.grade as SeoGrade,
          completeness: computeCompleteness(result),
        });
      };

      for (const hotel of hotelsRes.data || []) {
        const key = `hotel:${hotel.id}`;
        const override = overrideMap.get(key);
        const slug = hotel.slug || slugify(hotel.name || '');
        addScoredRow(
          {
            id: hotel.id,
            type: 'hotel',
            name: hotel.name || 'Untitled',
            slug,
            url: buildWorkflowUrl('hotel', slug, websiteSubdomain),
            locale: websiteLocale,
            image: hotel.main_image || undefined,
            status: override?.robots_noindex ? 'draft' : 'published',
          },
          {
            type: 'hotel',
            name: hotel.name || 'Untitled',
            slug,
            description: hotel.description || undefined,
            image: hotel.main_image || undefined,
            seoTitle: override?.custom_seo_title || undefined,
            seoDescription: override?.custom_seo_description || undefined,
            targetKeyword: override?.target_keyword || undefined,
            hasJsonLd: true,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
            wordCount: wordCount(hotel.description),
          }
        );
      }

      for (const activity of activitiesRes.data || []) {
        const key = `activity:${activity.id}`;
        const override = overrideMap.get(key);
        const slug = activity.slug || slugify(activity.name || '');
        addScoredRow(
          {
            id: activity.id,
            type: 'activity',
            name: activity.name || 'Untitled',
            slug,
            url: buildWorkflowUrl('activity', slug, websiteSubdomain),
            locale: websiteLocale,
            image: activity.main_image || undefined,
            status: override?.robots_noindex ? 'draft' : 'published',
          },
          {
            type: 'activity',
            name: activity.name || 'Untitled',
            slug,
            description: activity.description || undefined,
            image: activity.main_image || undefined,
            seoTitle: override?.custom_seo_title || undefined,
            seoDescription: override?.custom_seo_description || undefined,
            targetKeyword: override?.target_keyword || undefined,
            hasJsonLd: true,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
            wordCount: wordCount(activity.description),
          }
        );
      }

      for (const transfer of transfersRes.data || []) {
        const key = `transfer:${transfer.id}`;
        const override = overrideMap.get(key);
        const slug = transfer.slug || slugify(transfer.name || '');
        addScoredRow(
          {
            id: transfer.id,
            type: 'transfer',
            name: transfer.name || 'Untitled',
            slug,
            url: buildWorkflowUrl('transfer', slug, websiteSubdomain),
            locale: websiteLocale,
            image: transfer.main_image || undefined,
            status: override?.robots_noindex ? 'draft' : 'published',
          },
          {
            type: 'transfer',
            name: transfer.name || 'Untitled',
            slug,
            description: transfer.description || undefined,
            image: transfer.main_image || undefined,
            seoTitle: override?.custom_seo_title || undefined,
            seoDescription: override?.custom_seo_description || undefined,
            targetKeyword: override?.target_keyword || undefined,
            hasJsonLd: true,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
            wordCount: wordCount(transfer.description),
          }
        );
      }

      for (const pkg of packagesRes.data || []) {
        const key = `package:${pkg.id}`;
        const override = overrideMap.get(key);
        const slug = slugify(pkg.name || '');
        addScoredRow(
          {
            id: pkg.id,
            type: 'package',
            name: pkg.name || 'Untitled',
            slug,
            url: buildWorkflowUrl('package', slug, websiteSubdomain),
            locale: websiteLocale,
            image: pkg.cover_image_url || undefined,
            status: override?.robots_noindex ? 'draft' : 'published',
          },
          {
            type: 'package',
            name: pkg.name || 'Untitled',
            slug,
            description: pkg.description || undefined,
            image: pkg.cover_image_url || undefined,
            seoTitle: override?.custom_seo_title || undefined,
            seoDescription: override?.custom_seo_description || undefined,
            targetKeyword: override?.target_keyword || undefined,
            hasJsonLd: true,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
            wordCount: wordCount(pkg.description),
          }
        );
      }

      for (const page of pagesRes.data || []) {
        const slug = page.slug || slugify(page.title || '');
        addScoredRow(
          {
            id: page.id,
            type: 'page',
            name: page.title || 'Untitled',
            slug,
            url: buildWorkflowUrl('page', slug, websiteSubdomain),
            locale: websiteLocale,
            status: page.is_published ? 'published' : 'draft',
          },
          {
            type: 'page',
            name: page.title || 'Untitled',
            slug,
            seoTitle: page.seo_title || undefined,
            seoDescription: page.seo_description || undefined,
            targetKeyword: page.target_keyword || undefined,
            hasJsonLd: false,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
          }
        );
      }

      for (const post of blogsRes.data || []) {
        const slug = post.slug || slugify(post.title || '');
        const keywords = Array.isArray(post.seo_keywords) ? post.seo_keywords : [];
        addScoredRow(
          {
            id: post.id,
            type: 'blog',
            name: post.title || 'Untitled',
            slug,
            url: buildWorkflowUrl('blog', slug, websiteSubdomain),
            locale: websiteLocale,
            image: post.featured_image || undefined,
            status: post.status === 'published' ? 'published' : 'draft',
          },
          {
            type: 'blog',
            name: post.title || 'Untitled',
            slug,
            description: post.content || post.excerpt || undefined,
            image: post.featured_image || undefined,
            seoTitle: post.seo_title || post.title || undefined,
            seoDescription: post.seo_description || post.excerpt || undefined,
            targetKeyword: keywords[0] || undefined,
            hasJsonLd: true,
            hasCanonical: true,
            hasHreflang: true,
            hasOgTags: true,
            hasTwitterCard: true,
            wordCount: wordCount(post.content),
          }
        );
      }

      // Destinations table is optional in some environments.
      if (!destinationsUnavailableRef.current) {
      try {
        const { data: destinations, error: destError } = await supabase
          .from('destinations')
          .select('id, name, slug, main_image, description, seo_title, seo_description, target_keyword, is_published')
          .eq('account_id', accountId)
          .is('deleted_at', null);

        if (destError) {
          destinationsUnavailableRef.current = true;
        }

        for (const destination of destinations || []) {
          const slug = destination.slug || slugify(destination.name || '');
          addScoredRow(
            {
              id: destination.id,
              type: 'destination',
              name: destination.name || 'Untitled',
              slug,
              url: buildWorkflowUrl('destination', slug, websiteSubdomain),
              locale: websiteLocale,
              image: destination.main_image || undefined,
              status: destination.is_published === false ? 'draft' : 'published',
            },
            {
              type: 'destination',
              name: destination.name || 'Untitled',
              slug,
              description: destination.description || undefined,
              image: destination.main_image || undefined,
              seoTitle: destination.seo_title || undefined,
              seoDescription: destination.seo_description || undefined,
              targetKeyword: destination.target_keyword || undefined,
              hasJsonLd: true,
              hasCanonical: true,
              hasHreflang: true,
              hasOgTags: true,
              hasTwitterCard: true,
              wordCount: wordCount(destination.description),
            }
          );
        }
      } catch {
        destinationsUnavailableRef.current = true;
      }
      }

      setRows(builtRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }

  async function setRowPublished(row: UnifiedContentRow, publish: boolean) {
    if (row.type === 'page') {
      const { error: updateError } = await supabase
        .from('website_pages')
        .update({ is_published: publish })
        .eq('id', row.id);
      if (updateError) throw updateError;
      return;
    }

    if (row.type === 'blog') {
      const { error: updateError } = await supabase
        .from('website_blog_posts')
        .update({
          status: publish ? 'published' : 'draft',
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq('id', row.id);
      if (updateError) throw updateError;
      return;
    }

    if (row.type === 'destination') {
      const { error: upsertError } = await supabase
        .from('destination_seo_overrides')
        .upsert(
          {
            website_id: websiteId,
            destination_slug: row.slug,
            robots_noindex: !publish,
          },
          { onConflict: 'website_id,destination_slug' }
        );
      if (upsertError) throw upsertError;
      return;
    }

    const { error: upsertError } = await supabase
      .from('website_product_pages')
      .upsert(
        {
          website_id: websiteId,
          product_id: row.id,
          product_type: row.type,
          robots_noindex: !publish,
        },
        { onConflict: 'website_id,product_id' }
      );
    if (upsertError) throw upsertError;
  }

  async function applyBulkPublish(publish: boolean) {
    if (!selected.size) return;
    setSaving(true);
    setError(null);
    try {
      const selectedRows = rows.filter((r) => selected.has(`${r.type}:${r.id}`));
      for (const row of selectedRows) {
        await setRowPublished(row, publish);
      }
      setSelected(new Set());
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadRows().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = search.trim().toLowerCase();
      const searchOk =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q);
      const typeOk = typeFilter === 'all' || row.type === typeFilter;
      const gradeOk = gradeFilter === 'all' || row.grade === gradeFilter;
      const statusOk = statusFilter === 'all' || row.status === statusFilter;
      const completenessOk = completenessFilter === 'all' || row.completeness === completenessFilter;
      return searchOk && typeOk && gradeOk && statusOk && completenessOk;
    });
  }, [rows, search, typeFilter, gradeFilter, statusFilter, completenessFilter]);

  useEffect(() => { setCurrentPage(1); }, [search, typeFilter, gradeFilter, statusFilter, completenessFilter]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage, PAGE_SIZE]);

  if (!websiteId) {
    return (
      <StudioPage className="max-w-7xl">
        <div className="studio-panel border border-[var(--studio-warning)]/40 text-[var(--studio-warning)] p-3 text-sm">
          Missing website context. Reload from dashboard.
        </div>
      </StudioPage>
    );
  }

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Contenido"
        subtitle="Tabla unificada para SEO, productos, blog y páginas."
        actions={(
          <div className="flex items-center gap-2">
            <StudioButton variant="outline" size="sm" onClick={() => applyBulkPublish(true)} disabled={!selected.size || saving}>
              Publicar seleccionados
            </StudioButton>
            <StudioButton variant="outline" size="sm" onClick={() => applyBulkPublish(false)} disabled={!selected.size || saving}>
              Ocultar seleccionados
            </StudioButton>
          </div>
        )}
      />

      {/* Chips de tipo de contenido */}
      <div className="flex flex-wrap gap-2 mb-3">
        {([
          { value: 'all',         label: 'Todos' },
          { value: 'hotel',       label: 'Hoteles' },
          { value: 'activity',    label: 'Actividades' },
          { value: 'package',     label: 'Paquetes' },
          { value: 'destination', label: 'Destinos' },
          { value: 'blog',        label: 'Blog' },
          { value: 'page',        label: 'Páginas' },
        ] as const).map(({ value, label }) => {
          const count = value === 'all' ? rows.length : rows.filter(r => r.type === value).length;
          const active = typeFilter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-[var(--studio-primary)] text-white border-[var(--studio-primary)]'
                  : 'bg-[var(--studio-surface)] text-[var(--studio-text-muted)] border-[var(--studio-border)] hover:border-[var(--studio-primary)] hover:text-[var(--studio-text)]'
              }`}
            >
              {label}
              <span className={`text-[10px] ${active ? 'text-white/70' : 'text-[var(--studio-text-muted)]'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <StudioSearch
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, slug o tipo..."
        />
        <StudioSelect
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value as 'all' | SeoGrade)}
          options={[
            { value: 'all', label: 'Grade: all' },
            { value: 'A', label: 'Grade A' },
            { value: 'B', label: 'Grade B' },
            { value: 'C', label: 'Grade C' },
            { value: 'D', label: 'Grade D' },
            { value: 'F', label: 'Grade F' },
          ]}
        />
        <StudioSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | PublishStatus)}
          options={[
            { value: 'all', label: 'Status: all' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
          ]}
        />
        <StudioSelect
          value={completenessFilter}
          onChange={(e) => setCompletenessFilter(e.target.value as 'all' | Completeness)}
          options={[
            { value: 'all', label: 'Completeness: all' },
            { value: 'complete', label: 'Complete' },
            { value: 'partial', label: 'Partial' },
            { value: 'missing', label: 'Missing' },
          ]}
        />
      </div>

      {error && (
        <div className="studio-panel mb-4 border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-3 text-sm">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--studio-text)]">Backlog SEO</h3>
          <p className="text-sm text-[var(--studio-text-muted)]">
            Quick wins priorizados: striking distance, low CTR, canibalización y tablero Kanban.
          </p>
        </div>
        <SeoBacklog websiteId={websiteId} />
      </section>

      <div className="studio-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-3 px-3 w-[36px]">
                <input
                  type="checkbox"
                  checked={filteredRows.length > 0 && filteredRows.every((r) => selected.has(`${r.type}:${r.id}`))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(filteredRows.map((r) => `${r.type}:${r.id}`)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                />
              </th>
              <th className="py-3 px-3">Item</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Grade</th>
              <th className="py-3 px-3">Completeness</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Published</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-[var(--studio-text-muted)]" colSpan={8}>Loading content...</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-[var(--studio-text-muted)]" colSpan={8}>No items match the filters.</td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const selectedKey = `${row.type}:${row.id}`;
                return (
                  <tr key={selectedKey} className="border-b border-[var(--studio-border)]/50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(selectedKey)}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(selectedKey);
                            else next.delete(selectedKey);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 min-w-[240px]">
                        {row.image ? (
                          <img src={row.image} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-[var(--studio-border)]" />
                        )}
                        <div>
                          <p className="font-medium text-[var(--studio-text)]">{row.name}</p>
                          <p className="text-xs text-[var(--studio-text-muted)]">/{row.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 capitalize text-[var(--studio-text-muted)]">{row.type}</td>
                    <td className="px-3 py-2">
                      <StudioBadge tone={gradeTone(row.grade)}>
                        {row.grade} ({row.score})
                      </StudioBadge>
                    </td>
                    <td className="px-3 py-2">
                      <StudioBadge tone={row.completeness === 'complete' ? 'success' : row.completeness === 'partial' ? 'warning' : 'danger'}>
                        {row.completeness}
                      </StudioBadge>
                    </td>
                    <td className="px-3 py-2">
                      <StudioBadgeStatus status={row.status} />
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={row.status === 'published'}
                          onChange={async (e) => {
                            try {
                              setSaving(true);
                              await setRowPublished(row, e.target.checked);
                              await loadRows();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to update status');
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                        />
                        {row.status === 'published' ? 'On' : 'Off'}
                      </label>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <StudioButton
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(row.seoPath)}
                        >
                          Open SEO
                        </StudioButton>
                        {(row.type === 'hotel' || row.type === 'activity' || row.type === 'package' || row.type === 'destination' || row.type === 'blog' || row.type === 'page') && (
                          <StudioButton
                            size="sm"
                            variant="outline"
                            onClick={() => setWorkflowItem(row)}
                          >
                            Flujo SEO →
                          </StudioButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filteredRows.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-3 py-3 border-t border-[var(--studio-border)]">
            <p className="text-xs text-[var(--studio-text-muted)]">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} de {filteredRows.length}
            </p>
            <div className="flex items-center gap-2">
              <StudioButton size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</StudioButton>
              <span className="text-xs text-[var(--studio-text-muted)]">{currentPage} / {Math.ceil(filteredRows.length / PAGE_SIZE)}</span>
              <StudioButton size="sm" variant="outline" disabled={currentPage * PAGE_SIZE >= filteredRows.length} onClick={() => setCurrentPage(p => p + 1)}>→</StudioButton>
            </div>
          </div>
        )}
      </div>

      {workflowItem?.type === 'hotel' && (
        <SeoHotelWorkflow
          itemId={workflowItem.id}
          itemName={workflowItem.name}
          itemUrl={workflowItem.url}
          locale={workflowItem.locale}
          websiteId={websiteId}
          seoPath={workflowItem.seoPath}
          onClose={() => setWorkflowItem(null)}
        />
      )}
      {workflowItem?.type === 'activity' && (
        <SeoActivityWorkflow
          itemId={workflowItem.id}
          itemName={workflowItem.name}
          itemUrl={workflowItem.url}
          locale={workflowItem.locale}
          websiteId={websiteId}
          seoPath={workflowItem.seoPath}
          onClose={() => setWorkflowItem(null)}
        />
      )}
      {workflowItem?.type === 'package' && (
        <SeoPackageWorkflow
          itemId={workflowItem.id}
          itemName={workflowItem.name}
          itemUrl={workflowItem.url}
          locale={workflowItem.locale}
          websiteId={websiteId}
          seoPath={workflowItem.seoPath}
          onClose={() => setWorkflowItem(null)}
        />
      )}
      {workflowItem?.type === 'destination' && (
        <SeoDestinationWorkflow
          itemId={workflowItem.id}
          itemName={workflowItem.name}
          itemUrl={workflowItem.url}
          locale={workflowItem.locale}
          websiteId={websiteId}
          seoPath={workflowItem.seoPath}
          onClose={() => setWorkflowItem(null)}
        />
      )}
      {workflowItem?.type === 'blog' && (
        <SeoBlogWorkflow
          itemId={workflowItem.id}
          itemName={workflowItem.name}
          itemUrl={workflowItem.url}
          locale={workflowItem.locale}
          websiteId={websiteId}
          seoPath={workflowItem.seoPath}
          score={workflowItem.score}
          onClose={() => setWorkflowItem(null)}
        />
      )}
      {workflowItem?.type === 'page' && (
        <SeoPageWorkflow
          itemId={workflowItem.id}
          itemName={workflowItem.name}
          itemUrl={workflowItem.url}
          locale={workflowItem.locale}
          websiteId={websiteId}
          seoPath={workflowItem.seoPath}
          onClose={() => setWorkflowItem(null)}
        />
      )}
    </StudioPage>
  );
}

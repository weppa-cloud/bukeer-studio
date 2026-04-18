import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { HeroOverrideEditor } from '@/components/admin/page-customization/hero-override-editor';
import { SectionVisibilityToggle } from '@/components/admin/page-customization/section-visibility-toggle';
import { SectionsReorderEditor } from '@/components/admin/page-customization/sections-reorder-editor';
import { CustomSectionsEditor } from '@/components/admin/page-customization/custom-sections-editor';
import { VideoUrlEditor } from '@/components/admin/page-customization/video-url-editor';
import { AiFlagsPanel } from '@/components/admin/content-health/ai-flags-panel';
import { ContentHealthSchema, type ContentHealth } from '@bukeer/website-contract';
import {
  saveHeroOverride,
  saveVisibility,
  saveOrder,
  saveCustomSections,
  saveVideoUrl,
  toggleAiFlag,
} from './actions';
import type { CustomSection } from '@bukeer/website-contract';

interface PageProps {
  params: Promise<{ websiteId: string; slug: string }>;
}

type PackageRow = {
  id: string;
  account_id: string;
  slug: string;
  video_url: string | null;
  video_caption: string | null;
};

type PageRow = {
  custom_hero: { title?: string | null; subtitle?: string | null; backgroundImage?: string | null } | null;
  custom_sections: CustomSection[] | null;
  sections_order: string[] | null;
  hidden_sections: string[] | null;
};

export default async function ProductContentPage({ params }: PageProps) {
  const { websiteId, slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: website } = await supabase
    .from('websites')
    .select('id, account_id')
    .eq('id', websiteId)
    .maybeSingle();

  if (!website) notFound();

  const { data: pkg } = await supabase
    .from('package_kits')
    .select('id, account_id, slug, video_url, video_caption')
    .eq('slug', slug)
    .eq('account_id', website.account_id)
    .maybeSingle<PackageRow>();

  if (!pkg) notFound();

  const { data: page } = await supabase
    .from('website_product_pages')
    .select('custom_hero, custom_sections, sections_order, hidden_sections')
    .eq('product_id', pkg.id)
    .eq('product_type', 'package')
    .eq('website_id', websiteId)
    .maybeSingle<PageRow>();

  const heroValue = {
    title: page?.custom_hero?.title ?? null,
    subtitle: page?.custom_hero?.subtitle ?? null,
    backgroundImage: page?.custom_hero?.backgroundImage ?? null,
  };

  const { data: healthRaw } = await supabase.rpc('get_product_content_health', {
    p_product_id: pkg.id,
  });
  const health: ContentHealth | null = healthRaw
    ? ContentHealthSchema.safeParse(healthRaw).data ?? null
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Website {websiteId}</p>
        <h1 className="text-2xl font-bold text-foreground">Contenido de &ldquo;{slug}&rdquo;</h1>
        <p className="text-sm text-muted-foreground">
          Personalización por landing: hero, visibilidad + orden de secciones, secciones custom, video.
        </p>
      </header>

      <VideoUrlEditor
        productId={pkg.id}
        videoUrl={pkg.video_url}
        videoCaption={pkg.video_caption}
        onSave={async (next) => {
          'use server';
          await saveVideoUrl({ websiteId, productId: pkg.id, value: next });
        }}
      />

      {health && health.ai_fields.length > 0 && (
        <AiFlagsPanel
          productId={pkg.id}
          aiFields={health.ai_fields}
          onToggle={async (field, locked) => {
            'use server';
            await toggleAiFlag({ websiteId, productId: pkg.id, field, locked });
          }}
        />
      )}

      <HeroOverrideEditor
        productId={pkg.id}
        value={heroValue}
        onSave={async (next) => {
          'use server';
          await saveHeroOverride({ websiteId, productId: pkg.id, value: next });
        }}
      />

      <SectionVisibilityToggle
        productId={pkg.id}
        productType="package"
        hiddenSections={page?.hidden_sections ?? []}
        onChange={async (next) => {
          'use server';
          await saveVisibility({ websiteId, productId: pkg.id, hidden: next });
        }}
      />

      <SectionsReorderEditor
        productId={pkg.id}
        productType="package"
        sectionsOrder={page?.sections_order ?? []}
        onChange={async (next) => {
          'use server';
          await saveOrder({ websiteId, productId: pkg.id, order: next });
        }}
      />

      <CustomSectionsEditor
        productId={pkg.id}
        sections={page?.custom_sections ?? []}
        onChange={async (next) => {
          'use server';
          await saveCustomSections({ websiteId, productId: pkg.id, sections: next });
        }}
      />
    </div>
  );
}

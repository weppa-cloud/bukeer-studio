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
import { resolveProductRow, pageProductTypeValue } from '@/lib/admin/product-resolver';

interface PageProps {
  params: Promise<{ websiteId: string; slug: string }>;
}

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

  const resolved = await resolveProductRow(supabase, {
    accountId: website.account_id,
    slug,
    mode: 'content',
  });
  if (!resolved) notFound();

  const { productType, row: product } = resolved;

  const { data: page } = await supabase
    .from('website_product_pages')
    .select('custom_hero, custom_sections, sections_order, hidden_sections')
    .eq('product_id', product.id)
    .eq('product_type', pageProductTypeValue(productType))
    .eq('website_id', websiteId)
    .maybeSingle<PageRow>();

  const heroValue = {
    title: page?.custom_hero?.title ?? null,
    subtitle: page?.custom_hero?.subtitle ?? null,
    backgroundImage: page?.custom_hero?.backgroundImage ?? null,
  };

  const { data: healthRaw } = await supabase.rpc('get_product_content_health', {
    p_product_id: product.id,
  });
  const health: ContentHealth | null = healthRaw
    ? ContentHealthSchema.safeParse(healthRaw).data ?? null
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
          Website {websiteId} · type: {productType}
        </p>
        <h1 className="text-2xl font-bold text-foreground">Contenido de &ldquo;{slug}&rdquo;</h1>
        <p className="text-sm text-muted-foreground">
          Personalización por landing: hero, visibilidad + orden de secciones, secciones custom, video.
        </p>
      </header>

      <VideoUrlEditor
        productId={product.id}
        videoUrl={product.video_url}
        videoCaption={product.video_caption}
        onSave={async (next) => {
          'use server';
          await saveVideoUrl({ websiteId, productId: product.id, productType, value: next });
        }}
      />

      {health && health.ai_fields.length > 0 && (
        <AiFlagsPanel
          productId={product.id}
          aiFields={health.ai_fields}
          onToggle={async (field, locked) => {
            'use server';
            await toggleAiFlag({ websiteId, productId: product.id, productType, field, locked });
          }}
        />
      )}

      <HeroOverrideEditor
        productId={product.id}
        value={heroValue}
        onSave={async (next) => {
          'use server';
          await saveHeroOverride({ websiteId, productId: product.id, productType, value: next });
        }}
      />

      <SectionVisibilityToggle
        productId={product.id}
        productType={productType}
        hiddenSections={page?.hidden_sections ?? []}
        onChange={async (next) => {
          'use server';
          await saveVisibility({ websiteId, productId: product.id, productType, hidden: next });
        }}
      />

      <SectionsReorderEditor
        productId={product.id}
        productType={productType}
        sectionsOrder={page?.sections_order ?? []}
        onChange={async (next) => {
          'use server';
          await saveOrder({ websiteId, productId: product.id, productType, order: next });
        }}
      />

      <CustomSectionsEditor
        productId={product.id}
        sections={page?.custom_sections ?? []}
        onChange={async (next) => {
          'use server';
          await saveCustomSections({ websiteId, productId: product.id, productType, sections: next });
        }}
      />
    </div>
  );
}

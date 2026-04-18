import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { HeroOverrideEditor } from '@/components/admin/page-customization/hero-override-editor';
import { SectionVisibilityToggle } from '@/components/admin/page-customization/section-visibility-toggle';
import { SectionsReorderEditor } from '@/components/admin/page-customization/sections-reorder-editor';
import { CustomSectionsEditor } from '@/components/admin/page-customization/custom-sections-editor';
import { VideoUrlEditor } from '@/components/admin/page-customization/video-url-editor';
import type { ProductType } from '@/components/admin/page-customization/use-renderable-sections';
import type { CustomSection } from '@bukeer/website-contract';

interface PageProps {
  params: Promise<{ websiteId: string; slug: string }>;
}

type ProductRow = {
  id: string;
  type: string;
  video_url: string | null;
  video_caption: string | null;
};

type PageCustomization = {
  custom_hero: { title?: string | null; subtitle?: string | null; backgroundImage?: string | null } | null;
  custom_sections: CustomSection[] | null;
  sections_order: string[] | null;
  hidden_sections: string[] | null;
};

function toProductType(dbType: string): ProductType | null {
  if (dbType === 'activity' || dbType === 'hotel' || dbType === 'transfer' || dbType === 'destination' || dbType === 'package') {
    return dbType;
  }
  return null;
}

export default async function ProductContentPage({ params }: PageProps) {
  const { websiteId, slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: product } = await supabase
    .from('products')
    .select('id, type, video_url, video_caption')
    .eq('slug', slug)
    .maybeSingle<ProductRow>();

  if (!product) notFound();

  const productType = toProductType(product.type);
  if (!productType) notFound();

  const { data: page } = await supabase
    .from('product_page_customizations')
    .select('custom_hero, custom_sections, sections_order, hidden_sections')
    .eq('product_id', product.id)
    .maybeSingle<PageCustomization>();

  const heroValue = {
    title: page?.custom_hero?.title ?? null,
    subtitle: page?.custom_hero?.subtitle ?? null,
    backgroundImage: page?.custom_hero?.backgroundImage ?? null,
  };

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
        productId={product.id}
        videoUrl={product.video_url}
        videoCaption={product.video_caption}
      />

      <HeroOverrideEditor productId={product.id} value={heroValue} />

      <SectionVisibilityToggle
        productId={product.id}
        productType={productType}
        hiddenSections={page?.hidden_sections ?? []}
      />

      <SectionsReorderEditor
        productId={product.id}
        productType={productType}
        sectionsOrder={page?.sections_order ?? []}
      />

      <CustomSectionsEditor
        productId={product.id}
        sections={page?.custom_sections ?? []}
      />
    </div>
  );
}

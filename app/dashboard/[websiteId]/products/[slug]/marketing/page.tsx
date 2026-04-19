import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { getDashboardUserContext } from '@/lib/admin/user-context';
import { resolveStudioEditorV2Flag, isStudioFieldEnabled } from '@/lib/features/studio-editor-v2';
import { DescriptionEditor } from '@/components/admin/marketing/description-editor';
import { HighlightsEditor } from '@/components/admin/marketing/highlights-editor';
import { InclusionsExclusionsEditor } from '@/components/admin/marketing/inclusions-exclusions-editor';
import { RecommendationsEditor } from '@/components/admin/marketing/recommendations-editor';
import { InstructionsEditor } from '@/components/admin/marketing/instructions-editor';
import { SocialImagePicker } from '@/components/admin/marketing/social-image-picker';
import { GalleryCurator, type GalleryItem } from '@/components/admin/marketing/gallery-curator';
import { saveMarketingField } from './actions';
import type { MarketingFieldName } from '@bukeer/website-contract';
import { resolveProductRow } from '@/lib/admin/product-resolver';

interface PageProps {
  params: Promise<{ websiteId: string; slug: string }>;
}

export default async function MarketingPage({ params }: PageProps) {
  const { websiteId, slug } = await params;
  const supabase = await createSupabaseServerClient();

  const ctx = await getDashboardUserContext(supabase);
  if (ctx.status !== 'authenticated') notFound();

  const { data: website } = await supabase
    .from('websites')
    .select('id, account_id')
    .eq('id', websiteId)
    .eq('account_id', ctx.accountId)
    .maybeSingle();

  if (!website) notFound();

  const resolved = await resolveProductRow(supabase, {
    accountId: website.account_id,
    slug,
    mode: 'marketing',
  });
  if (!resolved) notFound();

  const { productType, row: product } = resolved;
  const gallery: GalleryItem[] = (product.program_gallery as GalleryItem[] | null) ?? [];

  const flagResolution = await resolveStudioEditorV2Flag(supabase, ctx.accountId, websiteId);
  const isFieldStudio = (field: MarketingFieldName) => isStudioFieldEnabled(flagResolution, field);

  const contentHref = `/dashboard/${websiteId}/products/${slug}/content`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
            Website {websiteId} · type: {productType} · last-edit: {product.last_edited_by_surface ?? 'unknown'}
          </p>
          <h1 className="text-2xl font-bold text-foreground">Marketing de &ldquo;{slug}&rdquo;</h1>
          <p className="text-sm text-muted-foreground">
            Contenido principal del producto (descripción, highlights, inclusiones…). Cada campo
            está gobernado por el flag <code>studio_editor_v2</code> — cuando Flutter aún es owner,
            el editor aparece en modo solo lectura.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scope flag: <code>{flagResolution.scope}</code> · Enabled: {String(flagResolution.enabled)}
          </p>
        </div>
        <Link href={contentHref} className="text-sm text-primary underline">
          Ir a &ldquo;Contenido&rdquo; →
        </Link>
      </header>

      <DescriptionEditor
        productId={product.id}
        value={product.description}
        aiGenerated={product.description_ai_generated ?? false}
        readOnly={!isFieldStudio('description')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: product.id,
            productType,
            patch: { field: 'description', value: next },
          });
        }}
      />

      <HighlightsEditor
        productId={product.id}
        value={product.program_highlights ?? []}
        aiGenerated={product.highlights_ai_generated ?? false}
        readOnly={!isFieldStudio('program_highlights')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: product.id,
            productType,
            patch: { field: 'program_highlights', value: next },
          });
        }}
      />

      <InclusionsExclusionsEditor
        productId={product.id}
        inclusions={product.program_inclusions ?? []}
        exclusions={product.program_exclusions ?? []}
        inclusionsReadOnly={!isFieldStudio('program_inclusions')}
        exclusionsReadOnly={!isFieldStudio('program_exclusions')}
        onSaveInclusions={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: product.id,
            productType,
            patch: { field: 'program_inclusions', value: next },
          });
        }}
        onSaveExclusions={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: product.id,
            productType,
            patch: { field: 'program_exclusions', value: next },
          });
        }}
      />

      <RecommendationsEditor
        productId={product.id}
        value={product.program_notes}
        readOnly={!isFieldStudio('program_notes')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: product.id,
            productType,
            patch: { field: 'program_notes', value: next },
          });
        }}
      />

      <InstructionsEditor
        productId={product.id}
        value={product.program_meeting_info}
        readOnly={!isFieldStudio('program_meeting_info')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: product.id,
            productType,
            patch: { field: 'program_meeting_info', value: next },
          });
        }}
      />

      <SocialImagePicker
        productId={product.id}
        value={product.cover_image_url}
        readOnly={!isFieldStudio('social_image')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: product.id,
            productType,
            patch: { field: 'social_image', value: next },
          });
        }}
      />

      <GalleryCurator
        productId={product.id}
        websiteId={websiteId}
        value={gallery}
        readOnly={!isFieldStudio('program_gallery')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: product.id,
            productType,
            patch: { field: 'program_gallery', value: next },
          });
        }}
      />
    </div>
  );
}

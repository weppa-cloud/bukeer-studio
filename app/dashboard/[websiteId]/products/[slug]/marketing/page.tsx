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

interface PageProps {
  params: Promise<{ websiteId: string; slug: string }>;
}

type PackageRow = {
  id: string;
  account_id: string;
  slug: string;
  description: string | null;
  description_ai_generated: boolean | null;
  program_highlights: string[] | null;
  highlights_ai_generated: boolean | null;
  program_inclusions: string[] | null;
  program_exclusions: string[] | null;
  program_notes: string | null;
  program_meeting_info: string | null;
  program_gallery: GalleryItem[] | null;
  cover_image_url: string | null;
  last_edited_by_surface: string | null;
};

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

  const { data: pkg } = await supabase
    .from('package_kits')
    .select(
      'id, account_id, slug, description, description_ai_generated, program_highlights, highlights_ai_generated, program_inclusions, program_exclusions, program_notes, program_meeting_info, program_gallery, cover_image_url, last_edited_by_surface',
    )
    .eq('slug', slug)
    .eq('account_id', website.account_id)
    .maybeSingle<PackageRow>();

  if (!pkg) notFound();

  const flagResolution = await resolveStudioEditorV2Flag(supabase, ctx.accountId, websiteId);

  const isFieldStudio = (field: MarketingFieldName) => isStudioFieldEnabled(flagResolution, field);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
            Website {websiteId} · last-edit: {pkg.last_edited_by_surface ?? 'unknown'}
          </p>
          <h1 className="text-2xl font-bold text-foreground">Marketing de &ldquo;{slug}&rdquo;</h1>
          <p className="text-sm text-muted-foreground">
            Contenido principal del paquete (descripción, highlights, inclusiones…). Cada campo
            está gobernado por el flag <code>studio_editor_v2</code> — cuando Flutter aún es owner,
            el editor aparece en modo solo lectura.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scope flag: <code>{flagResolution.scope}</code> · Enabled: {String(flagResolution.enabled)}
          </p>
        </div>
        <Link
          href={`/dashboard/${websiteId}/products/${slug}/content`}
          className="text-sm text-primary underline"
        >
          Ir a &ldquo;Contenido&rdquo; →
        </Link>
      </header>

      <DescriptionEditor
        productId={pkg.id}
        value={pkg.description}
        aiGenerated={pkg.description_ai_generated ?? false}
        readOnly={!isFieldStudio('description')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: pkg.id,
            patch: { field: 'description', value: next },
          });
        }}
      />

      <HighlightsEditor
        productId={pkg.id}
        value={pkg.program_highlights ?? []}
        aiGenerated={pkg.highlights_ai_generated ?? false}
        readOnly={!isFieldStudio('program_highlights')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: pkg.id,
            patch: { field: 'program_highlights', value: next },
          });
        }}
      />

      <InclusionsExclusionsEditor
        productId={pkg.id}
        inclusions={pkg.program_inclusions ?? []}
        exclusions={pkg.program_exclusions ?? []}
        inclusionsReadOnly={!isFieldStudio('program_inclusions')}
        exclusionsReadOnly={!isFieldStudio('program_exclusions')}
        onSaveInclusions={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: pkg.id,
            patch: { field: 'program_inclusions', value: next },
          });
        }}
        onSaveExclusions={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: pkg.id,
            patch: { field: 'program_exclusions', value: next },
          });
        }}
      />

      <RecommendationsEditor
        productId={pkg.id}
        value={pkg.program_notes}
        readOnly={!isFieldStudio('program_notes')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: pkg.id,
            patch: { field: 'program_notes', value: next },
          });
        }}
      />

      <InstructionsEditor
        productId={pkg.id}
        value={pkg.program_meeting_info}
        readOnly={!isFieldStudio('program_meeting_info')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: pkg.id,
            patch: { field: 'program_meeting_info', value: next },
          });
        }}
      />

      <SocialImagePicker
        productId={pkg.id}
        value={pkg.cover_image_url}
        readOnly={!isFieldStudio('social_image')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: pkg.id,
            patch: { field: 'social_image', value: next },
          });
        }}
      />

      <GalleryCurator
        productId={pkg.id}
        websiteId={websiteId}
        value={pkg.program_gallery ?? []}
        readOnly={!isFieldStudio('program_gallery')}
        onSave={async (next) => {
          'use server';
          await saveMarketingField({
            websiteId,
            productId: pkg.id,
            patch: { field: 'program_gallery', value: next },
          });
        }}
      />
    </div>
  );
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { getDashboardUserContext } from '@/lib/admin/user-context';
import { resolveStudioEditorV2Flag, isStudioFieldEnabled } from '@/lib/features/studio-editor-v2';
import { DescriptionEditor } from '@/components/admin/marketing/description-editor';
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
      'id, account_id, slug, description, description_ai_generated, program_highlights, highlights_ai_generated, last_edited_by_surface',
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

      <section
        className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground"
        aria-label="Editores adicionales — próximamente"
      >
        <p className="font-semibold text-foreground">Próximamente en esta página:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>HighlightsEditor · InclusionsExclusionsEditor · RecommendationsEditor</li>
          <li>InstructionsEditor · SocialImagePicker · GalleryCurator (A3)</li>
        </ul>
        <p className="mt-2">
          Tracked in [A2 #200](https://github.com/weppa-cloud/bukeer-studio/issues/200) + [A3
          #201](https://github.com/weppa-cloud/bukeer-studio/issues/201).
        </p>
      </section>
    </div>
  );
}

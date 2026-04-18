import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { ContentHealthListSchema, type ContentHealthList } from '@bukeer/website-contract';
import { ContentHealthDashboard } from '@/components/admin/content-health/dashboard';

interface PageProps {
  params: Promise<{ websiteId: string }>;
}

export default async function ContentHealthPage({ params }: PageProps) {
  const { websiteId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: website } = await supabase
    .from('websites')
    .select('id')
    .eq('id', websiteId)
    .maybeSingle();

  if (!website) notFound();

  const { data } = await supabase.rpc('list_products_content_health', {
    p_website_id: websiteId,
    p_limit: 50,
    p_offset: 0,
  });

  const parsed = ContentHealthListSchema.safeParse(data);
  const initial: ContentHealthList = parsed.success
    ? parsed.data
    : { items: [], total: 0, limit: 50, offset: 0 };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <ContentHealthDashboard
        websiteId={websiteId}
        initial={initial}
        productBasePath={`/dashboard/${websiteId}/products`}
      />
    </div>
  );
}

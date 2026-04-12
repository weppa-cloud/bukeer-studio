/**
 * Cluster Posts — POST (link post to cluster)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';

const LinkPostSchema = z.object({
  postId: z.string().uuid(),
  role: z.enum(['pillar', 'supporting', 'related']).default('supporting'),
  displayOrder: z.number().int().min(0).default(0),
});

function getAuthClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getEditorAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasEditorRole(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: clusterId } = await params;
  const raw = await request.json();
  const parsed = LinkPostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { postId, role, displayOrder } = parsed.data;

  const supabase = getAuthClient(auth.token);

  const { data, error } = await supabase
    .from('blog_cluster_posts')
    .upsert({
      cluster_id: clusterId,
      post_id: postId,
      role,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If role is 'pillar', update the cluster's pillar_post_id
  if (role === 'pillar') {
    await supabase
      .from('blog_topic_clusters')
      .update({ pillar_post_id: postId })
      .eq('id', clusterId);
  }

  return NextResponse.json({ clusterPost: data }, { status: 201 });
}

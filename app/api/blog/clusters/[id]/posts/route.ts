/**
 * Cluster Posts — POST (link post to cluster)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';

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
  const body = await request.json();
  const { postId, role = 'supporting', displayOrder = 0 } = body;

  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }

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

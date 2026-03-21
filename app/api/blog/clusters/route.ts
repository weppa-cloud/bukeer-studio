/**
 * Topic Clusters CRUD — GET (list) + POST (create)
 * Auth: getEditorAuth + hasEditorRole
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

export async function GET(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const websiteId = request.nextUrl.searchParams.get('websiteId');
  if (!websiteId) return NextResponse.json({ error: 'websiteId required' }, { status: 400 });

  const supabase = getAuthClient(auth.token);

  const { data, error } = await supabase
    .from('blog_topic_clusters')
    .select(`
      *,
      pillar_post:website_blog_posts!pillar_post_id(id, title, slug, status),
      posts:blog_cluster_posts(
        post_id,
        role,
        display_order,
        post:website_blog_posts(id, title, slug, status)
      )
    `)
    .eq('website_id', websiteId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ clusters: data });
}

export async function POST(request: NextRequest) {
  const auth = await getEditorAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasEditorRole(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { websiteId, name, description, targetKeyword, targetPostCount } = body;

  if (!websiteId || !name) {
    return NextResponse.json({ error: 'websiteId and name required' }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100);

  const supabase = getAuthClient(auth.token);

  const { data, error } = await supabase
    .from('blog_topic_clusters')
    .insert({
      website_id: websiteId,
      name,
      slug,
      description: description || null,
      target_keyword: targetKeyword || null,
      target_post_count: targetPostCount || 10,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cluster: data }, { status: 201 });
}

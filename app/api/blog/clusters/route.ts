/**
 * Topic Clusters CRUD — GET (list) + POST (create)
 * Auth: getEditorAuth + hasEditorRole
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';

const CreateClusterSchema = z.object({
  websiteId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  targetKeyword: z.string().optional(),
  targetPostCount: z.number().int().positive().default(10),
});

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
  if (!websiteId || !z.string().uuid().safeParse(websiteId).success) {
    return NextResponse.json({ error: 'Valid websiteId required' }, { status: 400 });
  }

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

  const raw = await request.json();
  const parsed = CreateClusterSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { websiteId, name, description, targetKeyword, targetPostCount } = parsed.data;

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
      target_post_count: targetPostCount,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cluster: data }, { status: 201 });
}

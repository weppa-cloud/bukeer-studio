import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.SITE_PREVIEW_TOKEN || process.env.REVALIDATE_SECRET;
  if (!token) {
    return NextResponse.json({ error: 'Preview token is not configured' }, { status: 500 });
  }

  return NextResponse.json({ token });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { toErrorResponse } from '@/lib/seo/errors';

interface IntersectionRow {
  domain: string;
  dr: number;
  linksTo: string;
  action: string;
}

export async function POST(request: NextRequest) {
  try {
    let websiteId = request.nextUrl.searchParams.get('websiteId');
    if (!websiteId) {
      const body = (await request.json().catch(() => ({}))) as { websiteId?: string };
      websiteId = body.websiteId ?? null;
    }
    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId is required', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await requireWebsiteAccess(websiteId);

    const supabase = createSupabaseServiceRoleClient();
    let rows: IntersectionRow[] = [];
    try {
      const { data, error } = await supabase
        .from('seo_competitors')
        .select('domain, avg_position, traffic_share, snapshot_date, source')
        .eq('website_id', websiteId)
        .order('snapshot_date', { ascending: false })
        .limit(12);

      if (error) {
        throw error;
      }

      rows = (data ?? []).map((row: {
        domain: string;
        avg_position: number | null;
        traffic_share: number | null;
        source: string | null;
      }) => ({
        domain: row.domain,
        dr: Math.max(0, Math.min(100, Math.round(100 - (row.avg_position ?? 50)))),
        linksTo: row.source ? row.source : 'competitor profile',
        action: row.traffic_share != null && row.traffic_share > 0.08 ? 'Prioridad alta' : 'Contactar',
      }));
    } catch {
      rows = [];
    }

    return NextResponse.json({
      rows,
      source: rows.length ? 'database-derived' : 'database-empty',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { toErrorResponse } from '@/lib/seo/errors';

interface KeywordRow {
  id: string;
  keyword: string;
  target_url: string | null;
}

interface KeywordSnapshotRow {
  keyword_id: string;
  snapshot_date: string;
  position: number | null;
  search_volume: number | null;
}

interface StrikingDistanceRow {
  url: string;
  keyword: string;
  position: number;
  volume: number;
  priority: 'P1' | 'P2' | 'P3';
  source: string;
  latestSnapshotDate: string;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function resolvePriority(position: number): 'P1' | 'P2' | 'P3' {
  if (position <= 10) return 'P1';
  if (position <= 15) return 'P2';
  return 'P3';
}

function resolveUrl(targetUrl: string | null, keyword: string) {
  if (targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
    } catch {
      return targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
    }
  }

  return `/${slugify(keyword)}`;
}

export async function GET(request: NextRequest) {
  try {
    const websiteId = request.nextUrl.searchParams.get('websiteId');
    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId is required', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await requireWebsiteAccess(websiteId);

    const supabase = createSupabaseServiceRoleClient();
    let keywords: KeywordRow[] = [];
    try {
      const { data: keywordsData, error: keywordsError } = await supabase
        .from('seo_keywords')
        .select('id, keyword, target_url')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false })
        .limit(250);

      if (keywordsError) {
        throw keywordsError;
      }

      keywords = (keywordsData ?? []) as KeywordRow[];
    } catch {
      return NextResponse.json({
        rows: [],
        source: 'database-empty',
        fetchedAt: new Date().toISOString(),
      });
    }

    if (!keywords.length) {
      return NextResponse.json({
        rows: [],
        source: 'database-empty',
        fetchedAt: new Date().toISOString(),
      });
    }

    const keywordIds = keywords.map((row) => row.id);
    const snapshots: KeywordSnapshotRow[] = [];
    const batchSize = 100;

    for (let index = 0; index < keywordIds.length; index += batchSize) {
      const batch = keywordIds.slice(index, index + batchSize);
      try {
        const { data, error } = await supabase
          .from('seo_keyword_snapshots')
          .select('keyword_id, snapshot_date, position, search_volume')
          .in('keyword_id', batch)
          .order('snapshot_date', { ascending: false });

        if (error) {
          throw error;
        }

        snapshots.push(...((data ?? []) as KeywordSnapshotRow[]));
      } catch {
        return NextResponse.json({
          rows: [],
          source: 'database-empty',
          fetchedAt: new Date().toISOString(),
        });
      }
    }

    const snapshotsByKeyword = new Map<string, KeywordSnapshotRow[]>();
    for (const snapshot of snapshots) {
      const list = snapshotsByKeyword.get(snapshot.keyword_id) ?? [];
      list.push(snapshot);
      snapshotsByKeyword.set(snapshot.keyword_id, list);
    }

    const rows = keywords
      .map((keywordRow) => {
        const latest = (snapshotsByKeyword.get(keywordRow.id) ?? [])[0];
        const position = latest?.position ?? null;
        const volume = latest?.search_volume ?? null;
        if (position == null || position < 8 || position > 20) return null;
        if (volume != null && volume < 100) return null;

        return {
          url: resolveUrl(keywordRow.target_url, keywordRow.keyword),
          keyword: keywordRow.keyword,
          position,
          volume: volume != null ? volume : 100,
          priority: resolvePriority(position),
          source: 'seo_keywords+seo_keyword_snapshots',
          latestSnapshotDate: latest?.snapshot_date ?? new Date().toISOString().slice(0, 10),
        } satisfies StrikingDistanceRow;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0;
        const priorityOrder: Record<'P1' | 'P2' | 'P3', number> = { P1: 0, P2: 1, P3: 2 };
        if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
        if (a.position !== b.position) return a.position - b.position;
        return b.volume - a.volume;
      })
      .slice(0, 10) as StrikingDistanceRow[];

    return NextResponse.json({
      rows,
      source: rows.length ? 'database' : 'database-empty',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

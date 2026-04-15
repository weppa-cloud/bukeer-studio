import { NextRequest, NextResponse } from 'next/server';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { toErrorResponse } from '@/lib/seo/errors';

interface OverviewRow {
  keyword: string;
  aiOverview: 'detected' | 'not_detected';
  domainCited: boolean | null;
  source: string;
}

function getField<T>(row: Record<string, unknown>, names: string[], fallback: T): T {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null && value !== '') return value as T;
  }
  return fallback;
}

function normalizeModelName(value: string | null | undefined) {
  const model = (value ?? '').toLowerCase();
  if (model.includes('chat')) return 'ChatGPT';
  if (model.includes('claude')) return 'Claude';
  if (model.includes('perplexity')) return 'Perplexity';
  if (model.includes('gemini')) return 'Gemini';
  return value ?? 'AI';
}

async function loadKeywordFallback(supabase: ReturnType<typeof createSupabaseServiceRoleClient>, websiteId: string) {
  try {
    const { data: keywordsData, error: keywordsError } = await supabase
      .from('seo_keywords')
      .select('id, keyword, target_url')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .limit(6);

    if (keywordsError) throw keywordsError;

    return (keywordsData ?? []).map((row: { keyword: string; target_url: string | null }) => ({
      keyword: row.keyword,
      aiOverview: 'not_detected' as const,
      domainCited: row.target_url ? true : null,
      source: 'seo_keywords',
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const websiteId = request.nextUrl.searchParams.get('websiteId');
    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId is required', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await requireWebsiteAccess(websiteId);

    const supabase = createSupabaseServiceRoleClient();
    let prompts: Array<Record<string, unknown>> = [];
    let snapshots: Array<Record<string, unknown>> = [];
    try {
      const [promptsResult, snapshotsResult] = await Promise.all([
        supabase.from('seo_ai_prompts').select('*').eq('website_id', websiteId).order('created_at', { ascending: false }).limit(8),
        supabase.from('seo_ai_visibility_snapshots').select('*').eq('website_id', websiteId).order('created_at', { ascending: false }).limit(24),
      ]);

      if (promptsResult.error) throw promptsResult.error;
      if (snapshotsResult.error) throw snapshotsResult.error;

      prompts = (promptsResult.data ?? []) as Array<Record<string, unknown>>;
      snapshots = (snapshotsResult.data ?? []) as Array<Record<string, unknown>>;
    } catch {
      prompts = [];
      snapshots = [];
    }
    const rows: OverviewRow[] = [];

    if (prompts.length > 0) {
      const snapshotsByPromptId = new Map<string, Array<Record<string, unknown>>>();
      for (const snapshot of snapshots) {
        const promptId = String(
          getField(snapshot, ['prompt_id', 'seo_ai_prompt_id', 'ai_prompt_id', 'promptId'], '')
        );
        if (!promptId) continue;
        const list = snapshotsByPromptId.get(promptId) ?? [];
        list.push(snapshot);
        snapshotsByPromptId.set(promptId, list);
      }

      for (const prompt of prompts.slice(0, 6)) {
        const promptId = String(getField(prompt, ['id', 'prompt_id'], ''));
        const keyword = String(getField(prompt, ['keyword', 'target_keyword', 'query', 'prompt', 'topic'], ''));
        const attached = snapshotsByPromptId.get(promptId) ?? [];
        const firstSnapshot = attached[0] ?? snapshots[rows.length] ?? null;
        const mentioned = Boolean(getField(firstSnapshot ?? {}, ['mentioned', 'is_mentioned', 'detected'], false));
        const citationUrl = getField<string | null>(firstSnapshot ?? {}, ['citation_url', 'source_url', 'url'], null);

        rows.push({
          keyword: keyword || 'Prompt',
          aiOverview: mentioned ? 'detected' : 'not_detected',
          domainCited: citationUrl ? true : null,
          source: mentioned ? normalizeModelName(String(getField(firstSnapshot ?? {}, ['model'], 'AI'))) : 'database',
        });
      }
    } else {
      rows.push(...(await loadKeywordFallback(supabase, websiteId)));
    }

    if (!rows.length) {
      rows.push(...(await loadKeywordFallback(supabase, websiteId)));
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

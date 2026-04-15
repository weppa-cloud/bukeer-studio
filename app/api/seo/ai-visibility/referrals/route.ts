import { NextRequest, NextResponse } from 'next/server';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { toErrorResponse } from '@/lib/seo/errors';

interface ReferralCard {
  name: string;
  domains: string[];
  sessions: number | null;
  source?: string;
}

const MODEL_ORDER = ['chatgpt', 'perplexity', 'gemini', 'claude'] as const;

function normalizeModelName(value: string) {
  const model = value.toLowerCase();
  if (model.includes('chat')) return 'ChatGPT';
  if (model.includes('claude')) return 'Claude';
  if (model.includes('perplexity')) return 'Perplexity';
  if (model.includes('gemini')) return 'Gemini';
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const websiteId = request.nextUrl.searchParams.get('websiteId');
    if (!websiteId) {
      return NextResponse.json({ error: 'websiteId is required', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await requireWebsiteAccess(websiteId);

    const supabase = createSupabaseServiceRoleClient();
    let snapshots: Array<Record<string, unknown>> = [];
    try {
      const { data, error } = await supabase
        .from('seo_ai_visibility_snapshots')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      snapshots = (data ?? []) as Array<Record<string, unknown>>;
    } catch {
      snapshots = [];
    }
    const byModel = new Map<string, { count: number; domains: Set<string> }>();

    for (const snapshot of snapshots) {
      const model = String(snapshot.model ?? snapshot.provider ?? snapshot.source ?? '');
      if (!model) continue;
      const key = model.toLowerCase();
      const entry = byModel.get(key) ?? { count: 0, domains: new Set<string>() };
      const mentioned = Boolean(snapshot.mentioned ?? snapshot.is_mentioned ?? snapshot.detected);
      if (mentioned) entry.count += 1;
      const citationUrl = snapshot.citation_url ?? snapshot.source_url ?? snapshot.url;
      if (typeof citationUrl === 'string' && citationUrl) {
        try {
          entry.domains.add(new URL(citationUrl).hostname.replace(/^www\./, ''));
        } catch {
          entry.domains.add(citationUrl);
        }
      }
      byModel.set(key, entry);
    }

    const cards: ReferralCard[] = MODEL_ORDER.map((modelKey) => {
      const entry = byModel.get(modelKey);
      return {
        name: normalizeModelName(modelKey),
        domains: entry ? Array.from(entry.domains).slice(0, 3) : [],
        sessions: entry ? entry.count : null,
        source: entry ? 'seo_ai_visibility_snapshots' : 'database-empty',
      };
    }).filter((card) => card.sessions != null || card.domains.length > 0);

    return NextResponse.json({
      cards,
      source: cards.length ? 'database-derived' : 'database-empty',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { getEditorModel } from '@/lib/ai/llm-provider';
import { requireWebsiteAccess } from '@/lib/seo/server-auth';
import { getFreshCredential, getIntegrationStatus } from '@/lib/seo/backend-service';
import { querySearchConsole } from '@/lib/seo/google-client';
import type { KeywordResearchDTO } from '@/lib/seo/dto';
import { toErrorResponse } from '@/lib/seo/errors';

const bodySchema = z.object({
  websiteId: z.string().uuid(),
  keyword: z.string().min(2).max(100),
  itemType: z.string().optional(),
  itemName: z.string().optional(),
  itemDescription: z.string().optional(),
  itemContext: z.record(z.string(), z.unknown()).optional(),
});

function buildAiPrompt(input: {
  keyword: string;
  itemType?: string;
  itemName?: string;
  itemDescription?: string;
  itemContext?: Record<string, unknown>;
  mode: 'gsc+ai' | 'ai-only';
  gscData?: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
  };
  relatedQueries?: Array<{ query: string; impressions: number; clicks: number; ctr: number; position: number }>;
}) {
  return `
Eres un estratega SEO para agencias de viaje.

Keyword objetivo: ${input.keyword}
Tipo: ${input.itemType ?? 'n/a'}
Nombre: ${input.itemName ?? 'n/a'}
Descripcion: ${(input.itemDescription ?? '').slice(0, 1500)}
Contexto JSON: ${input.itemContext ? JSON.stringify(input.itemContext).slice(0, 2000) : 'n/a'}
Modo: ${input.mode}

Datos Search Console: ${input.gscData ? JSON.stringify(input.gscData) : 'no disponible'}
Related queries: ${input.relatedQueries ? JSON.stringify(input.relatedQueries) : 'no disponible'}

Responde SOLO JSON:
{
  "primaryKeyword": "...",
  "secondaryKeywords": ["..."],
  "contentBrief": ["...", "..."],
  "reasoning": "..."
}
`.trim();
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]) as {
    primaryKeyword: string;
    secondaryKeywords: string[];
    contentBrief: string[];
    reasoning: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    await requireWebsiteAccess(body.websiteId);

    const status = await getIntegrationStatus(body.websiteId);

    let mode: KeywordResearchDTO['mode'] = 'ai-only';
    let searchConsoleData: KeywordResearchDTO['searchConsoleData'] = null;
    let relatedQueries: KeywordResearchDTO['relatedQueries'] = [];

    if (status.gsc.connected && status.gsc.siteUrl) {
      try {
        const gsc = await getFreshCredential(body.websiteId, 'gsc');
        const rows = await querySearchConsole({
          accessToken: gsc.access_token!,
          siteUrl: gsc.site_url!,
          body: {
            startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
            endDate: new Date().toISOString().slice(0, 10),
            dimensions: ['query'],
            rowLimit: 50,
            dimensionFilterGroups: [
              {
                filters: [
                  {
                    dimension: 'query',
                    operator: 'contains',
                    expression: body.keyword,
                  },
                ],
              },
            ],
          },
        });

        const total = rows.reduce<{
          impressions: number;
          clicks: number;
          position: number;
          count: number;
        }>(
          (acc, row) => {
            acc.impressions += row.impressions ?? 0;
            acc.clicks += row.clicks ?? 0;
            acc.position += row.position ?? 0;
            acc.count += 1;
            return acc;
          },
          { impressions: 0, clicks: 0, position: 0, count: 0 }
        );

        if (total.count > 0) {
          mode = 'gsc+ai';
          searchConsoleData = {
            impressions: total.impressions,
            clicks: total.clicks,
            ctr: total.impressions > 0 ? total.clicks / total.impressions : 0,
            avgPosition: total.position / total.count,
          };

          relatedQueries = rows.slice(0, 10).map((row) => ({
            query: row.keys?.[0] ?? body.keyword,
            impressions: row.impressions ?? 0,
            clicks: row.clicks ?? 0,
            ctr: row.ctr ?? 0,
            position: row.position ?? 0,
          }));
        }
      } catch {
        mode = 'ai-only';
      }
    }

    const aiResult = await generateText({
      model: getEditorModel(),
      system: 'Responde con JSON valido y recomendaciones SEO accionables.',
      prompt: buildAiPrompt({
        keyword: body.keyword,
        itemType: body.itemType,
        itemName: body.itemName,
        itemDescription: body.itemDescription,
        itemContext: body.itemContext,
        mode,
        gscData: searchConsoleData ?? undefined,
        relatedQueries,
      }),
    });

    const parsed = extractJson(aiResult.text) ?? {
      primaryKeyword: body.keyword,
      secondaryKeywords: [],
      contentBrief: ['Optimiza title y description con intención de búsqueda.'],
      reasoning: 'No se pudo parsear JSON del modelo, se usó fallback.',
    };

    const response: KeywordResearchDTO = {
      mode,
      keyword: body.keyword,
      searchConsoleData,
      relatedQueries,
      recommendation: {
        primaryKeyword: parsed.primaryKeyword || body.keyword,
        secondaryKeywords: parsed.secondaryKeywords || [],
        contentBrief: parsed.contentBrief || [],
        reasoning: parsed.reasoning || '',
      },
      message:
        mode === 'ai-only'
          ? 'Conecta Search Console en Analytics > Config para ver datos reales de busqueda.'
          : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

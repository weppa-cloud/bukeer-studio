import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  GrowthInventoryRowSchema,
  type ExperimentResult,
  type FunnelStage,
  type GrowthInventoryRow,
  type InventoryStatus,
} from '@bukeer/website-contract';
import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
  StudioEmptyState,
} from '@/components/studio/ui/primitives';
import { GrowthFunnelBoard } from '@/components/admin/growth-funnel-board';
import { GrowthInventoryTable } from '@/components/admin/growth-inventory-table';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { z } from 'zod';

/**
 * Growth Dashboard — SPEC #337 (Epic #310, Issue #311).
 *
 * Server component (ADR-001). Renders the AARRR funnel board + the Growth
 * Inventory table for a single website. Multi-tenant scoped (ADR-009): we
 * derive `account_id` from the SSR Supabase session and never aggregate
 * across tenants.
 *
 * Cache: `s-maxage=3600, stale-while-revalidate=600`. Tag:
 *   `growth-inventory:website:<id>`.
 *
 * Data is fetched from the A1 W2 route `/api/growth/inventory`. If that
 * endpoint is not yet present (404 / network error), we render an empty
 * state with guidance for the operator.
 */

// The page itself is dynamic by virtue of cookies() + headers() reads (auth).
// The HTTP cache tag and s-maxage live on the upstream `fetch` to
// /api/growth/inventory (data cache) — see fetchInventory() below.

const SearchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).optional(),
  market: z.string().min(1).max(40).optional(),
  cluster: z.string().min(1).max(200).optional(),
  funnel_stage: z
    .enum([
      'acquisition',
      'activation',
      'qualified_lead',
      'quote_sent',
      'booking',
      'review_referral',
    ])
    .optional(),
  status: z
    .enum(['idea', 'queued', 'in_progress', 'shipped', 'evaluated', 'archived'])
    .optional(),
  result: z
    .enum(['pending', 'win', 'loss', 'inconclusive', 'scale', 'stop'])
    .optional(),
});

const InventoryEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    rows: z.array(GrowthInventoryRowSchema),
    meta: z.object({
      total: z.number().int().nonnegative(),
    }),
  }),
});

interface FetchResult {
  rows: GrowthInventoryRow[];
  total: number;
  /** True when the route is missing (A1 W2 not yet shipped) */
  apiMissing: boolean;
  /** True when the route returned a non-404 error */
  errored: boolean;
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
}

async function fetchInventory(
  websiteId: string,
  accountId: string,
  filters: z.infer<typeof SearchParamsSchema>
): Promise<FetchResult> {
  const origin = await getOrigin();
  const url = new URL(`${origin}/api/growth/inventory`);
  url.searchParams.set('website_id', websiteId);
  url.searchParams.set('account_id', accountId);
  if (filters.locale) url.searchParams.set('locale', filters.locale);
  if (filters.market) url.searchParams.set('market', filters.market);
  if (filters.cluster) url.searchParams.set('cluster', filters.cluster);
  if (filters.funnel_stage) url.searchParams.set('funnel_stage', filters.funnel_stage);
  if (filters.status) url.searchParams.set('status', filters.status);
  if (filters.result) url.searchParams.set('result', filters.result);
  const limit = 50;
  const offset = filters.page ? (filters.page - 1) * limit : 0;
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  // Forward auth cookies so the API route sees the same Supabase session.
  const h = await headers();
  const cookie = h.get('cookie') ?? '';

  try {
    const response = await fetch(url, {
      headers: cookie ? { cookie } : {},
      next: {
        revalidate: 3600,
        tags: [`growth-inventory:website:${websiteId}`],
      },
    });

    if (response.status === 404) {
      return { rows: [], total: 0, apiMissing: true, errored: false };
    }
    if (!response.ok) {
      return { rows: [], total: 0, apiMissing: false, errored: true };
    }

    const json = await response.json();
    const parsed = InventoryEnvelopeSchema.safeParse(json);
    if (!parsed.success) {
      return { rows: [], total: 0, apiMissing: false, errored: true };
    }
    return {
      rows: parsed.data.data.rows,
      total: parsed.data.data.meta.total,
      apiMissing: false,
      errored: false,
    };
  } catch {
    // Most likely route missing or build-time fetch failure — degrade gracefully.
    return { rows: [], total: 0, apiMissing: true, errored: false };
  }
}

interface GrowthPageProps {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GrowthDashboardPage({
  params,
  searchParams,
}: GrowthPageProps) {
  const { websiteId } = await params;
  const rawSearch = await searchParams;

  const filters = SearchParamsSchema.parse({
    page: rawSearch.page,
    locale: rawSearch.locale,
    market: rawSearch.market,
    cluster: rawSearch.cluster,
    funnel_stage: rawSearch.funnel_stage,
    status: rawSearch.status,
    result: rawSearch.result,
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Multi-tenant scoping (ADR-009): derive account_id from the website row
  // the user is authorised to see. RLS protects against cross-tenant leakage.
  const { data: website, error: websiteError } = await supabase
    .from('websites')
    .select('id, account_id, subdomain, content')
    .eq('id', websiteId)
    .single();

  if (websiteError || !website) {
    redirect('/dashboard');
  }

  const accountId = website.account_id as string;

  const fetched = await fetchInventory(websiteId, accountId, filters);

  // Build option lists from the (already tenant-scoped) dataset.
  const locales = Array.from(new Set(fetched.rows.map((r) => r.locale))).sort();
  const markets = Array.from(new Set(fetched.rows.map((r) => r.market))).sort();
  const clusters = Array.from(
    new Set(fetched.rows.map((r) => r.cluster).filter((v): v is string => !!v))
  ).sort();

  const lastUpdated = fetched.rows[0]?.updated_at;

  return (
    <StudioPage className="max-w-7xl">
      <StudioSectionHeader
        title="Growth"
        subtitle="Funnel AARRR + Growth Inventory para el Weekly Growth Council."
        actions={
          <div className="flex items-center gap-2">
            <StudioBadge tone="info">SPEC #337</StudioBadge>
            {lastUpdated ? (
              <span className="text-xs text-[var(--studio-text-muted)]">
                Última actualización:{' '}
                {new Date(lastUpdated).toLocaleString('es-CO', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            ) : null}
          </div>
        }
      />

      {fetched.apiMissing ? (
        <div
          className="studio-panel border border-[var(--studio-warning)]/40 text-[var(--studio-warning)] p-3 text-sm dark:text-[var(--studio-warning)]"
          role="status"
        >
          La API de Growth Inventory todavía no está desplegada
          (<code>/api/growth/inventory</code>). Cuando A1 W2 publique el route,
          este dashboard se hidrata automáticamente al revalidar la cache
          <code> growth-inventory:website:{websiteId}</code>.
        </div>
      ) : null}

      {fetched.errored ? (
        <div
          className="studio-panel border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-3 text-sm"
          role="alert"
        >
          No pudimos cargar el Growth Inventory. Reintenta o revisa los
          logs de la API.
        </div>
      ) : null}

      <section
        aria-labelledby="growth-funnel-heading"
        className="space-y-3 mt-4"
      >
        <header>
          <h2
            id="growth-funnel-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Funnel AARRR
          </h2>
          <p className="text-sm text-[var(--studio-text-muted)]">
            Acquisition → Activation → Qualified Lead → Quote → Booking → Review/Referral
          </p>
        </header>
        <GrowthFunnelBoard rows={fetched.rows} />
      </section>

      <section
        aria-labelledby="growth-inventory-heading"
        className="space-y-3 mt-6"
      >
        <header>
          <h2
            id="growth-inventory-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Growth Inventory
          </h2>
          <p className="text-sm text-[var(--studio-text-muted)]">
            Cada fila representa un surface accionable. Una fila no avanza a
            <code> in_progress</code> sin hipótesis, baseline, owner,
            success_metric y evaluation_date.
          </p>
        </header>

        {fetched.apiMissing && fetched.rows.length === 0 ? (
          <StudioEmptyState
            title="Aún sin datos"
            description="El endpoint /api/growth/inventory no responde todavía. La cache se invalida automáticamente cuando A1 W2 lo publique."
          />
        ) : (
          <GrowthInventoryTable
            websiteId={websiteId}
            rows={fetched.rows}
            total={fetched.total}
            page={filters.page ?? 1}
            filters={{
              locale: filters.locale,
              market: filters.market,
              cluster: filters.cluster,
              funnel_stage: filters.funnel_stage as FunnelStage | undefined,
              status: filters.status as InventoryStatus | undefined,
              result: filters.result as ExperimentResult | undefined,
            }}
            options={{ locales, markets, clusters }}
          />
        )}
      </section>
    </StudioPage>
  );
}

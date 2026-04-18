import { createSupabaseServerClient } from '@/lib/supabase/server-client';
import { ReconciliationAlertsTable } from '@/components/admin/ops/reconciliation-alerts-table';
import { TriggerReconciliationButton } from '@/components/admin/ops/trigger-reconciliation-button';
import { runReconciliation, resolveAlert } from './actions';

interface PageProps {
  params: Promise<{ websiteId: string }>;
}

type AlertRow = {
  id: string;
  account_id: string | null;
  source: string;
  severity: string;
  summary: string;
  details: Record<string, unknown>;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

export default async function ReconciliationPage({ params }: PageProps) {
  const { websiteId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: alerts } = await supabase
    .from('reconciliation_alerts')
    .select('id, account_id, source, severity, summary, details, resolved_at, resolved_by, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<AlertRow[]>();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
            Website {websiteId} · super_admin
          </p>
          <h1 className="text-2xl font-bold text-foreground">Reconciliación</h1>
          <p className="text-sm text-muted-foreground">
            Alertas de discrepancia entre Flutter + Studio durante el rollout gradual R7.
          </p>
        </div>
        <TriggerReconciliationButton onTrigger={runReconciliation} />
      </header>

      <ReconciliationAlertsTable alerts={alerts ?? []} onResolve={resolveAlert} />
    </div>
  );
}

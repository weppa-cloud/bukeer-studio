'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParams } from 'next/navigation';

export interface ReconciliationAlert {
  id: string;
  account_id: string | null;
  source: string;
  severity: string;
  summary: string;
  details: Record<string, unknown>;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface ReconciliationAlertsTableProps {
  alerts: ReconciliationAlert[];
  onResolve: (input: { websiteId: string; alertId: string }) => Promise<void>;
}

function severityVariant(s: string): 'secondary' | 'destructive' | 'default' {
  if (s === 'error') return 'destructive';
  if (s === 'warn') return 'default';
  return 'secondary';
}

export function ReconciliationAlertsTable({ alerts, onResolve }: ReconciliationAlertsTableProps) {
  const params = useParams<{ websiteId: string }>();
  const websiteId = params?.websiteId ?? '';
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const unresolved = alerts.filter((a) => !a.resolved_at);
  const resolved = alerts.filter((a) => a.resolved_at);

  if (alerts.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-6" aria-label="Alertas de reconciliación">
        <p className="text-sm text-muted-foreground" role="status">
          Sin alertas. Sistema saludable.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Alertas de reconciliación">
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}

      {unresolved.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <header className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Pendientes ({unresolved.length})</h3>
          </header>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Severidad</th>
                <th className="px-4 py-2 text-left">Fuente</th>
                <th className="px-4 py-2 text-left">Resumen</th>
                <th className="px-4 py-2 text-left">Creada</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {unresolved.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.source}</td>
                  <td className="px-4 py-3 text-foreground">{a.summary}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      aria-label={`Resolver alerta ${a.summary}`}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await onResolve({ websiteId, alertId: a.id });
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Error');
                          }
                        })
                      }
                    >
                      Resolver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resolved.length > 0 && (
        <details className="rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted-foreground">
            Resueltas ({resolved.length})
          </summary>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Severidad</th>
                <th className="px-4 py-2 text-left">Resumen</th>
                <th className="px-4 py-2 text-left">Resuelta</th>
              </tr>
            </thead>
            <tbody>
              {resolved.map((a) => (
                <tr key={a.id} className="border-t border-border text-muted-foreground">
                  <td className="px-4 py-3"><Badge variant="secondary">{a.severity}</Badge></td>
                  <td className="px-4 py-3">{a.summary}</td>
                  <td className="px-4 py-3 text-xs">
                    {a.resolved_at ? new Date(a.resolved_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export interface TriggerReconciliationButtonProps {
  onTrigger: (input: { websiteId: string; windowHours?: number }) => Promise<{ anomaliesCount: number }>;
}

export function TriggerReconciliationButton({ onTrigger }: TriggerReconciliationButtonProps) {
  const params = useParams<{ websiteId: string }>();
  const websiteId = params?.websiteId ?? '';
  const [pending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setLastResult(null);
            try {
              const { anomaliesCount } = await onTrigger({ websiteId, windowHours: 24 });
              setLastResult(
                anomaliesCount === 0
                  ? 'Sin anomalías en ventana 24h'
                  : `${anomaliesCount} anomalías detectadas`,
              );
            } catch (e) {
              setLastResult(e instanceof Error ? e.message : 'Error');
            }
          })
        }
      >
        {pending ? 'Reconciliando…' : 'Ejecutar reconciliación 24h'}
      </Button>
      {lastResult && (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {lastResult}
        </p>
      )}
    </div>
  );
}

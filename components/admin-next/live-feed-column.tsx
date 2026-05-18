"use client";

import type { LiveFeedItem } from '@bukeer/admin-contract';
import { Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatePill } from './state-pill';

export function LiveFeedColumn({
  items,
  onInspectTrace,
}: {
  items: LiveFeedItem[];
  onInspectTrace: (traceId: string) => void;
}) {
  return (
    <section className="border-t bg-background xl:border-t-0">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Live supplier feed
            </div>
            <h2 className="mt-1 text-base font-semibold">Availability & margin</h2>
          </div>
          <Activity className="size-4 text-secondary" />
        </div>
      </div>
      <div className="space-y-3 p-4">
        {items.map((item) => (
          <article key={item.id} className="rounded-md border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{item.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <StatePill state={item.status} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <RefreshCw className="size-3.5" />
                {item.updatedLabel}
              </span>
              <span className="font-semibold">{item.marginLabel} margin</span>
            </div>
            <Button
              className="mt-3 w-full"
              variant="outline"
              size="sm"
              onClick={() => onInspectTrace(item.traceId)}
            >
              Inspect trace
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

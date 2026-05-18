"use client";

import type { ItinerarySegment, PlannerOpportunity } from '@bukeer/admin-contract';
import { CalendarDays, DollarSign, FileText, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatePill } from './state-pill';

export function PlanningCanvas({
  opportunity,
  segments,
  onInspectTrace,
}: {
  opportunity: PlannerOpportunity;
  segments: ItinerarySegment[];
  onInspectTrace: (traceId: string) => void;
}) {
  return (
    <section className="min-w-0">
      <div className="border-b bg-background p-4 lg:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Planner Workbench
            </h1>
            <div className="mt-1 text-2xl font-semibold tracking-normal">{opportunity.destination}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {opportunity.leadName} - {opportunity.tripDates} - {opportunity.durationLabel}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs lg:min-w-[360px]">
            <Metric icon={<CalendarDays className="size-4" />} label="SLA" value={opportunity.slaLabel} />
            <Metric icon={<DollarSign className="size-4" />} label="Value" value={opportunity.valueLabel} />
            <Metric icon={<ShieldAlert className="size-4" />} label="Margin" value={opportunity.marginLabel} />
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4 lg:p-5">
        <div className="rounded-md border border-accent/30 bg-accent/10 p-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-semibold">Not ready to send</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Public proposal send requires approval and missing passenger data resolution. This prototype is read-only.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-background">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Itinerary Manifest</div>
              <div className="text-xs text-muted-foreground">Confirmed, suggested, blocked and approval-required segments</div>
            </div>
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <div className="divide-y">
            {segments.map((segment) => (
              <article key={segment.id} className="grid gap-3 px-4 py-3 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center">
                <div className="text-xs font-semibold text-muted-foreground">{segment.dayLabel}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{segment.title}</h3>
                    <StatePill state={segment.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{segment.supplier}</p>
                </div>
                <div className="flex items-center justify-between gap-3 md:justify-end">
                  <div className="text-right text-xs">
                    <div className="font-semibold">{segment.priceLabel}</div>
                    <div className="text-muted-foreground">{segment.marginLabel}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onInspectTrace(segment.traceId)}>
                    Trace
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}

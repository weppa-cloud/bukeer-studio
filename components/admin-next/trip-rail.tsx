"use client";

import type { PlannerOpportunity } from '@bukeer/admin-contract';
import { Clock, MessageSquareText, PlaneTakeoff, Users } from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import { cn } from '@/lib/utils';
import { StatePill } from './state-pill';

export function TripRail({
  opportunities,
  selectedId,
}: {
  opportunities: PlannerOpportunity[];
  selectedId: string;
}) {
  return (
    <aside className="border-b bg-background lg:border-b-0 lg:border-r">
      <div className="border-b p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {adminNextCopy.tripRail.eyebrow}
        </div>
        <h2 className="mt-1 text-lg font-semibold">{adminNextCopy.tripRail.title}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto p-3 lg:block lg:space-y-2 lg:overflow-visible">
        {opportunities.map((item) => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              data-testid={`trip-rail-opportunity-${item.id}`}
              className={cn(
                'min-w-[280px] rounded-md border bg-background p-3 text-left lg:w-full',
                selected ? 'border-primary/40 shadow-sm ring-1 ring-primary/20' : 'border-border',
              )}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{item.leadName}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <PlaneTakeoff className="size-3.5" />
                    <span className="truncate">{item.destination}</span>
                  </div>
                </div>
                <StatePill state={item.actionState} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <Meta
                  icon={<Users className="size-3.5" />}
                  label={adminNextCopy.tripRail.paxLabel(item.traveler.pax.adults + item.traveler.pax.children)}
                />
                <Meta icon={<Clock className="size-3.5" />} label={item.slaLabel} />
                <Meta icon={<MessageSquareText className="size-3.5" />} label={item.sourceChannel} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.valueLabel}</span>
                <span className="font-semibold">{adminNextCopy.tripRail.marginLabel(item.marginLabel)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function Meta({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

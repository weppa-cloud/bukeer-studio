'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ScheduleEntry } from '@bukeer/website-contract';
import { SCHEDULE_STEPS_VISIBLE } from '@bukeer/website-contract';

interface ActivityScheduleInlineProps {
  steps: ScheduleEntry[];
  activitySlug?: string;
  activityName: string;
}

export function ActivityScheduleInline({
  steps,
  activitySlug,
  activityName,
}: ActivityScheduleInlineProps) {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) {
    return null;
  }

  const visibleSteps = expanded ? steps : steps.slice(0, SCHEDULE_STEPS_VISIBLE);
  const hiddenCount = steps.length - SCHEDULE_STEPS_VISIBLE;
  const hasMore = steps.length > SCHEDULE_STEPS_VISIBLE;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
        Programa
      </p>
      <ol className="space-y-2">
        {visibleSteps.map((step, index) => (
          <li
            key={`${index}-${step.title}`}
            className="flex items-start gap-3 text-sm"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-medium leading-snug">{step.title}</span>
              {step.time && (
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  {step.time}
                </span>
              )}
              {step.description && (
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {step.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {expanded ? 'Ver menos' : `Ver ${hiddenCount} más`}
          </button>
        )}
        {activitySlug && (
          <Link
            href={`/actividades/${activitySlug}`}
            className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
            aria-label={`Ver detalle completo de ${activityName}`}
          >
            Ver detalle completo →
          </Link>
        )}
      </div>
    </div>
  );
}

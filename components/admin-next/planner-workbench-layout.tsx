"use client";

import type { PlannerWorkbenchFixture } from '@bukeer/admin-contract';
import { AgentBlockedCard, AgentSuggestionCard } from './agent-cards';
import { ApprovalCommandBar } from './approval-command-bar';
import { LiveFeedColumn } from './live-feed-column';
import { PlanningCanvas } from './planning-canvas';
import { TripRail } from './trip-rail';

export function PlannerWorkbenchLayout({
  fixture,
  onInspectTrace,
  onSimulate,
}: {
  fixture: PlannerWorkbenchFixture;
  onInspectTrace: (traceId: string) => void;
  onSimulate: (message: string) => void;
}) {
  const approval = fixture.approvals[0];

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
      <TripRail opportunities={fixture.opportunities} selectedId={fixture.opportunity.id} />
      <div className="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 pb-28">
          <PlanningCanvas
            opportunity={fixture.opportunity}
            segments={fixture.itinerarySegments}
            onInspectTrace={onInspectTrace}
          />
          <section className="space-y-3 p-4 pt-0 lg:p-5 lg:pt-0">
            {fixture.suggestions.map((suggestion) => (
              <AgentSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onInspectTrace={onInspectTrace}
                onSimulate={onSimulate}
              />
            ))}
            {fixture.blockedStates.map((blocked) => (
              <AgentBlockedCard
                key={blocked.id}
                blocked={blocked}
                onInspectTrace={onInspectTrace}
              />
            ))}
          </section>
          {approval ? (
            <ApprovalCommandBar
              approval={approval}
              onInspectTrace={onInspectTrace}
              onSimulate={onSimulate}
            />
          ) : null}
        </div>
        <LiveFeedColumn items={fixture.liveFeed} onInspectTrace={onInspectTrace} />
      </div>
    </div>
  );
}

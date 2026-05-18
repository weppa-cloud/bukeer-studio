"use client";

import { useEffect, useState } from 'react';
import type {
  AuthenticatedAdminSessionContext,
  PlannerOpportunity,
  PlannerWorkbenchFixture,
} from '@bukeer/admin-contract';
import {
  SignatureApprovalCommandBar,
  SignatureBlockedBanner,
  SignatureCopilotPanel,
  SignatureItineraryManifest,
  SignatureLiveFeedColumn,
  SignatureMarginGuard,
  SignatureMissingDataChecklist,
  SignaturePlannerHeader,
  SignatureSafetyBoundary,
  SignatureTracePreview,
  SignatureTripRail,
} from './signature-ui';
import { TraceDrawer } from './trace-drawer';

export function PlannerWorkbenchPrototype({
  session,
  fixture,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: PlannerWorkbenchFixture;
}) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [lastTraceId, setLastTraceId] = useState(fixture.traceSummary.traceId);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  function inspectTrace(traceId: string) {
    setLastTraceId(traceId);
    setTraceOpen(true);
  }

  function simulate(message: string) {
    setSimulationMessage(message);
  }

  function traceIdForOpportunity(_opportunity: PlannerOpportunity, index: number) {
    return index === 0 ? fixture.traceSummary.traceId : fixture.suggestions[0]?.traceId ?? fixture.traceSummary.traceId;
  }

  const approval = fixture.approvals[0]!;
  const blocked = fixture.blockedStates[0]!;

  return (
    <main className="bukeer-admin-signature min-h-screen bg-background pb-28 text-foreground">
      {hydrated ? (
        <span data-testid="planner-workbench-hydrated" className="sr-only">
          Planner Workbench hydrated
        </span>
      ) : null}

      <div className="flex min-h-screen flex-col lg:flex-row">
        <SignatureTripRail
          opportunities={fixture.opportunities}
          session={session}
          traceIdForOpportunity={traceIdForOpportunity}
          onInspectTrace={inspectTrace}
        />

        <section className="min-w-0 flex-1">
          <SignaturePlannerHeader opportunity={fixture.opportunity} />

          <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 md:px-8">
            <SignatureBlockedBanner
              reason={blocked.reason}
              missingCount={fixture.opportunity.missingDataCount}
            />

            <SignatureItineraryManifest
              segments={fixture.itinerarySegments}
              traceId={fixture.traceSummary.traceId}
              onInspectTrace={inspectTrace}
            />

            <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <SignatureCopilotPanel
                suggestions={fixture.suggestions}
                onInspectTrace={inspectTrace}
              />
              <SignatureTracePreview
                traceEvents={fixture.traceEvents}
                traceId={fixture.traceSummary.traceId}
                onInspectTrace={inspectTrace}
              />
            </section>
          </div>
        </section>

        <aside className="w-full shrink-0 border-t border-border bg-[hsl(var(--bukeer-surface-rail))] p-4 lg:border-l lg:border-t-0 xl:w-96">
          <SignatureLiveFeedColumn items={fixture.liveFeed} onInspectTrace={inspectTrace} />
          <div className="mt-4 space-y-4">
            <SignatureMarginGuard
              margin={fixture.opportunity.marginLabel}
              target="18%"
              revenue={fixture.opportunity.valueLabel}
              cost="USD 3,805"
              profit="USD 995"
            />
            <SignatureMissingDataChecklist items={fixture.missingData} />
            <SignatureSafetyBoundary simulationMessage={simulationMessage} />
          </div>
        </aside>
      </div>

      <SignatureApprovalCommandBar
        approval={approval}
        onInspectTrace={inspectTrace}
        onSimulate={simulate}
      />

      <TraceDrawer
        open={traceOpen}
        onOpenChange={setTraceOpen}
        summary={{ ...fixture.traceSummary, traceId: lastTraceId }}
        events={fixture.traceEvents}
      />
    </main>
  );
}

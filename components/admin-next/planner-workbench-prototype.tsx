"use client";

import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import type {
  AuthenticatedAdminSessionContext,
  PlannerOpportunity,
  PlannerWorkbenchFixture,
} from '@bukeer/admin-contract';
import { mapAgentLedgerToTrace } from '@/lib/admin-next/agent-ledger-adapter';
import { agentLedgerFixture } from '@/lib/admin-next/fixtures/agent-ledger';
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

type PrototypeAppearance = 'light' | 'dark';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

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
  const [appearance, setAppearance] = useState<PrototypeAppearance>('light');

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

  const activeTrace = useMemo(() => {
    try {
      return mapAgentLedgerToTrace(agentLedgerFixture, lastTraceId);
    } catch {
      return {
        summary: { ...fixture.traceSummary, traceId: lastTraceId },
        events: fixture.traceEvents,
      };
    }
  }, [fixture.traceEvents, fixture.traceSummary, lastTraceId]);

  const approval = fixture.approvals[0]!;
  const blocked = fixture.blockedStates[0]!;

  return (
    <main
      className={cx(
        'bukeer-admin-signature min-h-screen bg-background pb-28 text-foreground',
        appearance === 'dark' && 'dark'
      )}
      data-appearance={appearance}
      data-testid="planner-workbench-root"
      style={{ colorScheme: appearance }}
    >
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
          <SignaturePlannerHeader
            opportunity={fixture.opportunity}
            actions={
              <PrototypeAppearanceToggle
                appearance={appearance}
                onAppearanceChange={setAppearance}
              />
            }
          />

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
        appearance={appearance}
        summary={activeTrace.summary}
        events={activeTrace.events}
      />
    </main>
  );
}

function PrototypeAppearanceToggle({
  appearance,
  onAppearanceChange,
}: {
  appearance: PrototypeAppearance;
  onAppearanceChange: (appearance: PrototypeAppearance) => void;
}) {
  return (
    <div
      aria-label="Appearance"
      className="inline-flex rounded-md border border-border bg-[hsl(var(--bukeer-surface-panel))] p-1 text-xs shadow-sm"
      role="group"
    >
      <button
        type="button"
        className={cx(
          'inline-flex h-8 items-center gap-1.5 rounded px-2.5 font-medium transition',
          appearance === 'light'
            ? 'bg-[hsl(var(--bukeer-live)/0.12)] text-[hsl(var(--bukeer-live))]'
            : 'text-muted-foreground hover:bg-muted'
        )}
        data-testid="planner-workbench-light-mode"
        onClick={() => onAppearanceChange('light')}
      >
        <Sun className="size-3.5" />
        Light
      </button>
      <button
        type="button"
        className={cx(
          'inline-flex h-8 items-center gap-1.5 rounded px-2.5 font-medium transition',
          appearance === 'dark'
            ? 'bg-[hsl(var(--bukeer-structural)/0.18)] text-[hsl(var(--bukeer-structural))]'
            : 'text-muted-foreground hover:bg-muted'
        )}
        data-testid="planner-workbench-dark-mode"
        onClick={() => onAppearanceChange('dark')}
      >
        <Moon className="size-3.5" />
        Dark
      </button>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import type {
  AdminDataSourceMode,
  AgentLedgerSnapshot,
  PlannerOpportunity,
  PlannerWorkbenchFixture,
} from '@bukeer/admin-contract';
import { mapAgentLedgerToTrace } from '@/lib/admin-next/agent-ledger-adapter';
import { agentLedgerFixture } from '@/lib/admin-next/fixtures/agent-ledger';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';
import {
  SignatureApprovalCommandBar,
  SignatureBlockedBanner,
  SignatureCopilotPanel,
  SignatureDraftActionPanel,
  SignatureItineraryManifest,
  SignatureLiveFeedColumn,
  SignatureMarginGuard,
  SignatureMissingDataChecklist,
  SignaturePlannerHeader,
  SignatureSafetyBoundary,
  SignatureTracePreview,
  SignatureTripRail,
  type BukeerDraftAction,
  type SignatureWhatsAppHandoffResult,
} from './signature-ui';
import { TraceDrawer } from './trace-drawer';

type PrototypeAppearance = 'light' | 'dark';
type AuthenticatedAdminNextSessionContext = Extract<
  AdminNextSessionContext,
  { status: 'authenticated' }
>;

const WHATSAPP_HANDOFF_ENDPOINT = '/api/admin-next/planner-workbench/whatsapp-handoff';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function PlannerWorkbenchPrototype({
  session,
  fixture,
  agentLedger = agentLedgerFixture,
  dataSourceMode = 'fixture',
}: {
  session: AuthenticatedAdminNextSessionContext;
  fixture: PlannerWorkbenchFixture;
  agentLedger?: AgentLedgerSnapshot;
  dataSourceMode?: AdminDataSourceMode;
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

  async function createWhatsAppHandoff(
    action: BukeerDraftAction
  ): Promise<SignatureWhatsAppHandoffResult> {
    const response = await fetch(WHATSAPP_HANDOFF_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draftActionId: action.id,
        traceId: action.traceId,
        opportunityId: fixture.opportunity.id,
      }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof payload?.error?.message === 'string'
          ? payload.error.message
          : 'Could not create WhatsApp handoff.';
      throw new Error(message);
    }

    const data = payload?.data ?? payload;
    const referenceCode = typeof data?.referenceCode === 'string' ? data.referenceCode : null;
    const waMeUrl =
      typeof data?.waMeUrl === 'string'
        ? data.waMeUrl
        : typeof data?.whatsappUrl === 'string'
          ? data.whatsappUrl
          : null;

    if (!referenceCode || !waMeUrl) {
      throw new Error('WhatsApp handoff response was incomplete.');
    }

    return {
      referenceCode,
      waMeUrl,
      expiresAt: typeof data?.expiresAt === 'string' ? data.expiresAt : null,
    };
  }

  function traceIdForOpportunity(_opportunity: PlannerOpportunity, index: number) {
    return index === 0 ? fixture.traceSummary.traceId : fixture.suggestions[0]?.traceId ?? fixture.traceSummary.traceId;
  }

  const activeTrace = useMemo(() => {
    try {
      return mapAgentLedgerToTrace(agentLedger, lastTraceId);
    } catch {
      return {
        summary: { ...fixture.traceSummary, traceId: lastTraceId },
        events: fixture.traceEvents,
      };
    }
  }, [agentLedger, fixture.traceEvents, fixture.traceSummary, lastTraceId]);

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

            <SignatureDraftActionPanel
              draftActions={fixture.draftActions}
              onInspectTrace={inspectTrace}
              onSimulate={simulate}
              whatsappHandoffEnabled={session.flags.adminNextExternalHandoff}
              onCreateWhatsAppHandoff={createWhatsAppHandoff}
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
            <SignatureSafetyBoundary
              dataSourceMode={dataSourceMode}
              simulationMessage={simulationMessage}
            />
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

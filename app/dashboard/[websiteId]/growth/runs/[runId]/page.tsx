import { notFound } from "next/navigation";
import Link from "next/link";
import {
  type AgentRunStatus,
  type GrowthAgentRunEvent,
} from "@bukeer/website-contract";
import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
} from "@/components/studio/ui/primitives";
import { getAgentRunDetail } from "@/lib/growth/console/queries-runs";
import { hasGrowthRole, requireGrowthRole } from "@/lib/growth/console/auth";
import { approveRun, rejectRun, downloadArtifactAction } from "./actions";

/**
 * Reviews & Agent Runs — detail view (#407).
 *
 * Tenant-guarded server component (ADR-009). Renders run header, append-only
 * timeline of events, evidence (collapsed JSON), and an artifact download
 * affordance via Server Action that returns a signed URL.
 *
 * Append-only: events are READ-ONLY here. There is no UI for editing or
 * deleting events.
 *
 * Artifact paths are NEVER raw-exposed. We display only the last 16 chars
 * of `artifact_path` plus a TODO note; the signed URL is derived
 * server-side and only returned through the action.
 *
 * Roles: Approve / Reject require `curator+`. The Server Actions also
 * re-check before mutating.
 */

const STATUS_TONE: Record<
  AgentRunStatus,
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
  claimed: "info",
  running: "info",
  review_required: "warning",
  failed: "danger",
  completed: "success",
  stalled: "danger",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

interface PageProps {
  params: Promise<{ websiteId: string; runId: string }>;
}

function EvidenceBlock({
  evidence,
}: {
  evidence: Record<string, unknown> | null;
}) {
  if (!evidence || Object.keys(evidence).length === 0) {
    return (
      <p className="text-xs text-[var(--studio-text-muted)]">
        Sin evidencia registrada.
      </p>
    );
  }
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-[var(--studio-text-muted)]">
        Mostrar evidencia ({Object.keys(evidence).length} keys)
      </summary>
      <pre className="mt-2 p-3 rounded-md bg-[var(--studio-surface)] overflow-x-auto">
        {JSON.stringify(evidence, null, 2)}
      </pre>
    </details>
  );
}

function EventTimeline({ events }: { events: GrowthAgentRunEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-[var(--studio-text-muted)]">
        Sin eventos registrados.
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {events.map((ev) => (
        <li
          key={ev.event_id}
          data-testid={`growth-run-event-row-${ev.event_id}`}
          className="studio-panel border border-[var(--studio-border)] p-3"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[var(--studio-text-muted)]">
              {fmtDate(ev.occurred_at)}
            </span>
            <StudioBadge
              tone={
                ev.severity === "error"
                  ? "danger"
                  : ev.severity === "warn"
                    ? "warning"
                    : "neutral"
              }
            >
              {ev.event_type}
            </StudioBadge>
            {ev.severity !== "info" ? (
              <StudioBadge
                tone={ev.severity === "error" ? "danger" : "warning"}
              >
                {ev.severity}
              </StudioBadge>
            ) : null}
          </div>
          {ev.message ? <p className="text-sm mt-1">{ev.message}</p> : null}
          {ev.payload && Object.keys(ev.payload).length > 0 ? (
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer text-[var(--studio-text-muted)]">
                payload ({Object.keys(ev.payload).length} keys)
              </summary>
              <pre className="mt-2 p-2 rounded bg-[var(--studio-surface)] overflow-x-auto">
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            </details>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default async function GrowthRunDetailPage({ params }: PageProps) {
  const { websiteId, runId } = await params;

  const auth = await requireGrowthRole(websiteId, "viewer");
  const accountId = auth.accountId;
  const { role } = auth;
  const canCurate = hasGrowthRole(role, "curator");

  const detail = await getAgentRunDetail(websiteId, runId, accountId);
  if (!detail) notFound();

  const {
    run,
    events,
    agentName,
    agreementForLane,
    hasArtifact,
    artifactPathTail,
  } = detail;

  return (
    <StudioPage className="max-w-5xl">
      <StudioSectionHeader
        title={`Run ${run.run_id.slice(-8)}`}
        subtitle={`Lane ${run.lane} · ${agentName ?? "agent: —"}`}
        actions={
          <div className="flex items-center gap-2">
            <StudioBadge tone={STATUS_TONE[run.status]}>
              {run.status}
            </StudioBadge>
            <Link
              href={`/dashboard/${websiteId}/growth/runs`}
              className="text-xs underline text-[var(--studio-text-muted)]"
            >
              ← Volver
            </Link>
          </div>
        }
      />

      {/* Header facts */}
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mt-4">
        <div>
          <dt className="text-[var(--studio-text-muted)]">claim_id</dt>
          <dd className="font-mono break-all">{run.claim_id}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">workspace</dt>
          <dd className="font-mono break-all">{run.workspace_path}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">attempts</dt>
          <dd>{run.attempts}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">started</dt>
          <dd>{fmtDate(run.started_at)}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">finished</dt>
          <dd>{fmtDate(run.finished_at)}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">heartbeat</dt>
          <dd>{fmtDate(run.heartbeat_at)}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">
            agreement_threshold
          </dt>
          <dd>
            {agreementForLane != null ? agreementForLane.toFixed(2) : "—"}
          </dd>
        </div>
        {run.error_class ? (
          <div className="col-span-2 md:col-span-3">
            <dt className="text-[var(--studio-text-muted)]">error</dt>
            <dd className="text-[var(--studio-danger)]">
              <span className="font-mono">{run.error_class}</span>
              {run.error_message ? <> — {run.error_message}</> : null}
            </dd>
          </div>
        ) : null}
      </dl>

      {/* Approve / Reject */}
      <section aria-labelledby="run-review-heading" className="space-y-3 mt-6">
        <header>
          <h2
            id="run-review-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Review
          </h2>
          {!canCurate ? (
            <p className="text-xs text-[var(--studio-text-muted)]">
              Tu rol actual ({role}) no puede aprobar/rechazar runs. Se requiere{" "}
              <code>curator</code> o superior.
            </p>
          ) : null}
        </header>
        <div className="flex flex-wrap gap-2">
          <form action={approveRun}>
            <input type="hidden" name="websiteId" value={websiteId} />
            <input type="hidden" name="runId" value={run.run_id} />
            <button
              type="submit"
              disabled={!canCurate || run.status !== "review_required"}
              className="studio-button studio-button--primary disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                run.status !== "review_required"
                  ? "Solo runs en review_required pueden aprobarse."
                  : undefined
              }
            >
              Approve
            </button>
          </form>
          <form action={rejectRun} className="flex items-end gap-2">
            <input type="hidden" name="websiteId" value={websiteId} />
            <input type="hidden" name="runId" value={run.run_id} />
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-[var(--studio-text-muted)]">
                Notas (opcional)
              </span>
              <input
                type="text"
                name="notes"
                maxLength={500}
                disabled={!canCurate || run.status !== "review_required"}
                className="studio-input"
              />
            </label>
            <button
              type="submit"
              disabled={!canCurate || run.status !== "review_required"}
              className="studio-button studio-button--danger disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reject
            </button>
          </form>
        </div>
      </section>

      {/* Artifact (path obfuscated) */}
      <section
        aria-labelledby="run-artifact-heading"
        className="space-y-2 mt-6"
      >
        <header>
          <h2
            id="run-artifact-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Artifact
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            La ruta cruda nunca se expone. Mostramos los últimos 16 caracteres
            como hash visible; la URL firmada se calcula por server action.
          </p>
        </header>
        {hasArtifact ? (
          <div className="flex flex-wrap items-center gap-3">
            <code className="text-xs font-mono text-[var(--studio-text-muted)]">
              …{artifactPathTail}
            </code>
            <form action={downloadArtifactAction}>
              <input type="hidden" name="websiteId" value={websiteId} />
              <input type="hidden" name="runId" value={run.run_id} />
              <button
                type="submit"
                className="studio-button studio-button--outline"
              >
                Download artifact
              </button>
            </form>
            <span className="text-xs text-[var(--studio-text-muted)]">
              TODO(#404): some artifacts live in the orchestrator workspace (not
              Storage). Signed-URL transport for those is TBD.
            </span>
          </div>
        ) : (
          <p className="text-xs text-[var(--studio-text-muted)]">
            Este run no produjo artifact.
          </p>
        )}
      </section>

      {/* Evidence */}
      <section
        aria-labelledby="run-evidence-heading"
        className="space-y-2 mt-6"
      >
        <header>
          <h2
            id="run-evidence-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Evidence
          </h2>
        </header>
        <EvidenceBlock evidence={run.evidence} />
      </section>

      {/* Events timeline (append-only) */}
      <section
        aria-labelledby="run-events-heading"
        data-testid="growth-run-events-panel"
        className="space-y-2 mt-6"
      >
        <header>
          <h2
            id="run-events-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Timeline ({events.length})
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            Append-only — los eventos no se pueden editar ni eliminar (RLS lo
            bloquea a nivel DB).
          </p>
        </header>
        <EventTimeline events={events} />
      </section>
    </StudioPage>
  );
}

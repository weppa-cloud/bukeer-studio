import {
  ApprovalCommandBar,
  BukeerStatePill,
  TraceNode,
} from "@/components/bukeer-admin/signature-components"

export default function SignatureTraceApproval() {
  return (
    <main className="bukeer-admin-signature min-h-screen bg-[hsl(var(--background))] pb-20 text-[hsl(var(--foreground))]">
      <header className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-md bg-[hsl(var(--bukeer-structural))] px-2 py-1 text-sm font-semibold text-white">B</div>
            <span className="text-sm font-medium">Agent Traces</span>
            <span className="text-sm text-muted-foreground">trace_9f3a2b</span>
          </div>
          <BukeerStatePill tone="humanLoop">Pending approval</BukeerStatePill>
        </div>
      </header>
      <div className="grid grid-cols-[1fr_27rem]">
        <section className="mx-auto w-full max-w-4xl px-8 py-10">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Agent trace</div>
            <h1 className="mt-2 text-xl font-semibold">Itinerary Draft - Mariana Rios</h1>
            <p className="mt-1 text-sm text-muted-foreground">Agent: bukeer-travel-v2 - Session sess_mr_20260518_092</p>
          </div>
          <div className="space-y-5 border-l pl-8">
            <TraceNode title="Context packet created" description="Traveler context assembled from CRM, prior trips and preferences. Tenant scope and permissions verified." status="completed" tone="live" />
            <TraceNode title="Reasoning summary produced" description="Model produced an itinerary plan summary covering route, accommodation logic, activity sequencing and margin analysis." status="completed" tone="live" />
            <TraceNode title="Tool call requested" description="Agent issued itinerary.createDraft. Guardrail resolution required before execution proceeds." status="running" tone="structural" />
            <TraceNode title="Approval interruption" description="Human-in-the-loop gate triggered. Manager approval required before draft is persisted." status="pending" tone="humanLoop" />
            <TraceNode title="Payment override blocked" description="Agent attempted booking.reservePayment before draft approval. Action blocked by policy." status="blocked" tone="danger" />
          </div>
        </section>
        <aside className="min-h-[calc(100vh-3.25rem)] border-l bg-[hsl(var(--bukeer-surface-rail))] p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tool invocation detail</div>
          <h2 className="mt-4 font-semibold">Tool Call Requested</h2>
          <div className="mt-2 inline-flex rounded-md bg-[hsl(var(--bukeer-structural)/0.12)] px-2 py-1 font-mono text-xs text-[hsl(var(--bukeer-structural))]">itinerary.createDraft</div>
          <div className="mt-6 space-y-5 text-sm">
            <section>
              <h3 className="font-semibold">Rationale</h3>
              <p className="mt-2 text-muted-foreground">Draft creation persists a provisional itinerary record and requires permission check plus margin guardrail clearance.</p>
            </section>
            <section>
              <h3 className="font-semibold">Data sources</h3>
              <div className="mt-2 space-y-2">
                {["Reasoning plan node-02", "Supplier catalog 2026", "Pricing engine dynamic-v7"].map((source) => (
                  <div key={source} className="rounded-md border bg-card px-3 py-2 font-mono text-xs">{source}</div>
                ))}
              </div>
            </section>
            <section className="rounded-lg border border-[hsl(var(--bukeer-warning)/0.45)] bg-[hsl(var(--bukeer-warning)/0.10)] p-3">
              <h3 className="font-semibold">Risk assessment</h3>
              <p className="mt-2 text-muted-foreground">Write operation. Margin below policy. Children ages unconfirmed.</p>
            </section>
          </div>
        </aside>
      </div>
      <ApprovalCommandBar />
    </main>
  )
}

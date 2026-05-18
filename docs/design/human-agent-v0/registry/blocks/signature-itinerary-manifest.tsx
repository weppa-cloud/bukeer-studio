import {
  ApprovalCommandBar,
  BukeerStatePill,
  CopilotThread,
  ItineraryBlock,
  MarginGuard,
  MissingDataChecklist,
} from "@/components/bukeer-admin/signature-components"

const days = [
  { day: "Jul 12", title: "Arrival", state: "confirmed" },
  { day: "Jul 13", title: "Old City", state: "approval_required" },
  { day: "Jul 14", title: "Rosario Islands", state: "blocked_missing_data" },
  { day: "Jul 15", title: "Beach day", state: "suggested" },
]

const supplierEvidence = [
  { title: "Hotel Casa San Agustin", detail: "18.6% margin - supplier available - best fit" },
  { title: "Sofitel Legend Santa Clara", detail: "12.9% margin - hold expires in 43m" },
  { title: "Rosario Islands Charter", detail: "On request - passport names required" },
]

export default function SignatureItineraryManifest() {
  return (
    <main className="bukeer-admin-signature flex min-h-screen bg-[hsl(var(--background))] pb-20 text-[hsl(var(--foreground))]">
      <aside className="w-72 shrink-0 border-r bg-[hsl(var(--bukeer-surface-rail))]">
        <div className="border-b p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Itinerary manifest</div>
          <h1 className="mt-2 text-lg font-semibold">Cartagena Family Escape</h1>
          <p className="mt-1 text-sm text-muted-foreground">5D/4N - 2 adults + 2 children</p>
        </div>
        <div className="divide-y">
          {days.map((item) => (
            <button key={item.day} className="flex w-full items-center justify-between p-4 text-left hover:bg-background">
              <span>
                <span className="block text-xs text-muted-foreground">{item.day}</span>
                <span className="block font-semibold">{item.title}</span>
              </span>
              <BukeerStatePill tone={item.state === "confirmed" ? "success" : item.state === "blocked_missing_data" ? "humanLoop" : "structural"}>
                {item.state}
              </BukeerStatePill>
            </button>
          ))}
        </div>
        <div className="border-t p-4">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-muted-foreground">Cost</span><div className="font-semibold">$3,805</div></div>
            <div><span className="text-muted-foreground">Sell</span><div className="font-semibold">$4,800</div></div>
            <div><span className="text-muted-foreground">Margin</span><div className="font-semibold text-[hsl(var(--bukeer-human-loop))]">14%</div></div>
          </div>
        </div>
      </aside>
      <section className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-8 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Proposal readiness</div>
              <h2 className="mt-1 text-xl font-semibold">Not ready to send - approval and missing data required</h2>
            </div>
            <BukeerStatePill tone="humanLoop">Approval required</BukeerStatePill>
          </div>
        </header>
        <div className="mx-auto max-w-4xl space-y-5 px-8 py-6">
          <div className="rounded-lg border border-[hsl(var(--bukeer-human-loop)/0.36)] bg-[hsl(var(--bukeer-human-loop)/0.10)] p-4">
            <div className="font-semibold text-[hsl(var(--bukeer-human-loop))]">Blocked: missing passenger data</div>
            <p className="mt-1 text-sm text-muted-foreground">Children ages and passport names are required before hotel rooming list, boat insurance and public proposal send.</p>
          </div>
          <ItineraryBlock kind="Transfer" title="Private airport transfer" meta="Confirmed - Rafael Nunez Intl to Old City hotel" price="$85" margin="17.4% margin" tone="live" />
          <ItineraryBlock kind="Hotel" title="Sofitel Legend Santa Clara" meta="Pending supplier confirmation - hold expires in 43 minutes" price="$1,424" margin="12.9% margin" tone="humanLoop" />
          <CopilotThread title="AI suggests hotel swap" rationale="Hotel Casa San Agustin improves margin to 18.6%, keeps Old City proximity and reduces supplier hold risk." action="Inspect trace" />
          <ItineraryBlock kind="Excursion" title="Rosario Islands private charter" meta="Blocked until passport names and children ages are complete" price="$680" margin="18.7% margin" tone="humanLoop" />
        </div>
      </section>
      <aside className="w-96 shrink-0 border-l bg-[hsl(var(--bukeer-surface-rail))] p-4">
        <MarginGuard margin="14.0%" target="18%" revenue="$4,800" cost="$3,805" profit="$995" />
        <div className="mt-4">
          <MissingDataChecklist items={["Children ages", "Full passport names", "Dietary restrictions", "Inbound flight time"]} />
        </div>
        <section className="mt-4 rounded-lg border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Supplier evidence</div>
          <div className="mt-3 space-y-3">
            {supplierEvidence.map((item) => (
              <div key={item.title} className="rounded-md border p-3">
                <div className="font-semibold">{item.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
      <ApprovalCommandBar />
    </main>
  )
}

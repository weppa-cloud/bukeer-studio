import {
  ApprovalCommandBar,
  BukeerStatePill,
  CopilotThread,
  MissingDataChecklist,
} from "@/components/bukeer-admin/signature-components"

export default function SignatureConversationCopilot() {
  return (
    <main className="bukeer-admin-signature flex min-h-screen bg-[hsl(var(--background))] pb-20 text-[hsl(var(--foreground))]">
      <aside className="w-64 shrink-0 border-r bg-[hsl(var(--bukeer-surface-rail))]">
        <div className="border-b p-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Inbox</div>
        {["Mariana Rios", "Carlos Velez", "Ana Jimenez"].map((name, index) => (
          <button key={name} className="flex w-full items-center justify-between border-b p-4 text-left hover:bg-background">
            <span>
              <span className="block text-sm font-semibold">{name}</span>
              <span className="text-xs text-muted-foreground">{index === 0 ? "High intent" : "Needs review"}</span>
            </span>
            {index === 0 ? <BukeerStatePill tone="live">Live</BukeerStatePill> : null}
          </button>
        ))}
      </aside>
      <section className="min-w-0 flex-1 border-r">
        <header className="border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Mariana Rios - WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Public/private messaging boundary with human review gate.</p>
        </header>
        <div className="space-y-4 p-6">
          <article className="rounded-lg border bg-card p-4">
            <div className="text-sm font-semibold text-[hsl(var(--bukeer-live))]">Mariana Rios</div>
            <p className="mt-2 text-sm">Busco un viaje a Cartagena en julio para mi familia. Queremos hotel cerca de la ciudad amurallada y actividades para ninos.</p>
          </article>
          <article className="rounded-lg border border-[hsl(var(--bukeer-structural)/0.30)] bg-[hsl(var(--bukeer-structural)/0.08)] p-4">
            <div className="text-sm font-semibold">Sofia Martinez - internal note</div>
            <p className="mt-2 text-sm text-muted-foreground">High intent lead. Missing ages, exact dates and budget. Do not quote pricing yet.</p>
          </article>
          <CopilotThread title="AI suggested reply" rationale="Reply asks only for blocking missing fields before itinerary creation. No pricing or booking commitments are disclosed." action="Use in composer" />
          <section className="rounded-lg border border-[hsl(var(--bukeer-human-loop)/0.36)] bg-[hsl(var(--bukeer-human-loop)/0.08)] p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[hsl(var(--bukeer-human-loop))]">Human review required</h2>
              <BukeerStatePill tone="success">Low risk</BukeerStatePill>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Reply is allowed only after confirming it asks for missing information and does not commit price, availability or booking.</p>
          </section>
        </div>
      </section>
      <aside className="w-[28rem] shrink-0 bg-[hsl(var(--bukeer-surface-rail))] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Entity extraction</h2>
            <p className="text-xs text-muted-foreground">Live analysis from WhatsApp thread</p>
          </div>
          <BukeerStatePill tone="live">88%</BukeerStatePill>
        </div>
        <div className="space-y-3">
          {["Destination: Cartagena", "Pax: 2 adults + 2 children", "Dates: July 2026, exact TBD", "Preference: beach hotel + Old City"].map((field) => (
            <div key={field} className="rounded-lg border bg-card p-3 text-sm">{field}</div>
          ))}
        </div>
        <div className="mt-5">
          <MissingDataChecklist items={["Children ages", "Exact travel dates", "Budget range"]} />
        </div>
      </aside>
      <ApprovalCommandBar />
    </main>
  )
}

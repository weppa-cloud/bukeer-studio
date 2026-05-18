import {
  ApprovalCommandBar,
  CopilotThread,
  ItineraryBlock,
  LiveFeedColumn,
  MarginGuard,
  MissingDataChecklist,
  TripRail,
} from "@/components/bukeer-admin/signature-components"

const trips = [
  { name: "Mariana Rios", destination: "Cartagena, Colombia", value: "$4,800", state: "2 missing", tone: "live" as const },
  { name: "James Thornton", destination: "Medellin, Colombia", value: "$3,200", state: "approval", tone: "humanLoop" as const },
  { name: "Sophie Muller", destination: "Santa Marta + Tayrona", value: "$9,500", state: "hold", tone: "humanLoop" as const },
]

const feed = [
  { title: "Hotel Casa San Agustin", meta: "Better margin and kid-friendly amenities", tone: "live" as const },
  { title: "Sofitel Legend Santa Clara", meta: "Confirmation needed from revenue desk", tone: "humanLoop" as const },
  { title: "Private transfer CTG", meta: "Confirmed, vehicle assigned", tone: "success" as const },
]

export default function SignaturePlannerWorkbench() {
  return (
    <main className="bukeer-admin-signature flex min-h-screen bg-[hsl(var(--background))] pb-20 text-[hsl(var(--foreground))]">
      <TripRail trips={trips} />
      <section className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-8 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Client</div>
              <h1 className="mt-1 text-xl font-semibold">Mariana Rios - Cartagena family escape</h1>
              <p className="mt-1 text-sm text-muted-foreground">Jul 12-17, 2026 - 2 adults + 2 children - Budget USD 4,800</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Quoted</div>
              <div className="text-lg font-semibold text-[hsl(var(--bukeer-live))]">$3,805</div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-4xl space-y-5 px-8 py-6">
          <div className="rounded-lg border border-[hsl(var(--bukeer-human-loop)/0.36)] bg-[hsl(var(--bukeer-human-loop)/0.10)] px-4 py-3 text-sm">
            Missing data: children ages and full passport names. Proposal accuracy may be limited.
          </div>
          <div className="space-y-3">
            <ItineraryBlock kind="Transfer" title="Private transfer - CTG Airport to hotel" meta="Rafael Nunez Intl - Family van - Meet and greet included" price="$85" margin="17.4% margin" tone="live" />
            <ItineraryBlock kind="Hotel" title="Hotel Casa San Agustin" meta="Superior suite, city view - 4 nights - Breakfast included" price="$1,680" margin="18.6% margin" tone="humanLoop" />
            <CopilotThread title="AI suggests hotel swap" rationale="Casa San Agustin improves margin and lowers supplier confirmation risk while preserving Old City proximity." action="Review suggestion" />
            <ItineraryBlock kind="Excursion" title="Private Old City walking tour" meta="Bilingual guide - 3h - Includes Castillo de San Felipe entry" price="$240" margin="22.1% margin" tone="live" />
          </div>
        </div>
      </section>
      <LiveFeedColumn items={feed} />
      <div className="fixed right-4 top-24 w-80 space-y-4">
        <MarginGuard margin="16.8%" target="18%" revenue="$4,800" cost="$3,805" profit="$995" />
        <MissingDataChecklist items={["Children ages", "Full passport names", "Dietary preferences", "Inbound flight details"]} />
      </div>
      <ApprovalCommandBar />
    </main>
  )
}

import * as React from "react"
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  Lock,
  MessageSquareText,
  Plane,
  Sparkles,
  UserCheck,
  WalletCards,
} from "lucide-react"

type Tone = "structural" | "live" | "humanLoop" | "success" | "warning" | "danger"

const toneClasses: Record<Tone, string> = {
  structural: "border-[hsl(var(--bukeer-structural)/0.28)] bg-[hsl(var(--bukeer-structural)/0.09)] text-[hsl(var(--bukeer-structural))]",
  live: "border-[hsl(var(--bukeer-live)/0.32)] bg-[hsl(var(--bukeer-live)/0.10)] text-[hsl(var(--bukeer-live))]",
  humanLoop: "border-[hsl(var(--bukeer-human-loop)/0.36)] bg-[hsl(var(--bukeer-human-loop)/0.10)] text-[hsl(var(--bukeer-human-loop))]",
  success: "border-[hsl(var(--bukeer-success)/0.34)] bg-[hsl(var(--bukeer-success)/0.10)] text-[hsl(var(--bukeer-success))]",
  warning: "border-[hsl(var(--bukeer-warning)/0.46)] bg-[hsl(var(--bukeer-warning)/0.14)] text-amber-700",
  danger: "border-destructive/35 bg-destructive/10 text-destructive",
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function BukeerStatePill({
  tone = "structural",
  children,
}: {
  tone?: Tone
  children: React.ReactNode
}) {
  return (
    <span className={cx("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium", toneClasses[tone])}>
      {children}
    </span>
  )
}

export function TripRail({
  trips,
}: {
  trips: Array<{ name: string; destination: string; value: string; state: string; tone: Tone }>
}) {
  return (
    <aside className="w-72 shrink-0 border-r bg-[hsl(var(--bukeer-surface-rail))]">
      <div className="border-b p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Opportunities</div>
        <div className="mt-3 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">Search trips...</div>
      </div>
      <div className="divide-y">
        {trips.map((trip) => (
          <button key={trip.name} className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-background">
            <span className={cx("mt-1 h-2 w-2 rounded-full", trip.tone === "humanLoop" ? "bg-[hsl(var(--bukeer-human-loop))]" : "bg-[hsl(var(--bukeer-live))]")} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{trip.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{trip.destination}</span>
              <span className="mt-2 inline-flex text-xs text-muted-foreground">{trip.state}</span>
            </span>
            <span className="text-sm font-semibold">{trip.value}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

export function ItineraryBlock({
  kind,
  title,
  meta,
  price,
  margin,
  tone = "structural",
}: {
  kind: string
  title: string
  meta: string
  price: string
  margin: string
  tone?: Tone
}) {
  return (
    <article className={cx("rounded-lg border bg-card p-4 shadow-sm", tone === "humanLoop" && "border-l-4 border-l-[hsl(var(--bukeer-human-loop))]", tone === "live" && "border-l-4 border-l-[hsl(var(--bukeer-live))]")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Plane className="h-3.5 w-3.5" />
            {kind}
          </div>
          <h3 className="mt-1 font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
        </div>
        <div className="text-right">
          <div className="font-semibold">{price}</div>
          <div className="text-xs text-[hsl(var(--bukeer-live))]">{margin}</div>
        </div>
      </div>
    </article>
  )
}

export function MarginGuard({
  margin,
  target,
  revenue,
  cost,
  profit,
}: {
  margin: string
  target: string
  revenue: string
  cost: string
  profit: string
}) {
  return (
    <section className="rounded-lg border border-[hsl(var(--bukeer-warning)/0.45)] bg-[hsl(var(--bukeer-warning)/0.10)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--bukeer-human-loop))]" />
          Margin guard
        </div>
        <div className="font-semibold text-[hsl(var(--bukeer-human-loop))]">{margin}</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-background">
        <div className="h-2 w-3/4 rounded-full bg-[hsl(var(--bukeer-warning))]" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div><span className="text-muted-foreground">Revenue</span><div className="font-semibold">{revenue}</div></div>
        <div><span className="text-muted-foreground">Cost</span><div className="font-semibold">{cost}</div></div>
        <div><span className="text-muted-foreground">Profit</span><div className="font-semibold text-[hsl(var(--bukeer-live))]">{profit}</div></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Target margin: {target}. Require manager approval when below target.</p>
    </section>
  )
}

export function MissingDataChecklist({ items }: { items: string[] }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold text-[hsl(var(--bukeer-human-loop))]">
        <Lock className="h-4 w-4" />
        Missing data
      </div>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm">
            <CircleDot className="mt-0.5 h-4 w-4 text-[hsl(var(--bukeer-human-loop))]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function LiveFeedColumn({ items }: { items: Array<{ title: string; meta: string; tone: Tone }> }) {
  return (
    <aside className="w-80 shrink-0 border-l bg-[hsl(var(--bukeer-surface-rail))] p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Live feed</div>
        <BukeerStatePill tone="live">Live</BukeerStatePill>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-lg border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>
              </div>
              <BukeerStatePill tone={item.tone}>{item.tone}</BukeerStatePill>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export function CopilotThread({
  title,
  rationale,
  action,
}: {
  title: string
  rationale: string
  action: string
}) {
  return (
    <section className="rounded-lg border border-[hsl(var(--bukeer-live)/0.30)] bg-[hsl(var(--bukeer-live)/0.08)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold text-[hsl(var(--bukeer-live))]">
          <Sparkles className="h-4 w-4" />
          {title}
        </div>
        <BukeerStatePill tone="live">88%</BukeerStatePill>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{rationale}</p>
      <div className="mt-4 flex justify-end">
        <button className="rounded-md border border-[hsl(var(--bukeer-live)/0.38)] bg-[hsl(var(--bukeer-live)/0.14)] px-3 py-2 text-sm font-medium text-[hsl(var(--bukeer-live))]">{action}</button>
      </div>
    </section>
  )
}

export function TraceNode({
  title,
  description,
  tone = "structural",
  status,
}: {
  title: string
  description: string
  tone?: Tone
  status: string
}) {
  return (
    <div className="relative pl-8">
      <span className={cx("absolute left-0 top-1 h-3 w-3 rounded-full ring-4", tone === "humanLoop" ? "bg-[hsl(var(--bukeer-human-loop))] ring-[hsl(var(--bukeer-human-loop)/0.18)]" : "bg-[hsl(var(--bukeer-live))] ring-[hsl(var(--bukeer-live)/0.18)]")} />
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold">{title}</div>
          <BukeerStatePill tone={tone}>{status}</BukeerStatePill>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function ApprovalCommandBar({ mode = "approval" }: { mode?: "approval" | "draft" | "blocked" }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between border-t bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2 text-sm">
        {mode === "blocked" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-[hsl(var(--bukeer-human-loop))]" />}
        <span className="font-medium">{mode === "blocked" ? "Blocked by policy" : "Approval required"}</span>
        <span className="text-muted-foreground">Trace, permissions and risk must be reviewed before write.</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-md border px-3 py-2 text-sm font-medium">Escalate</button>
        <button className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">Reject</button>
        <button className="rounded-md bg-[hsl(var(--bukeer-live))] px-3 py-2 text-sm font-semibold text-white">Approve</button>
      </div>
    </footer>
  )
}

export const bukeerSignatureIcons = {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  WalletCards,
}

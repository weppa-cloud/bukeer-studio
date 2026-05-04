import Link from "next/link";
import { requireGrowthRole } from "@/lib/growth/console/auth";

/**
 * Growth Console layout — SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md
 *   §"Bukeer Studio UI Scope" (issue #405).
 *
 * Server Component. Enforces:
 *   - Tenant membership (RLS-backed select on `websites` via auth helper).
 *   - Feature flag gate `GROWTH_OS_UI_ENABLED` in production. Staging/dev
 *     always render the console (per SPEC §"Bukeer Studio UI Scope":
 *     "Internal staging access for council/curator/admin roles is allowed").
 *
 * No `"use client"` — all reads happen on the server. The parent layout at
 * `/dashboard/[websiteId]/layout.tsx` is a Client Component (auth bootstrap +
 * admin chrome); a Server Component child is a valid composition.
 */

interface GrowthLayoutProps {
  children: React.ReactNode;
  params: Promise<{ websiteId: string }>;
}

const TABS: ReadonlyArray<{
  slug: string;
  label: string;
  href: (id: string) => string;
}> = [
  {
    slug: "overview",
    label: "Command Center",
    href: (id) => `/dashboard/${id}/growth/overview`,
  },
  {
    slug: "agents",
    label: "Agent Team",
    href: (id) => `/dashboard/${id}/growth/agents`,
  },
  {
    slug: "workboard",
    label: "Workboard",
    href: (id) => `/dashboard/${id}/growth/workboard`,
  },
  {
    slug: "backlog",
    label: "Opportunities",
    href: (id) => `/dashboard/${id}/growth/backlog`,
  },
  {
    slug: "runs",
    label: "Review Queue",
    href: (id) => `/dashboard/${id}/growth/runs`,
  },
  {
    slug: "experiments",
    label: "Experiments",
    href: (id) => `/dashboard/${id}/growth/experiments`,
  },
  {
    slug: "data-health",
    label: "Data Health",
    href: (id) => `/dashboard/${id}/growth/data-health`,
  },
];

function FeatureGatedPlaceholder() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-md border border-dashed border-[var(--studio-border,theme(colors.zinc.300))] bg-[var(--studio-surface,theme(colors.zinc.50))] p-6 text-center">
        <h1 className="text-lg font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
          Growth OS Console
        </h1>
        <p className="mt-2 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
          Coming soon — gated by{" "}
          <a
            href="https://github.com/weppa-cloud/bukeer-studio/issues/256"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            #256
          </a>
          . Internal staging access is enabled for council, curator and admin
          roles.
        </p>
      </div>
    </div>
  );
}

export default async function GrowthLayout({
  children,
  params,
}: GrowthLayoutProps) {
  const { websiteId } = await params;

  // Tenant membership (server-side). Throws via redirect on mismatch.
  await requireGrowthRole(websiteId, "viewer");

  // Feature flag gate. Staging/dev always render; production requires the
  // explicit opt-in env var (per SPEC §"Bukeer Studio UI Scope").
  const flagEnabled = process.env.GROWTH_OS_UI_ENABLED === "true";
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !flagEnabled) {
    return <FeatureGatedPlaceholder />;
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
            Growth OS
          </h1>
          <p className="text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
            Human control plane for ColombiaTours Growth OS — review agent work,
            inspect evidence, and gate Council decisions.
          </p>
        </div>
        <nav
          aria-label="Growth console tabs"
          className="border-b border-[var(--studio-border,theme(colors.zinc.200))]"
        >
          <ul className="flex flex-wrap gap-1">
            {TABS.map((tab) => (
              <li key={tab.slug}>
                <Link
                  href={tab.href(websiteId)}
                  prefetch
                  className="inline-block px-3 py-2 text-sm text-[var(--studio-text,theme(colors.zinc.700))] hover:text-[var(--studio-text-strong,theme(colors.zinc.900))] hover:bg-[var(--studio-surface-hover,theme(colors.zinc.100))] rounded-t-md"
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main>{children}</main>
      <span
        data-testid="growth-current-website-id"
        className="sr-only"
        aria-hidden="true"
      >
        {websiteId}
      </span>
    </div>
  );
}

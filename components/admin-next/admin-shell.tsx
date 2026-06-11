"use client";

import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  Bell,
  Blocks,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Command,
  Package,
  LayoutDashboard,
  Map,
  PlaneTakeoff,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import { cn } from '@/lib/utils';

type AdminShellNavKey =
  | 'dashboard'
  | 'planner'
  | 'conversations'
  | 'contacts'
  | 'products'
  | 'agenda'
  | 'account'
  | 'settings';

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  planner: PlaneTakeoff,
  conversations: Blocks,
  contacts: Users,
  products: Package,
  agenda: CalendarDays,
  account: CircleHelp,
  settings: Map,
} satisfies Record<AdminShellNavKey, React.ComponentType<{ className?: string }>>;

export function AdminShell({
  session,
  children,
  activeKey = 'planner',
}: {
  session: AuthenticatedAdminSessionContext;
  children: React.ReactNode;
  activeKey?: AdminShellNavKey;
}) {
  return (
    <main className="min-h-screen bg-muted/40 text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden border-r bg-background lg:flex lg:flex-col">
          <div className="border-b p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {adminNextCopy.shell.brandEyebrow}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <PlaneTakeoff className="size-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{adminNextCopy.shell.productName}</div>
                <div className="text-xs text-muted-foreground">{adminNextCopy.shell.modeLabel}</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {adminNextCopy.shell.nav.map((item) => {
              const Icon = NAV_ICONS[item.key as AdminShellNavKey];
              const isActive = item.key === activeKey;

              return (
              <button
                key={item.key}
                data-testid={`admin-next-nav-${item.key}`}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm font-medium',
                  isActive
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted',
                )}
                type="button"
              >
                <Icon className="size-4" />
                {item.label}
              </button>
              );
            })}
          </nav>
          <div className="border-t p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span>{session.role}</span>
            </div>
            <div className="mt-1 truncate">{session.accountId}</div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-3 px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 min-w-0 items-center gap-2 rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                  <Search className="size-4" />
                  <span className="hidden sm:inline">{adminNextCopy.shell.searchPlaceholder}</span>
                  <Command className="hidden size-3 sm:block" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusChip icon={<CheckCircle2 className="size-3.5" />} label={adminNextCopy.shell.readOnlyStatus} />
                <StatusChip icon={<CircleHelp className="size-3.5" />} label={adminNextCopy.shell.noWritesStatus} />
                <button
                  className="flex size-8 items-center justify-center rounded-md border text-muted-foreground"
                  type="button"
                  aria-label={adminNextCopy.shell.notificationsLabel}
                  data-testid="admin-next-notifications"
                >
                  <Bell className="size-4" />
                </button>
                <div className="hidden text-right text-xs sm:block">
                  <div className="font-semibold text-foreground">{session.displayName}</div>
                  <div className="text-muted-foreground">{session.email}</div>
                </div>
              </div>
            </div>
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </section>
      </div>
    </main>
  );
}

function StatusChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="hidden h-7 items-center gap-1.5 rounded-md border bg-muted px-2 text-xs font-medium text-muted-foreground md:inline-flex">
      {icon}
      {label}
    </span>
  );
}

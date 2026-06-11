"use client";

import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Link2,
  LockKeyhole,
  Save,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  SettingsFixture,
  SettingsIntegration,
  SettingsItem,
  SettingsToggle,
} from '@/lib/admin-next/fixtures/settings';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

export function SettingsModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: SettingsFixture;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: React.CSSProperties;
      dark: React.CSSProperties;
    };
  };
}) {
  return (
    <AdminShell session={session} activeKey="settings">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-settings-root"
        data-theme-preset={evolucionTheme.presetSlug}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto max-w-[1440px] space-y-4">
          <SettingsHeader />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <div className="space-y-4">
              <AgencyPanel fixture={fixture} />
              <RulesPanel rules={fixture.businessRules} />
            </div>
            <div className="space-y-4">
              <InfoPanel
                icon="billing"
                items={fixture.billing}
                testId="admin-next-settings-billing"
                title={adminNextCopy.settings.billingTitle}
              />
              <InfoPanel
                icon="team"
                items={fixture.team}
                testId="admin-next-settings-team"
                title={adminNextCopy.settings.teamTitle}
              />
              <IntegrationsPanel integrations={fixture.integrations} />
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function SettingsHeader() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
          {adminNextCopy.settings.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminNextCopy.settings.subtitle}
        </p>
      </div>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md border bg-primary px-3 text-sm font-semibold text-primary-foreground"
        data-testid="admin-next-settings-save"
        type="button"
      >
        <Save className="size-4" />
        {adminNextCopy.settings.saveAction}
      </button>
    </div>
  );
}

function AgencyPanel({ fixture }: { fixture: SettingsFixture }) {
  const agency = fixture.agency;

  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-settings-agency">
      <PanelHeader
        icon={<Building2 className="size-4" />}
        title={adminNextCopy.settings.agencyTitle}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Metric label={adminNextCopy.settings.agencyNameLabel} value={agency.name} />
        <Metric label={adminNextCopy.settings.websiteLabel} value={agency.website} />
        <Metric label={adminNextCopy.settings.localeLabel} value={agency.locale} />
        <Metric label={adminNextCopy.settings.currencyLabel} value={agency.currency} />
      </div>
    </section>
  );
}

function RulesPanel({ rules }: { rules: SettingsToggle[] }) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-settings-rules">
      <PanelHeader
        icon={<ShieldCheck className="size-4" />}
        title={adminNextCopy.settings.rulesTitle}
      />
      <div className="mt-3 divide-y">
        {rules.map((rule) => (
          <div className="flex items-center gap-4 py-3" key={rule.id}>
            <div className="flex size-9 items-center justify-center rounded-md border bg-background text-primary">
              <LockKeyhole className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{rule.label}</div>
              <div className="truncate text-xs text-muted-foreground">{rule.detail}</div>
            </div>
            <Toggle enabled={rule.enabled} />
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoPanel({
  title,
  items,
  testId,
  icon,
}: {
  title: string;
  items: SettingsItem[];
  testId: string;
  icon: 'billing' | 'team';
}) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid={testId}>
      <PanelHeader
        icon={icon === 'billing' ? <CreditCard className="size-4" /> : <UsersRound className="size-4" />}
        title={title}
      />
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div className="rounded-md border bg-background p-3" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-sm font-medium text-primary">{item.value}</div>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {adminNextCopy.settings.readOnlyLabel}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntegrationsPanel({ integrations }: { integrations: SettingsIntegration[] }) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-settings-integrations">
      <PanelHeader
        icon={<Link2 className="size-4" />}
        title={adminNextCopy.settings.integrationsTitle}
      />
      <div className="mt-3 divide-y">
        {integrations.map((integration) => (
          <div className="flex items-start gap-3 py-3" key={integration.id}>
            <div className="flex size-9 items-center justify-center rounded-md border bg-background text-primary">
              <CheckCircle2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-semibold">{integration.name}</div>
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                  {integration.status}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{integration.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PanelHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-md border bg-background text-primary">
        {icon}
      </span>
      <h2 className="text-base font-semibold tracking-normal">{title}</h2>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-11 items-center rounded-full border p-0.5',
        enabled ? 'justify-end border-primary/30 bg-primary/20' : 'justify-start bg-muted',
      )}
    >
      <span className="size-4 rounded-full bg-primary" />
    </span>
  );
}

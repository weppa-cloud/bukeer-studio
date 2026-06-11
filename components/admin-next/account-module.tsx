"use client";

import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import { Edit3, Globe2, KeyRound, LogOut, Monitor, ShieldCheck, Sparkles } from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  AccountFixture,
  AccountInfoItem,
  AccountPreference,
} from '@/lib/admin-next/fixtures/account';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

export function AccountModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: AccountFixture;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: React.CSSProperties;
      dark: React.CSSProperties;
    };
  };
}) {
  return (
    <AdminShell session={session} activeKey="account">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-account-root"
        data-theme-preset={evolucionTheme.presetSlug}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto max-w-[1440px] space-y-4">
          <AccountHeader />
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <ProfilePanel fixture={fixture} />
              <InfoPanel
                icon="security"
                items={fixture.security}
                testId="admin-next-account-security"
                title={adminNextCopy.account.securityTitle}
              />
            </div>
            <div className="space-y-4">
              <InfoPanel
                icon="preferences"
                items={fixture.preferences}
                testId="admin-next-account-preferences"
                title={adminNextCopy.account.preferencesTitle}
              />
              <NotificationsPanel notifications={fixture.notifications} />
              <SignaturePanel signature={fixture.signature} />
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function AccountHeader() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
          {adminNextCopy.account.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminNextCopy.account.subtitle}
        </p>
      </div>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
        data-testid="admin-next-account-sign-out"
        type="button"
      >
        <LogOut className="size-4" />
        {adminNextCopy.account.signOutAction}
      </button>
    </div>
  );
}

function ProfilePanel({ fixture }: { fixture: AccountFixture }) {
  const profile = fixture.profile;

  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-account-profile">
      <PanelHeader action={adminNextCopy.account.editProfileAction} testId="admin-next-account-edit-profile" title={adminNextCopy.account.profileTitle} />
      <div className="mt-4 flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-lg font-semibold text-primary">
          {profile.initials}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{profile.name}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{profile.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary" key={badge}>
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {profile.info.map((item) => (
          <Metric item={item} key={item.id} />
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
  items: AccountInfoItem[];
  testId: string;
  icon: 'security' | 'preferences';
}) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid={testId}>
      <PanelTitle title={title} />
      <div className="mt-3 divide-y">
        {items.map((item, index) => (
          <div className="flex items-center gap-3 py-3" key={item.id}>
            <div className="flex size-9 items-center justify-center rounded-md border bg-background text-primary">
              {icon === 'security' ? securityIcon(index) : preferenceIcon(index)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{item.label}</div>
              <div className="truncate text-xs text-muted-foreground">{item.value}</div>
            </div>
            <span className="text-xs font-semibold text-primary">{adminNextCopy.account.changeAction}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotificationsPanel({ notifications }: { notifications: AccountPreference[] }) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-account-notifications">
      <PanelTitle title={adminNextCopy.account.notificationsTitle} />
      <div className="mt-3 divide-y">
        {notifications.map((item) => (
          <div className="flex items-center gap-4 py-3" key={item.id}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{item.label}</div>
              <div className="truncate text-xs text-muted-foreground">{item.detail}</div>
            </div>
            <span
              className={cn(
                'inline-flex h-6 w-11 items-center rounded-full border p-0.5',
                item.enabled ? 'justify-end border-primary/30 bg-primary/20' : 'justify-start bg-muted',
              )}
            >
              <span className="size-4 rounded-full bg-primary" />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignaturePanel({ signature }: { signature: string[] }) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground" data-testid="admin-next-account-signature">
      <PanelHeader action={adminNextCopy.account.editAction} testId="admin-next-account-edit-signature" title={adminNextCopy.account.signatureTitle} />
      <div className="mt-4 rounded-lg border bg-background p-4 text-sm leading-6 text-muted-foreground">
        {signature.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </section>
  );
}

function PanelHeader({ title, action, testId }: { title: string; action: string; testId: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <PanelTitle title={title} />
      <button
        className="inline-flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-xs font-semibold text-muted-foreground"
        data-testid={testId}
        type="button"
      >
        <Edit3 className="size-3.5" />
        {action}
      </button>
    </div>
  );
}

function PanelTitle({ title }: { title: string }) {
  return <h2 className="text-base font-semibold tracking-normal">{title}</h2>;
}

function Metric({ item }: { item: AccountInfoItem }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{item.value}</div>
    </div>
  );
}

function securityIcon(index: number) {
  if (index === 0) return <KeyRound className="size-4" />;
  if (index === 1) return <ShieldCheck className="size-4" />;
  return <Monitor className="size-4" />;
}

function preferenceIcon(index: number) {
  if (index === 0) return <Globe2 className="size-4" />;
  return <Sparkles className="size-4" />;
}

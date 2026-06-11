"use client";

import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  Building2,
  ChevronRight,
  Download,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  ContactRecord,
  ContactSignal,
  ContactTimelineItem,
  ContactsFixture,
  ContactTone,
} from '@/lib/admin-next/fixtures/contacts';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

const toneClasses: Record<ContactTone, string> = {
  primary: 'border-primary/30 bg-primary/10 text-primary',
  live: 'border-[var(--bukeer-live)]/30 bg-[var(--bukeer-live-soft)] text-[var(--bukeer-live)]',
  warning:
    'border-[var(--bukeer-warning)]/30 bg-[var(--bukeer-warning-soft)] text-[var(--bukeer-warning)]',
  success:
    'border-[var(--bukeer-success)]/30 bg-[var(--bukeer-success-soft)] text-[var(--bukeer-success)]',
};

export function ContactsModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: ContactsFixture;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: React.CSSProperties;
      dark: React.CSSProperties;
    };
  };
}) {
  return (
    <AdminShell session={session} activeKey="contacts">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-contacts-root"
        data-theme-preset={evolucionTheme.presetSlug}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto grid max-w-[1440px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <ContactsHeader />
            <ContactsToolbar total={fixture.contacts.length} />
            <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(360px,0.88fr)]">
              <ContactsGrid contacts={fixture.contacts} selectedId={fixture.selected.id} />
              <ContactDetail contact={fixture.selected} timeline={fixture.timeline} />
            </div>
          </div>
          <ContactsAiPanel signals={fixture.signals} />
        </div>
      </section>
    </AdminShell>
  );
}

function ContactsHeader() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
          {adminNextCopy.contacts.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminNextCopy.contacts.subtitle}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
          data-testid="admin-next-contacts-import"
          type="button"
        >
          <Download className="size-4" />
          {adminNextCopy.contacts.importAction}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          data-testid="admin-next-contacts-new"
          type="button"
        >
          <Plus className="size-4" />
          {adminNextCopy.contacts.primaryAction}
        </button>
      </div>
    </div>
  );
}

function ContactsToolbar({ total }: { total: number }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border bg-card p-3 text-card-foreground lg:flex-row lg:items-center lg:justify-between"
      data-testid="admin-next-contacts-toolbar"
    >
      <div className="flex h-10 min-w-0 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground lg:w-[360px]">
        <Search className="size-4" />
        <span className="truncate">{adminNextCopy.contacts.searchPlaceholder}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {adminNextCopy.contacts.filters.map((filter, index) => (
          <button
            className={cn(
              'h-8 rounded-md border px-3 text-xs font-semibold',
              index === 0
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'bg-background text-muted-foreground',
            )}
            data-testid={`admin-next-contacts-filter-${filter.key}`}
            key={filter.key}
            type="button"
          >
            {filter.label}
          </button>
        ))}
        <span className="text-xs font-medium text-muted-foreground">
          {adminNextCopy.contacts.totalLabel(total)}
        </span>
      </div>
    </div>
  );
}

function ContactsGrid({
  contacts,
  selectedId,
}: {
  contacts: ContactRecord[];
  selectedId: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1" data-testid="admin-next-contacts-grid">
      {contacts.map((contact) => (
        <ContactCard contact={contact} isSelected={contact.id === selectedId} key={contact.id} />
      ))}
    </div>
  );
}

function ContactCard({ contact, isSelected }: { contact: ContactRecord; isSelected: boolean }) {
  const Icon = contact.badges.includes('Proveedor') ? Building2 : UserRound;

  return (
    <article
      className={cn(
        'rounded-lg border bg-card p-4 text-card-foreground',
        isSelected && 'border-primary/40 bg-primary/5',
      )}
      data-testid={`admin-next-contact-card-${contact.id}`}
    >
      <div className="flex items-start gap-3">
        <Avatar contact={contact} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-primary" />
            <h2 className="truncate text-sm font-semibold">{contact.name}</h2>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {contact.badges.map((badge) => (
              <ToneBadge key={badge} tone={contact.tone}>
                {badge}
              </ToneBadge>
            ))}
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <ContactLine icon={<Mail className="size-4" />} value={contact.email} />
        <ContactLine icon={<Phone className="size-4" />} value={contact.phone} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Metric label={adminNextCopy.contacts.itinerariesLabel} value={String(contact.itineraries)} />
        <Metric label={adminNextCopy.contacts.balanceLabel} value={contact.openBalance} />
      </div>
    </article>
  );
}

function ContactDetail({
  contact,
  timeline,
}: {
  contact: ContactRecord;
  timeline: ContactTimelineItem[];
}) {
  return (
    <section
      className="rounded-lg border bg-card p-4 text-card-foreground"
      data-testid="admin-next-contacts-detail"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <Avatar contact={contact} size="lg" />
          <div>
            <h2 className="text-xl font-semibold tracking-normal">{contact.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{contact.lastActivity}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
            data-testid="admin-next-contacts-open-conversation"
            type="button"
          >
            <MessageCircle className="size-4" />
            {adminNextCopy.contacts.openConversationAction}
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
            data-testid="admin-next-contacts-new-itinerary"
            type="button"
          >
            <Plus className="size-4" />
            {adminNextCopy.contacts.newItineraryAction}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric label={adminNextCopy.contacts.totalSalesLabel} value={contact.totalSales} />
        <Metric label={adminNextCopy.contacts.balanceLabel} value={contact.openBalance} />
        <Metric label={adminNextCopy.contacts.cityLabel} value={contact.city} />
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <PanelTitle title={adminNextCopy.contacts.timelineTitle} />
          <div className="mt-3 divide-y rounded-lg border">
            {timeline.map((item) => (
              <div className="grid gap-3 p-3 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center" key={item.id}>
                <div className={cn('flex size-9 items-center justify-center rounded-md border', toneClasses[item.tone])}>
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{item.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{item.meta}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <ToneBadge tone={item.tone}>{item.status}</ToneBadge>
                  <span className="text-sm font-semibold">{item.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <PanelTitle title={adminNextCopy.contacts.infoTitle} />
          <div className="mt-3 space-y-2 rounded-lg border p-3">
            <Metric label={adminNextCopy.contacts.documentLabel} value={contact.document} compact />
            <Metric label={adminNextCopy.contacts.emailLabel} value={contact.email} compact />
            <Metric label={adminNextCopy.contacts.phoneLabel} value={contact.phone} compact />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactsAiPanel({ signals }: { signals: ContactSignal[] }) {
  return (
    <aside
      className="rounded-lg border bg-card p-4 text-card-foreground xl:sticky xl:top-20 xl:h-[calc(100vh-7rem)]"
      data-testid="admin-next-contacts-ai-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {adminNextCopy.contacts.aiPanelEyebrow}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">
            {adminNextCopy.contacts.aiPanelTitle}
          </h2>
        </div>
        <Sparkles className="size-5 text-primary" />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {adminNextCopy.contacts.aiPanelDescription}
      </p>
      <div className="mt-5 space-y-3">
        {signals.map((signal) => (
          <div className="rounded-lg border bg-background p-3" key={signal.id}>
            <ToneBadge tone={signal.tone}>{signal.label}</ToneBadge>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{signal.detail}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function PanelTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>;
}

function ContactLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('rounded-md border bg-background px-3 py-2', compact && 'border-transparent bg-muted/50')}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function Avatar({ contact, size = 'md' }: { contact: ContactRecord; size?: 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg border text-sm font-semibold',
        size === 'lg' ? 'size-12' : 'size-10',
        toneClasses[contact.tone],
      )}
    >
      {contact.initials}
    </div>
  );
}

function ToneBadge({ tone, children }: { tone: ContactTone; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex rounded-md border px-2 py-1 text-xs font-semibold', toneClasses[tone])}>
      {children}
    </span>
  );
}

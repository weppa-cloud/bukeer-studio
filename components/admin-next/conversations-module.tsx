"use client";

import { useState } from 'react';
import type { AuthenticatedAdminSessionContext } from '@bukeer/admin-contract';
import {
  Bot,
  Check,
  Clock3,
  FileText,
  Link2,
  MessageCircle,
  Phone,
  PlusCircle,
  Radio,
  Send,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';
import type {
  CloseOutcome,
  ConversationSignal,
  ConversationSummary,
  ConversationsFixture,
} from '@/lib/admin-next/fixtures/conversations';
import { cn } from '@/lib/utils';
import { AdminShell } from './admin-shell';

const toneClasses: Record<ConversationSummary['tone'], string> = {
  primary: 'border-primary/30 bg-primary/10 text-primary',
  live: 'border-secondary/30 bg-secondary/10 text-secondary',
  warning: 'border-[hsl(var(--bukeer-warning))]/30 bg-[hsl(var(--bukeer-warning)/0.12)] text-[hsl(var(--bukeer-warning))]',
};

export function ConversationsModule({
  session,
  fixture,
  evolucionTheme,
}: {
  session: AuthenticatedAdminSessionContext;
  fixture: ConversationsFixture;
  evolucionTheme: {
    presetSlug: string;
    styles: {
      light: React.CSSProperties;
      dark: React.CSSProperties;
    };
  };
}) {
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeOutcome, setCloseOutcome] = useState<CloseOutcome>('won');
  const [closeReason, setCloseReason] = useState('');
  const requiresReason = closeOutcome === 'no_purchase';
  const canSaveClose = !requiresReason || closeReason.length > 0;

  const openCloseModal = () => {
    setCloseOutcome('won');
    setCloseReason('');
    setIsCloseModalOpen(true);
  };

  return (
    <AdminShell session={session} activeKey="conversations">
      <section
        className="min-h-full bg-[var(--bukeer-surface-rail)] p-4 text-foreground md:p-6"
        data-testid="admin-next-conversations-root"
        data-theme-preset={evolucionTheme.presetSlug}
        style={evolucionTheme.styles.light}
      >
        <div className="mx-auto grid max-w-[1440px] gap-4">
          <Header onClose={openCloseModal} />
          <div className="grid min-h-[720px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
            <Inbox conversations={fixture.conversations} selectedId={fixture.selected.id} />
            <Thread fixture={fixture} />
            <CrmPanel fixture={fixture} />
          </div>
        </div>

        {isCloseModalOpen ? (
          <CloseConversationModal
            canSaveClose={canSaveClose}
            closeOutcome={closeOutcome}
            closeReason={closeReason}
            fixture={fixture}
            requiresReason={requiresReason}
            onClose={() => setIsCloseModalOpen(false)}
            onOutcomeChange={(outcome) => {
              setCloseOutcome(outcome);
              if (outcome !== 'no_purchase') setCloseReason('');
            }}
            onReasonChange={setCloseReason}
          />
        ) : null}
      </section>
    </AdminShell>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {adminNextCopy.conversations.eyebrow}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">{adminNextCopy.conversations.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {adminNextCopy.conversations.subtitle}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
          type="button"
          data-testid="admin-next-conversations-create-request"
        >
          <PlusCircle className="size-4" />
          {adminNextCopy.conversations.primaryAction}
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          type="button"
          data-testid="admin-next-conversations-close"
          onClick={onClose}
        >
          <Check className="size-4" />
          {adminNextCopy.conversations.closeAction}
        </button>
      </div>
    </header>
  );
}

function Inbox({
  conversations,
  selectedId,
}: {
  conversations: ConversationSummary[];
  selectedId: string;
}) {
  return (
    <aside
      className="min-w-0 rounded-lg border bg-card shadow-sm"
      data-testid="admin-next-conversations-inbox"
    >
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{adminNextCopy.conversations.inboxTitle}</h2>
          <span className="rounded-md border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {conversations.length}
          </span>
        </div>
      </div>
      <div className="divide-y">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            className={cn(
              'flex w-full flex-col gap-3 px-4 py-4 text-left',
              conversation.id === selectedId ? 'bg-primary/10' : 'hover:bg-muted/60',
            )}
            type="button"
            data-testid={`admin-next-conversation-card-${conversation.id}`}
            data-status={conversation.status}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{conversation.customerName}</div>
                <div className="truncate text-xs text-muted-foreground">{conversation.agencyLabel}</div>
              </div>
              <span className={cn('rounded-md border px-2 py-1 text-xs font-medium', toneClasses[conversation.tone])}>
                {adminNextCopy.conversations.channelLabels[conversation.channel]}
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{conversation.lastMessage}</p>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{conversation.lastMessageAt}</span>
              <span>{conversation.valueLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
                {conversation.itineraryId}
              </span>
              <span className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
                {conversation.slaLabel}
              </span>
              {conversation.unreadCount > 0 ? (
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {adminNextCopy.conversations.unreadLabel(conversation.unreadCount)}
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function Thread({ fixture }: { fixture: ConversationsFixture }) {
  return (
    <section
      className="flex min-w-0 flex-col rounded-lg border bg-card shadow-sm"
      data-testid="admin-next-conversations-thread"
    >
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{fixture.selected.customerName}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{adminNextCopy.conversations.threadTitle}</span>
            <span>{fixture.selected.itineraryId}</span>
            <span>{fixture.selected.owner}</span>
          </div>
        </div>
        <RealtimeStatus fixture={fixture} />
      </div>

      <div className="flex-1 space-y-3 overflow-hidden p-4">
        {fixture.selected.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.author === 'customer' ? 'justify-start' : 'justify-end',
            )}
            data-testid={`admin-next-conversations-message-${message.id}`}
          >
            <div
              className={cn(
                'max-w-[76%] rounded-lg border px-4 py-3 text-sm shadow-sm',
                message.author === 'customer'
                  ? 'bg-background'
                  : message.author === 'assistant'
                    ? 'border-secondary/30 bg-secondary/10'
                    : 'border-primary/30 bg-primary/10',
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {message.author === 'assistant' ? <Bot className="size-3.5" /> : <UserRound className="size-3.5" />}
                <span>{message.authorName}</span>
                <span>{message.timestamp}</span>
              </div>
              <p>{message.body}</p>
              {message.state ? (
                <div className="mt-2 text-xs text-muted-foreground">{message.state}</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4" data-testid="admin-next-conversations-composer">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
            {adminNextCopy.conversations.composerPlaceholder}
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            type="button"
            data-testid="admin-next-conversations-send"
          >
            <Send className="size-4" />
            {adminNextCopy.conversations.sendAction}
          </button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {fixture.templates.map((template) => (
            <button
              key={template.id}
              className="rounded-lg border bg-muted/50 p-3 text-left text-sm"
              type="button"
              data-testid={`admin-next-conversations-template-${template.id}`}
            >
              <div className="font-medium">{template.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{template.body}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function RealtimeStatus({ fixture }: { fixture: ConversationsFixture }) {
  return (
    <div
      className="rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-sm"
      data-testid="admin-next-conversations-realtime-status"
      data-latency-contract={fixture.selected.realtime.latencyLabel}
    >
      <div className="flex items-center gap-2 font-semibold text-secondary">
        <Radio className="size-4" />
        {adminNextCopy.conversations.realtimeTitle}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {fixture.selected.realtime.provider} · {fixture.selected.realtime.mirrorLabel} ·{' '}
        {fixture.selected.realtime.updatedAt}
      </div>
      <div className="mt-2 text-xs font-medium">
        {adminNextCopy.conversations.realtimeLatencyLabel}: {fixture.selected.realtime.latencyLabel}
      </div>
    </div>
  );
}

function CrmPanel({ fixture }: { fixture: ConversationsFixture }) {
  return (
    <aside className="space-y-4">
      <section
        className="rounded-lg border bg-card p-4 shadow-sm"
        data-testid="admin-next-conversations-crm-panel"
      >
        <h2 className="text-sm font-semibold">{adminNextCopy.conversations.crmPanelTitle}</h2>
        <div className="mt-4 space-y-3 text-sm">
          <InfoRow
            icon={<UserRound className="size-4" />}
            label={adminNextCopy.conversations.idLabel}
            value={fixture.selected.crm.contactId}
          />
          <InfoRow
            icon={<Phone className="size-4" />}
            label={adminNextCopy.conversations.phoneLabel}
            value={fixture.selected.crm.phone}
          />
          <InfoRow
            icon={<MessageCircle className="size-4" />}
            label={adminNextCopy.conversations.emailLabel}
            value={fixture.selected.crm.email}
          />
          <InfoRow
            icon={<Clock3 className="size-4" />}
            label={adminNextCopy.conversations.lastPurchaseLabel}
            value={fixture.selected.crm.lastPurchase}
          />
        </div>
        <div
          className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-3"
          data-testid="admin-next-conversations-lead-temperature"
          data-temperature={fixture.selected.temperature}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {adminNextCopy.conversations.qualificationTitle}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {adminNextCopy.conversations.temperatureLabels[fixture.selected.temperature]}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{fixture.selected.crm.preference}</div>
        </div>
      </section>

      <section
        className="rounded-lg border bg-card p-4 shadow-sm"
        data-testid="admin-next-conversations-linked-itinerary"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="size-4 text-primary" />
          {adminNextCopy.conversations.linkedItineraryTitle}
        </div>
        <div className="mt-3 rounded-lg border bg-muted/50 p-3">
          <div className="text-sm font-semibold">{fixture.selected.linkedItinerary.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {fixture.selected.linkedItinerary.id} · {fixture.selected.linkedItinerary.state}
          </div>
          <div className="mt-2 text-xs font-medium text-primary">
            {adminNextCopy.conversations.marginLabel} {fixture.selected.linkedItinerary.margin}
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border bg-card p-4 shadow-sm"
        data-testid="admin-next-conversations-ai-assist"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Sparkles className="size-4 text-primary" />
          {adminNextCopy.conversations.aiPanelEyebrow}
        </div>
        <h2 className="mt-2 text-sm font-semibold">{adminNextCopy.conversations.aiPanelTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminNextCopy.conversations.aiPanelDescription}
        </p>
        <div className="mt-4 space-y-2">
          {fixture.signals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="size-4 text-primary" />
          {adminNextCopy.conversations.notesTitle}
        </div>
        <div className="mt-3 space-y-2">
          {fixture.selected.notes.map((note) => (
            <div key={note.id} className="rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="font-medium">{note.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{note.body}</div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-medium">{value}</div>
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: ConversationSignal }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm">
      <span className="text-muted-foreground">{signal.label}</span>
      <span className={cn('rounded-md border px-2 py-1 text-xs font-medium', toneClasses[signal.tone])}>
        {signal.value}
      </span>
    </div>
  );
}

function CloseConversationModal({
  canSaveClose,
  closeOutcome,
  closeReason,
  fixture,
  requiresReason,
  onClose,
  onOutcomeChange,
  onReasonChange,
}: {
  canSaveClose: boolean;
  closeOutcome: CloseOutcome;
  closeReason: string;
  fixture: ConversationsFixture;
  requiresReason: boolean;
  onClose: () => void;
  onOutcomeChange: (outcome: CloseOutcome) => void;
  onReasonChange: (reason: string) => void;
}) {
  const outcomes = Object.entries(adminNextCopy.conversations.closeOutcomeLabels) as Array<
    [CloseOutcome, string]
  >;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <section
        className="w-full max-w-xl rounded-lg border bg-card p-5 shadow-lg"
        data-testid="admin-next-conversations-close-modal"
        data-close-ready={canSaveClose ? 'true' : 'false'}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{adminNextCopy.conversations.closeModalTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {adminNextCopy.conversations.closeModalSubtitle}
            </p>
          </div>
          <button
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground"
            type="button"
            aria-label={adminNextCopy.conversations.closeCancelAction}
            onClick={onClose}
            data-testid="admin-next-conversations-close-cancel"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {outcomes.map(([outcome, label]) => (
            <button
              key={outcome}
              className={cn(
                'rounded-lg border px-3 py-3 text-sm font-semibold',
                closeOutcome === outcome
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'bg-background text-muted-foreground',
              )}
              type="button"
              data-testid={`admin-next-conversations-close-outcome-${outcome}`}
              data-selected={closeOutcome === outcome ? 'true' : 'false'}
              onClick={() => onOutcomeChange(outcome)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-lg border bg-muted/40 p-3">
          <div
            className={cn(
              'text-sm font-semibold',
              requiresReason && !closeReason
                ? 'text-[hsl(var(--bukeer-warning))]'
                : 'text-secondary',
            )}
            data-testid={
              requiresReason && !closeReason
                ? 'admin-next-conversations-close-reason-required'
                : 'admin-next-conversations-close-valid'
            }
          >
            {requiresReason && !closeReason
              ? adminNextCopy.conversations.reasonRequiredLabel
              : adminNextCopy.conversations.closeValidLabel}
          </div>
          <div className="mt-3 grid gap-2">
            {fixture.selected.closeReasons.map((reason) => (
              <button
                key={reason.id}
                className={cn(
                  'rounded-md border px-3 py-2 text-left text-sm',
                  closeReason === reason.id
                    ? 'border-secondary/30 bg-secondary/10 text-secondary'
                    : 'bg-background text-muted-foreground',
                )}
                type="button"
                data-testid={`admin-next-conversations-close-reason-${reason.id}`}
                data-selected={closeReason === reason.id ? 'true' : 'false'}
                onClick={() => onReasonChange(reason.id)}
              >
                {reason.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            className="h-9 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground"
            type="button"
            data-testid="admin-next-conversations-close-secondary-cancel"
            onClick={onClose}
          >
            {adminNextCopy.conversations.closeCancelAction}
          </button>
          <button
            className="h-9 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            data-testid="admin-next-conversations-close-save"
            data-close-ready={canSaveClose ? 'true' : 'false'}
            disabled={!canSaveClose}
            onClick={onClose}
          >
            {adminNextCopy.conversations.closeSaveAction}
          </button>
        </div>
      </section>
    </div>
  );
}

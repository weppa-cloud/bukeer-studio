'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { StudioBadge, StudioButton, StudioTextarea } from '@/components/studio/ui/primitives';
import {
  Send,
  Bot,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { EditorSection } from '@/lib/studio/section-actions';

// ============================================================================
// Types
// ============================================================================

interface StudioChatProps {
  websiteId: string;
  pageId: string;
  sections: EditorSection[];
  selectedSectionId: string | null;
  onToolAction: (toolName: string, args: Record<string, unknown>) => void;
}

// ============================================================================
// Tool action card
// ============================================================================

function ToolActionCard({
  toolName,
  args,
  state,
  onApply,
}: {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  onApply: () => void;
}) {
  const [applied, setApplied] = useState(false);

  const toolLabels: Record<string, string> = {
    rewrite_section: 'Rewrite Section',
    create_section: 'Add Section',
    remove_section: 'Remove Section',
    reorder_sections: 'Reorder Sections',
    toggle_visibility: 'Toggle Visibility',
    duplicate_section: 'Duplicate Section',
    update_seo: 'Update SEO',
    suggest_images: 'Suggest Images',
    translate_section: 'Translate',
    generate_content: 'Generate Content',
  };

  const description = (args.description as string) ?? toolName;
  const isPending = state === 'call' || state === 'partial-call';

  const handleApply = () => {
    onApply();
    setApplied(true);
  };

  return (
    <div
      className="studio-panel my-2 p-3"
      role="status"
      aria-label={`Tool action: ${toolLabels[toolName] ?? toolName}`}
      data-testid={`studio-chat-tool-card-${toolName}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StudioBadge tone="info" className="text-xs">
              {toolLabels[toolName] ?? toolName}
            </StudioBadge>
            {isPending && <Loader2 className="w-3 h-3 animate-spin text-[var(--studio-text-muted)]" />}
            {(state === 'result' || applied) && <CheckCircle2 className="w-3 h-3 text-[var(--studio-success)]" />}
          </div>
          <p className="text-xs text-[var(--studio-text-muted)]">{description}</p>
        </div>
        {applied ? (
          <span className="shrink-0 text-xs h-7 flex items-center text-[var(--studio-success)] font-medium">
            Applied
          </span>
        ) : (
          <StudioButton
            variant="outline"
            size="sm"
            className="shrink-0 text-xs h-7"
            onClick={handleApply}
            disabled={isPending}
            data-testid={`studio-chat-tool-apply-${toolName}`}
          >
            Apply
          </StudioButton>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Chat message
// ============================================================================

function ChatMessage({
  message,
  onToolAction,
}: {
  message: UIMessage;
  onToolAction: (toolName: string, args: Record<string, unknown>) => void;
}) {
  const isUser = message.role === 'user';

  // Extract tool invocations from message parts
  const toolParts = message.parts?.filter(
    (part) => part.type === 'tool-invocation'
  ) ?? [];

  const textParts = message.parts?.filter(
    (part) => part.type === 'text'
  ) ?? [];

  const textContent = textParts.map((p) => (p as { type: 'text'; text: string }).text).join('');

  return (
    <div
      className={cn('flex gap-2 mb-4', isUser ? 'flex-row-reverse' : '')}
      data-testid={`studio-chat-message-${message.role}`}
    >
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
          isUser
            ? 'bg-[var(--studio-primary)] text-white'
            : 'bg-[var(--studio-panel)] text-[var(--studio-text-muted)] border border-[var(--studio-border)]'
        )}
        role="img"
        aria-label={isUser ? 'You' : 'AI Assistant'}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      <div className={cn('flex-1 min-w-0', isUser ? 'text-right' : '')}>
        {textContent && (
          <div
            className={cn(
              'inline-block px-3 py-2 rounded-lg text-sm max-w-[90%]',
              isUser
                ? 'bg-[var(--studio-primary)] text-white rounded-tr-none'
                : 'bg-[var(--studio-panel)] text-[var(--studio-text)] rounded-tl-none border border-[var(--studio-border)]'
            )}
          >
            <p className="whitespace-pre-wrap">{textContent}</p>
          </div>
        )}

        {toolParts.map((part, i) => {
          const toolPart = part as unknown as {
            type: 'tool-invocation';
            toolInvocation: {
              toolName: string;
              args: Record<string, unknown>;
              state: string;
            };
          };
          const inv = toolPart.toolInvocation;
          return (
            <ToolActionCard
              key={i}
              toolName={inv.toolName}
              args={inv.args}
              state={inv.state}
              onApply={() => onToolAction(inv.toolName, inv.args)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Quick actions
// ============================================================================

const QUICK_ACTIONS = [
  { label: 'Improve text', prompt: 'Improve the text of the selected section to be more engaging and professional.' },
  { label: 'Add CTA', prompt: 'Add a compelling call-to-action section at the end of the page.' },
  { label: 'Translate to English', prompt: 'Translate all sections to English.' },
  { label: 'Improve SEO', prompt: 'Optimize the page content for SEO with better keywords and meta descriptions.' },
];

// ============================================================================
// Main component
// ============================================================================

export function StudioChat({
  websiteId,
  pageId,
  sections,
  selectedSectionId,
  onToolAction,
}: StudioChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const contextRef = useRef({
    websiteId,
    pageId,
    selectedSectionId,
    sectionCount: sections.length,
  });

  useEffect(() => {
    contextRef.current = {
      websiteId,
      pageId,
      selectedSectionId,
      sectionCount: sections.length,
    };
  }, [websiteId, pageId, selectedSectionId, sections.length]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, []);

  const transportRef = useRef(
    new DefaultChatTransport({
      api: '/api/ai/studio-chat',
      body: () => ({
        websiteId: contextRef.current.websiteId,
        pageId: contextRef.current.pageId,
        focusedSectionId: contextRef.current.selectedSectionId,
        sectionCount: contextRef.current.sectionCount,
      }),
    })
  );

  const [lastPrompt, setLastPrompt] = useState('');

  const { messages, status, sendMessage, stop, error, clearError } = useChat({
    transport: transportRef.current,
    onFinish: () => {
      scrollToBottom();
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || isLoading) return;

      const text = inputValue.trim();
      setLastPrompt(text);
      sendMessage({ text });
      setInputValue('');
    },
    [inputValue, isLoading, sendMessage]
  );

  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (isLoading) return;
      let fullPrompt = prompt;
      if (selectedSectionId) {
        fullPrompt = `[Focus: section ${selectedSectionId}] ${prompt}`;
      }
      sendMessage({ text: fullPrompt });
    },
    [isLoading, selectedSectionId, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col h-full" data-testid="studio-chat-root">
      {/* Messages area */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4" data-testid="studio-chat-messages">
          {messages.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-8 text-center"
              data-testid="studio-chat-empty"
            >
              <div className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--studio-primary)_12%,transparent)] flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-[var(--studio-primary)]" />
              </div>
              <p className="text-sm font-medium mb-1 text-[var(--studio-text)]">AI Assistant</p>
              <p className="text-xs text-[var(--studio-text-muted)] mb-6 max-w-[250px]">
                Ask me to edit sections, add content, translate, or improve your page.
              </p>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_ACTIONS.map((action) => (
                  <StudioButton
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    data-testid={`studio-chat-quick-action-${action.label
                      .toLowerCase()
                      .replace(/\s+/g, '-')}`}
                    onClick={() => handleQuickAction(action.prompt)}
                  >
                    {action.label}
                  </StudioButton>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onToolAction={onToolAction}
              />
            ))
          )}

          {isLoading && (
            <div
              className="flex items-center gap-2 text-[var(--studio-text-muted)] mb-4"
              data-testid="studio-chat-stream-indicator"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Thinking...</span>
              <StudioButton
                variant="ghost"
                size="sm"
                className="text-xs h-6"
                onClick={stop}
                data-testid="studio-chat-stop"
              >
                Stop
              </StudioButton>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 text-[var(--studio-danger)] mb-4 p-2 rounded-md border border-[color-mix(in_srgb,var(--studio-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--studio-danger)_12%,transparent)]"
              data-testid="studio-chat-error"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs flex-1">{error.message}</span>
              {lastPrompt && (
                <StudioButton
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 shrink-0"
                  onClick={() => {
                    clearError();
                    sendMessage({ text: lastPrompt });
                  }}
                  data-testid="studio-chat-retry"
                >
                  Retry
                </StudioButton>
              )}
              <StudioButton
                variant="ghost"
                size="sm"
                className="text-xs h-6 shrink-0"
                onClick={() => clearError()}
                data-testid="studio-chat-dismiss-error"
              >
                Dismiss
              </StudioButton>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-[var(--studio-border)]" />

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3" data-testid="studio-chat-form">
        {selectedSectionId && (
          <div className="mb-2" data-testid="studio-chat-focus-badge">
            <StudioBadge tone="info" className="text-xs">
              Focused: {sections.find((s) => s.id === selectedSectionId)?.sectionType?.replace(/_/g, ' ') || selectedSectionId.slice(0, 8)}
            </StudioBadge>
          </div>
        )}
        <div className="flex gap-2">
          <StudioTextarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to edit your page..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm overflow-y-auto"
            rows={1}
            data-testid="studio-chat-input"
          />
          <StudioButton
            type="submit"
            size="md"
            className="shrink-0 h-10 w-10 px-0"
            disabled={!inputValue.trim() || isLoading}
            data-testid="studio-chat-send"
          >
            <Send className="w-4 h-4" />
          </StudioButton>
        </div>
      </form>
    </div>
  );
}

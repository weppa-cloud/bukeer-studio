'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
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

  return (
    <Card className="my-2 border-primary/20">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {toolLabels[toolName] ?? toolName}
              </Badge>
              {isPending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              {state === 'result' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs h-7"
            onClick={onApply}
            disabled={isPending}
          >
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <div className={cn('flex gap-2 mb-4', isUser ? 'flex-row-reverse' : '')}>
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      <div className={cn('flex-1 min-w-0', isUser ? 'text-right' : '')}>
        {textContent && (
          <div
            className={cn(
              'inline-block px-3 py-2 rounded-lg text-sm max-w-[90%]',
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-none'
                : 'bg-muted rounded-tl-none'
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  const { messages, status, sendMessage, stop, error, clearError } = useChat({
    transport: {
      api: '/api/ai/studio-chat',
      body: {
        websiteId,
        pageId,
        focusedSectionId: selectedSectionId,
      },
    } as any, // DefaultChatTransport accepts these via HttpChatTransportInitOptions
    onFinish: () => {
      scrollToBottom();
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || isLoading) return;

      sendMessage({ text: inputValue.trim() });
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
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef as any}>
        <div className="py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">AI Assistant</p>
              <p className="text-xs text-muted-foreground mb-6 max-w-[250px]">
                Ask me to edit sections, add content, translate, or improve your page.
              </p>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickAction(action.prompt)}
                  >
                    {action.label}
                  </Button>
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
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Thinking...</span>
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={stop}>
                Stop
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive mb-4 p-2 bg-destructive/10 rounded-md">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs flex-1">{error.message}</span>
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => clearError()}>
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3">
        {selectedSectionId && (
          <div className="mb-2">
            <Badge variant="secondary" className="text-xs">
              Focused: {selectedSectionId.slice(0, 8)}...
            </Badge>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to edit your page..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 h-10 w-10"
            disabled={!inputValue.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

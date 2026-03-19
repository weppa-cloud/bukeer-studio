'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

interface CopilotAction {
  id: string;
  type: string;
  targetSectionId?: string;
  targetSectionType?: string;
  description: string;
  preview: {
    before?: unknown;
    after: unknown;
  };
  confidence: 'high' | 'medium' | 'low';
  position?: {
    relativeTo?: string;
    placement?: 'before' | 'after';
  };
}

export interface CopilotPlan {
  reasoning: string;
  actions: CopilotAction[];
  promptTemplateUsed?: string;
}

interface PromptTemplate {
  label: string;
  icon: string;
  prompt: string;
}

export interface CopilotBarProps {
  websiteId: string;
  token: string;
  focusedSectionId?: string;
  focusedSectionType?: string;
  onPlanReady: (plan: CopilotPlan, sessionId: string) => void;
  onError: (message: string) => void;
}

// ── Icon mapping (Material Icons name to simple SVG) ────────────────────────

function TemplateIcon({ icon }: { icon: string }) {
  // Simple emoji-based icons for the template chips
  const iconMap: Record<string, string> = {
    trending_up: '\u2197\uFE0F',
    search: '\uD83D\uDD0D',
    wb_sunny: '\u2600\uFE0F',
    translate: '\uD83C\uDF10',
  };
  return <span className="text-sm">{iconMap[icon] ?? ''}</span>;
}

// ── Component ───────────────────────────────────────────────────────────────

export function CopilotBar({
  websiteId,
  token,
  focusedSectionId,
  focusedSectionType,
  onPlanReady,
  onError,
}: CopilotBarProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, PromptTemplate> | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load templates on mount (fetch once)
  useEffect(() => {
    // Templates come from the copilot API response; we cache them after first call.
    // For the initial render, use hardcoded defaults.
    setTemplates({
      increase_leads: {
        label: 'Aumentar leads',
        icon: 'trending_up',
        prompt:
          'Optimiza el sitio para generar mas solicitudes de cotizacion. Mejora los CTAs, agrega urgencia y destaca testimonios.',
      },
      improve_seo: {
        label: 'Mejorar SEO',
        icon: 'search',
        prompt:
          'Mejora el SEO del sitio: optimiza meta titulo, descripcion y textos de secciones con palabras clave relevantes para turismo.',
      },
      summer_campaign: {
        label: 'Campana de verano',
        icon: 'wb_sunny',
        prompt:
          'Adapta el sitio para una campana de verano: cambia textos, agrega secciones de destinos de playa y promociones de temporada.',
      },
      translate_en: {
        label: 'Traducir a ingles',
        icon: 'translate',
        prompt:
          'Traduce todo el contenido visible del sitio al ingles, manteniendo el tono y estilo de la marca.',
      },
    });
  }, []);

  const submit = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      setIsLoading(true);
      setReasoning('Analizando tu solicitud...');
      setErrorMessage(null);

      abortRef.current = new AbortController();

      try {
        const response = await fetch('/api/ai/editor/copilot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: text.trim(),
            websiteId,
            focusedSectionId,
            focusedSectionType,
            locale: 'es',
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const msg =
            errorData?.error ?? `Error ${response.status}: ${response.statusText}`;
          throw new Error(msg);
        }

        const data = await response.json();

        // Cache templates from response
        if (data.templates) {
          setTemplates(data.templates);
        }

        setReasoning(data.plan.reasoning);

        // Brief pause to show reasoning before delivering plan
        setTimeout(() => {
          onPlanReady(data.plan, data.sessionId);
          setIsLoading(false);
          setReasoning(null);
          setPrompt('');
        }, 800);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setIsLoading(false);
          setReasoning(null);
          return;
        }

        const message = err instanceof Error ? err.message : 'Error inesperado';
        setErrorMessage(message);
        setIsLoading(false);
        setReasoning(null);
        onError(message);
      }
    },
    [websiteId, token, focusedSectionId, focusedSectionType, isLoading, onPlanReady, onError]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submit(prompt);
    },
    [prompt, submit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit(prompt);
      }
    },
    [prompt, submit]
  );

  const handleTemplateClick = useCallback(
    (templatePrompt: string) => {
      setPrompt(templatePrompt);
      // Auto-submit template prompts
      submit(templatePrompt);
    },
    [submit]
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setReasoning(null);
  }, []);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    if (prompt.trim()) {
      submit(prompt);
    }
  }, [prompt, submit]);

  return (
    <div className="border-t border-border bg-background">
      {/* Prompt template chips */}
      {!isLoading && templates && (
        <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto scrollbar-thin">
          {Object.entries(templates).map(([key, template]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTemplateClick(template.prompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              <TemplateIcon icon={template.icon} />
              {template.label}
            </button>
          ))}
        </div>
      )}

      {/* Reasoning display */}
      {reasoning && isLoading && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full shrink-0" />
            <span className="truncate">{reasoning}</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {errorMessage && !isLoading && (
        <div className="px-4 py-2">
          <div className="flex items-center justify-between gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            <span className="truncate">{errorMessage}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs font-medium underline shrink-0 hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4 py-3">
        {/* Focus indicator */}
        {focusedSectionId && focusedSectionType && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-xs text-primary shrink-0 self-center">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {focusedSectionType}
          </div>
        )}

        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            focusedSectionId
              ? `Describe cambios para la seccion ${focusedSectionType ?? ''}...`
              : 'Describe que quieres cambiar en tu sitio web...'
          }
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 max-h-24"
        />

        {isLoading ? (
          <button
            type="button"
            onClick={handleCancel}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
          >
            Cancelar
          </button>
        ) : (
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        )}
      </form>
    </div>
  );
}

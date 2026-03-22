/**
 * Copilot Panel — AI Chat inside Puck Editor
 *
 * Uses usePuck() to access editor state and dispatch data changes.
 * Injected via overrides.fields in the Puck component.
 *
 * Features:
 * - Text prompt input
 * - Quick action buttons (templates)
 * - Action cards with Apply/Skip
 * - Section-aware context (knows selected section)
 * - Direct dispatch to Puck (no postMessage)
 */

'use client';

import React, { useState, useCallback, useRef, memo } from 'react';
import { usePuck } from '@measured/puck';
import { applyAction, applyAllActions } from './copilot-actions';
import type { CopilotAction, CopilotPlan, ActionResult } from './copilot-actions';
import type { PuckData } from '../adapters';

// ============================================================================
// Types
// ============================================================================

interface CopilotPanelProps {
  websiteId: string;
  token: string | null;
}

interface QuickTemplate {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  { id: 'improve', label: 'Mejorar copy', icon: '\u2728', prompt: 'Mejora el texto de esta seccion para que sea mas persuasivo y profesional' },
  { id: 'testimonials', label: 'Testimonios', icon: '\uD83D\uDCAC', prompt: 'Agrega una seccion de testimonios con 3 testimonios de clientes satisfechos' },
  { id: 'cta', label: 'Call to Action', icon: '\uD83D\uDE80', prompt: 'Agrega un CTA atractivo al final de la pagina' },
  { id: 'translate', label: 'Traducir EN', icon: '\uD83C\uDF10', prompt: 'Traduce todo el contenido de esta pagina al ingles' },
];

// ============================================================================
// Component (wrapped in memo per tech-validator suggestion)
// ============================================================================

export const CopilotPanel = memo(function CopilotPanel({
  websiteId,
  token,
}: CopilotPanelProps) {
  const { appState, dispatch } = usePuck();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<CopilotPlan | null>(null);
  const [results, setResults] = useState<ActionResult[]>([]);
  const snapshotRef = useRef<PuckData | null>(null);

  // Get selected section context
  const selectedIndex = (appState.ui as Record<string, unknown>).itemSelector as { index: number } | null;
  const selectedSection = selectedIndex != null
    ? (appState.data as PuckData).content[selectedIndex.index]
    : null;

  const handleSubmit = useCallback(async (promptText: string) => {
    if (!promptText.trim() || !token) return;

    setIsLoading(true);
    setError(null);
    setPlan(null);
    setResults([]);

    // Snapshot current data for undo
    snapshotRef.current = JSON.parse(JSON.stringify(appState.data));

    try {
      const response = await fetch('/api/ai/editor/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: promptText,
          websiteId,
          focusedSectionId: selectedSection?.props?.id,
          focusedSectionType: selectedSection?.type,
          locale: 'es',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as Record<string, string>).error || `Error ${response.status}`);
      }

      const data = await response.json();
      setPlan(data.plan as CopilotPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar sugerencias');
    } finally {
      setIsLoading(false);
    }
  }, [token, websiteId, selectedSection, appState.data]);

  const handleApplyAction = useCallback((action: CopilotAction) => {
    try {
      const currentData = appState.data as PuckData;
      const newData = applyAction(currentData, action);
      dispatch({ type: 'setData', data: newData } as never);
      setResults((prev) => [...prev, { actionId: action.id, result: 'applied' }]);
    } catch (err) {
      setResults((prev) => [
        ...prev,
        { actionId: action.id, result: 'failed', error: err instanceof Error ? err.message : 'Error' },
      ]);
    }
  }, [appState.data, dispatch]);

  const handleApplyAll = useCallback(() => {
    if (!plan) return;
    const currentData = appState.data as PuckData;
    const { data: newData, results: actionResults } = applyAllActions(currentData, plan.actions);
    dispatch({ type: 'setData', data: newData } as never);
    setResults(actionResults);
  }, [plan, appState.data, dispatch]);

  const handleSkipAction = useCallback((actionId: string) => {
    setResults((prev) => [...prev, { actionId, result: 'skipped' }]);
  }, []);

  const handleUndo = useCallback(() => {
    if (snapshotRef.current) {
      dispatch({ type: 'setData', data: snapshotRef.current } as never);
      setPlan(null);
      setResults([]);
    }
  }, [dispatch]);

  const handleDismiss = useCallback(() => {
    setPlan(null);
    setResults([]);
    setPrompt('');
    setError(null);
  }, []);

  // Collapsed state — just show toggle button
  if (isCollapsed) {
    return (
      <div style={styles.collapsedBar}>
        <button
          style={styles.toggleBtn}
          onClick={() => setIsCollapsed(false)}
          type="button"
        >
          <span>{'\u2728'}</span>
          <span>AI Copilot</span>
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>{'\u2728'} AI Copilot</span>
        <button style={styles.closeBtn} onClick={() => setIsCollapsed(true)} type="button">
          {'\u2715'}
        </button>
      </div>

      {/* Section context */}
      {selectedSection && (
        <div style={styles.context}>
          Editando: <strong>{selectedSection.type}</strong>
        </div>
      )}

      {/* Quick templates */}
      <div style={styles.templates}>
        {QUICK_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            style={styles.templateBtn}
            onClick={() => handleSubmit(tpl.prompt)}
            disabled={isLoading}
            type="button"
          >
            {tpl.icon} {tpl.label}
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <div style={styles.inputRow}>
        <input
          type="text"
          placeholder="Describe que quieres cambiar..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit(prompt)}
          style={styles.input}
          disabled={isLoading}
        />
        <button
          style={styles.sendBtn}
          onClick={() => handleSubmit(prompt)}
          disabled={!prompt.trim() || isLoading}
          type="button"
        >
          {isLoading ? '...' : '\u2794'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.error}>
          {error}
          <button style={styles.retryBtn} onClick={() => handleSubmit(prompt)} type="button">
            Reintentar
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={styles.loading}>
          Generando sugerencias...
        </div>
      )}

      {/* Plan + Actions */}
      {plan && (
        <div style={styles.plan}>
          {/* Reasoning */}
          <div style={styles.reasoning}>
            {plan.reasoning}
          </div>

          {/* Action cards */}
          {plan.actions.map((action) => {
            const actionResult = results.find((r) => r.actionId === action.id);
            const isProcessed = !!actionResult;

            return (
              <div
                key={action.id}
                style={{
                  ...styles.actionCard,
                  ...(isProcessed ? styles.actionProcessed : {}),
                }}
              >
                <div style={styles.actionHeader}>
                  <span style={styles.actionType}>{action.type.replace(/_/g, ' ')}</span>
                  <span style={{
                    ...styles.confidenceBadge,
                    background: action.confidence === 'high' ? '#dcfce7' : action.confidence === 'medium' ? '#fef3c7' : '#fee2e2',
                    color: action.confidence === 'high' ? '#065f46' : action.confidence === 'medium' ? '#92400e' : '#991b1b',
                  }}>
                    {action.confidence}
                  </span>
                </div>
                <p style={styles.actionDesc}>{action.description}</p>

                {isProcessed ? (
                  <span style={{
                    ...styles.resultBadge,
                    color: actionResult.result === 'applied' ? '#065f46' : actionResult.result === 'skipped' ? '#6B7280' : '#991b1b',
                  }}>
                    {actionResult.result === 'applied' ? '\u2713 Aplicado' : actionResult.result === 'skipped' ? 'Omitido' : `\u2717 ${actionResult.error}`}
                  </span>
                ) : (
                  <div style={styles.actionButtons}>
                    <button
                      style={styles.applyBtn}
                      onClick={() => handleApplyAction(action)}
                      type="button"
                    >
                      Aplicar
                    </button>
                    <button
                      style={styles.skipBtn}
                      onClick={() => handleSkipAction(action.id)}
                      type="button"
                    >
                      Omitir
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Batch actions */}
          {results.length < plan.actions.length && (
            <div style={styles.batchActions}>
              <button style={styles.applyAllBtn} onClick={handleApplyAll} type="button">
                Aplicar todo
              </button>
              <button style={styles.dismissBtn} onClick={handleDismiss} type="button">
                Descartar
              </button>
            </div>
          )}

          {/* Undo */}
          {results.some((r) => r.result === 'applied') && (
            <button style={styles.undoBtn} onClick={handleUndo} type="button">
              {'\u21A9'} Deshacer cambios de IA
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Styles (inline — Puck fields override is outside Tailwind context)
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: '1px solid #E5E7EB',
    marginTop: 16,
    paddingTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 400,
    overflowY: 'auto',
  },
  collapsedBar: {
    borderTop: '1px solid #E5E7EB',
    marginTop: 16,
    paddingTop: 8,
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: '#f5f3ff',
    border: '1px solid #ddd6fe',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: '#7c57b3',
    width: '100%',
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#7c57b3',
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    color: '#9CA3AF',
    padding: 4,
  },
  context: {
    fontSize: 12,
    color: '#6B7280',
    background: '#F9FAFB',
    padding: '4px 8px',
    borderRadius: 4,
  },
  templates: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  templateBtn: {
    padding: '4px 8px',
    fontSize: 11,
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    background: 'white',
    cursor: 'pointer',
    color: '#4B5563',
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
  },
  inputRow: {
    display: 'flex',
    gap: 4,
  },
  input: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 13,
    border: '1px solid #D1D5DB',
    borderRadius: 6,
    outline: 'none',
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
  },
  sendBtn: {
    padding: '6px 12px',
    background: '#7c57b3',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
  },
  error: {
    fontSize: 12,
    color: '#991b1b',
    background: '#fef2f2',
    padding: '6px 10px',
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryBtn: {
    fontSize: 11,
    color: '#7c57b3',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  loading: {
    fontSize: 12,
    color: '#7c57b3',
    textAlign: 'center',
    padding: 12,
  },
  plan: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  reasoning: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    padding: '6px 0',
    borderBottom: '1px solid #F3F4F6',
  },
  actionCard: {
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    padding: 10,
    background: 'white',
  },
  actionProcessed: {
    opacity: 0.6,
  },
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionType: {
    fontSize: 11,
    fontWeight: 600,
    color: '#4B5563',
    textTransform: 'uppercase',
  },
  confidenceBadge: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 8,
    fontWeight: 500,
  },
  actionDesc: {
    fontSize: 12,
    color: '#374151',
    margin: '4px 0 8px',
    lineHeight: 1.4,
  },
  actionButtons: {
    display: 'flex',
    gap: 6,
  },
  applyBtn: {
    padding: '4px 12px',
    fontSize: 12,
    background: '#7c57b3',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
  },
  skipBtn: {
    padding: '4px 12px',
    fontSize: 12,
    background: 'transparent',
    color: '#6B7280',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    cursor: 'pointer',
  },
  resultBadge: {
    fontSize: 11,
    fontWeight: 500,
  },
  batchActions: {
    display: 'flex',
    gap: 8,
    paddingTop: 8,
    borderTop: '1px solid #F3F4F6',
  },
  applyAllBtn: {
    flex: 1,
    padding: '6px 12px',
    fontSize: 12,
    background: '#7c57b3',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
  },
  dismissBtn: {
    padding: '6px 12px',
    fontSize: 12,
    background: 'transparent',
    color: '#6B7280',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    cursor: 'pointer',
  },
  undoBtn: {
    padding: '6px 12px',
    fontSize: 12,
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
    width: '100%',
    marginTop: 4,
  },
};

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { renderSectionWithResult } from '@/lib/sections/render-section';
import { EditableSection } from '@/components/editor/editable-section';
import { EditorShell } from '@/components/editor/editor-shell';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

// Puck imports (feature-flagged)
import { sectionsToPuckData, puckDataToSections } from '@/lib/puck/adapters';
import type { PuckData } from '@/lib/puck/adapters';
import { pageConfig } from '@/lib/puck/configs/page-config';
import '@/styles/puck-bukeer-theme.css';

// ============================================================================
// Error Boundary for Puck
// ============================================================================

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PuckErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Puck] Editor crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 16,
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>&#9888;</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            El editor encontro un error
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280', maxWidth: 400 }}>
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              background: '#6d28d9',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Recargar editor
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PUCK_ENABLED = process.env.NEXT_PUBLIC_PUCK_EDITOR === 'true';

// Puck component loaded dynamically to avoid bundling when feature is off
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PuckEditor: React.ComponentType<any> | null = null;

const ALLOWED_ORIGINS = [
  'https://app.bukeer.com',
  // Allow any localhost port in development for Flutter web
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:62047']
    : []),
].filter(Boolean) as string[];

// Helper to check if origin is allowed (supports localhost:* in dev)
function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // In development, allow any localhost port
  if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
    return true;
  }
  return false;
}

interface EditorPageProps {
  params: Promise<{ websiteId: string }>;
}

interface WebsiteSnapshot {
  website: {
    id: string;
    subdomain: string;
    status: string;
    revision: number;
    theme: WebsiteData['theme'];
    content: Record<string, unknown>;
    account_id: string;
  };
  sections: Array<{
    id: string;
    sectionType: string;
    variant: string | null;
    displayOrder: number;
    isEnabled: boolean;
    config: Record<string, unknown>;
    content: Record<string, unknown>;
  }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [state, setState] = useState<'waiting' | 'loading' | 'ready' | 'error'>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WebsiteSnapshot | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Puck state
  const [puckReady, setPuckReady] = useState(!PUCK_ENABLED);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const tokenRef = useRef<string | null>(null);
  const parentOriginRef = useRef<string | null>(null);
  const puckDataRef = useRef<PuckData | null>(null);

  // Load Puck module dynamically
  useEffect(() => {
    if (!PUCK_ENABLED) return;
    import('@measured/puck').then((mod) => {
      PuckEditor = mod.Puck as unknown as typeof PuckEditor;
      setPuckReady(true);
    });
    // Also load CSS — dynamic import for side-effect
    // @ts-expect-error — CSS module import has no type declarations
    import('@measured/puck/puck.css');
  }, []);

  // Resolve params
  useEffect(() => {
    params.then(p => setWebsiteId(p.websiteId));
  }, [params]);

  const sendToParent = useCallback((type: string, payload: Record<string, unknown>) => {
    const targetOrigin = type === 'canvas:ready' ? '*' : parentOriginRef.current;

    if (!targetOrigin && type !== 'canvas:ready') return;

    window.parent.postMessage({
      source: 'bukeer-sites-editor',
      version: 1,
      websiteId,
      type,
      payload,
    }, targetOrigin!);
  }, [websiteId]);

  const loadData = useCallback(async (keepSelection = false) => {
    if (!tokenRef.current || !websiteId) {
      sendToParent('canvas:state', {
        state: 'error',
        error: { code: 'auth', message: 'No token or websiteId' }
      });
      return;
    }

    setState('loading');
    sendToParent('canvas:state', { state: 'loading' });

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${tokenRef.current}` }
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

      // Call RPC with websiteId (not subdomain)
      const { data: snapshot, error: rpcError } = await supabase.rpc(
        'get_website_editor_snapshot',
        { p_website_id: websiteId }
      );

      if (rpcError) throw rpcError;

      const typedSnapshot = snapshot as WebsiteSnapshot;
      setData(typedSnapshot);
      setIsDirty(false);
      setState('ready');

      // Send editorMode in canvas:state so Flutter knows which mode is active
      sendToParent('canvas:state', {
        state: 'ready',
        editorMode: PUCK_ENABLED && puckReady ? 'puck' : 'legacy',
        hasUnsavedChanges: false,
      });

      // Keep inspector selection in sync after refreshes.
      if (keepSelection && selectedSectionId) {
        const selected = typedSnapshot.sections.find((s) => s.id === selectedSectionId);
        if (selected) {
          sendToParent('section:selected', {
            sectionId: selected.id,
            sectionType: selected.sectionType,
            isEnabled: selected.isEnabled,
            content: selected.content,
          });
        }
      }

      if (!keepSelection) {
        setSelectedSectionId(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setState('error');
      setError(errorMessage);
      sendToParent('canvas:state', {
        state: 'error',
        error: { code: 'rpc', message: errorMessage }
      });
    }
  }, [websiteId, sendToParent, selectedSectionId, puckReady]);

  const scrollToSection = useCallback((sectionId: string) => {
    document.querySelector(`[data-section-id="${sectionId}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, []);

  useEffect(() => {
    if (!websiteId) return;

    const handleMessage = (event: MessageEvent) => {
      // Check if origin is allowed
      if (!isAllowedOrigin(event.origin)) {
        console.warn('[Editor] Rejected origin:', event.origin);
        return;
      }

      if (!parentOriginRef.current) {
        parentOriginRef.current = event.origin;
      }

      if (event.origin !== parentOriginRef.current) return;
      if (event.data?.source !== 'bukeer-sites-editor') return;
      if (event.data?.websiteId !== websiteId) return;

      const { type, payload } = event.data;

      switch (type) {
        case 'editor:init':
          tokenRef.current = payload.accessToken;
          loadData();
          break;
        case 'canvas:refresh':
          loadData(payload.keepSelection);
          break;
        case 'section:focus':
          scrollToSection(payload.sectionId);
          break;
        case 'copilot:applied':
          // Flutter finished applying copilot actions
          if (PUCK_ENABLED && puckReady && payload.puckData) {
            // If copilot sends Puck Data directly, update via ref
            // (Puck will re-render with the new data)
            puckDataRef.current = payload.puckData as PuckData;
          }
          // Always refresh from DB to stay in sync
          loadData(true);
          break;
        case 'copilot:focus': {
          // Flutter wants to focus copilot on a specific section
          const focusSectionId = payload.sectionId as string | undefined;
          if (focusSectionId) {
            setSelectedSectionId(focusSectionId);
            scrollToSection(focusSectionId);
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify that we're ready (only message with '*')
    sendToParent('canvas:ready', { canvasOrigin: window.location.origin });

    return () => {
      window.removeEventListener('message', handleMessage);
      tokenRef.current = null;
      parentOriginRef.current = null;
    };
  }, [websiteId, loadData, scrollToSection, sendToParent]);

  const handleSectionClick = useCallback((
    sectionId: string,
    sectionType: string,
    isEnabled: boolean,
    content: Record<string, unknown>
  ) => {
    setSelectedSectionId(sectionId);
    sendToParent('section:selected', {
      sectionId,
      sectionType,
      isEnabled,
      content,
    });
  }, [sendToParent]);

  // ============================================================================
  // Puck handlers
  // ============================================================================

  const handlePuckChange = useCallback((puckData: PuckData) => {
    puckDataRef.current = puckData;
    if (!isDirty) {
      setIsDirty(true);
      sendToParent('canvas:state', {
        state: 'ready',
        editorMode: 'puck',
        hasUnsavedChanges: true,
      });
    }
  }, [isDirty, sendToParent]);

  const handlePuckSave = useCallback(async (puckData: PuckData) => {
    if (!tokenRef.current || !websiteId) return;

    setIsSaving(true);
    sendToParent('canvas:state', {
      state: 'saving',
      editorMode: 'puck',
      hasUnsavedChanges: false,
    });

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${tokenRef.current}` }
          },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        }
      );

      // Convert Puck data back to sections format
      const sections = puckDataToSections(puckData);

      // Upsert each section
      for (const section of sections) {
        if (!section.id) continue;
        await supabase
          .from('website_sections')
          .update({
            section_type: section.section_type,
            variant: section.variant,
            display_order: section.display_order,
            is_enabled: section.is_enabled,
            content: section.content,
            config: section.config,
          })
          .eq('id', section.id)
          .eq('website_id', websiteId);
      }

      setIsDirty(false);
      sendToParent('canvas:state', {
        state: 'ready',
        editorMode: 'puck',
        hasUnsavedChanges: false,
      });
    } catch (err) {
      console.error('[Editor] Save failed:', err);
      sendToParent('canvas:state', {
        state: 'error',
        editorMode: 'puck',
        error: { code: 'save', message: err instanceof Error ? err.message : 'Save failed' },
      });
    } finally {
      setIsSaving(false);
    }
  }, [websiteId, sendToParent]);

  const handlePuckPublish = useCallback(async (puckData: PuckData) => {
    // Save first, then publish (update website status)
    await handlePuckSave(puckData);

    if (!tokenRef.current || !websiteId) return;

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${tokenRef.current}` }
          },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        }
      );

      await supabase
        .from('websites')
        .update({ status: 'published' })
        .eq('id', websiteId);

      sendToParent('canvas:state', {
        state: 'ready',
        editorMode: 'puck',
        hasUnsavedChanges: false,
      });
    } catch (err) {
      console.error('[Editor] Publish failed:', err);
    }
  }, [websiteId, handlePuckSave, sendToParent]);

  // Warn before closing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Standalone mode: use EditorShell V2 with drag-and-drop
  if (mode === 'standalone' && websiteId) {
    return <EditorShell websiteId={websiteId} />;
  }

  // Embedded mode render states
  if (!websiteId || state === 'waiting') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-pulse w-8 h-8 rounded-full bg-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Conectando con el editor...</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center text-destructive">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Transform sections for renderSectionWithResult (camelCase to snake_case for compatibility)
  const rawContent = data.website.content || {};
  const getString = (val: unknown, fallback = '') =>
    typeof val === 'string' ? val : fallback;

  const getRecord = <T extends Record<string, unknown>>(
    val: unknown,
    fallback: T
  ): T => (val && typeof val === 'object' ? (val as T) : fallback);

  const seo = getRecord(rawContent.seo, {
    title: '',
    description: '',
    keywords: '',
  });
  const contact = getRecord(rawContent.contact, {
    email: '',
    phone: '',
    address: '',
  });
  const social = getRecord(rawContent.social, {});

  const sectionsForWebsite: WebsiteSection[] = data.sections.map((section) => ({
    id: section.id,
    section_type: section.sectionType,
    variant: section.variant ?? '',
    display_order: section.displayOrder,
    is_enabled: section.isEnabled,
    config: section.config,
    content: section.content,
  }));

  const statusForRender: WebsiteData['status'] =
    data.website.status === 'published' ? 'published' : 'draft';

  const transformedWebsite: WebsiteData = {
    id: data.website.id,
    subdomain: data.website.subdomain,
    status: statusForRender,
    theme: data.website.theme as WebsiteData['theme'],
    content: {
      siteName: getString(rawContent.siteName, getString(rawContent.site_name)),
      tagline: getString(rawContent.tagline),
      logo: getString(rawContent.logo),
      seo: {
        title: getString(seo.title),
        description: getString(seo.description),
        keywords: getString(seo.keywords),
      },
      contact: {
        email: getString(contact.email),
        phone: getString(contact.phone),
        address: getString(contact.address),
      },
      social,
    },
    account_id: data.website.account_id,
    custom_domain: null,
    template_id: '',
    featured_products: {
      destinations: [],
      hotels: [],
      activities: [],
      transfers: [],
    },
    sections: sectionsForWebsite,
  };

  // ============================================================================
  // Puck Editor Mode
  // ============================================================================
  if (PUCK_ENABLED && puckReady && PuckEditor) {
    const puckData = sectionsToPuckData(sectionsForWebsite);

    return (
      <PuckErrorBoundary>
        <PuckEditor
          config={pageConfig}
          data={puckData}
          onPublish={handlePuckPublish}
          onChange={handlePuckChange}
          headerTitle="Inicio"
          metadata={{ website: transformedWebsite }}
          renderHeaderActions={({ state: puckState }: { state: { data: PuckData } }) => (
            <div className="editor-actions">
              {/* Preview toggle */}
              <button
                className={`editor-btn ${showFullPreview ? 'editor-btn--primary' : ''}`}
                onClick={() => setShowFullPreview(!showFullPreview)}
                title={showFullPreview ? 'Volver al editor' : 'Vista previa completa'}
                type="button"
              >
                {showFullPreview ? 'Editar' : 'Preview'}
              </button>

              <span
                className={`editor-status ${
                  isSaving
                    ? 'editor-status--saving'
                    : isDirty
                      ? 'editor-status--dirty'
                      : 'editor-status--saved'
                }`}
              >
                {isSaving
                  ? 'Guardando...'
                  : isDirty
                    ? '\u25CF Sin guardar'
                    : '\u2713 Guardado'}
              </span>
              <button
                className="editor-btn"
                disabled={!isDirty || isSaving}
                onClick={() => handlePuckSave(puckState.data)}
                type="button"
              >
                Guardar borrador
              </button>
              <button
                className="editor-btn editor-btn--primary"
                disabled={isSaving}
                onClick={() => handlePuckPublish(puckState.data)}
                type="button"
              >
                Publicar
              </button>
            </div>
          )}
          overrides={{
            preview: ({ children }: { children: React.ReactNode }) => (
              <M3ThemeProvider initialTheme={data.website.theme}>
                {showFullPreview && <SiteHeader website={transformedWebsite} />}
                {children}
                {showFullPreview && <SiteFooter website={transformedWebsite} />}
              </M3ThemeProvider>
            ),
          }}
        />
      </PuckErrorBoundary>
    );
  }

  // ============================================================================
  // Legacy Canvas Mode (default)
  // ============================================================================
  return (
    <M3ThemeProvider initialTheme={data.website.theme}>
      <div className="min-h-screen">
        {data.sections.map((section) => {
          // Transform to snake_case for renderSectionWithResult compatibility
          const sectionForRender = {
            id: section.id,
            section_type: section.sectionType,
            variant: section.variant ?? '',
            display_order: section.displayOrder,
            is_enabled: section.isEnabled,
            config: section.config,
            content: section.content,
          };

          const result = renderSectionWithResult({
            section: sectionForRender,
            website: transformedWebsite,
          });

          return (
            <EditableSection
              key={section.id}
              sectionId={section.id}
              sectionType={section.sectionType}
              isSelected={selectedSectionId === section.id}
              isEnabled={section.isEnabled}
              content={section.content}
              onClick={handleSectionClick}
            >
              {result.element}
            </EditableSection>
          );
        })}
      </div>
    </M3ThemeProvider>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { renderSectionWithResult } from '@/lib/sections/render-section';
import { EditableSection } from './editable-section';
import { Toolbar, type ViewportSize } from './toolbar';
import { SectionPalette } from './section-palette';
import { CanvasFrame } from './canvas-frame';
import { CopilotBar, type CopilotPlan } from './copilot-bar';
import { createAuthClient, getAuthUser } from '@/lib/auth/require-auth';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface EditorSection {
  id: string;
  sectionType: string;
  variant: string | null;
  displayOrder: number;
  isEnabled: boolean;
  config: Record<string, unknown>;
  content: Record<string, unknown>;
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
  sections: EditorSection[];
}

// Sortable wrapper for sections
function SortableSection({
  section,
  isSelected,
  onSelect,
  renderedElement,
}: {
  section: EditorSection;
  isSelected: boolean;
  onSelect: (id: string, type: string, enabled: boolean, content: Record<string, unknown>) => void;
  renderedElement: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
        <EditableSection
          sectionId={section.id}
          sectionType={section.sectionType}
          isSelected={isSelected}
          isEnabled={section.isEnabled}
          content={section.content}
          onClick={onSelect}
        >
          {renderedElement}
        </EditableSection>
      </div>
    </div>
  );
}

interface EditorShellProps {
  websiteId: string;
  /** Auth token from Supabase session (SSO cookie set by middleware). */
  initialToken?: string;
}

/**
 * Editor V2 Shell — Layout: sidebar palette + canvas + toolbar
 *
 * Features:
 * - Drag-and-drop section reordering (@dnd-kit)
 * - Responsive preview (3 viewports)
 * - Save Draft / Publish via existing RPCs
 * - Works with Supabase Auth session (SSO token from Flutter)
 */
export function EditorShell({ websiteId, initialToken }: EditorShellProps) {
  const [data, setData] = useState<WebsiteSnapshot | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedSectionType, setSelectedSectionType] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const tokenRef = useRef<string | null>(initialToken ?? null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Create authenticated supabase client
  const getSupabase = useCallback(() => {
    const token = tokenRef.current;
    if (!token) return null;

    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );
  }, []);

  // Load data via RPC
  const loadData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setState('error');
      setError('No authentication token');
      return;
    }

    setState('loading');
    try {
      const { data: snapshot, error: rpcError } = await supabase.rpc(
        'get_website_editor_snapshot',
        { p_website_id: websiteId }
      );
      if (rpcError) throw rpcError;

      setData(snapshot as WebsiteSnapshot);
      setState('ready');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, [websiteId, getSupabase]);

  // Auth: get session token from Supabase (SSO cookie set by middleware)
  useEffect(() => {
    async function initAuth() {
      if (tokenRef.current) {
        loadData();
        return;
      }

      const client = createAuthClient();
      const { data: { session } } = await client.auth.getSession();
      if (session?.access_token) {
        tokenRef.current = session.access_token;
        loadData();
      } else {
        setState('error');
        setError('No estás autenticado. Inicia sesión primero.');
      }
    }
    initAuth();
  }, [loadData]);

  // Handle drag end — reorder sections
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !data) return;

    const oldIndex = data.sections.findIndex((s) => s.id === active.id);
    const newIndex = data.sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update
    const newSections = arrayMove(data.sections, oldIndex, newIndex).map((s, i) => ({
      ...s,
      displayOrder: i,
    }));
    setData({ ...data, sections: newSections });

    // Persist via REST (update display_order for each moved section)
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const updates = newSections.map((s, i) =>
        supabase
          .from('website_sections')
          .update({ display_order: i })
          .eq('id', s.id)
          .eq('website_id', websiteId)
      );
      await Promise.all(updates);
    } catch {
      // Revert on failure
      loadData();
    }
  }, [data, websiteId, getSupabase, loadData]);

  // Save Draft
  const handleSaveDraft = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setIsSaving(true);
    try {
      await supabase.rpc('create_website_draft', {
        p_website_id: websiteId,
        p_description: 'Saved from editor',
      });
    } finally {
      setIsSaving(false);
    }
  }, [websiteId, getSupabase]);

  // Publish
  const handlePublish = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setIsPublishing(true);
    try {
      const { data: draft } = await supabase.rpc('create_website_draft', {
        p_website_id: websiteId,
        p_description: 'Published from editor',
      });

      const versionId = (draft as Record<string, unknown> | null)?.version_id as string | undefined;
      if (versionId) {
        await supabase.rpc('publish_website_version', {
          p_website_id: websiteId,
          p_version_id: versionId,
        });
      }

      await loadData();
    } finally {
      setIsPublishing(false);
    }
  }, [websiteId, getSupabase, loadData]);

  // Preview
  const handlePreview = useCallback(() => {
    if (!data?.website.subdomain) return;
    window.open(`https://${data.website.subdomain}.bukeer.com`, '_blank');
  }, [data]);

  // Save as Template
  const handleSaveAsTemplate = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const templateName = window.prompt(
      'Nombre de la plantilla:',
      `Plantilla de ${data?.website.subdomain ?? 'mi sitio'}`
    );
    if (!templateName) return;

    const description = window.prompt('Descripción (opcional):', '') ?? undefined;
    const isPublic = window.confirm('¿Hacer pública esta plantilla?');

    try {
      const { data: result, error: rpcError } = await supabase.rpc(
        'save_website_as_template',
        {
          p_website_id: websiteId,
          p_template_name: templateName,
          p_description: description,
          p_is_public: isPublic,
        }
      );

      if (rpcError) throw rpcError;

      const typedResult = result as { success: boolean; template_id?: string; error?: string };
      if (!typedResult.success) {
        window.alert(`Error: ${typedResult.error}`);
        return;
      }

      window.alert('Plantilla guardada correctamente.');
    } catch (err) {
      window.alert(
        `Error al guardar plantilla: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }, [websiteId, data, getSupabase]);

  // Section select
  const handleSectionSelect = useCallback((
    id: string, type: string, enabled: boolean, content: Record<string, unknown>
  ) => {
    setSelectedSectionId(id);
    setSelectedSectionType(type);
  }, []);

  // Copilot handlers
  const handleCopilotPlanReady = useCallback((plan: CopilotPlan, sessionId: string) => {
    // Send plan to Flutter parent via postMessage
    window.parent.postMessage({
      source: 'bukeer-sites-editor',
      version: 1,
      websiteId,
      type: 'copilot:plan',
      payload: { plan, sessionId },
    }, '*');
  }, [websiteId]);

  const handleCopilotError = useCallback((message: string) => {
    // Notify Flutter parent of copilot error
    window.parent.postMessage({
      source: 'bukeer-sites-editor',
      version: 1,
      websiteId,
      type: 'copilot:error',
      payload: { message },
    }, '*');
  }, [websiteId]);

  // Build transformed website for render
  const buildWebsiteForRender = useCallback((): WebsiteData | null => {
    if (!data) return null;

    const raw = data.website.content || {};
    const getString = (val: unknown, fallback = '') =>
      typeof val === 'string' ? val : fallback;
    const getRecord = <T extends Record<string, unknown>>(val: unknown, fallback: T): T =>
      val && typeof val === 'object' ? (val as T) : fallback;

    const seo = getRecord(raw.seo, { title: '', description: '', keywords: '' });
    const contact = getRecord(raw.contact, { email: '', phone: '', address: '' });
    const social = getRecord(raw.social, {});

    const sections: WebsiteSection[] = data.sections.map((s) => ({
      id: s.id,
      section_type: s.sectionType,
      variant: s.variant ?? '',
      display_order: s.displayOrder,
      is_enabled: s.isEnabled,
      config: s.config,
      content: s.content,
    }));

    return {
      id: data.website.id,
      subdomain: data.website.subdomain,
      status: data.website.status === 'published' ? 'published' : 'draft',
      theme: data.website.theme,
      content: {
        siteName: getString(raw.siteName, getString(raw.site_name)),
        tagline: getString(raw.tagline),
        logo: getString(raw.logo),
        seo: { title: getString(seo.title), description: getString(seo.description), keywords: getString(seo.keywords) },
        contact: { email: getString(contact.email), phone: getString(contact.phone), address: getString(contact.address) },
        social,
      },
      account_id: data.website.account_id,
      custom_domain: null,
      template_id: '',
      featured_products: { destinations: [], hotels: [], activities: [], transfers: [], packages: [] },
      sections,
    };
  }, [data]);

  // Render states
  if (state === 'loading' || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
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

  const websiteForRender = buildWebsiteForRender();
  if (!websiteForRender) return null;

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        websiteSubdomain={data.website.subdomain}
        websiteStatus={data.website.status}
        currentViewport={viewport}
        onViewportChange={setViewport}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onPreview={handlePreview}
        onSaveAsTemplate={handleSaveAsTemplate}
        isSaving={isSaving}
        isPublishing={isPublishing}
      />

      <div className="flex-1 flex overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SectionPalette isOpen={paletteOpen} onToggle={() => setPaletteOpen(!paletteOpen)} />

          <CanvasFrame websiteId={websiteId} viewport={viewport}>
            <M3ThemeProvider initialTheme={data.website.theme?.tokens ? { tokens: data.website.theme.tokens, profile: data.website.theme.profile } : undefined}>
              <SortableContext
                items={data.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {data.sections.map((section) => {
                  const sectionForRender: WebsiteSection = {
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
                    website: websiteForRender,
                  });

                  return (
                    <SortableSection
                      key={section.id}
                      section={section}
                      isSelected={selectedSectionId === section.id}
                      onSelect={handleSectionSelect}
                      renderedElement={result.element}
                    />
                  );
                })}
              </SortableContext>
            </M3ThemeProvider>
          </CanvasFrame>
        </DndContext>
      </div>

      {tokenRef.current && (
        <CopilotBar
          websiteId={websiteId}
          token={tokenRef.current}
          focusedSectionId={selectedSectionId ?? undefined}
          focusedSectionType={selectedSectionType ?? undefined}
          onPlanReady={handleCopilotPlanReady}
          onError={handleCopilotError}
        />
      )}
    </div>
  );
}

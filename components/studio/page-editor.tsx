'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { renderSectionWithResult } from '@/lib/sections/render-section';
import { SectionPreview } from './section-preview';
import { SectionForm } from './section-form';
import { SectionPicker } from './section-picker';
import { StudioChat } from './studio-chat';
import { SeoPanel } from './seo-panel';
import { Toolbar, type ViewportSize } from '@/components/editor/toolbar';
import { CanvasFrame } from '@/components/editor/canvas-frame';
import { useAutosave, type AutosaveStatus } from '@/lib/hooks/use-autosave';
import { useDirtyState } from '@/lib/hooks/use-dirty-state';
import { useCommonShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { useLocalBackup } from '@/lib/hooks/use-local-backup';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';
import {
  moveSection,
  duplicateSection,
  removeSection as removeSectionAction,
  toggleSectionVisibility,
  updateSectionContent,
  addSection,
  type EditorSection,
} from '@/lib/studio/section-actions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Plus, ArrowLeft, WifiOff } from 'lucide-react';
import type { WebsiteData, WebsiteSection } from '@bukeer/website-contract';
import type { SectionTypeValue } from '@bukeer/website-contract';

// ============================================================================
// Types
// ============================================================================

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

interface PageSnapshot {
  page: {
    id: string;
    title: string;
    slug: string;
    page_type: string;
    is_published: boolean;
    seo_title: string | null;
    seo_description: string | null;
  };
  website: WebsiteSnapshot['website'];
  sections: EditorSection[];
}

interface PageEditorProps {
  websiteId: string;
  pageId: string; // 'home' for homepage, UUID for custom pages
  onBack: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function PageEditor({ websiteId, pageId, onBack }: PageEditorProps) {
  const isHomepage = pageId === 'home';
  const supabase = createSupabaseBrowserClient();

  // State
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [websiteData, setWebsiteData] = useState<WebsiteSnapshot['website'] | null>(null);
  const [pageData, setPageData] = useState<PageSnapshot['page'] | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'edit' | 'ai' | 'seo'>('edit');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // Hooks
  const { isOnline } = useNetworkStatus();
  const { isDirty, checkDirty, markClean } = useDirtyState(sections);
  const backup = useLocalBackup<EditorSection[]>(`editor_${websiteId}_${pageId}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Selected section
  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedSectionId) ?? null,
    [sections, selectedSectionId]
  );

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadData = useCallback(async () => {
    setState('loading');
    try {
      if (isHomepage) {
        const { data: snapshot, error: rpcError } = await supabase.rpc(
          'get_website_editor_snapshot',
          { p_website_id: websiteId }
        );
        if (rpcError) throw rpcError;

        const snap = snapshot as WebsiteSnapshot;
        setWebsiteData(snap.website);
        setSections(snap.sections);
      } else {
        // Custom page — load from website_pages + website for theme
        const [pageResult, websiteResult] = await Promise.all([
          supabase
            .from('website_pages')
            .select('id, title, slug, page_type, is_published, seo_title, seo_description, sections')
            .eq('id', pageId)
            .single(),
          supabase
            .from('websites')
            .select('id, subdomain, status, theme, content, account_id')
            .eq('id', websiteId)
            .single(),
        ]);

        if (pageResult.error) throw pageResult.error;
        if (websiteResult.error) throw websiteResult.error;

        const page = pageResult.data;
        const website = websiteResult.data;

        setWebsiteData({
          id: website.id,
          subdomain: website.subdomain,
          status: website.status,
          revision: 0,
          theme: website.theme as WebsiteData['theme'],
          content: (website.content as Record<string, unknown>) ?? {},
          account_id: website.account_id,
        });

        setPageData({
          id: page.id,
          title: page.title,
          slug: page.slug,
          page_type: page.page_type,
          is_published: page.is_published,
          seo_title: page.seo_title,
          seo_description: page.seo_description,
        });
        setSeoTitle(page.seo_title ?? '');
        setSeoDescription(page.seo_description ?? '');

        // Normalize page sections (PageSection has `type` not `section_type`)
        const rawSections = (page.sections as Array<Record<string, unknown>>) ?? [];
        const normalized: EditorSection[] = rawSections.map((s, i) => ({
          id: (s.id as string) ?? crypto.randomUUID(),
          sectionType: (s.type as string) ?? (s.section_type as string) ?? 'text',
          variant: (s.variant as string) ?? null,
          displayOrder: i,
          isEnabled: s.is_enabled !== false,
          config: (s.config as Record<string, unknown>) ?? {},
          content: (s.content as Record<string, unknown>) ?? {},
        }));
        setSections(normalized);
      }

      setState('ready');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, [websiteId, pageId, isHomepage, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check for local backup on mount
  useEffect(() => {
    if (state !== 'ready') return;
    const backupData = backup.restore();
    if (backupData && backupData.length > 0) {
      const backupTime = backup.getTimestamp();
      if (backupTime && Date.now() - backupTime < 24 * 60 * 60 * 1000) {
        // Backup is less than 24h old — offer to restore
        // For now, silently prefer server data. Phase 2 will add UI for this.
      }
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // Save
  // ============================================================================

  const saveSections = useCallback(
    async (sectionsToSave: EditorSection[]) => {
      if (isHomepage) {
        // Update each section individually in website_sections
        const updates = sectionsToSave.map((s, i) =>
          supabase
            .from('website_sections')
            .update({
              display_order: i,
              is_enabled: s.isEnabled,
              content: s.content,
              config: s.config,
              variant: s.variant,
            })
            .eq('id', s.id)
            .eq('website_id', websiteId)
        );
        await Promise.all(updates);
      } else {
        // Update page sections as JSONB array
        const pageSections = sectionsToSave.map((s) => ({
          id: s.id,
          type: s.sectionType,
          variant: s.variant,
          content: s.content,
          config: s.config,
          is_enabled: s.isEnabled,
        }));
        const pageUpdate: Record<string, unknown> = { sections: pageSections };
        if (seoTitle) pageUpdate.seo_title = seoTitle;
        if (seoDescription) pageUpdate.seo_description = seoDescription;
        const { error: updateError } = await supabase
          .from('website_pages')
          .update(pageUpdate)
          .eq('id', pageId);
        if (updateError) throw updateError;
      }

      markClean(sectionsToSave);
      backup.clear();
    },
    [isHomepage, websiteId, pageId, supabase, markClean, backup]
  );

  // Autosave
  const { status: autosaveStatus, saveNow } = useAutosave({
    data: sections,
    onSave: saveSections,
    debounceMs: 2000,
    enabled: state === 'ready' && isDirty && isOnline,
  });

  // Local backup on changes
  useEffect(() => {
    if (isDirty && sections.length > 0) {
      backup.save(sections);
    }
  }, [sections, isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // Section mutations
  // ============================================================================

  const updateSections = useCallback(
    (newSections: EditorSection[]) => {
      setSections(newSections);
      checkDirty(newSections);
    },
    [checkDirty]
  );

  const handleMoveUp = useCallback(
    (id: string) => updateSections(moveSection(sections, id, 'up')),
    [sections, updateSections]
  );

  const handleMoveDown = useCallback(
    (id: string) => updateSections(moveSection(sections, id, 'down')),
    [sections, updateSections]
  );

  const handleDuplicate = useCallback(
    (id: string) => updateSections(duplicateSection(sections, id)),
    [sections, updateSections]
  );

  const handleToggleVisibility = useCallback(
    (id: string) => updateSections(toggleSectionVisibility(sections, id)),
    [sections, updateSections]
  );

  const handleDelete = useCallback(
    (id: string) => {
      updateSections(removeSectionAction(sections, id));
      if (selectedSectionId === id) {
        setSelectedSectionId(null);
      }
    },
    [sections, selectedSectionId, updateSections]
  );

  const handleAddSection = useCallback(
    (sectionType: SectionTypeValue) => {
      const newSections = addSection(sections, sectionType);
      updateSections(newSections);
      // Select the newly added section (last one)
      const newSection = newSections[newSections.length - 1];
      if (newSection) {
        setSelectedSectionId(newSection.id);
        setPanelTab('edit');
      }
    },
    [sections, updateSections]
  );

  const handleFieldChange = useCallback(
    (field: string, value: unknown) => {
      if (!selectedSectionId) return;
      updateSections(updateSectionContent(sections, selectedSectionId, { [field]: value }));
    },
    [sections, selectedSectionId, updateSections]
  );

  const handleSeoChange = useCallback(
    (field: 'seoTitle' | 'seoDescription', value: string) => {
      if (field === 'seoTitle') setSeoTitle(value);
      else setSeoDescription(value);
      checkDirty(sections); // Mark dirty
    },
    [sections, checkDirty]
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedSectionId(id);
    setPanelTab('edit');
  }, []);

  // AI tool action handler — applies tool calls from studio-chat to sections
  const handleToolAction = useCallback(
    (toolName: string, args: Record<string, unknown>) => {
      switch (toolName) {
        case 'rewrite_section':
        case 'translate_section':
          if (args.sectionId && args.content) {
            updateSections(
              updateSectionContent(sections, args.sectionId as string, args.content as Record<string, unknown>)
            );
          } else if (args.sectionId && args.translatedContent) {
            updateSections(
              updateSectionContent(sections, args.sectionId as string, args.translatedContent as Record<string, unknown>)
            );
          }
          break;
        case 'create_section':
          updateSections(
            addSection(
              sections,
              args.sectionType as string,
              args.position as { relativeTo?: string; placement?: 'before' | 'after' } | undefined
            )
          );
          break;
        case 'remove_section':
          if (args.sectionId) {
            updateSections(removeSectionAction(sections, args.sectionId as string));
            if (selectedSectionId === args.sectionId) setSelectedSectionId(null);
          }
          break;
        case 'reorder_sections':
          if (args.order && Array.isArray(args.order)) {
            const sectionMap = new Map(sections.map((s) => [s.id, s]));
            const reordered: EditorSection[] = [];
            for (const id of args.order as string[]) {
              const s = sectionMap.get(id);
              if (s) { reordered.push(s); sectionMap.delete(id); }
            }
            for (const s of sectionMap.values()) reordered.push(s);
            updateSections(reordered.map((s, i) => ({ ...s, displayOrder: i })));
          }
          break;
        case 'toggle_visibility':
          if (args.sectionId) {
            updateSections(toggleSectionVisibility(sections, args.sectionId as string));
          }
          break;
        case 'duplicate_section':
          if (args.sectionId) {
            updateSections(duplicateSection(sections, args.sectionId as string));
          }
          break;
        case 'update_seo':
          if (args.sectionId) {
            const patch: Record<string, unknown> = {};
            if (args.seoTitle) patch.seo_title = args.seoTitle;
            if (args.seoDescription) patch.seo_description = args.seoDescription;
            updateSections(updateSectionContent(sections, args.sectionId as string, patch));
          }
          break;
        case 'suggest_images':
          if (args.sectionId && args.images) {
            const images = args.images as Array<{ url: string; alt: string }>;
            const patch: Record<string, unknown> = images.length === 1
              ? { image: images[0].url, imageAlt: images[0].alt }
              : { images };
            updateSections(updateSectionContent(sections, args.sectionId as string, patch));
          }
          break;
        case 'generate_content':
          // Content generation creates a new section with the generated content
          updateSections(addSection(sections, args.sectionType as string));
          break;
      }
    },
    [sections, selectedSectionId, updateSections]
  );

  // ============================================================================
  // DnD
  // ============================================================================

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newSections = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
        ...s,
        displayOrder: i,
      }));
      updateSections(newSections);
    },
    [sections, updateSections]
  );

  // ============================================================================
  // Save / Publish
  // ============================================================================

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveSections(sections);
      if (isHomepage) {
        await supabase.rpc('create_website_draft', {
          p_website_id: websiteId,
          p_description: 'Saved from Studio editor',
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [sections, saveSections, isHomepage, websiteId, supabase]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      await saveSections(sections);

      if (isHomepage) {
        const { data: draft } = await supabase.rpc('create_website_draft', {
          p_website_id: websiteId,
          p_description: 'Published from Studio editor',
        });
        const versionId = (draft as Record<string, unknown> | null)?.version_id as string | undefined;
        if (versionId) {
          await supabase.rpc('publish_website_version', {
            p_website_id: websiteId,
            p_version_id: versionId,
          });
        }
      } else {
        await supabase
          .from('website_pages')
          .update({ is_published: true })
          .eq('id', pageId);
      }

      await loadData();
    } finally {
      setIsPublishing(false);
    }
  }, [sections, saveSections, isHomepage, websiteId, pageId, supabase, loadData]);

  const handlePreview = useCallback(() => {
    if (!websiteData?.subdomain) return;
    if (isHomepage) {
      window.open(`https://${websiteData.subdomain}.bukeer.com`, '_blank');
    } else if (pageData?.slug) {
      window.open(`https://${websiteData.subdomain}.bukeer.com/${pageData.slug}`, '_blank');
    }
  }, [websiteData, pageData, isHomepage]);

  // Keyboard shortcuts
  useCommonShortcuts({
    onSave: saveNow,
  });

  // ============================================================================
  // Build website data for render pipeline
  // ============================================================================

  const websiteForRender = useMemo((): WebsiteData | null => {
    if (!websiteData) return null;

    const raw = websiteData.content || {};
    const getString = (val: unknown, fallback = '') =>
      typeof val === 'string' ? val : fallback;
    const getRecord = <T extends Record<string, unknown>>(val: unknown, fallback: T): T =>
      val && typeof val === 'object' ? (val as T) : fallback;

    const seo = getRecord(raw.seo as Record<string, unknown> | undefined, { title: '', description: '', keywords: '' });
    const contact = getRecord(raw.contact as Record<string, unknown> | undefined, { email: '', phone: '', address: '' });
    const social = getRecord(raw.social as Record<string, unknown> | undefined, {});

    const sectionsList: WebsiteSection[] = sections.map((s) => ({
      id: s.id,
      section_type: s.sectionType,
      variant: s.variant ?? '',
      display_order: s.displayOrder,
      is_enabled: s.isEnabled,
      config: s.config,
      content: s.content,
    }));

    return {
      id: websiteData.id,
      subdomain: websiteData.subdomain,
      status: websiteData.status === 'published' ? 'published' : 'draft',
      theme: websiteData.theme,
      content: {
        siteName: getString(raw.siteName as unknown, getString(raw.site_name as unknown)),
        tagline: getString(raw.tagline as unknown),
        logo: getString(raw.logo as unknown),
        seo: { title: getString(seo.title), description: getString(seo.description), keywords: getString(seo.keywords) },
        contact: { email: getString(contact.email), phone: getString(contact.phone), address: getString(contact.address) },
        social,
      },
      account_id: websiteData.account_id,
      custom_domain: null,
      template_id: '',
      featured_products: { destinations: [], hotels: [], activities: [], transfers: [] },
      sections: sectionsList,
    };
  }, [websiteData, sections]);

  // ============================================================================
  // Render
  // ============================================================================

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <div className="text-center text-destructive">
          <p className="font-medium">Error loading editor</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to pages
        </Button>
      </div>
    );
  }

  if (!websiteForRender) return null;

  const pageTitle = isHomepage
    ? 'Homepage'
    : pageData?.title ?? 'Page';

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* Top toolbar */}
        <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
          {/* Left: back + page title */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium text-sm">{pageTitle}</span>
            <Badge variant={websiteData?.status === 'published' ? 'default' : 'secondary'}>
              {websiteData?.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
            {!isOnline && (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="w-3 h-3" />
                Offline
              </Badge>
            )}
            {autosaveStatus === 'saved' && (
              <span className="text-xs text-green-600">&#10003; Saved</span>
            )}
            {autosaveStatus === 'saving' && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
            {autosaveStatus === 'error' && (
              <span className="text-xs text-destructive">Save failed</span>
            )}
          </div>

          {/* Center: viewport switcher */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['desktop', 'tablet', 'mobile'] as ViewportSize[]).map((vp) => (
              <button
                key={vp}
                onClick={() => setViewport(vp)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewport === vp
                    ? 'bg-background shadow-sm'
                    : 'hover:bg-background/50'
                }`}
              >
                {vp === 'desktop' ? '🖥️' : vp === 'tablet' ? '📱' : '📲'}
              </button>
            ))}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving || !isDirty}
              onClick={handleSaveDraft}
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              size="sm"
              disabled={isPublishing}
              onClick={handlePublish}
            >
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>

        {/* Main content: preview (65%) + panel (35%) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Preview pane */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-[65] min-w-0 bg-muted/30 overflow-auto flex flex-col">
              <CanvasFrame websiteId={websiteId} viewport={viewport}>
                <M3ThemeProvider
                  initialTheme={
                    websiteData?.theme?.tokens
                      ? { tokens: websiteData.theme.tokens, profile: websiteData.theme.profile } as any
                      : undefined
                  }
                >
                  <SortableContext
                    items={sections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sections.map((section, index) => {
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
                        <SectionPreview
                          key={section.id}
                          section={section}
                          isSelected={selectedSectionId === section.id}
                          isFirst={index === 0}
                          isLast={index === sections.length - 1}
                          onSelect={handleSelect}
                          onMoveUp={handleMoveUp}
                          onMoveDown={handleMoveDown}
                          onDuplicate={handleDuplicate}
                          onToggleVisibility={handleToggleVisibility}
                          onDelete={handleDelete}
                        >
                          {result.element}
                        </SectionPreview>
                      );
                    })}
                  </SortableContext>
                </M3ThemeProvider>

                {/* Add section button at bottom */}
                <div className="flex justify-center py-8">
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    onClick={() => setPickerOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Add Section
                  </Button>
                </div>
              </CanvasFrame>
            </div>
          </DndContext>

          {/* Right panel */}
          <div className="flex-[35] min-w-[320px] max-w-[480px] border-l bg-background flex flex-col">
            <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as 'edit' | 'ai' | 'seo')}>
              <div className="border-b px-4">
                <TabsList className="w-full justify-start bg-transparent h-11 gap-4">
                  <TabsTrigger
                    value="edit"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                  >
                    Edit
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                  >
                    AI
                  </TabsTrigger>
                  <TabsTrigger
                    value="seo"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3"
                  >
                    SEO
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="edit" className="flex-1 mt-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {selectedSection ? (
                    <SectionForm
                      sectionType={selectedSection.sectionType}
                      content={selectedSection.content}
                      onChange={handleFieldChange}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium">No section selected</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click on a section in the preview to edit it.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-2"
                        onClick={() => setPickerOpen(true)}
                      >
                        <Plus className="w-3 h-3" />
                        Add Section
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="ai" className="flex-1 mt-0 overflow-hidden">
                <StudioChat
                  websiteId={websiteId}
                  pageId={pageId}
                  sections={sections}
                  selectedSectionId={selectedSectionId}
                  onToolAction={handleToolAction}
                />
              </TabsContent>

              <TabsContent value="seo" className="flex-1 mt-0 overflow-hidden">
                <SeoPanel
                  websiteId={websiteId}
                  pageId={pageId}
                  pageTitle={isHomepage ? 'Homepage' : pageData?.title}
                  sections={sections}
                  seoTitle={seoTitle}
                  seoDescription={seoDescription}
                  onSeoChange={handleSeoChange}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Section picker modal */}
        <SectionPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAddSection}
        />
      </div>
    </TooltipProvider>
  );
}

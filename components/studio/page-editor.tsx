'use client';

import { useState, useCallback, useEffect, useMemo, SyntheticEvent } from 'react';
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
import type { ThemeInput } from '@/lib/theme/m3-theme-provider';
import { renderSectionWithResult } from '@/lib/sections/render-section';
import { SectionPreview } from './section-preview';
import { SectionForm } from './section-form';
import { SectionPicker } from './section-picker';
import { StudioChat } from './studio-chat';
import { SeoPanel } from './seo-panel';
import { CanvasFrame } from '@/components/editor/canvas-frame';
import { useAutosave } from '@/lib/hooks/use-autosave';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { StudioButton, StudioTopbar, StudioTabs, StudioBadge, StudioBadgeStatus } from '@/components/studio/ui/primitives';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import {
  Plus,
  ArrowLeft,
  WifiOff,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Save,
  Upload,
  Pencil,
  Moon,
  Sun,
  RefreshCw,
} from 'lucide-react';
import type { WebsiteData, WebsiteSection } from '@bukeer/website-contract';
import type { SectionTypeValue } from '@bukeer/website-contract';

// ============================================================================
// Content normalization for page sections (DB shape → schema shape)
// ============================================================================

function normalizePageSectionContent(
  sectionType: string,
  content: Record<string, unknown>
): Record<string, unknown> {
  const c = { ...content };

  // rich_text / text / text_image: DB has `body`, schema expects `text`
  if (['rich_text', 'text', 'text_image'].includes(sectionType)) {
    if (c.body && !c.text) {
      c.text = c.body;
      delete c.body;
    }
  }

  // features_grid: ensure `items` is an array
  if (['features', 'features_grid'].includes(sectionType)) {
    if (!Array.isArray(c.items)) {
      c.items = c.items ? [c.items] : [];
    }
  }

  // gallery: ensure `images` is an array
  if (['gallery', 'gallery_grid'].includes(sectionType)) {
    if (!Array.isArray(c.images)) {
      c.images = c.images ? [c.images] : [];
    }
  }

  return c;
}

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

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type PreviewMode = 'edit' | 'exact';

const EXACT_PREVIEW_WIDTHS: Partial<Record<ViewportSize, string>> = {
  desktop: '1440px',
  tablet: '768px',
  mobile: '375px',
};

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
  const [previewMode, setPreviewMode] = useState<PreviewMode>('edit');
  const [exactPreviewRefreshKey, setExactPreviewRefreshKey] = useState(0);
  const [isSyncingExactPreview, setIsSyncingExactPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'edit' | 'ai' | 'seo'>('edit');
  const [studioMode, setStudioMode] = useState<'light' | 'dark'>('light');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoDirty, setSeoDirty] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (!actionToast) return;
    const t = setTimeout(() => setActionToast(null), 2000);
    return () => clearTimeout(t);
  }, [actionToast]);

  // Hooks
  const { isOnline } = useNetworkStatus();
  const { isDirty, checkDirty, markClean } = useDirtyState(sections);
  const isEditorDirty = isDirty || seoDirty;
  const backup = useLocalBackup<EditorSection[]>(`editor_${websiteId}_${pageId}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Selected section
  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedSectionId) ?? null,
    [sections, selectedSectionId]
  );

  const exactPreviewUrl = useMemo(() => {
    if (!websiteData?.subdomain) return null;

    const slugPath = !isHomepage && pageData?.slug
      ? `/${pageData.slug.replace(/^\/+/, '')}`
      : '';

    const query = `studio_preview=1&mode=exact&r=${exactPreviewRefreshKey}`;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/site/${websiteData.subdomain}${slugPath}?${query}`;
    }

    return `/site/${websiteData.subdomain}${slugPath}?${query}`;
  }, [websiteData?.subdomain, isHomepage, pageData?.slug, exactPreviewRefreshKey]);

  const handleExactPreviewLoad = useCallback((event: SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframe = event.currentTarget;
      const doc = iframe.contentDocument;
      if (!doc?.head || doc.getElementById('studio-exact-preview-scrollbar-reset')) return;

      const style = doc.createElement('style');
      style.id = 'studio-exact-preview-scrollbar-reset';
      style.textContent = `
        html, body {
          scrollbar-width: none;
        }
        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
      `;
      doc.head.appendChild(style);
    } catch {
      // Ignore cross-origin or iframe lifecycle errors.
    }
  }, []);

  const applyStudioMode = useCallback((mode: 'light' | 'dark') => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.style.colorScheme = mode;

    try {
      localStorage.setItem('studio-ui-mode', mode);
    } catch {
      // Ignore storage write failures.
    }

    setStudioMode(mode);
  }, []);

  const toggleStudioMode = useCallback(() => {
    applyStudioMode(studioMode === 'dark' ? 'light' : 'dark');
  }, [applyStudioMode, studioMode]);

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadData = useCallback(async () => {
    setState('loading');
    try {
      if (isHomepage) {
        const [{ data: snapshot, error: rpcError }, { data: websiteRow }] = await Promise.all([
          supabase.rpc('get_website_editor_snapshot', { p_website_id: websiteId }),
          supabase
            .from('websites')
            .select('content')
            .eq('id', websiteId)
            .single(),
        ]);
        if (rpcError) throw rpcError;

        const snap = snapshot as WebsiteSnapshot;
        setWebsiteData(snap.website);
        setSections(snap.sections);

        const homepageContent =
          (websiteRow?.content as Record<string, unknown> | null) ??
          (snap.website.content as Record<string, unknown>) ??
          {};
        const homepageSeo =
          homepageContent.seo && typeof homepageContent.seo === 'object'
            ? (homepageContent.seo as Record<string, unknown>)
            : {};
        setSeoTitle(typeof homepageSeo.title === 'string' ? homepageSeo.title : '');
        setSeoDescription(typeof homepageSeo.description === 'string' ? homepageSeo.description : '');
        setSeoDirty(false);
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
        setSeoDirty(false);

        // Normalize page sections (PageSection has `type` not `section_type`)
        const rawSections = (page.sections as Array<Record<string, unknown>>) ?? [];
        const normalized: EditorSection[] = rawSections.map((s, i) => {
          const sectionType = (s.type as string) ?? (s.section_type as string) ?? 'text';
          const rawContent = (s.content as Record<string, unknown>) ?? {};
          return {
            id: (s.id as string) ?? crypto.randomUUID(),
            sectionType,
            variant: (s.variant as string) ?? null,
            displayOrder: i,
            isEnabled: s.is_enabled !== false,
            config: (s.config as Record<string, unknown>) ?? {},
            content: normalizePageSectionContent(sectionType, rawContent),
          };
        });
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

  // Studio admin/editor color mode: explicit preference, default to light.
  useEffect(() => {
    let mode: 'light' | 'dark' = 'light';
    try {
      const savedMode = localStorage.getItem('studio-ui-mode');
      if (savedMode === 'light' || savedMode === 'dark') {
        mode = savedMode;
      }
    } catch {
      // Keep light mode fallback.
    }

    applyStudioMode(mode);
  }, [applyStudioMode]);

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

        // Persist homepage SEO values into websites.content.seo.
        const currentContent = (websiteData?.content as Record<string, unknown>) ?? {};
        const currentSeo =
          currentContent.seo && typeof currentContent.seo === 'object'
            ? (currentContent.seo as Record<string, unknown>)
            : {};

        const { error: websiteUpdateError } = await supabase
          .from('websites')
          .update({
            content: {
              ...currentContent,
              seo: {
                ...currentSeo,
                title: seoTitle,
                description: seoDescription,
              },
            },
          })
          .eq('id', websiteId);
        if (websiteUpdateError) throw websiteUpdateError;
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
      setSeoDirty(false);
      backup.clear();
    },
    [isHomepage, websiteId, pageId, supabase, markClean, backup, websiteData, seoTitle, seoDescription]
  );

  // Autosave
  const { status: autosaveStatus, saveNow } = useAutosave({
    data: { sections, seoTitle, seoDescription },
    onSave: async (payload) => saveSections(payload.sections),
    debounceMs: 2000,
    enabled: state === 'ready' && isEditorDirty && isOnline,
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
    (id: string) => {
      updateSections(moveSection(sections, id, 'up'));
      setActionToast('Section moved up');
    },
    [sections, updateSections]
  );

  const handleMoveDown = useCallback(
    (id: string) => {
      updateSections(moveSection(sections, id, 'down'));
      setActionToast('Section moved down');
    },
    [sections, updateSections]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const newSections = duplicateSection(sections, id);
      updateSections(newSections);
      // Auto-select the duplicated section (inserted right after the original)
      const idx = newSections.findIndex((s) => s.id === id);
      if (idx !== -1 && idx + 1 < newSections.length) {
        setSelectedSectionId(newSections[idx + 1].id);
        setPanelTab('edit');
      }
      setActionToast('Section duplicated');
    },
    [sections, updateSections]
  );

  const handleToggleVisibility = useCallback(
    (id: string) => updateSections(toggleSectionVisibility(sections, id)),
    [sections, updateSections]
  );

  const handleDeleteRequest = useCallback(
    (id: string) => setDeleteTarget(id),
    []
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    updateSections(removeSectionAction(sections, deleteTarget));
    if (selectedSectionId === deleteTarget) {
      setSelectedSectionId(null);
    }
    setDeleteTarget(null);
    setActionToast('Section deleted');
  }, [deleteTarget, sections, selectedSectionId, updateSections]);

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
      setSeoDirty(true);
    },
    []
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

  const refreshExactPreview = useCallback(() => {
    setExactPreviewRefreshKey((k) => k + 1);
  }, []);

  const handleTogglePreviewMode = useCallback(() => {
    setPreviewMode((current) => {
      const next = current === 'edit' ? 'exact' : 'edit';
      if (next === 'exact' && isEditorDirty) {
        setActionToast('Exact preview muestra contenido guardado. Guarda para sincronizar cambios.');
      }
      return next;
    });
  }, [isEditorDirty]);

  const handleSyncExactPreview = useCallback(async () => {
    setIsSyncingExactPreview(true);
    try {
      await saveNow();
      setActionToast('Cambios sincronizados en exact preview');
      refreshExactPreview();
    } finally {
      setIsSyncingExactPreview(false);
    }
  }, [saveNow, refreshExactPreview]);

  // Keyboard shortcuts
  useCommonShortcuts({
    onSave: saveNow,
  });

  // Full-screen: hide parent dashboard layout (sidebar, nav tabs, header)
  useEffect(() => {
    document.body.classList.add('studio-editor-fullscreen');
    return () => {
      document.body.classList.remove('studio-editor-fullscreen');
    };
  }, []);

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
      featured_products: { destinations: [], hotels: [], activities: [], transfers: [], packages: [] },
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

  const viewportIcons: Record<ViewportSize, React.ReactNode> = {
    desktop: <Monitor className="w-4 h-4" />,
    tablet: <Tablet className="w-4 h-4" />,
    mobile: <Smartphone className="w-4 h-4" />,
  };

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-[100] flex flex-col studio-shell">
        <StudioTopbar
          left={(
            <>
              <StudioButton variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </StudioButton>
              <span className="font-semibold text-sm text-[var(--studio-text)]">{pageTitle}</span>
              <StudioBadgeStatus status={websiteData?.status === 'published' ? 'published' : 'draft'} />
              {!isOnline ? (
                <StudioBadge tone="danger" className="inline-flex items-center gap-1 uppercase tracking-wide text-[10px]">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </StudioBadge>
              ) : null}
              {autosaveStatus === 'saved' ? (
                <StudioBadge tone="success" className="inline-flex items-center gap-1">
                  <Save className="w-3 h-3" />
                  Saved
                </StudioBadge>
              ) : null}
              {autosaveStatus === 'saving' ? (
                <StudioBadge tone="info">Saving...</StudioBadge>
              ) : null}
              {autosaveStatus === 'error' ? (
                <StudioBadge tone="danger">Save failed</StudioBadge>
              ) : null}
            </>
          )}
          center={(
            <div className="flex items-center gap-1 bg-[var(--studio-panel)] rounded-full p-1 border border-[var(--studio-border)]">
              {(['desktop', 'tablet', 'mobile'] as ViewportSize[]).map((vp) => (
                <button
                  key={vp}
                  onClick={() => setViewport(vp)}
                  className={`p-1.5 rounded-full transition-all ${
                    viewport === vp
                      ? 'bg-[var(--studio-bg-elevated)] text-[var(--studio-text)] shadow-sm border border-[var(--studio-border)]'
                      : 'text-[var(--studio-text-muted)]'
                  }`}
                  title={vp.charAt(0).toUpperCase() + vp.slice(1)}
                  type="button"
                >
                  {viewportIcons[vp]}
                </button>
              ))}
            </div>
          )}
          right={(
            <>
              <StudioButton variant="ghost" size="sm" onClick={handlePreview}>
                <Eye className="w-3.5 h-3.5" />
                Preview
              </StudioButton>
              <StudioButton
                variant={previewMode === 'exact' ? 'outline' : 'ghost'}
                size="sm"
                onClick={handleTogglePreviewMode}
              >
                {previewMode === 'exact' ? 'Edit' : 'Exact'}
              </StudioButton>
              {previewMode === 'exact' ? (
                <>
                  <StudioButton variant="ghost" size="sm" onClick={refreshExactPreview}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </StudioButton>
                  <StudioButton
                    variant="outline"
                    size="sm"
                    disabled={isSyncingExactPreview || !isEditorDirty}
                    onClick={handleSyncExactPreview}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSyncingExactPreview ? 'Syncing...' : 'Sync + Refresh'}
                  </StudioButton>
                </>
              ) : null}
              <StudioButton variant="ghost" size="sm" onClick={toggleStudioMode}>
                {studioMode === 'dark' ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Moon className="w-3.5 h-3.5" />
                )}
                {studioMode === 'dark' ? 'Light' : 'Dark'}
              </StudioButton>
              <StudioButton
                variant="outline"
                size="sm"
                disabled={isSaving || !isEditorDirty}
                onClick={handleSaveDraft}
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </StudioButton>
              <StudioButton size="sm" disabled={isPublishing} onClick={handlePublish}>
                <Upload className="w-3.5 h-3.5" />
                {isPublishing ? 'Publishing...' : 'Publish'}
              </StudioButton>
            </>
          )}
        />

        {/* Main content: preview (65%) + panel (35%) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Preview pane */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-[65] min-w-0 bg-[color-mix(in_srgb,var(--studio-panel)_46%,transparent)] overflow-auto flex flex-col">
              <CanvasFrame
                websiteId={websiteId}
                viewport={viewport}
                widths={previewMode === 'exact' ? EXACT_PREVIEW_WIDTHS : undefined}
                fitToContainer={previewMode !== 'exact'}
              >
                {previewMode === 'exact' ? (
                  <div className="h-full min-h-[calc(100vh-170px)] bg-background">
                    <iframe
                      key={exactPreviewUrl ?? 'empty-preview'}
                      src={exactPreviewUrl ?? 'about:blank'}
                      title="Exact site preview"
                      onLoad={handleExactPreviewLoad}
                      className="block w-full h-full min-h-[calc(100vh-170px)] border-0"
                    />
                  </div>
                ) : (
                  <>
                    <M3ThemeProvider
                      initialTheme={
                        websiteData?.theme?.tokens
                          ? { tokens: websiteData.theme.tokens, profile: websiteData.theme.profile } as ThemeInput
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

                          let result: ReturnType<typeof renderSectionWithResult>;
                          try {
                            result = renderSectionWithResult({
                              section: sectionForRender,
                              website: websiteForRender,
                            });
                          } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            console.warn(
                              `[PageEditor] Failed to render section ${section.sectionType} (${section.id}): ${message}`
                            );
                            result = {
                              element: (
                                <div className="section-padding bg-red-50 border border-red-300 rounded-lg mx-4 my-2">
                                  <div className="container py-8">
                                    <p className="text-red-700 font-medium mb-2">
                                      Error en sección: <code className="bg-red-100 px-2 py-1 rounded">{section.sectionType}</code>
                                    </p>
                                    <p className="text-red-600 text-sm">{message}</p>
                                  </div>
                                </div>
                              ),
                            };
                          }

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
                              onDelete={handleDeleteRequest}
                            >
                              {result.element}
                            </SectionPreview>
                          );
                        })}
                      </SortableContext>
                    </M3ThemeProvider>

                    {/* Add section divider — modern dashed line with button */}
                    <div className="flex items-center justify-center py-10 px-8">
                      <div className="flex-1 border-t border-dashed border-[var(--studio-border)]" />
                      <StudioButton
                        variant="outline"
                        size="sm"
                        className="mx-4 gap-2 rounded-full border-dashed"
                        onClick={() => setPickerOpen(true)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Section
                      </StudioButton>
                      <div className="flex-1 border-t border-dashed border-[var(--studio-border)]" />
                    </div>
                  </>
                )}
              </CanvasFrame>
            </div>
          </DndContext>

          {/* Right panel */}
          <div className="flex-[35] min-w-[320px] max-w-[480px] border-l border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] flex flex-col">
            <div className="p-2 border-b border-[var(--studio-border)]">
              <StudioTabs
                value={panelTab}
                onChange={(value) => setPanelTab(value as 'edit' | 'ai' | 'seo')}
                options={[
                  { id: 'edit', label: 'Edit' },
                  { id: 'ai', label: 'AI' },
                  { id: 'seo', label: 'SEO' },
                ]}
              />
            </div>

            {panelTab === 'edit' ? (
              <ScrollArea className="h-full">
                {selectedSection ? (
                  <SectionForm
                    sectionType={selectedSection.sectionType}
                    content={selectedSection.content}
                    onChange={handleFieldChange}
                  />
                ) : (
                  previewMode === 'exact' ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-[color-mix(in_srgb,var(--studio-primary)_14%,transparent)] flex items-center justify-center mb-5">
                        <Eye className="w-6 h-6 text-[var(--studio-primary)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--studio-text)]">Exact preview mode</p>
                      <p className="text-xs text-[var(--studio-text-muted)] mt-1.5 max-w-[260px]">
                        Section selection and drag-reorder are disabled in Exact mode. Switch to Edit mode to modify sections.
                      </p>
                      <StudioButton
                        variant="outline"
                        size="sm"
                        className="mt-5 gap-2 rounded-full"
                        onClick={() => setPreviewMode('edit')}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Switch to Edit mode
                      </StudioButton>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-[color-mix(in_srgb,var(--studio-primary)_14%,transparent)] flex items-center justify-center mb-5">
                        <Pencil className="w-6 h-6 text-[var(--studio-primary)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--studio-text)]">No section selected</p>
                      <p className="text-xs text-[var(--studio-text-muted)] mt-1.5 max-w-[220px]">
                        Click on a section in the preview to start editing its content.
                      </p>
                      <StudioButton
                        variant="outline"
                        size="sm"
                        className="mt-5 gap-2 rounded-full"
                        onClick={() => setPickerOpen(true)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Section
                      </StudioButton>
                    </div>
                  )
                )}
              </ScrollArea>
            ) : null}

            {panelTab === 'ai' ? (
              <div className="flex-1 overflow-hidden">
                <StudioChat
                  websiteId={websiteId}
                  pageId={pageId}
                  sections={sections}
                  selectedSectionId={selectedSectionId}
                  onToolAction={handleToolAction}
                />
              </div>
            ) : null}

            {panelTab === 'seo' ? (
              <div className="flex-1 overflow-hidden">
                <SeoPanel
                  websiteId={websiteId}
                  pageId={pageId}
                  pageTitle={isHomepage ? 'Homepage' : pageData?.title}
                  sections={sections}
                  seoTitle={seoTitle}
                  seoDescription={seoDescription}
                  onSeoChange={handleSeoChange}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Section picker modal */}
        <SectionPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAddSection}
        />

        {/* Delete confirmation */}
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Section"
          description="This section and its content will be permanently removed. This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />

        {/* Action toast */}
        {actionToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full bg-[var(--studio-surface-elevated)] border border-[var(--studio-border)] shadow-lg text-sm text-[var(--studio-text)] animate-in fade-in slide-in-from-bottom-2 duration-200">
            {actionToast}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

'use client';

import { useState, useCallback, useEffect, useMemo, useRef, SyntheticEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { SectionForm } from './section-form';
import { SectionPicker } from './section-picker';
import { SectionOverlay } from './section-overlay';
import { StudioChat } from './studio-chat';
import { SeoPanel } from './seo-panel';
import { LeftPanelShell, type LeftPanelMode } from './left-panel/panel-shell';
import { CanvasFrame } from '@/components/editor/canvas-frame';
import { useAutosave } from '@/lib/hooks/use-autosave';
import { useDirtyState } from '@/lib/hooks/use-dirty-state';
import { useCommonShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { useLocalBackup } from '@/lib/hooks/use-local-backup';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';
// Note: dnd-kit drag-to-iframe is not possible (React DnD can't cross iframe boundary).
// Elements panel uses click-to-add. Navigator uses move up/down buttons.
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
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Undo2,
  Redo2,
  LayoutGrid,
} from 'lucide-react';
import type { WebsiteData, WebsiteSection } from '@bukeer/website-contract';
import type { SectionTypeValue } from '@bukeer/website-contract';

// ============================================================================
// Hot Update: Patch iframe DOM for instant visual feedback
// ============================================================================

/**
 * Hot-update a single field in the iframe DOM for instant visual feedback.
 * Uses semantic HTML structure to locate the target element.
 * Returns true if patched successfully, false if iframe refresh needed.
 */
function patchIframeSectionField(
  doc: Document,
  sectionId: string,
  field: string,
  value: string
): boolean {
  const section = doc.querySelector(`section[data-section-id="${sectionId}"]`);
  if (!section) return false;

  // Image fields
  if (field === 'backgroundImage') {
    const img = section.querySelector('img') as HTMLImageElement | null;
    if (img) { img.src = value; return true; }
    const bgEl = section.querySelector('[style*="background-image"]') as HTMLElement | null;
    if (bgEl) { bgEl.style.backgroundImage = `url(${value})`; return true; }
    return false;
  }

  // Title/heading fields — try multiple strategies
  if (['title', 'heading'].includes(field)) {
    // Strategy 1: h1 or h2 tag
    const heading = section.querySelector('h1, h2');
    if (heading) { heading.textContent = value; return true; }
    // Strategy 2: Large text container (hero with TextGenerateEffect)
    const largeText = section.querySelector('[class*="text-4xl"], [class*="text-5xl"], [class*="text-6xl"], [class*="text-7xl"]');
    if (largeText) { largeText.textContent = value; return true; }
    return false;
  }

  // Subtitle/description — the paragraph after the heading
  if (['subtitle', 'description'].includes(field)) {
    // Strategy 1: p tag after heading
    const heading = section.querySelector('h1, h2');
    if (heading) {
      const next = heading.nextElementSibling;
      if (next?.tagName === 'P') { next.textContent = value; return true; }
    }
    // Strategy 2: any p with medium text class
    const p = section.querySelector('p[class*="text-lg"], p[class*="text-xl"], p[class*="text-base"], p[class*="opacity"]');
    if (p) { p.textContent = value; return true; }
    // Strategy 3: first p in the section
    const firstP = section.querySelector('p');
    if (firstP) { firstP.textContent = value; return true; }
    return false;
  }

  // CTA button text
  if (['ctaText', 'buttonText'].includes(field)) {
    const link = section.querySelector('a[href]');
    if (link) {
      // If link has a span child, update the span
      const span = link.querySelector('span');
      if (span) { span.textContent = value; return true; }
      link.textContent = value;
      return true;
    }
    return false;
  }

  return false;
}

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
  const [exactPreviewRefreshKey, setExactPreviewRefreshKey] = useState(0);
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
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('sections');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [iframeLoadCount, setIframeLoadCount] = useState(0);
  // Track original section IDs from DB (for homepage INSERT/DELETE detection)
  const dbSectionIdsRef = useRef<Set<string>>(new Set());
  // Undo/redo history
  const [history, setHistory] = useState<EditorSection[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const exactPreviewRef = useRef<HTMLIFrameElement | null>(null);

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
      exactPreviewRef.current = iframe;
      setIframeLoadCount((c) => c + 1);
      const doc = iframe.contentDocument;
      if (!doc?.head) return;

      if (!doc.getElementById('studio-exact-preview-scrollbar-reset')) {
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
          section[data-section-id] {
            cursor: pointer;
          }
          section[data-studio-selected="true"] {
            outline: 2px solid hsl(var(--primary));
            outline-offset: 2px;
            border-radius: 8px;
          }
        `;
        doc.head.appendChild(style);
      }

      const previousHandler = (doc as unknown as { __studioExactClickHandler?: EventListener })
        .__studioExactClickHandler;
      if (previousHandler) {
        doc.removeEventListener('click', previousHandler, true);
      }

      const clickHandler: EventListener = (rawEvent) => {
        const target = rawEvent.target as Node | null;
        // Use nodeType === 1 (ELEMENT_NODE) instead of instanceof Element
        // because iframe elements belong to a different JS realm where
        // `target instanceof Element` always returns false.
        if (!target || target.nodeType !== 1) return;
        const el = target as Element;

        if (el.closest('a[href]')) {
          rawEvent.preventDefault();
        }

        const sectionEl = el.closest('section[data-section-id], section[data-section-type], section[id]');
        if (!sectionEl) return;

        const directId = sectionEl.getAttribute('data-section-id');
        if (directId && sections.some((s) => s.id === directId)) {
          setSelectedSectionId(directId);
          setPanelTab('edit');
          return;
        }

        const type =
          sectionEl.getAttribute('data-section-type') ||
          sectionEl.getAttribute('id');
        if (!type) return;

        const match = sections.find((s) => s.sectionType === type);
        if (match) {
          setSelectedSectionId(match.id);
          setPanelTab('edit');
        }
      };

      (doc as unknown as { __studioExactClickHandler?: EventListener }).__studioExactClickHandler =
        clickHandler;
      doc.addEventListener('click', clickHandler, true);
    } catch {
      // Ignore cross-origin or iframe lifecycle errors.
    }
  }, [sections]);

  useEffect(() => {
    const doc = exactPreviewRef.current?.contentDocument;
    if (!doc) return;

    doc.querySelectorAll('section[data-studio-selected="true"]').forEach((el) => {
      el.removeAttribute('data-studio-selected');
    });

    if (!selectedSectionId) return;

    const exactSection = doc.querySelector(
      `section[data-section-id="${selectedSectionId}"]`
    );
    if (exactSection) {
      exactSection.setAttribute('data-studio-selected', 'true');
      return;
    }

    const selected = sections.find((s) => s.id === selectedSectionId);
    if (!selected) return;
    const fallbackSection = doc.querySelector(
      `section[data-section-type="${selected.sectionType}"]`
    );
    fallbackSection?.setAttribute('data-studio-selected', 'true');
  }, [selectedSectionId, sections]);

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
        // Track original DB IDs for INSERT/DELETE detection
        dbSectionIdsRef.current = new Set(snap.sections.map((s) => s.id));

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
        // Diff against original DB state to detect INSERTs/UPDATEs/DELETEs
        const currentIds = new Set(sectionsToSave.map((s) => s.id));
        const dbIds = dbSectionIdsRef.current;

        const toInsert = sectionsToSave.filter((s) => !dbIds.has(s.id));
        const toUpdate = sectionsToSave.filter((s) => dbIds.has(s.id));
        const toDelete = [...dbIds].filter((id) => !currentIds.has(id));

        const ops: PromiseLike<unknown>[] = [];

        // UPDATE existing sections
        for (const s of toUpdate) {
          const idx = sectionsToSave.indexOf(s);
          ops.push(
            supabase
              .from('website_sections')
              .update({
                display_order: idx,
                is_enabled: s.isEnabled,
                content: s.content,
                config: s.config,
                variant: s.variant,
              })
              .eq('id', s.id)
              .eq('website_id', websiteId)
              .then()
          );
        }

        // INSERT new sections
        for (const s of toInsert) {
          const idx = sectionsToSave.indexOf(s);
          ops.push(
            supabase
              .from('website_sections')
              .insert({
                id: s.id,
                website_id: websiteId,
                section_type: s.sectionType,
                variant: s.variant ?? '',
                display_order: idx,
                is_enabled: s.isEnabled,
                config: s.config,
                content: s.content,
              })
              .then()
          );
        }

        // DELETE removed sections
        for (const id of toDelete) {
          ops.push(
            supabase
              .from('website_sections')
              .delete()
              .eq('id', id)
              .eq('website_id', websiteId)
              .then()
          );
        }

        await Promise.all(ops);

        // Update the DB tracking ref so next save diffs correctly
        dbSectionIdsRef.current = new Set(sectionsToSave.map((s) => s.id));

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
      // Refresh preview after autosave persists the new order
      setTimeout(() => setExactPreviewRefreshKey((k) => k + 1), 3000);
    },
    [sections, updateSections]
  );

  const handleMoveDown = useCallback(
    (id: string) => {
      updateSections(moveSection(sections, id, 'down'));
      setActionToast('Section moved down');
      setTimeout(() => setExactPreviewRefreshKey((k) => k + 1), 3000);
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

      // Hot update: patch iframe DOM directly for instant visual feedback
      if (typeof value === 'string') {
        try {
          const doc = exactPreviewRef.current?.contentDocument;
          if (doc) {
            patchIframeSectionField(doc, selectedSectionId, field, value);
          }
        } catch {
          // Ignore — iframe will refresh on save anyway
        }
      }
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
  // Undo / Redo
  // ============================================================================

  const pushHistory = useCallback(
    (prev: EditorSection[]) => {
      setHistory((h) => {
        const newHistory = h.slice(0, historyIndex + 1);
        newHistory.push(prev);
        // Keep max 30 entries
        if (newHistory.length > 30) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex((i) => Math.min(i + 1, 29));
    },
    [historyIndex]
  );

  // Wrap updateSections to track history
  const originalUpdateSections = updateSections;
  const updateSectionsWithHistory = useCallback(
    (newSections: EditorSection[]) => {
      pushHistory(sections);
      originalUpdateSections(newSections);
    },
    [sections, pushHistory, originalUpdateSections]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex < 0 || history.length === 0) return;
    const prev = history[historyIndex];
    if (prev) {
      setHistoryIndex((i) => i - 1);
      originalUpdateSections(prev);
      setActionToast('Undo');
    }
  }, [history, historyIndex, originalUpdateSections]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    if (next) {
      setHistoryIndex((i) => i + 1);
      originalUpdateSections(next);
      setActionToast('Redo');
    }
  }, [history, historyIndex, originalUpdateSections]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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

  // Keyboard shortcuts
  useCommonShortcuts({
    onSave: saveNow,
  });

  // Panel toggle shortcut: backslash (\)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '\\' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        setPanelCollapsed((c) => !c);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
              <StudioButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  document.body.classList.remove('studio-editor-fullscreen');
                  onBack();
                }}
                title="Back to pages"
              >
                <ArrowLeft className="w-4 h-4" />
              </StudioButton>
              <StudioButton
                variant="ghost"
                size="sm"
                onClick={() => setLeftPanelCollapsed((c) => !c)}
                title="Toggle elements panel"
              >
                {leftPanelCollapsed ? (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                )}
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
            <div className="flex items-center gap-3">
              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5">
                <StudioButton
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyIndex < 0}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </StudioButton>
                <StudioButton
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </StudioButton>
              </div>

              {/* Viewport switcher */}
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
                    title={`${vp.charAt(0).toUpperCase() + vp.slice(1)} (${EXACT_PREVIEW_WIDTHS[vp] ?? 'auto'})`}
                    type="button"
                  >
                    {viewportIcons[vp]}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-[var(--studio-text-muted)] tabular-nums">
                {EXACT_PREVIEW_WIDTHS[viewport] ?? 'auto'}
              </span>
            </div>
          )}
          right={(
            <>
              <StudioButton variant="ghost" size="sm" onClick={handlePreview}>
                <Eye className="w-3.5 h-3.5" />
                Preview
              </StudioButton>
              <StudioButton
                variant="ghost"
                size="sm"
                onClick={() => setPanelCollapsed((c) => !c)}
                title="Toggle panel (\\)"
              >
                {panelCollapsed ? (
                  <PanelRightOpen className="w-3.5 h-3.5" />
                ) : (
                  <PanelRightClose className="w-3.5 h-3.5" />
                )}
              </StudioButton>
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

        {/* Main content: left panel + canvas + right panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel — Elements / Layers / Theme / AI */}
          <LeftPanelShell
            mode={leftPanelMode}
            onModeChange={setLeftPanelMode}
            collapsed={leftPanelCollapsed}
            onAddSection={handleAddSection}
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelectSection={handleSelect}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onToggleVisibility={handleToggleVisibility}
            onDuplicate={handleDuplicate}
            onDelete={handleDeleteRequest}
          />

          {/* Canvas (preview pane with overlay) */}
          <div className="flex-1 min-w-0 bg-[color-mix(in_srgb,var(--studio-panel)_46%,transparent)] overflow-auto flex flex-col">
            <CanvasFrame
              websiteId={websiteId}
              viewport={viewport}
              widths={EXACT_PREVIEW_WIDTHS}
              fitToContainer
            >
              <div className="relative bg-background" style={{ minHeight: 'calc(100vh - 120px)' }}>
                <iframe
                  ref={exactPreviewRef}
                  key={exactPreviewUrl ?? 'empty-preview'}
                  src={exactPreviewUrl ?? 'about:blank'}
                  title="Site preview"
                  onLoad={(e) => {
                    handleExactPreviewLoad(e);
                    // Auto-resize iframe to match content height — measure ONCE after load settles
                    try {
                      const iframe = e.currentTarget;
                      const doc = iframe.contentDocument;

                      // Inject CSS to fix viewport-height units inside the full-height iframe.
                      // Since the iframe is stretched to match content, 100vh = full page height
                      // instead of the visible viewport. Override h-screen/min-h-screen to 800px.
                      if (doc?.head) {
                        const style = doc.createElement('style');
                        style.textContent = `
                          .h-screen, .min-h-screen { --studio-vh: 800px; }
                          .h-screen { height: var(--studio-vh) !important; }
                          .min-h-screen { min-height: var(--studio-vh) !important; }
                        `;
                        doc.head.appendChild(style);
                      }

                      const measureAndResize = () => {
                        const d = iframe.contentDocument;
                        if (!d?.body) return;
                        // Temporarily shrink iframe to measure true content height
                        const prevHeight = iframe.style.height;
                        iframe.style.height = '1px';
                        const h = d.documentElement.scrollHeight;
                        iframe.style.height = h > 100 ? `${h}px` : prevHeight;
                      };
                      // Measure at increasing delays as images/fonts load
                      setTimeout(measureAndResize, 300);
                      setTimeout(measureAndResize, 1500);
                      setTimeout(measureAndResize, 4000);
                    } catch { /* cross-origin */ }
                  }}
                  className="block w-full border-0"
                  style={{ minHeight: 'calc(100vh - 120px)' }}
                />
                <SectionOverlay
                  iframeRef={exactPreviewRef}
                  sections={sections}
                  selectedSectionId={selectedSectionId}
                  onSelect={handleSelect}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onDuplicate={handleDuplicate}
                  onToggleVisibility={handleToggleVisibility}
                  onDelete={handleDeleteRequest}
                  onAddSection={() => setPickerOpen(true)}
                  iframeLoadKey={iframeLoadCount}
                />
              </div>
            </CanvasFrame>
          </div>

          {/* Right panel — Edit / AI / SEO */}
          <div className={`border-l border-[var(--studio-border)] bg-[var(--studio-bg-elevated)] flex flex-col transition-all duration-300 ${panelCollapsed ? 'w-0 min-w-0 max-w-0 overflow-hidden opacity-0 border-l-0' : 'w-[320px] min-w-[320px] max-w-[420px]'}`}>
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
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[color-mix(in_srgb,var(--studio-primary)_14%,transparent)] flex items-center justify-center mb-5">
                      <Pencil className="w-6 h-6 text-[var(--studio-primary)]" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--studio-text)]">No section selected</p>
                    <p className="text-xs text-[var(--studio-text-muted)] mt-1.5 max-w-[220px]">
                      Click a section in the preview, or pick one from the Elements panel.
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

        {/* Section picker modal (fallback for "Add Section" button) */}
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

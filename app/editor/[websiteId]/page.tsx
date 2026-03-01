'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { renderSectionWithResult } from '@/lib/sections/render-section';
import { EditableSection } from '@/components/editor/editable-section';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

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
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [state, setState] = useState<'waiting' | 'loading' | 'ready' | 'error'>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WebsiteSnapshot | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);
  const parentOriginRef = useRef<string | null>(null);

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
      setState('ready');
      sendToParent('canvas:state', { state: 'ready' });

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
  }, [websiteId, sendToParent, selectedSectionId]);

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

  // Render states
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
  // Include content with defaults for sections that need website data (social, contact, etc.)
  // Handle both camelCase (from RPC) and snake_case formats
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

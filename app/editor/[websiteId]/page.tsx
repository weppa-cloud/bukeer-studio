'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { M3ThemeProvider } from '@/lib/theme/m3-theme-provider';
import { renderSectionWithResult } from '@/lib/sections/render-section';
import { EditableSection } from '@/components/editor/editable-section';
import { EditorShell } from '@/components/editor/editor-shell';
import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import type { ThemeInput } from '@/lib/theme/m3-theme-provider';

// ============================================================================
// Legacy Editor Page — Puck removed (#569)
//
// This page is kept for:
// 1. Standalone mode (?mode=standalone) → EditorShell V2
// 2. Blog editor sub-routes (/editor/[websiteId]/blog/*)
// 3. Legacy canvas fallback for direct URL access
//
// Flutter no longer iframes this page — it uses launchUrl to /dashboard/ with SSO token.
// ============================================================================

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

function getInitialTheme(theme: WebsiteSnapshot['website']['theme'] | null | undefined): ThemeInput | undefined {
  if (!theme?.tokens || !theme?.profile) return undefined;
  return {
    tokens: theme.tokens as ThemeInput['tokens'],
    profile: theme.profile as ThemeInput['profile'],
  };
}

export default function EditorPage({ params }: EditorPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams?.get('mode');
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [state, setState] = useState<'waiting' | 'loading' | 'ready' | 'error'>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WebsiteSnapshot | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);

  // Resolve params
  useEffect(() => {
    params.then(p => setWebsiteId(p.websiteId));
  }, [params]);

  const loadData = useCallback(async () => {
    if (!tokenRef.current || !websiteId) return;

    setState('loading');

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

      const { data: snapshot, error: rpcError } = await supabase.rpc(
        'get_website_editor_snapshot',
        { p_website_id: websiteId }
      );
      if (rpcError) throw rpcError;

      setData(snapshot as WebsiteSnapshot);
      setState('ready');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setState('error');
      setError(errorMessage);
    }
  }, [websiteId]);

  // Get token from Supabase session (standalone mode — no iframe parent)
  useEffect(() => {
    if (!websiteId) return;

    import('@/lib/supabase/browser-client').then(({ createSupabaseBrowserClient }) => {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          tokenRef.current = session.access_token;
          loadData();
        } else {
          // No session — redirect to login, then back here
          router.push(`/login?redirect=/editor/${websiteId}`);
        }
      });
    });
  }, [websiteId, loadData, router]);

  // Standalone mode: use EditorShell V2 with drag-and-drop
  if (mode === 'standalone' && websiteId) {
    return <EditorShell websiteId={websiteId} />;
  }

  // Render states
  if (!websiteId || state === 'waiting') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-pulse w-8 h-8 rounded-full bg-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando editor...</p>
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

  // Transform data for rendering
  const rawContent = data.website?.content || {};
  const getString = (val: unknown, fallback = '') =>
    typeof val === 'string' ? val : fallback;

  const getRecord = <T extends Record<string, unknown>>(
    val: unknown,
    fallback: T
  ): T => (val && typeof val === 'object' ? (val as T) : fallback);

  const seo = getRecord(rawContent.seo, { title: '', description: '', keywords: '' });
  const contact = getRecord(rawContent.contact, { email: '', phone: '', address: '' });
  const social = getRecord(rawContent.social, {});

  const sectionsForWebsite: WebsiteSection[] = (data.sections || []).map((section) => ({
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
      packages: [],
    },
    sections: sectionsForWebsite,
  };

  // ============================================================================
  // Legacy Canvas Mode (read-only preview)
  // ============================================================================
  return (
    <M3ThemeProvider initialTheme={getInitialTheme(data.website.theme)}>
      <div className="min-h-screen">
        {(data.sections || []).map((section) => {
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
              onClick={(id: string) => { setSelectedSectionId(id); }}
            >
              {result.element}
            </EditableSection>
          );
        })}
      </div>
    </M3ThemeProvider>
  );
}

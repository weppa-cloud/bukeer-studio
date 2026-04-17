'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import type { WebsiteData, WebsitePage } from '@bukeer/website-contract';

interface WebsiteContextValue {
  website: WebsiteData | null;
  pages: WebsitePage[];
  loading: boolean;
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  save: (updates: Partial<WebsiteData>) => Promise<void>;
  refetch: () => Promise<void>;
  publish: () => Promise<void>;
}

const WebsiteContext = createContext<WebsiteContextValue | null>(null);

export function useWebsite() {
  const ctx = useContext(WebsiteContext);
  if (!ctx) throw new Error('useWebsite must be used within WebsiteProvider');
  return ctx;
}

interface WebsiteProviderProps {
  websiteId: string;
  children: ReactNode;
}

export function WebsiteProvider({ websiteId, children }: WebsiteProviderProps) {
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDirty, setDirty] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const fetchWebsite = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .single();

    if (data) {
      setWebsite(data as unknown as WebsiteData);
    }

    const { data: pagesData } = await supabase
      .from('website_pages')
      .select('*')
      .eq('website_id', websiteId)
      .order('nav_order', { ascending: true });

    setPages((pagesData || []) as unknown as WebsitePage[]);
    setLoading(false);
  }, [websiteId, supabase]);

  useEffect(() => {
    fetchWebsite();
  }, [fetchWebsite]);

  const save = useCallback(async (updates: Partial<WebsiteData>) => {
    const { error } = await supabase
      .from('websites')
      .update(updates)
      .eq('id', websiteId);

    if (!error) {
      setWebsite((prev) => prev ? { ...prev, ...updates } : prev);
      setDirty(false);
    }
  }, [websiteId, supabase]);

  const publish = useCallback(async () => {
    await save({ status: 'published' });
  }, [save]);

  return (
    <WebsiteContext.Provider
      value={{
        website,
        pages,
        loading,
        isDirty,
        setDirty,
        save,
        refetch: fetchWebsite,
        publish,
      }}
    >
      {children}
    </WebsiteContext.Provider>
  );
}

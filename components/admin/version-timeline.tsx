'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';

interface VersionEntry {
  id: string;
  revision: number;
  message: string | null;
  created_at: string;
  created_by: string | null;
}

interface VersionTimelineProps {
  websiteId: string;
}

export function VersionTimeline({ websiteId }: VersionTimelineProps) {
  const supabase = createSupabaseBrowserClient();
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('website_versions')
        .select('id, revision, message, created_at, created_by')
        .eq('website_id', websiteId)
        .order('revision', { ascending: false })
        .limit(20);

      setVersions((data || []) as VersionEntry[]);
      setLoading(false);
    }
    load();
  }, [websiteId, supabase]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">No version history yet.</p>
        <p className="text-xs mt-1">Versions are created each time you publish.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {versions.map((version, i) => (
        <div key={version.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
            {i < versions.length - 1 && (
              <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />
            )}
          </div>

          {/* Content */}
          <div className="pb-6 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  v{version.revision}
                </span>
                {version.message && (
                  <span className="text-sm text-slate-500 ml-2">{version.message}</span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {new Date(version.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

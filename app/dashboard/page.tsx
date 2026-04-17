'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { WebsiteCard } from '@/components/admin/website-card';
import { EmptyState } from '@/components/admin/empty-state';
import { SkeletonList } from '@/components/admin/skeleton-card';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import Link from 'next/link';
import { getDashboardUserContext } from '@/lib/admin/user-context';

interface WebsiteRow {
  id: string;
  subdomain: string;
  status: 'draft' | 'published';
  content: { siteName?: string } | null;
  updated_at: string | null;
}

export default function DashboardPage() {
  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const loadWebsites = useCallback(async () => {
    setLoading(true);
    setAccessError(null);
    try {
      const context = await getDashboardUserContext(supabase);

      if (context.status === 'unauthenticated') {
        setAccessError('Tu sesión expiró. Inicia sesión nuevamente.');
        setWebsites([]);
        return;
      }

      if (context.status === 'missing_role') {
        setAccessError('No tienes un rol activo en ninguna cuenta.');
        setWebsites([]);
        return;
      }

      const { data, error } = await supabase
        .from('websites')
        .select('id, subdomain, status, content, updated_at')
        .eq('account_id', context.accountId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        setAccessError('No se pudieron cargar los sitios web.');
        setWebsites([]);
        return;
      }

      setWebsites((data as WebsiteRow[]) || []);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadWebsites();
  }, [loadWebsites]);

  async function handleDelete(id: string) {
    await supabase
      .from('websites')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    setWebsites((prev) => prev.filter((w) => w.id !== id));
    setDeleteId(null);
  }

  return (
    <div className="studio-page max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--studio-text)]">
            My Websites
          </h1>
          <p className="text-[var(--studio-text-muted)] mt-1">
            Manage and publish your web presence
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="studio-btn studio-btn-primary studio-btn-md"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" d="M12 5v14M5 12h14" />
          </svg>
          New website
        </Link>
      </div>

      {loading ? (
        <SkeletonList count={6} />
      ) : accessError ? (
        <EmptyState
          title="Access unavailable"
          description={accessError}
          action={
            <button
              onClick={() => loadWebsites()}
              className="studio-btn studio-btn-primary studio-btn-md"
            >
              Retry
            </button>
          }
        />
      ) : websites.length === 0 ? (
        <EmptyState
          title="Create your first website"
          description="Start building your travel agency's online presence with our visual editor."
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              <path strokeWidth="1.5" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          }
          action={
            <Link
              href="/dashboard/new"
              className="studio-btn studio-btn-primary studio-btn-md"
            >
              Create website
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {websites.map((website) => (
            <WebsiteCard
              key={website.id}
              id={website.id}
              name={website.content?.siteName || website.subdomain}
              subdomain={website.subdomain}
              status={website.status}
              lastEdited={website.updated_at || undefined}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete website"
        description="This action cannot be undone. The website will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

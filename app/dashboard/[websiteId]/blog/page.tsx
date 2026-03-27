'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { EmptyState } from '@/components/admin/empty-state';
import {
  StudioPage,
  StudioSectionHeader,
  StudioButton,
  StudioTabs,
  StudioSearch,
  StudioBadgeStatus,
  StudioListRow,
} from '@/components/studio/ui/primitives';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';

interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: 'draft' | 'published' | 'scheduled';
  featured_image: string | null;
  published_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Draft' },
  { id: 'scheduled', label: 'Scheduled' },
] as const;

export default function BlogTab() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]['id']>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('website_blog_posts')
      .select('id, title, slug, excerpt, status, featured_image, published_at, created_at')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data } = await query;
    setPosts((data || []) as BlogPostRow[]);
    setLoading(false);
  }, [websiteId, supabase, statusFilter, search, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleCreate() {
    const { data } = await supabase
      .from('website_blog_posts')
      .insert({
        website_id: websiteId,
        title: 'Untitled Post',
        slug: `untitled-${Date.now()}`,
        content: '',
        status: 'draft',
      })
      .select()
      .single();

    if (data) {
      router.push(`/dashboard/${websiteId}/blog/${data.id}`);
    }
  }

  async function handleBulkAction(action: 'publish' | 'archive' | 'delete') {
    const ids = Array.from(selected);
    if (!ids.length) return;

    if (action === 'delete') {
      setDeleteIds(ids);
      return;
    }

    const status = action === 'publish' ? 'published' : 'draft';
    await supabase
      .from('website_blog_posts')
      .update({ status, ...(action === 'publish' ? { published_at: new Date().toISOString() } : {}) })
      .in('id', ids);

    setSelected(new Set());
    fetchPosts();
  }

  async function handleDelete(ids: string[]) {
    await supabase.from('website_blog_posts').delete().in('id', ids);
    setDeleteIds([]);
    setSelected(new Set());
    fetchPosts();
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Blog Posts"
        subtitle="Gestiona contenido y estado editorial con un flujo uniforme."
        actions={<StudioButton onClick={handleCreate}>New post</StudioButton>}
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <StudioTabs
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
        />
        <StudioSearch
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="flex-1 min-w-[240px] max-w-sm"
          placeholder="Search posts..."
        />

        <StudioTabs
          value={viewMode}
          onChange={(value) => setViewMode(value)}
          options={[
            { id: 'grid', label: 'Grid' },
            { id: 'list', label: 'List' },
          ]}
          className="ml-auto"
        />
      </div>

      {selected.size > 0 && (
        <div className="studio-panel mb-4 p-3 flex items-center gap-2">
          <span className="text-sm text-[var(--studio-text)] font-medium">{selected.size} selected</span>
          <StudioButton size="sm" onClick={() => handleBulkAction('publish')}>Publish</StudioButton>
          <StudioButton size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>Archive</StudioButton>
          <StudioButton size="sm" variant="danger" onClick={() => handleBulkAction('delete')}>Delete</StudioButton>
          <StudioButton size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </StudioButton>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="studio-card p-4 animate-pulse">
              <div className="h-32 rounded-lg bg-[var(--studio-panel)] mb-3" />
              <div className="h-4 rounded bg-[var(--studio-panel)] w-3/4 mb-2" />
              <div className="h-3 rounded bg-[var(--studio-panel)] w-1/2" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          title="No blog posts yet"
          description="Start creating content to attract visitors and improve SEO."
          action={<StudioButton onClick={handleCreate}>Create post</StudioButton>}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="studio-card overflow-hidden cursor-pointer"
              onClick={() => router.push(`/dashboard/${websiteId}/blog/${post.id}`)}
            >
              <div className="relative">
                {post.featured_image ? (
                  <img src={post.featured_image} alt="" className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-[var(--studio-panel)]" />
                )}
                <input
                  type="checkbox"
                  checked={selected.has(post.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(post.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-3 left-3 w-4 h-4 rounded"
                />
                <div className="absolute top-3 right-3">
                  <StudioBadgeStatus status={post.status} />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[var(--studio-text)] truncate">{post.title}</h3>
                {post.excerpt && (
                  <p className="text-sm text-[var(--studio-text-muted)] mt-1 line-clamp-2">{post.excerpt}</p>
                )}
                <p className="text-xs text-[var(--studio-text-muted)] mt-2">
                  {new Date(post.published_at || post.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <StudioListRow
              key={post.id}
              className="p-3 flex items-center gap-3 cursor-pointer"
              onClick={() => router.push(`/dashboard/${websiteId}/blog/${post.id}`)}
            >
              <input
                type="checkbox"
                checked={selected.has(post.id)}
                onChange={() => toggleSelect(post.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded"
              />
              {post.featured_image ? (
                <img src={post.featured_image} alt="" className="w-16 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-12 rounded-lg bg-[var(--studio-panel)] border border-[var(--studio-border)]" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-[var(--studio-text)] truncate">{post.title}</h3>
                <p className="text-xs text-[var(--studio-text-muted)]">/{post.slug}</p>
              </div>
              <StudioBadgeStatus status={post.status} />
              <span className="text-xs text-[var(--studio-text-muted)]">
                {new Date(post.published_at || post.created_at).toLocaleDateString()}
              </span>
            </StudioListRow>
          ))}
        </div>
      )}

      {posts.length === PAGE_SIZE && (
        <div className="flex justify-center mt-6 gap-2">
          <StudioButton
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </StudioButton>
          <StudioButton size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>
            Next
          </StudioButton>
        </div>
      )}

      <ConfirmDialog
        open={deleteIds.length > 0}
        title={`Delete ${deleteIds.length} post(s)`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => handleDelete(deleteIds)}
        onCancel={() => setDeleteIds([])}
      />
    </StudioPage>
  );
}

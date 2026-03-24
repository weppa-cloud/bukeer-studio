'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/admin/empty-state';
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
  category?: { name: string; color: string | null } | null;
}

export default function BlogTab() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('website_blog_posts')
      .select('id, title, slug, excerpt, status, featured_image, published_at, created_at, category:website_blog_categories(name, color)')
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

  const STATUS_COUNTS = ['all', 'published', 'draft', 'scheduled'] as const;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Blog Posts</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" d="M12 5v14M5 12h14" />
          </svg>
          New post
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Status chips */}
        <div className="flex gap-1">
          {STATUS_COUNTS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search posts..."
          />
        </div>

        {/* View toggle */}
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
          >
            <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
          >
            <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {selected.size} selected
          </span>
          <button
            onClick={() => handleBulkAction('publish')}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg"
          >
            Publish
          </button>
          <button
            onClick={() => handleBulkAction('archive')}
            className="px-3 py-1 text-sm bg-slate-600 text-white rounded-lg"
          >
            Archive
          </button>
          <button
            onClick={() => handleBulkAction('delete')}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg"
          >
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-slate-500 ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          title="No blog posts yet"
          description="Start creating content to attract visitors and improve SEO."
          action={
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-xl">
              Create post
            </button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/dashboard/${websiteId}/blog/${post.id}`)}
            >
              {/* Checkbox */}
              <div className="relative">
                {post.featured_image ? (
                  <img src={post.featured_image} alt="" className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800" />
                )}
                <input
                  type="checkbox"
                  checked={selected.has(post.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(post.id); }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-3 left-3 w-4 h-4 rounded opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
                />
                <div className="absolute top-3 right-3">
                  <StatusBadge status={post.status} />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-slate-900 dark:text-white truncate">{post.title}</h3>
                {post.excerpt && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{post.excerpt}</p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(post.published_at || post.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              onClick={() => router.push(`/dashboard/${websiteId}/blog/${post.id}`)}
            >
              <input
                type="checkbox"
                checked={selected.has(post.id)}
                onChange={() => toggleSelect(post.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded"
              />
              {post.featured_image && (
                <img src={post.featured_image} alt="" className="w-16 h-12 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-900 dark:text-white truncate">{post.title}</h3>
                <p className="text-sm text-slate-500">/{post.slug}</p>
              </div>
              <StatusBadge status={post.status} />
              <span className="text-sm text-slate-400">
                {new Date(post.published_at || post.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {posts.length === PAGE_SIZE && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border"
          >
            Next
          </button>
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
    </div>
  );
}

'use client';

import { useState, useMemo, lazy, Suspense } from 'react';
import Image from 'next/image';
import type { AutosaveStatus } from '@/lib/hooks/use-autosave';

// Lazy-load TipTap BlogEditor to avoid SSR issues with ProseMirror
const BlogEditorRich = lazy(() =>
  import('@/components/editor/blog-editor').then((mod) => ({
    default: mod.BlogEditor,
  }))
);

interface PostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'scheduled';
  featured_image: string | null;
  category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  word_count: number | null;
  published_at: string | null;
}

interface BlogEditorComponentProps {
  post: PostData;
  autoSaveStatus: AutosaveStatus;
  websiteId: string;
  onChange: (post: PostData) => void;
  onBack: () => void;
}

export function BlogEditorComponent({
  post,
  autoSaveStatus,
  websiteId,
  onChange,
  onBack,
}: BlogEditorComponentProps) {
  const [showSidebar, setShowSidebar] = useState(true);

  const wordCount = useMemo(() => {
    return (post.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  }, [post.content]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const statusIcon = {
    idle: null,
    saving: (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Saving...
      </span>
    ),
    saved: <span className="text-xs text-green-500">Saved</span>,
    error: <span className="text-xs text-red-500">Save failed</span>,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">Blog</span>
          <span className="text-sm text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-xs">
            {post.title || 'Untitled'}
          </span>
          {statusIcon[autoSaveStatus]}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={post.status}
            onChange={(e) => onChange({ ...post, status: e.target.value as PostData['status'] })}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main editor — TipTap rich text */}
        <div className="flex-1 overflow-y-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            }
          >
            <BlogEditorRich
              initialContent={post.content}
              initialTitle={post.title}
              onChange={(content) => onChange({ ...post, content })}
              onTitleChange={(title) => onChange({ ...post, title })}
              websiteId={websiteId}
            />
          </Suspense>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto p-4 space-y-6">
            {/* SEO */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">SEO</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">SEO Title</label>
                  <input
                    value={post.seo_title || ''}
                    onChange={(e) => onChange({ ...post, seo_title: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    maxLength={70}
                  />
                  <span className="text-xs text-slate-400">{(post.seo_title || '').length}/70</span>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">SEO Description</label>
                  <textarea
                    value={post.seo_description || ''}
                    onChange={(e) => onChange({ ...post, seo_description: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 resize-none"
                    rows={3}
                    maxLength={160}
                  />
                  <span className="text-xs text-slate-400">{(post.seo_description || '').length}/160</span>
                </div>
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Excerpt</h4>
              <textarea
                value={post.excerpt || ''}
                onChange={(e) => onChange({ ...post, excerpt: e.target.value })}
                className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 resize-none"
                rows={3}
                placeholder="Brief summary of the post"
              />
            </div>

            {/* Featured Image */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Featured Image</h4>
              {post.featured_image ? (
                <div className="relative">
                  <Image
                    src={post.featured_image}
                    alt=""
                    width={640}
                    height={160}
                    unoptimized
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => onChange({ ...post, featured_image: null })}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg p-6 text-center">
                  <p className="text-sm text-slate-400">Drag & drop or click to upload</p>
                </div>
              )}
            </div>

            {/* URL / Slug */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">URL Slug</h4>
              <input
                value={post.slug}
                onChange={(e) => onChange({ ...post, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="w-full px-2 py-1.5 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-400">
        <span>{wordCount} words</span>
        <span>{readingTime} min read</span>
      </div>
    </div>
  );
}

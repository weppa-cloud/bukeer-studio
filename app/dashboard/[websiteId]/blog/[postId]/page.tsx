'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useAutosave } from '@/lib/hooks/use-autosave';
import { useCommonShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { BlogEditorComponent } from '@/components/admin/blog-editor-admin';

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

export default function BlogEditorPage() {
  const { websiteId, postId } = useParams<{ websiteId: string; postId: string }>();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (data) setPost(data as PostData);
      setLoading(false);
    }
    load();
  }, [postId, supabase]);

  const handleSave = useCallback(async (data: PostData) => {
    const { id, ...updates } = data;
    // Calculate word count
    const wordCount = (updates.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    await supabase
      .from('blog_posts')
      .update({ ...updates, word_count: wordCount })
      .eq('id', id);
  }, [supabase]);

  const { status: autoSaveStatus, saveNow } = useAutosave({
    data: post,
    onSave: handleSave as any,
    debounceMs: 2000,
    enabled: !!post,
  });

  useCommonShortcuts({
    onSave: saveNow,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!post) {
    return <div className="p-6 text-center text-slate-500">Post not found</div>;
  }

  return (
    <BlogEditorComponent
      post={post}
      autoSaveStatus={autoSaveStatus}
      websiteId={websiteId}
      onChange={setPost}
      onBack={() => router.push(`/dashboard/${websiteId}/blog`)}
    />
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BlogEditor } from '@/components/editor/blog-editor';
import { detectAuthMode, createAuthClient } from '@/lib/auth/require-auth';

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: 'draft' | 'published' | 'scheduled';
  category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  featured_image: string | null;
}

interface BlogPostPageProps {
  params: Promise<{ websiteId: string; postId: string }>;
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [tokenRef, setTokenRef] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [isScoring, setIsScoring] = useState(false);

  // Auto-score content after save, persist to blog_content_scores on publish
  const scoreContent = useCallback(async (savedStatus?: string) => {
    if (!tokenRef || !content || content.length < 100) return;
    setIsScoring(true);
    try {
      const res = await fetch('/api/ai/editor/score-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenRef}`,
        },
        body: JSON.stringify({
          content,
          title,
          metaDescription: seoDescription || undefined,
          locale: 'es',
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setScoreResult(result);

        // Persist scores only for published posts
        if (savedStatus === 'published' && websiteId && postId) {
          const supabase = getSupabase();
          if (supabase) {
            // Compute content hash (SHA-256, truncated to 16 hex chars)
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

            const wordCount = content.split(/\s+/).filter(Boolean).length;

            await supabase.from('blog_content_scores').upsert({
              post_id: postId,
              website_id: websiteId,
              overall_score: Math.round(result.overall),
              seo_score: Math.round(result.seo),
              readability_score: Math.round(result.readability),
              structure_score: Math.round(result.structure),
              geo_score: Math.round(result.geo),
              grade: result.grade,
              checks: result.checks || [],
              content_hash: contentHash,
              word_count: wordCount,
              scored_at: new Date().toISOString(),
            }, { onConflict: 'post_id,content_hash' });
          }
        }
      }
    } catch {
      // Score failure is non-blocking
    } finally {
      setIsScoring(false);
    }
  }, [tokenRef, content, title, seoDescription, websiteId, postId, getSupabase]);

  useEffect(() => {
    params.then((p) => {
      setWebsiteId(p.websiteId);
      setPostId(p.postId);
    });
  }, [params]);

  const getSupabase = useCallback(() => {
    if (!tokenRef) return null;
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${tokenRef}` } },
        auth: { persistSession: false },
      }
    );
  }, [tokenRef]);

  // Load post data
  useEffect(() => {
    async function load() {
      if (!websiteId || !postId) return;

      const authMode = detectAuthMode();
      if (authMode === 'standalone') {
        const client = createAuthClient();
        const {
          data: { session },
        } = await client.auth.getSession();
        if (session?.access_token) {
          setTokenRef(session.access_token);
        } else {
          setError('No estás autenticado');
          setLoading(false);
          return;
        }
      }
    }
    load();
  }, [websiteId, postId]);

  // Load post once we have token
  useEffect(() => {
    async function loadPost() {
      if (!tokenRef || !websiteId || !postId) return;

      const supabase = getSupabase();
      if (!supabase) return;

      try {
        if (postId === 'new') {
          // New post
          setTitle('');
          setContent('');
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('website_blog_posts')
          .select('*')
          .eq('id', postId)
          .eq('website_id', websiteId)
          .single();

        if (fetchError) throw fetchError;

        const postData = data as BlogPostData;
        setPost(postData);
        setTitle(postData.title ?? '');
        setContent(postData.content ?? '');
        setSeoTitle(postData.seo_title ?? '');
        setSeoDescription(postData.seo_description ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading post');
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [tokenRef, websiteId, postId, getSupabase]);

  const handleSave = useCallback(
    async (status: 'draft' | 'published' = 'draft') => {
      const supabase = getSupabase();
      if (!supabase || !websiteId) return;

      setSaving(true);
      try {
        const slug =
          title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 100) || 'untitled';

        const wordCount = content.split(/\s+/).filter(Boolean).length;
        const excerpt = content.replace(/[#*_\[\]()]/g, '').slice(0, 200);

        if (postId === 'new') {
          const { data, error: insertError } = await supabase
            .from('website_blog_posts')
            .insert({
              website_id: websiteId,
              title,
              slug,
              content,
              excerpt,
              status,
              seo_title: seoTitle || title,
              seo_description: seoDescription || excerpt,
              word_count: wordCount,
              published_at: status === 'published' ? new Date().toISOString() : null,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;

          // Navigate to the created post
          window.location.href = `/editor/${websiteId}/blog/${(data as { id: string }).id}?mode=standalone`;
        } else {
          const updateData: Record<string, unknown> = {
            title,
            slug,
            content,
            excerpt,
            status,
            seo_title: seoTitle || title,
            seo_description: seoDescription || excerpt,
            word_count: wordCount,
            updated_at: new Date().toISOString(),
          };

          if (status === 'published' && !post?.status) {
            updateData.published_at = new Date().toISOString();
          }

          const { error: updateError } = await supabase
            .from('website_blog_posts')
            .update(updateData)
            .eq('id', postId)
            .eq('website_id', websiteId);

          if (updateError) throw updateError;
        }

        // Auto-score after successful save (persist only for published posts)
        scoreContent(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error saving post');
      } finally {
        setSaving(false);
      }
    },
    [getSupabase, websiteId, postId, title, content, seoTitle, seoDescription, post, scoreContent]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center text-destructive">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center justify-between">
        <a
          href={`/editor/${websiteId}/blog?mode=standalone`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Blog
        </a>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Publicar
          </button>
        </div>
      </div>

      {/* Editor + SEO sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          <BlogEditor
            initialTitle={title}
            initialContent={content}
            websiteId={websiteId ?? ''}
            postId={postId ?? undefined}
            authToken={tokenRef ?? undefined}
            onTitleChange={setTitle}
            onChange={setContent}
            scoreResult={scoreResult}
            isScoring={isScoring}
            onScoreRefresh={scoreContent}
          />
        </div>

        {/* SEO sidebar */}
        <div className="w-72 border-l p-4 overflow-auto shrink-0">
          <h3 className="text-sm font-medium mb-3">SEO</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Meta título</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || 'Título SEO...'}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(seoTitle || title).length}/60 caracteres
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Meta descripción
              </label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Descripción para buscadores..."
                rows={3}
                className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {seoDescription.length}/160 caracteres
              </p>
            </div>

            {/* Content stats */}
            <div className="pt-3 border-t">
              <h4 className="text-xs font-medium mb-2">Estadísticas</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Palabras: {content.split(/\s+/).filter(Boolean).length}</p>
                <p>
                  Encabezados:{' '}
                  {(content.match(/^#{1,6}\s/gm) ?? []).length}
                </p>
                <p>
                  Tiempo de lectura:{' '}
                  {Math.max(
                    1,
                    Math.ceil(
                      content.split(/\s+/).filter(Boolean).length / 200
                    )
                  )}{' '}
                  min
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

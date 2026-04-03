'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createAuthClient } from '@/lib/auth/require-auth';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'scheduled';
  published_at: string | null;
  updated_at: string;
  excerpt: string | null;
}

interface BlogListPageProps {
  params: Promise<{ websiteId: string }>;
}

export default function BlogListPage({ params }: BlogListPageProps) {
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setWebsiteId(p.websiteId));
  }, [params]);

  const loadPosts = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);

    try {
      const client = createAuthClient();
      const {
        data: { session },
      } = await client.auth.getSession();
      const token = session?.access_token ?? null;

      if (!token) {
        setError('No estás autenticado');
        setLoading(false);
        return;
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        }
      );

      const { data, error: fetchError } = await supabase
        .from('website_blog_posts')
        .select('id, title, slug, status, published_at, updated_at, excerpt')
        .eq('website_id', websiteId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPosts((data as BlogPost[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading posts');
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleNewPost = () => {
    if (websiteId) {
      window.location.href = `/editor/${websiteId}/blog/new?mode=standalone`;
    }
  };

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
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Blog</h1>
          <p className="text-sm text-muted-foreground">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/editor/${websiteId}?mode=standalone`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Editor
          </a>
          <button
            onClick={handleNewPost}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Nuevo post
          </button>
        </div>
      </div>

      {/* Post list */}
      <div className="flex-1 overflow-auto p-6">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">
              No hay posts de blog todavía.
            </p>
            <button
              onClick={handleNewPost}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
            >
              Crear primer post
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {posts.map((post) => (
              <a
                key={post.id}
                href={`/editor/${websiteId}/blog/${post.id}?mode=standalone`}
                className="block p-4 rounded-lg border hover:border-primary/30 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {post.title || 'Sin título'}
                    </h3>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        post.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : post.status === 'scheduled'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {post.status === 'published'
                        ? 'Publicado'
                        : post.status === 'scheduled'
                        ? 'Programado'
                        : 'Borrador'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.updated_at).toLocaleDateString('es')}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { useWebsiteLocale } from '@/lib/hooks/use-website-locale';
import { buildEntityAlt } from '@/lib/utils/entity-alt';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

interface BlogSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  publishedAt?: string;
  category?: string | { name: string; slug: string };
}

export function BlogSection({ section, website }: BlogSectionProps) {
  const { subdomain } = website;
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    posts?: BlogPost[];
  };

  const locale = useWebsiteLocale();
  const text = getPublicUiExtraTextGetter(locale);
  const agency = website.content.siteName || '';

  const variant = section.variant || 'default';
  const title = sectionContent.title || text('sectionBlogTitle');
  const posts = sectionContent.posts || [];

  if (variant === 'showcase') {
    return <ShowcaseBlog title={title} subtitle={sectionContent.subtitle} posts={posts} subdomain={subdomain} locale={locale} agency={agency} />;
  }

  return (
    <div className="section-padding bg-muted/30">
      <div className="container">
        <div className="flex items-end justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title" style={{ color: 'var(--text-heading)' }}>{title}</h2>
            {sectionContent.subtitle && (
              <p className="section-subtitle mt-2 text-muted-foreground">{sectionContent.subtitle}</p>
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href={`/site/${subdomain}/blog`}
              className="text-primary font-medium hover:underline hidden md:block"
            >
              {text('sectionBlogViewAllArrow')}
            </Link>
          </motion.div>
        </div>

        {posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.slice(0, 3).map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Link href={`/site/${subdomain}/blog/${post.slug}`}>
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-4">
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={buildEntityAlt('blog', post.title, locale, agency)}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-2 text-muted-foreground text-sm line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                  {post.publishedAt && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {new Date(post.publishedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </Link>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>{text('sectionBlogNoPosts')}</p>
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link
            href={`/site/${subdomain}/blog`}
            className="inline-flex items-center gap-2 text-primary font-medium"
          >
            {text('sectionBlogViewAllPosts')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

function getCategoryName(category?: string | { name: string; slug: string }): string | undefined {
  if (!category) return undefined;
  if (typeof category === 'string') return category;
  return category.name;
}

// Showcase variant — pixel-perfect match with theme reference using bridge CSS variables
function ShowcaseBlog({ title, subtitle, posts, subdomain, locale, agency }: { title: string; subtitle?: string; posts: BlogPost[]; subdomain: string; locale: string; agency: string }) {
  const text = getPublicUiExtraTextGetter(locale);
  return (
    <div className="section-padding">
      <div className="container">
        <div className="flex items-end justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title" style={{ color: 'var(--text-heading)' }}>{title}</h2>
            {subtitle && (
              <p className="section-subtitle mt-2" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href={`/site/${subdomain}/blog`}
              className="font-medium hover:underline hidden md:block"
              style={{ color: 'var(--accent)' }}
            >
              {text('sectionBlogViewAllArrow')}
            </Link>
          </motion.div>
        </div>

        {posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.slice(0, 3).map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="group"
              >
                <Link
                  href={`/site/${subdomain}/blog/${post.slug}`}
                  className="block rounded-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="relative overflow-hidden" style={{ aspectRatio: '16/10' }}>
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={buildEntityAlt('blog', post.title, locale, agency)}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {getCategoryName(post.category) && (
                        <span
                          className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: 'var(--nav-link-hover-bg)', color: 'var(--accent)' }}
                        >
                          {getCategoryName(post.category)}
                        </span>
                      )}
                      {post.publishedAt && (
                        <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(post.publishedAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <h3
                      className="text-lg leading-tight mb-2 line-clamp-2 transition-colors"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <p>{text('sectionBlogNoPosts')}</p>
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link
            href={`/site/${subdomain}/blog`}
            className="inline-flex items-center gap-2 font-medium"
            style={{ color: 'var(--accent)' }}
          >
            {text('sectionBlogViewAllPosts')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

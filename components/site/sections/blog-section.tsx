'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface BlogSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function BlogSection({ section, website }: BlogSectionProps) {
  const { subdomain } = website;
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    posts?: Array<{
      id: string;
      title: string;
      slug: string;
      excerpt?: string;
      featured_image?: string;
      published_at?: string;
    }>;
  };

  const title = sectionContent.title || 'Últimas del Blog';
  const posts = sectionContent.posts || [];

  return (
    <div className="section-padding bg-muted/30">
      <div className="container">
        <div className="flex items-end justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            {sectionContent.subtitle && (
              <p className="mt-2 text-muted-foreground">{sectionContent.subtitle}</p>
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
              Ver todos →
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
                    {post.featured_image ? (
                      <Image
                        src={post.featured_image}
                        alt={post.title}
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
                  {post.published_at && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {new Date(post.published_at).toLocaleDateString('es-ES', {
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
            <p>No hay publicaciones disponibles</p>
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link
            href={`/site/${subdomain}/blog`}
            className="inline-flex items-center gap-2 text-primary font-medium"
          >
            Ver todos los posts
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

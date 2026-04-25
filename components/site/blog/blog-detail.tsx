import Link from 'next/link';
import Image from 'next/image';
import { SafeHtml } from '@/lib/sanitize';
import { formatPublicDate, getPublicUiMessages } from '@/lib/site/public-ui-messages';
import { getBasePath } from '@/lib/utils/base-path';

interface BlogCategory {
  slug?: string | null;
  name?: string | null;
}

export interface BlogDetailPost {
  slug: string;
  title: string;
  content: string;
  excerpt?: string | null;
  featured_image?: string | null;
  published_at?: string | null;
  author_name?: string | null;
  category?: BlogCategory | null;
}

export interface BlogDetailProps {
  subdomain: string;
  locale: string;
  post: BlogDetailPost;
  isCustomDomain?: boolean;
}

export function BlogDetail({ subdomain, locale, post, isCustomDomain = false }: BlogDetailProps) {
  const messages = getPublicUiMessages(locale);
  const basePath = getBasePath(subdomain, isCustomDomain);

  return (
    <article data-testid="detail-blog" className="section-padding">
      <div className="container max-w-[72ch]">
        <nav className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href={basePath || '/'} className="transition-colors hover:text-foreground">
                {messages.blogPost.breadcrumbHome}
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href={`${basePath}/blog`} className="transition-colors hover:text-foreground">
                {messages.blogPost.breadcrumbBlog}
              </Link>
            </li>
            <li>/</li>
            <li className="max-w-[200px] truncate text-foreground">{post.title}</li>
          </ol>
        </nav>

        <header className="mb-8">
          {post.category?.slug && post.category?.name ? (
            <Link
              href={`${basePath}/blog?category=${post.category.slug}`}
              className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {post.category.name}
            </Link>
          ) : null}

          <h1 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">{post.title}</h1>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            {post.published_at ? (
              <time dateTime={post.published_at}>
                {formatPublicDate(post.published_at, locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            ) : null}
            {post.author_name ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{post.author_name}</span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{Math.ceil(post.content.split(/\s+/).length / 200)} {messages.blogPost.readingTimeSuffix}</span>
          </div>
        </header>

        {post.featured_image ? (
          <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-xl">
            <Image
              src={post.featured_image}
              alt={post.title}
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 768px) 100vw, 72ch"
              className="object-cover"
            />
          </div>
        ) : null}

        <SafeHtml
          content={post.content}
          fallbackAlt={post.title}
          className="blog-prose prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium prose-strong:text-foreground prose-blockquote:not-italic prose-figure:my-0"
        />

        <div className="mt-12 border-t pt-8">
          <div className="flex items-center justify-between">
            <Link href={`${basePath}/blog`} className="inline-flex items-center gap-2 text-primary hover:underline">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {messages.blogPost.backToBlog}
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{messages.blogPost.shareLabel}</span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://${subdomain}.bukeer.com/blog/${post.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={messages.blogPost.shareTwitterAria}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://${subdomain}.bukeer.com/blog/${post.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={messages.blogPost.shareFacebookAria}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${post.title} - https://${subdomain}.bukeer.com/blog/${post.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={messages.blogPost.shareWhatsappAria}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

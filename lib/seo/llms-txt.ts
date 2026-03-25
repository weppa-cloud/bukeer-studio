/**
 * llms.txt Generator — per-tenant AI-readable site summary
 *
 * Follows the llmstxt.org specification (844K+ websites adopted).
 * Generates a Markdown file that AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
 * can use to understand site content without crawling every page.
 *
 * Regenerated on publish via revalidateTag('llms-txt').
 * Only includes published content (never drafts).
 */

import type { WebsiteData, BlogPost } from '../supabase/get-website';

interface Destination {
  name: string;
  slug: string;
}

export function generateLlmsTxt(
  website: WebsiteData,
  posts: BlogPost[],
  baseUrl: string,
  destinations?: Destination[],
): string {
  const siteName = website.content.siteName || website.content.account?.name || 'Travel Agency';
  const description = website.content.seo?.description || website.content.tagline || '';
  const contactEmail = website.content.contact?.email;
  const contactPhone = website.content.contact?.phone;

  const lines: string[] = [];

  // Header
  lines.push(`# ${siteName}`);
  lines.push('');
  if (description) {
    lines.push(`> ${description}`);
    lines.push('');
  }

  // About section
  lines.push('## About');
  lines.push(`- [Homepage](${baseUrl})`);
  lines.push(`- [About Us](${baseUrl}/nosotros)`);
  lines.push('');

  // Destinations (if available)
  if (destinations && destinations.length > 0) {
    lines.push('## Destinations');
    for (const dest of destinations.slice(0, 20)) {
      lines.push(`- [${dest.name}](${baseUrl}/destinos/${dest.slug})`);
    }
    lines.push('');
  }

  // Travel Guides (top 20 published posts by views)
  const publishedPosts = posts
    .filter(p => p.status === 'published')
    .sort((a, b) => ((b as any).view_count || 0) - ((a as any).view_count || 0))
    .slice(0, 20);

  if (publishedPosts.length > 0) {
    lines.push('## Travel Guides');
    for (const post of publishedPosts) {
      const excerpt = post.excerpt ? `: ${post.excerpt.slice(0, 120)}` : '';
      lines.push(`- [${post.title}](${baseUrl}/blog/${post.slug})${excerpt}`);
    }
    lines.push('');
  }

  // Contact
  if (contactEmail || contactPhone) {
    lines.push('## Contact');
    if (contactEmail) lines.push(`- Email: ${contactEmail}`);
    if (contactPhone) lines.push(`- Phone: ${contactPhone}`);
    lines.push('');
  }

  return lines.join('\n');
}

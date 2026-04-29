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
import type { ProductData } from '@bukeer/website-contract';

interface Destination {
  name: string;
  slug: string;
}

interface LlmsTxtOptions {
  destinations?: Destination[];
  packages?: ProductData[];
  activities?: ProductData[];
}

function getPostViewCount(post: BlogPost): number {
  const postWithViews = post as BlogPost & { view_count?: unknown };
  return typeof postWithViews.view_count === 'number' ? postWithViews.view_count : 0;
}

export function generateLlmsTxt(
  website: WebsiteData,
  posts: BlogPost[],
  baseUrl: string,
  options: LlmsTxtOptions = {},
): string {
  const siteName = website.content.siteName || website.content.account?.name || 'Travel Agency';
  const description = website.content.seo?.description || website.content.tagline || '';
  const contactEmail = website.content.contact?.email;
  const contactPhone = website.content.contact?.phone;
  const destinations = options.destinations ?? [];
  const packages = options.packages ?? [];
  const activities = options.activities ?? [];

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
  lines.push(`- [Packages](${baseUrl}/paquetes)`);
  lines.push(`- [Activities](${baseUrl}/actividades)`);
  lines.push(`- [Blog](${baseUrl}/blog)`);
  lines.push('');

  lines.push('## Value Proposition');
  if (description) {
    lines.push(`- ${description}`);
  }
  lines.push('- Colombia travel planning, packaged trips, local experiences, destination guidance, and direct contact with a travel specialist.');
  lines.push('');

  const entityNames = new Set<string>([
    siteName,
    'Colombia',
    'Colombia travel',
    'travel agency',
    'tour operator',
    'custom itineraries',
    ...destinations.map((dest) => dest.name).filter(Boolean),
    ...packages.map((item) => item.name).filter(Boolean),
    ...activities.map((item) => item.name).filter(Boolean),
  ]);

  if (entityNames.size > 0) {
    lines.push('## Key Entities');
    for (const entity of Array.from(entityNames).slice(0, 40)) {
      lines.push(`- ${entity}`);
    }
    lines.push('');
  }

  // Destinations (if available)
  if (destinations.length > 0) {
    lines.push('## Destinations');
    for (const dest of destinations.slice(0, 20)) {
      lines.push(`- [${dest.name}](${baseUrl}/destinos/${dest.slug})`);
    }
    lines.push('');
  }

  if (packages.length > 0) {
    lines.push('## Priority Packages');
    for (const item of packages.slice(0, 12)) {
      const summary = item.description ? `: ${item.description.slice(0, 140)}` : '';
      lines.push(`- [${item.name}](${baseUrl}/paquetes/${item.slug})${summary}`);
    }
    lines.push('');
  }

  if (activities.length > 0) {
    lines.push('## Priority Experiences');
    for (const item of activities.slice(0, 12)) {
      const summary = item.description ? `: ${item.description.slice(0, 140)}` : '';
      lines.push(`- [${item.name}](${baseUrl}/actividades/${item.slug})${summary}`);
    }
    lines.push('');
  }

  // Travel Guides (top 20 published posts by views)
  const publishedPosts = posts
    .filter(p => p.status === 'published')
    .sort((a, b) => getPostViewCount(b) - getPostViewCount(a))
    .slice(0, 20);

  lines.push('## Travel Guides');
  if (publishedPosts.length > 0) {
    for (const post of publishedPosts) {
      const excerpt = post.excerpt ? `: ${post.excerpt.slice(0, 120)}` : '';
      lines.push(`- [${post.title}](${baseUrl}/blog/${post.slug})${excerpt}`);
    }
  } else {
    lines.push(`- [Travel Guides Index](${baseUrl}/blog)`);
  }
  lines.push('');

  // Contact
  if (contactEmail || contactPhone) {
    lines.push('## Contact');
    lines.push(`- [Contact Page](${baseUrl}/contacto)`);
    if (contactEmail) lines.push(`- Email: ${contactEmail}`);
    if (contactPhone) lines.push(`- Phone: ${contactPhone}`);
    lines.push('');
  }

  lines.push('## Canonical URL Policy');
  lines.push(`- Use canonical URLs under ${baseUrl}`);
  lines.push('- Prefer public package, activity, destination and guide URLs over dashboard, editor or API routes.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Internal Link Resolver
 *
 * Resolves [INTERNAL_LINK:topic] placeholders in blog content
 * to actual <a> links pointing to published posts.
 *
 * Uses title similarity matching to find the best post for each topic.
 * Stores resolved links in post.internal_links JSONB.
 *
 * Issue: SPEC §5.2.2
 */

import type { BlogPost } from '@bukeer/website-contract';

interface ResolvedLink {
  url: string;
  anchor: string;
  target_post_id: string;
}

/**
 * Find the best matching post for a topic using simple word overlap.
 */
function findBestMatch(topic: string, posts: BlogPost[]): BlogPost | null {
  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (topicWords.length === 0) return null;

  let bestPost: BlogPost | null = null;
  let bestScore = 0;

  for (const post of posts) {
    const titleWords = post.title.toLowerCase().split(/\s+/);
    const overlap = topicWords.filter(w => titleWords.some(tw => tw.includes(w) || w.includes(tw)));
    const score = overlap.length / topicWords.length;

    if (score > bestScore) {
      bestScore = score;
      bestPost = post;
    }
  }

  // Require at least 30% word overlap
  return bestScore >= 0.3 ? bestPost : null;
}

/**
 * Resolve all [INTERNAL_LINK:topic] placeholders in content.
 *
 * @param content - Markdown content with placeholders
 * @param publishedPosts - All published posts for this website (exclude current post)
 * @param baseUrl - Base URL for link generation (e.g., https://agencia.bukeer.com)
 * @returns Object with resolved content and list of resolved links
 */
export function resolveInternalLinks(
  content: string,
  publishedPosts: BlogPost[],
  baseUrl: string,
): { content: string; links: ResolvedLink[] } {
  const links: ResolvedLink[] = [];
  const pattern = /\[INTERNAL_LINK:([^\]]+)\]/g;

  const resolvedContent = content.replace(pattern, (_match, topic: string) => {
    const trimmedTopic = topic.trim();
    const matchedPost = findBestMatch(trimmedTopic, publishedPosts);

    if (matchedPost) {
      const url = `${baseUrl}/blog/${matchedPost.slug}`;
      links.push({
        url,
        anchor: trimmedTopic,
        target_post_id: matchedPost.id,
      });
      return `[${trimmedTopic}](${url})`;
    }

    // No match found — leave placeholder as plain text (no broken link)
    return trimmedTopic;
  });

  return { content: resolvedContent, links };
}

/**
 * Scan content for unresolved [INTERNAL_LINK:topic] placeholders.
 * Returns list of topics that still need resolution.
 */
export function findUnresolvedLinks(content: string): string[] {
  const pattern = /\[INTERNAL_LINK:([^\]]+)\]/g;
  const topics: string[] = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    topics.push(match[1].trim());
  }
  return topics;
}

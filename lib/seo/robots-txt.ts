/**
 * Shared robots.txt generator for per-tenant websites.
 *
 * Used by:
 * - /site/[subdomain]/robots.txt/route.ts (subdomain tenants)
 * - /domain/[host]/robots.txt/route.ts (custom domain tenants)
 */

export function generateRobotsTxt(baseUrl: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml

# AI Crawlers — allowed for AI search optimization (AEO)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

# Disallow internal routes
Disallow: /editor/
Disallow: /api/
Disallow: /_next/
`;
}

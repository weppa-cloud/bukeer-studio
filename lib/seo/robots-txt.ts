/**
 * Shared robots.txt generator for per-tenant websites.
 *
 * Used by:
 * - /site/[subdomain]/robots.txt/route.ts (subdomain tenants)
 * - /domain/[host]/robots.txt/route.ts (custom domain tenants)
 */

export function generateRobotsTxt(baseUrl: string): string {
  const internalDisallow = `Disallow: /editor/
Disallow: /api/`;

  const aiCrawlers = [
    ['OAI-SearchBot', 'OpenAI search visibility'],
    ['ChatGPT-User', 'OpenAI user-requested fetch'],
    ['GPTBot', 'OpenAI model improvement / training'],
    ['Claude-SearchBot', 'Anthropic search visibility'],
    ['Claude-User', 'Anthropic user-requested fetch'],
    ['ClaudeBot', 'Anthropic model improvement / training'],
    ['anthropic-ai', 'Legacy Anthropic crawler token'],
    ['PerplexityBot', 'Perplexity search index'],
    ['Google-Extended', 'Google Gemini / Vertex AI control token'],
  ];

  const aiGroups = aiCrawlers
    .map(([agent, purpose]) => `# ${purpose}
User-agent: ${agent}
Allow: /
${internalDisallow}`)
    .join('\n\n');

  return `User-agent: *
Allow: /
${internalDisallow}

${aiGroups}

Sitemap: ${baseUrl}/sitemap.xml
`;
}

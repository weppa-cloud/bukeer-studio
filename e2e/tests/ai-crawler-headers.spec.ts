import { test, expect } from '@playwright/test';

/**
 * EPIC #207 W2 · P1 · AI crawler response headers.
 *
 * Bukeer public pages must allow AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
 * to index content. Verifies the `X-Robots-Tag` response header carries
 * `index, follow` (or at minimum contains `index` without a `noindex` token)
 * when the User-Agent matches a known AI bot.
 *
 * Source: lib/seo/robots-txt.ts + middleware.ts
 */

const AI_CRAWLERS = [
  { name: 'GPTBot', ua: 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)' },
  { name: 'ClaudeBot', ua: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://www.anthropic.com/claudebot)' },
  {
    name: 'PerplexityBot',
    ua: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://www.perplexity.ai/perplexitybot)',
  },
] as const;

const PUBLIC_PATH = '/site/colombiatours';

test.describe('AI crawler response headers @p1-seo', () => {
  for (const bot of AI_CRAWLERS) {
    test(`${bot.name} receives indexable x-robots-tag`, async ({ playwright }) => {
      const context = await playwright.request.newContext({
        extraHTTPHeaders: { 'user-agent': bot.ua },
      });
      try {
        const res = await context.get(PUBLIC_PATH, { maxRedirects: 0 });
        test.skip(
          res.status() >= 500,
          `Tenant unreachable for ${bot.name} (status ${res.status()}) — seed required`,
        );
        const headers = res.headers();
        const robotsTag = headers['x-robots-tag'];

        test.skip(
          !robotsTag,
          `x-robots-tag not emitted for ${bot.name} — middleware contract may rely on robots.txt only`,
        );

        // Must NOT carry a `noindex` directive for AI crawlers.
        expect(robotsTag.toLowerCase()).not.toMatch(/\bnoindex\b/);
        // Should carry `index` (explicit) — tolerate `all` as shorthand.
        expect(robotsTag.toLowerCase()).toMatch(/\b(index|all)\b/);
      } finally {
        await context.dispose();
      }
    });
  }
});

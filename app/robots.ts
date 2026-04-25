/**
 * Dynamic Robots.txt Generator
 *
 * Configures crawler access rules for search engines and AI crawlers.
 *
 * Supported AI Crawlers:
 * - GPTBot (OpenAI) - ChatGPT, GPT-4
 * - ChatGPT-User (OpenAI) - ChatGPT browsing
 * - OAI-SearchBot (OpenAI) - OpenAI Search (SearchGPT)
 * - anthropic-ai / Claude-Web (Anthropic) - Claude AI
 * - PerplexityBot (Perplexity AI) - Perplexity search
 * - Google-Extended (Google) - Google SGE/Gemini
 * - Bingbot (Microsoft) - Bing search and Copilot
 *
 * Access: https://bukeer.com/robots.txt
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://studio.bukeer.com';

  return {
    rules: [
      // 1. Default rules for all crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/admin/',
          '/dashboard/',
        ],
      },
      // 2. OpenAI GPTBot - Allow for AI search optimization (AEO)
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      // 3. OpenAI ChatGPT browsing
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      // 4. OpenAI Search (SearchGPT) - distinct from ChatGPT-User
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      // 5. Anthropic Claude - Allow for AI search optimization
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      // 5. Perplexity AI
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      // 6. Google SGE / Gemini
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      // 7. Microsoft Copilot / Bing
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      // 8. Common search engine bots - full access
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'Applebot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'Slurp', // Yahoo
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

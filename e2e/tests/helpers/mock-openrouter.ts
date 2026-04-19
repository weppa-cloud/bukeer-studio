import type { Page, Route, Request } from '@playwright/test';

export interface MockOpenrouterOptions {
  /** If true, the transcreate stream route resolves with a deterministic envelope. */
  transcreateStream?: boolean;
  /** If true, ai-editor routes respond with canned JSON. */
  aiEditor?: boolean;
  /** If true, studio-chat copilot streams a canned assistant message. */
  copilotChat?: boolean;
  /** Simulate an OpenRouter 5xx error instead of a success body. */
  simulateError?: boolean;
  /** Optional override for the envelope payload returned by transcreate/stream. */
  envelope?: Record<string, unknown>;
}

const DEFAULT_ENVELOPE = {
  schema_version: '2.0' as const,
  payload_v2: {
    meta_title: 'QA Package (EN)',
    meta_desc: 'Deterministic mock transcreation for E2E tests.',
    slug: 'qa-package-en',
    h1: 'QA Package',
    keywords: ['qa', 'e2e', 'mock'],
  },
};

const DEFAULT_AI_RESPONSES: Record<string, unknown> = {
  'generate-section': {
    type: 'hero',
    props: { title: 'Mock generated hero', subtitle: 'Stubbed AI content.' },
  },
  'generate-blog': {
    title: 'Mock blog post',
    slug: 'mock-blog-post',
    body: '# Mock blog\n\nStubbed content.',
  },
  'generate-cluster-plan': {
    pillar: 'Mock pillar',
    spokes: ['Spoke A', 'Spoke B'],
  },
  'generate-content-pipeline': {
    weeks: [
      { week: 1, topics: ['Mock topic 1'] },
      { week: 2, topics: ['Mock topic 2'] },
    ],
  },
  'improve-text': { text: 'Mock improved copy.' },
  'score-content': { score: 87, findings: [] },
  'suggest-sections': { suggestions: [{ type: 'about' }, { type: 'cta_banner' }] },
};

export async function installOpenrouterMocks(
  page: Page,
  options: MockOpenrouterOptions = {},
): Promise<void> {
  const {
    transcreateStream = true,
    aiEditor = true,
    copilotChat = true,
    simulateError = false,
    envelope = DEFAULT_ENVELOPE,
  } = options;

  if (transcreateStream) {
    await page.route('**/api/seo/content-intelligence/transcreate/stream', async (route) => {
      if (simulateError) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'AI_STREAM_ERROR', message: 'Mocked upstream failure' } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: JSON.stringify(envelope),
      });
    });
  }

  if (aiEditor) {
    await page.route('**/api/ai/editor/**', async (route) => {
      const path = matchEditorEndpoint(route.request().url());
      if (!path) {
        await route.continue();
        return;
      }
      if (simulateError) {
        await route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'AI_UPSTREAM_ERROR', message: 'Mocked failure' } }),
        });
        return;
      }
      const body = DEFAULT_AI_RESPONSES[path] ?? { ok: true };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: body }),
      });
    });
  }

  if (copilotChat) {
    await page.route('**/api/ai/editor/copilot', async (route) => {
      if (simulateError) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'AI_STREAM_ERROR', message: 'Mocked' } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: 'Mock copilot response.',
      });
    });
  }
}

export async function removeOpenrouterMocks(page: Page): Promise<void> {
  await page.unroute('**/api/seo/content-intelligence/transcreate/stream');
  await page.unroute('**/api/ai/editor/**');
  await page.unroute('**/api/ai/editor/copilot');
}

function matchEditorEndpoint(url: string): string | null {
  const match = url.match(/\/api\/ai\/editor\/([^?\/]+)/);
  return match?.[1] ?? null;
}

export function interceptTranscreateCreateDraft(
  page: Page,
  handler: (request: Request, route: Route) => Promise<void> | void,
): Promise<void> {
  return page.route('**/api/seo/content-intelligence/transcreate', async (route) => {
    await handler(route.request(), route);
  });
}

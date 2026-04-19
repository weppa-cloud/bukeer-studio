/**
 * Tests for AI editor API routes.
 * Validates auth, role checks, rate limiting, and input validation.
 */

// Mock dependencies
jest.mock('@/lib/ai/auth-helpers', () => ({
  getEditorAuth: jest.fn(),
  hasEditorRole: jest.fn(),
}));

jest.mock('@/lib/ai/rate-limit', () => ({
  checkRateLimit: jest.fn(),
  recordCost: jest.fn(),
}));

jest.mock('ai', () => ({
  generateObject: jest.fn(),
  generateText: jest.fn(),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'mock-model'),
}));

jest.mock('@bukeer/website-contract', () => ({
  SECTION_TYPES: ['hero', 'destinations', 'hotels', 'testimonials', 'cta'],
}));

import { getEditorAuth, hasEditorRole } from '@/lib/ai/auth-helpers';
import { checkRateLimit, recordCost } from '@/lib/ai/rate-limit';
import { generateObject, generateText } from 'ai';
import { calculateCost } from '@/lib/ai/model-pricing';
import { NextRequest } from 'next/server';

// Helper to create mock NextRequest
function mockRequest(body: any = {}): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: new Map([['authorization', 'Bearer test-token']]),
  } as any;
}

const mockAuth = {
  userId: 'u1',
  accountId: 'a1',
  role: 'admin',
  token: 'test-token',
};

const mockRateOk = {
  allowed: true,
  remaining: 19,
  resetAt: new Date(Date.now() + 60000),
};

const mockRateBlocked = {
  allowed: false,
  remaining: 0,
  resetAt: new Date(Date.now() + 30000),
  reason: 'Rate limit exceeded: 20 req/min',
};

describe('AI Editor Routes - Common Guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generate-section', () => {
    let POST: (req: NextRequest) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import(
        '@/app/api/ai/editor/generate-section/route'
      );
      POST = mod.POST;
    });

    it('returns 401 when not authenticated', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(null);

      const response = await POST(mockRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when role is insufficient', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(false);

      const response = await POST(mockRequest());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('returns 429 when rate limited', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateBlocked);

      const response = await POST(mockRequest());

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('returns 400 for invalid sectionType', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);

      const response = await POST(
        mockRequest({ sectionType: 'invalid-type' })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid sectionType');
    });

    it('returns 400 for prompt exceeding 2000 chars', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);

      const response = await POST(
        mockRequest({
          sectionType: 'hero',
          prompt: 'x'.repeat(2001),
        })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('too long');
    });

    it('generates section content successfully', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);
      (generateObject as jest.Mock).mockResolvedValue({
        object: { title: 'Welcome', description: 'Travel with us' },
        usage: { totalTokens: 100, inputTokens: 80, outputTokens: 20 },
      });

      const response = await POST(
        mockRequest({ sectionType: 'hero', prompt: 'Travel agency hero' })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.content.title).toBe('Welcome');
      expect(data.data.sectionType).toBe('hero');
      expect(recordCost).toHaveBeenCalledWith(
        'a1',
        calculateCost('mistralai/mistral-large', {
          inputTokens: 80,
          outputTokens: 20,
        }),
      );
    });
  });

  describe('generate-blog', () => {
    let POST: (req: NextRequest) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/ai/editor/generate-blog/route');
      POST = mod.POST;
    });

    it('returns 400 when topic is missing', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);

      const response = await POST(mockRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('topic');
    });

    it('returns 400 when topic exceeds 2000 chars', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);

      const response = await POST(
        mockRequest({ topic: 'x'.repeat(2001) })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('too long');
    });

    it('generates blog post successfully', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);
      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          title: 'Top 10 Destinations',
          slug: 'top-10-destinations',
          excerpt: 'Discover the best places',
          content: '# Top 10\n\nContent...',
          seo: {
            metaTitle: 'Top 10',
            metaDescription: 'Best places',
            keywords: ['travel'],
          },
        },
        usage: { totalTokens: 500, inputTokens: 300, outputTokens: 200 },
      });

      const response = await POST(
        mockRequest({ topic: 'Top destinations in Colombia' })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.post.title).toBe('Top 10 Destinations');
      expect(recordCost).toHaveBeenCalledWith(
        'a1',
        calculateCost('mistralai/mistral-large', {
          inputTokens: 300,
          outputTokens: 200,
        }),
      );
    });
  });

  describe('improve-text', () => {
    let POST: (req: NextRequest) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/ai/editor/improve-text/route');
      POST = mod.POST;
    });

    it('returns 400 when text is missing', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);

      const response = await POST(mockRequest({ action: 'rewrite' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details.some((d: { path: string }) => d.path === 'text')).toBe(true);
    });

    it('returns 400 for invalid action', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);

      const response = await POST(
        mockRequest({ text: 'Hello', action: 'hack' })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details.some((d: { path: string }) => d.path === 'action')).toBe(true);
    });

    it('returns 400 when text exceeds 10000 chars', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);

      const response = await POST(
        mockRequest({ text: 'x'.repeat(10001), action: 'rewrite' })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details.some((d: { path: string }) => d.path === 'text')).toBe(true);
    });

    it('improves text successfully', async () => {
      (getEditorAuth as jest.Mock).mockResolvedValue(mockAuth);
      (hasEditorRole as jest.Mock).mockReturnValue(true);
      (checkRateLimit as jest.Mock).mockResolvedValue(mockRateOk);
      (generateText as jest.Mock).mockResolvedValue({
        text: 'Improved text here',
        usage: { totalTokens: 50 },
      });

      const response = await POST(
        mockRequest({ text: 'Original text', action: 'rewrite' })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.improved).toBe('Improved text here');
      expect(data.data.action).toBe('rewrite');
    });
  });
});

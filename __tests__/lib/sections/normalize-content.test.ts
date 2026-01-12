/**
 * Tests for normalizeContent function
 *
 * Run with: npx jest __tests__/lib/sections/normalize-content.test.ts
 * Or configure Jest in package.json
 */

import {
  normalizeContent,
  normalizeHeroContent,
  normalizeCtaContent,
  normalizeFeaturesContent,
} from '@/lib/sections/normalize-content';

describe('normalizeContent', () => {
  describe('snake_case to camelCase conversion', () => {
    it('converts simple snake_case keys to camelCase', () => {
      const input = {
        cta_text: 'Click me',
        background_image: 'https://example.com/image.jpg',
      };
      const result = normalizeContent(input);

      expect(result).toEqual({
        ctaText: 'Click me',
        backgroundImage: 'https://example.com/image.jpg',
      });
    });

    it('handles deeply nested snake_case keys', () => {
      const input = {
        hero_config: {
          background_image: 'url.jpg',
          cta_text: 'Learn more',
        },
      };
      const result = normalizeContent(input);

      expect(result).toEqual({
        heroConfig: {
          backgroundImage: 'url.jpg',
          ctaText: 'Learn more',
        },
      });
    });

    it('processes arrays of objects', () => {
      const input = {
        items: [
          { featured_image: 'img1.jpg', published_at: '2024-01-01' },
          { featured_image: 'img2.jpg', published_at: '2024-01-02' },
        ],
      };
      const result = normalizeContent(input);

      expect(result).toEqual({
        items: [
          { featuredImage: 'img1.jpg', publishedAt: '2024-01-01' },
          { featuredImage: 'img2.jpg', publishedAt: '2024-01-02' },
        ],
      });
    });
  });

  describe('KEY_ALIASES mapping', () => {
    it('maps cta_href to ctaUrl', () => {
      const input = { cta_href: '/contact' };
      const result = normalizeContent(input);

      expect(result).toEqual({ ctaUrl: '/contact' });
    });

    it('maps cta_url to ctaUrl', () => {
      const input = { cta_url: '/contact' };
      const result = normalizeContent(input);

      expect(result).toEqual({ ctaUrl: '/contact' });
    });

    it('maps ctaHref to ctaUrl', () => {
      const input = { ctaHref: '/contact' };
      const result = normalizeContent(input);

      expect(result).toEqual({ ctaUrl: '/contact' });
    });

    it('maps button_text to buttonText', () => {
      const input = { button_text: 'Submit' };
      const result = normalizeContent(input);

      expect(result).toEqual({ buttonText: 'Submit' });
    });

    it('maps button_href to buttonUrl', () => {
      const input = { button_href: '/submit' };
      const result = normalizeContent(input);

      expect(result).toEqual({ buttonUrl: '/submit' });
    });

    it('maps secondary_button_text to secondaryButtonText', () => {
      const input = { secondary_button_text: 'Cancel' };
      const result = normalizeContent(input);

      expect(result).toEqual({ secondaryButtonText: 'Cancel' });
    });

    it('maps bg_image to backgroundImage', () => {
      const input = { bg_image: 'bg.jpg' };
      const result = normalizeContent(input);

      expect(result).toEqual({ backgroundImage: 'bg.jpg' });
    });

    it('maps show_categories to showCategories', () => {
      const input = { show_categories: true };
      const result = normalizeContent(input);

      expect(result).toEqual({ showCategories: true });
    });
  });

  describe('preserves camelCase keys', () => {
    it('keeps already camelCase keys unchanged', () => {
      const input = {
        ctaText: 'Click',
        backgroundImage: 'url.jpg',
        buttonUrl: '/path',
      };
      const result = normalizeContent(input);

      expect(result).toEqual({
        ctaText: 'Click',
        backgroundImage: 'url.jpg',
        buttonUrl: '/path',
      });
    });
  });

  describe('handles edge cases', () => {
    it('returns empty object for null input', () => {
      const result = normalizeContent(null);
      expect(result).toEqual({});
    });

    it('returns empty object for undefined input', () => {
      const result = normalizeContent(undefined);
      expect(result).toEqual({});
    });

    it('returns empty object for non-object input', () => {
      // @ts-expect-error Testing invalid input
      const result = normalizeContent('string');
      expect(result).toEqual({});
    });

    it('preserves primitive values in arrays', () => {
      const input = {
        tags: ['tag1', 'tag2', 'tag3'],
        numbers: [1, 2, 3],
      };
      const result = normalizeContent(input);

      expect(result).toEqual({
        tags: ['tag1', 'tag2', 'tag3'],
        numbers: [1, 2, 3],
      });
    });

    it('preserves boolean and number values', () => {
      const input = {
        is_enabled: true,
        display_order: 5,
        rating: 4.5,
      };
      const result = normalizeContent(input);

      expect(result).toEqual({
        isEnabled: true,
        displayOrder: 5,
        rating: 4.5,
      });
    });
  });
});

describe('typed helper functions', () => {
  describe('normalizeHeroContent', () => {
    it('returns typed hero content', () => {
      const input = {
        title: 'Welcome',
        subtitle: 'To our site',
        cta_text: 'Learn more',
        cta_href: '/about',
        background_image: 'hero.jpg',
      };
      const result = normalizeHeroContent(input);

      expect(result.title).toBe('Welcome');
      expect(result.subtitle).toBe('To our site');
      expect(result.ctaText).toBe('Learn more');
      expect(result.ctaUrl).toBe('/about');
      expect(result.backgroundImage).toBe('hero.jpg');
    });
  });

  describe('normalizeCtaContent', () => {
    it('returns typed CTA content', () => {
      const input = {
        title: 'Get Started',
        button_text: 'Sign Up',
        button_url: '/signup',
        secondary_button_text: 'Learn More',
        secondary_button_url: '/about',
      };
      const result = normalizeCtaContent(input);

      expect(result.title).toBe('Get Started');
      expect(result.buttonText).toBe('Sign Up');
      expect(result.buttonUrl).toBe('/signup');
      expect(result.secondaryButtonText).toBe('Learn More');
      expect(result.secondaryButtonUrl).toBe('/about');
    });
  });

  describe('normalizeFeaturesContent', () => {
    it('returns typed features content with normalized items', () => {
      const input = {
        title: 'Features',
        items: [
          { icon: 'star', title: 'Feature 1', description: 'Desc 1' },
          { icon: 'heart', title: 'Feature 2', description: 'Desc 2' },
        ],
      };
      const result = normalizeFeaturesContent(input);

      expect(result.title).toBe('Features');
      expect(result.items).toHaveLength(2);
      expect(result.items?.[0].title).toBe('Feature 1');
    });
  });
});

describe('real-world scenarios', () => {
  it('normalizes hero section from legacy DB format', () => {
    const legacyData = {
      title: 'Viajes Increíbles',
      subtitle: 'Descubre el mundo con nosotros',
      background_image: 'https://storage.supabase.co/hero.jpg',
      cta_text: 'Ver Destinos',
      cta_href: '/destinos',
    };

    const result = normalizeContent(legacyData);

    expect(result).toEqual({
      title: 'Viajes Increíbles',
      subtitle: 'Descubre el mundo con nosotros',
      backgroundImage: 'https://storage.supabase.co/hero.jpg',
      ctaText: 'Ver Destinos',
      ctaUrl: '/destinos',
    });
  });

  it('normalizes blog posts from DB format', () => {
    const dbPosts = {
      title: 'Blog',
      posts: [
        {
          id: '1',
          title: 'Post 1',
          slug: 'post-1',
          featured_image: 'https://example.com/img1.jpg',
          published_at: '2024-01-15T10:00:00Z',
        },
      ],
    };

    const result = normalizeContent(dbPosts);

    expect(result.posts[0].featuredImage).toBe('https://example.com/img1.jpg');
    expect(result.posts[0].publishedAt).toBe('2024-01-15T10:00:00Z');
  });

  it('handles mixed casing in same object', () => {
    const mixedData = {
      title: 'Test',
      ctaText: 'Already camelCase',
      background_image: 'needs_conversion.jpg',
      cta_href: '/path',
    };

    const result = normalizeContent(mixedData);

    expect(result).toEqual({
      title: 'Test',
      ctaText: 'Already camelCase',
      backgroundImage: 'needs_conversion.jpg',
      ctaUrl: '/path',
    });
  });
});

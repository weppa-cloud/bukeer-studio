import { test, expect } from '@playwright/experimental-ct-react';
import { ThemeEditor } from '@/components/admin/theme-editor';
import type { WebsiteData } from '@bukeer/website-contract';

const BASE_WEBSITE: WebsiteData = {
  id: 'ct-theme',
  subdomain: 'ct-theme',
  status: 'draft',
  theme: {
    tokens: {
      colors: { seedColor: '#1A237E' },
      typography: { heading: 'Playfair Display', body: 'Inter' },
    },
    profile: { brandMood: 'luxurious' },
  },
  content: {
    siteName: 'CT Test',
    tagline: '',
    logo: '',
    seo: { title: '', description: '', keywords: '' },
    contact: { email: '', phone: '', address: '' },
    social: {},
  },
  account_id: 'ct-account',
  custom_domain: null,
  template_id: 'blank',
  featured_products: { destinations: [], hotels: [], activities: [], transfers: [], packages: [] },
  sections: [],
};

test.describe('<ThemeEditor>', () => {
  test('renders 8 preset swatches', async ({ mount }) => {
    const c = await mount(<ThemeEditor website={BASE_WEBSITE} onSave={async () => undefined} />);
    for (const preset of ['Adventure', 'Luxury', 'Tropical', 'Corporate', 'Boutique', 'Cultural', 'Eco', 'Romantic']) {
      await expect(c).toContainText(preset);
    }
  });

  test('preset click triggers onSave with tokens', async ({ mount }) => {
    let saved: Record<string, unknown> | null = null;
    const c = await mount(
      <ThemeEditor
        website={BASE_WEBSITE}
        onSave={async (update) => {
          saved = update as Record<string, unknown>;
        }}
      />,
    );
    await c.getByRole('button', { name: /Tropical/ }).first().click();
    await expect.poll(() => (saved?.theme as { profile?: { brandMood?: string } } | null)?.profile?.brandMood ?? null, {
      timeout: 3000,
    }).toBe('tropical');
  });

  test('visual — luxury preset', async ({ mount }) => {
    const c = await mount(<ThemeEditor website={BASE_WEBSITE} onSave={async () => undefined} />);
    await expect(c).toHaveScreenshot('theme-editor-luxury.png');
  });
});

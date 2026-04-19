import { test, expect } from '@playwright/experimental-ct-react';
import { BrandKitEditor } from '@/components/admin/brand-kit-editor';
import type { WebsiteData } from '@bukeer/website-contract';

const BASE_WEBSITE: WebsiteData = {
  id: 'ct-brand',
  subdomain: 'ct-brand',
  status: 'draft',
  theme: { tokens: { colors: { seedColor: '#00897B' } }, profile: { brandMood: 'tropical' } },
  content: {
    siteName: 'Brand CT',
    tagline: 'Mood board',
    logo: '',
    logoLight: '',
    logoDark: '',
    seo: { title: '', description: '', keywords: '' },
    contact: { email: '', phone: '', address: '' },
    social: {},
  } as WebsiteData['content'],
  account_id: 'ct-account',
  custom_domain: null,
  template_id: 'blank',
  featured_products: { destinations: [], hotels: [], activities: [], transfers: [], packages: [] },
  sections: [],
};

test.describe('<BrandKitEditor>', () => {
  test('renders mood cards', async ({ mount }) => {
    const c = await mount(<BrandKitEditor website={BASE_WEBSITE} onSave={async () => undefined} />);
    for (const mood of ['Adventurous', 'Luxurious', 'Tropical', 'Corporate', 'Boutique', 'Cultural']) {
      await expect(c).toContainText(mood);
    }
  });

  test('mood click persists via onSave', async ({ mount }) => {
    let saved: Record<string, unknown> | null = null;
    const c = await mount(
      <BrandKitEditor
        website={BASE_WEBSITE}
        onSave={async (update) => {
          saved = update as Record<string, unknown>;
        }}
      />,
    );
    await c.getByRole('button', { name: /Luxurious/i }).first().click();
    await expect.poll(
      () => (saved?.theme as { profile?: { brandMood?: string } } | null)?.profile?.brandMood ?? null,
      { timeout: 3000 },
    ).toBe('luxurious');
  });

  test('visual — tropical defaults', async ({ mount }) => {
    const c = await mount(<BrandKitEditor website={BASE_WEBSITE} onSave={async () => undefined} />);
    await expect(c).toHaveScreenshot('brand-kit-editor-tropical.png');
  });
});

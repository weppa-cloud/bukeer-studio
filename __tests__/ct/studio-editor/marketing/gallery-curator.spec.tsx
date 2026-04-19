import { test, expect } from '@playwright/experimental-ct-react';
import { GalleryCurator } from '@/components/admin/marketing/gallery-curator';

const SAMPLE_ITEM = {
  url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600&h=400&fit=crop',
  alt: 'Sample destination photo',
  caption: 'Caption sample',
};

test.describe('<GalleryCurator>', () => {
  test('readOnly — shows solo lectura and preview tiles', async ({ mount }) => {
    const c = await mount(
      <GalleryCurator
        productId="p-1"
        websiteId="w-1"
        value={[SAMPLE_ITEM]}
        readOnly
      />,
    );
    await expect(c).toContainText(/solo lectura/i);
    await expect(c.getByRole('img').first()).toBeVisible();
    await expect(c.getByRole('button', { name: /subir imagen/i })).toHaveCount(0);
  });

  test('editable — renders tiles + upload button + counter', async ({ mount }) => {
    const c = await mount(
      <GalleryCurator productId="p-1" websiteId="w-1" value={[SAMPLE_ITEM]} onSave={async () => {}} />,
    );
    await expect(c.getByTestId('gallery-tile')).toHaveCount(1);
    await expect(c.getByRole('button', { name: /subir imagen/i })).toBeVisible();
    await expect(c.getByText('1 / 20')).toBeVisible();
  });

  test('upload button disabled when at max (20)', async ({ mount }) => {
    const filled = Array.from({ length: 20 }, (_, i) => ({
      url: `https://example.com/img-${i}.jpg`,
      alt: `Img ${i}`,
      caption: null,
    }));
    const c = await mount(
      <GalleryCurator productId="p-1" websiteId="w-1" value={filled} onSave={async () => {}} />,
    );
    await expect(c.getByRole('button', { name: /subir imagen/i })).toBeDisabled();
  });

  test('remove tile updates draft + counter', async ({ mount }) => {
    const c = await mount(
      <GalleryCurator
        productId="p-1"
        websiteId="w-1"
        value={[SAMPLE_ITEM, { ...SAMPLE_ITEM, url: 'https://example.com/b.jpg' }]}
        onSave={async () => {}}
      />,
    );
    await expect(c.getByTestId('gallery-tile')).toHaveCount(2);
    await c.getByRole('button', { name: /eliminar imagen 2/i }).click();
    await expect(c.getByTestId('gallery-tile')).toHaveCount(1);
    await expect(c.getByText('1 / 20')).toBeVisible();
  });

  test('edit alt field triggers dirty save button', async ({ mount }) => {
    let captured: Array<{ url: string; alt?: string | null; caption?: string | null }> | undefined;
    const c = await mount(
      <GalleryCurator
        productId="p-1"
        websiteId="w-1"
        value={[SAMPLE_ITEM]}
        onSave={async (v) => {
          captured = v;
        }}
      />,
    );
    const altInput = c.locator('#gallery-alt-0');
    await altInput.fill('Updated alt');
    await c.getByRole('button', { name: 'Guardar' }).click();
    await expect(c.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(captured?.[0].alt).toBe('Updated alt');
  });

  test('has data-testid for Playwright smoke', async ({ mount }) => {
    const c = await mount(
      <GalleryCurator productId="p-1" websiteId="w-1" value={[]} />,
    );
    await expect(c).toHaveAttribute('data-testid', 'marketing-editor-gallery');
  });

  test('visual — empty editable', async ({ mount }) => {
    const c = await mount(
      <GalleryCurator productId="p-1" websiteId="w-1" value={[]} onSave={async () => {}} />,
    );
    await expect(c).toHaveScreenshot('gallery-curator-empty.png');
  });

  test('visual — readOnly with items', async ({ mount }) => {
    const c = await mount(
      <GalleryCurator
        productId="p-1"
        websiteId="w-1"
        value={[SAMPLE_ITEM, { ...SAMPLE_ITEM, url: 'https://example.com/b.jpg' }]}
        readOnly
      />,
    );
    await expect(c).toHaveScreenshot('gallery-curator-readonly.png');
  });
});

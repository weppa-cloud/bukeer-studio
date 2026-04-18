import { test, expect } from '@playwright/experimental-ct-react';
import { SocialImagePicker } from '@/components/admin/marketing/social-image-picker';

test.describe('<SocialImagePicker>', () => {
  test('readOnly — shows solo lectura and preview', async ({ mount }) => {
    const c = await mount(
      <SocialImagePicker
        productId="p-1"
        value="https://example.com/img.jpg"
        readOnly
      />,
    );
    await expect(c).toContainText(/solo lectura/i);
    await expect(c.getByRole('img')).toBeVisible();
    await expect(c.getByRole('textbox')).toHaveCount(0);
  });

  test('invalid URL — save disabled', async ({ mount }) => {
    const c = await mount(
      <SocialImagePicker productId="p-1" value={null} onSave={async () => {}} />,
    );
    await c.getByLabel(/url de la imagen/i).fill('notaurl');
    await expect(c.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  test('valid URL — save emits trimmed url', async ({ mount }) => {
    let captured: string | null | undefined;
    const c = await mount(
      <SocialImagePicker
        productId="p-1"
        value={null}
        onSave={async (v) => {
          captured = v;
        }}
      />,
    );
    await c.getByLabel(/url de la imagen/i).fill('  https://example.com/a.jpg  ');
    await c.getByRole('button', { name: /guardar/i }).click();
    await expect(c.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(captured).toBe('https://example.com/a.jpg');
  });

  test('empty save → null', async ({ mount }) => {
    let captured: string | null | undefined = 'sentinel';
    const c = await mount(
      <SocialImagePicker
        productId="p-1"
        value="https://example.com/old.jpg"
        onSave={async (v) => {
          captured = v;
        }}
      />,
    );
    await c.getByLabel(/url de la imagen/i).fill('');
    await c.getByRole('button', { name: /guardar/i }).click();
    await expect(c.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(captured).toBeNull();
  });

  test('has data-testid for Playwright smoke', async ({ mount }) => {
    const c = await mount(<SocialImagePicker productId="p-1" value={null} />);
    await expect(c).toHaveAttribute('data-testid', 'marketing-editor-social-image');
  });

  test('visual — empty state', async ({ mount }) => {
    const c = await mount(<SocialImagePicker productId="p-1" value={null} />);
    await expect(c).toHaveScreenshot('social-image-picker-empty.png');
  });

  test('visual — with preview', async ({ mount }) => {
    const c = await mount(
      <SocialImagePicker
        productId="p-1"
        value="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&h=630&fit=crop"
      />,
    );
    await expect(c).toHaveScreenshot('social-image-picker-with-preview.png');
  });

  test('visual — readOnly with image', async ({ mount }) => {
    const c = await mount(
      <SocialImagePicker
        productId="p-1"
        value="https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&h=630&fit=crop"
        readOnly
      />,
    );
    await expect(c).toHaveScreenshot('social-image-picker-readonly.png');
  });
});

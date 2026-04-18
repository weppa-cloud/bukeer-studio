import { test, expect } from '@playwright/experimental-ct-react';
import { SectionVisibilityToggle } from '@/components/admin/page-customization/section-visibility-toggle';

test.describe('<SectionVisibilityToggle>', () => {
  test('empty — todas visibles por default', async ({ mount }) => {
    const c = await mount(
      <SectionVisibilityToggle productId="p-1" productType="activity" hiddenSections={[]} />,
    );
    const toggles = c.getByRole('button', { name: /alternar visibilidad/i });
    await expect(toggles.first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('filled — secciones ocultas reflejan aria-pressed false', async ({ mount }) => {
    const c = await mount(
      <SectionVisibilityToggle
        productId="p-1"
        productType="activity"
        hiddenSections={['gallery', 'faq']}
      />,
    );
    await expect(c.getByRole('button', { name: /alternar visibilidad: galería/i })).toHaveAttribute('aria-pressed', 'false');
    await expect(c.getByRole('button', { name: /alternar visibilidad: hero/i })).toHaveAttribute('aria-pressed', 'true');
  });

  test('readOnly — toggles disabled + banner', async ({ mount }) => {
    const c = await mount(
      <SectionVisibilityToggle
        productId="p-1"
        productType="package"
        hiddenSections={[]}
        readOnly
      />,
    );
    await expect(c.getByRole('alert')).toContainText(/solo lectura/i);
    const firstToggle = c.getByRole('button', { name: /alternar visibilidad/i }).first();
    await expect(firstToggle).toBeDisabled();
  });

  test('visual — activity', async ({ mount }) => {
    const c = await mount(
      <SectionVisibilityToggle productId="p-1" productType="activity" hiddenSections={[]} />,
    );
    await expect(c).toHaveScreenshot('section-visibility-toggle-activity.png');
  });

  test('visual — package with hidden', async ({ mount }) => {
    const c = await mount(
      <SectionVisibilityToggle
        productId="p-1"
        productType="package"
        hiddenSections={['gallery', 'faq']}
      />,
    );
    await expect(c).toHaveScreenshot('section-visibility-toggle-package-hidden.png');
  });
});

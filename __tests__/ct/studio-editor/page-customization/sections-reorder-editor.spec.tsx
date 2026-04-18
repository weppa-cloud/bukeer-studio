import { test, expect } from '@playwright/experimental-ct-react';
import { SectionsReorderEditor } from '@/components/admin/page-customization/sections-reorder-editor';

test.describe('<SectionsReorderEditor>', () => {
  test('empty — usa orden default de renderable sections', async ({ mount }) => {
    const c = await mount(
      <SectionsReorderEditor productId="p-1" productType="activity" sectionsOrder={[]} />,
    );
    const items = c.getByRole('listitem');
    await expect(items.first()).toContainText('Hero');
  });

  test('filled — respeta orden custom', async ({ mount }) => {
    const c = await mount(
      <SectionsReorderEditor
        productId="p-1"
        productType="activity"
        sectionsOrder={['faq', 'hero', 'gallery']}
      />,
    );
    const items = c.getByRole('listitem');
    await expect(items.first()).toContainText('FAQ');
  });

  test('arrow keys — nudge button disabled on edges', async ({ mount }) => {
    const c = await mount(
      <SectionsReorderEditor productId="p-1" productType="activity" sectionsOrder={[]} />,
    );
    const firstItem = c.getByRole('listitem').first();
    const upButton = firstItem.getByRole('button', { name: /^subir:/i });
    await expect(upButton).toBeDisabled();
  });

  test('readOnly — drag handles disabled + banner', async ({ mount }) => {
    const c = await mount(
      <SectionsReorderEditor
        productId="p-1"
        productType="package"
        sectionsOrder={[]}
        readOnly
      />,
    );
    await expect(c.getByRole('alert')).toContainText(/solo lectura/i);
    const dragHandle = c.getByRole('button', { name: /^arrastrar:/i }).first();
    await expect(dragHandle).toBeDisabled();
  });

  test('visual — activity default order', async ({ mount }) => {
    const c = await mount(
      <SectionsReorderEditor productId="p-1" productType="activity" sectionsOrder={[]} />,
    );
    await expect(c).toHaveScreenshot('sections-reorder-editor-activity.png');
  });
});

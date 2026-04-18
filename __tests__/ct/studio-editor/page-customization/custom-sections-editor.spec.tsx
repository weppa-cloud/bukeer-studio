import { test, expect } from '@playwright/experimental-ct-react';
import { CustomSectionsEditor } from '@/components/admin/page-customization/custom-sections-editor';
import type { CustomSection } from '@bukeer/website-contract';

const FILLED: CustomSection[] = [
  { id: 's1', type: 'text', position: 0, content: { html: '<p>Hello</p>' } },
  { id: 's2', type: 'cta', position: 1, content: { label: 'Reservar', href: 'https://example.com', variant: 'primary' } },
];

test.describe('<CustomSectionsEditor>', () => {
  test('empty — muestra mensaje + CTA de agregar', async ({ mount }) => {
    const c = await mount(<CustomSectionsEditor productId="p-1" sections={[]} />);
    await expect(c.getByText(/aún no hay secciones personalizadas/i)).toBeVisible();
    await expect(c.getByRole('button', { name: /agregar sección/i })).toBeVisible();
  });

  test('filled — lista secciones con tipo + posición', async ({ mount }) => {
    const c = await mount(<CustomSectionsEditor productId="p-1" sections={FILLED} />);
    const items = c.getByRole('listitem');
    await expect(items.first()).toContainText('text');
    await expect(items.first()).toContainText('Posición 1');
    await expect(items.nth(1)).toContainText('cta');
  });

  test('readOnly — sin botón de agregar + banner', async ({ mount }) => {
    const c = await mount(<CustomSectionsEditor productId="p-1" sections={FILLED} readOnly />);
    await expect(c.getByRole('alert')).toContainText(/solo lectura/i);
    await expect(c.getByRole('button', { name: /agregar sección/i })).toHaveCount(0);
    await expect(c.getByRole('button', { name: /eliminar/i })).toHaveCount(0);
  });

  test('visual — empty', async ({ mount }) => {
    const c = await mount(<CustomSectionsEditor productId="p-1" sections={[]} />);
    await expect(c).toHaveScreenshot('custom-sections-editor-empty.png');
  });

  test('visual — filled', async ({ mount }) => {
    const c = await mount(<CustomSectionsEditor productId="p-1" sections={FILLED} />);
    await expect(c).toHaveScreenshot('custom-sections-editor-filled.png');
  });
});

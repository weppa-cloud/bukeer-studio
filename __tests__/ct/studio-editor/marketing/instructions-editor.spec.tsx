import { test, expect } from '@playwright/experimental-ct-react';
import { InstructionsEditor } from '@/components/admin/marketing/instructions-editor';

test.describe('<InstructionsEditor>', () => {
  test('readOnly — shows solo lectura alert', async ({ mount }) => {
    const c = await mount(
      <InstructionsEditor productId="p-1" value="Nos vemos en el hotel" readOnly />,
    );
    await expect(c).toContainText(/solo lectura/i);
    await expect(c).toContainText('Nos vemos en el hotel');
    await expect(c.getByRole('textbox')).toHaveCount(0);
  });

  test('save calls onSave with trimmed value', async ({ mount }) => {
    let captured: string | null | undefined;
    const c = await mount(
      <InstructionsEditor
        productId="p-1"
        value={null}
        onSave={async (v) => {
          captured = v;
        }}
      />,
    );
    await c.getByLabel(/contenido/i).fill('  Lobby 7am  ');
    await c.getByRole('button', { name: /guardar/i }).click();
    await expect(c.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(captured).toBe('Lobby 7am');
  });

  test('empty save → null', async ({ mount }) => {
    let captured: string | null | undefined = 'sentinel';
    const c = await mount(
      <InstructionsEditor
        productId="p-1"
        value="texto"
        onSave={async (v) => {
          captured = v;
        }}
      />,
    );
    await c.getByLabel(/contenido/i).fill('');
    await c.getByRole('button', { name: /guardar/i }).click();
    await expect(c.getByText('Guardado')).toBeVisible({ timeout: 2000 });
    expect(captured).toBeNull();
  });

  test('save button disabled when unchanged', async ({ mount }) => {
    const c = await mount(
      <InstructionsEditor productId="p-1" value="texto" onSave={async () => {}} />,
    );
    await expect(c.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  test('has data-testid for Playwright smoke', async ({ mount }) => {
    const c = await mount(<InstructionsEditor productId="p-1" value="x" />);
    await expect(c).toHaveAttribute('data-testid', 'marketing-editor-instructions');
  });

  test('visual — empty state', async ({ mount }) => {
    const c = await mount(<InstructionsEditor productId="p-1" value={null} />);
    await expect(c).toHaveScreenshot('instructions-editor-empty.png');
  });

  test('visual — filled', async ({ mount }) => {
    const c = await mount(
      <InstructionsEditor
        productId="p-1"
        value="Nos encontramos en el lobby del hotel a las 7:00 AM."
      />,
    );
    await expect(c).toHaveScreenshot('instructions-editor-filled.png');
  });

  test('visual — readOnly', async ({ mount }) => {
    const c = await mount(
      <InstructionsEditor productId="p-1" value="Lobby del hotel a las 7:00 AM." readOnly />,
    );
    await expect(c).toHaveScreenshot('instructions-editor-readonly.png');
  });
});

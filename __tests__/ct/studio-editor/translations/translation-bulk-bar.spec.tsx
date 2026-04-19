import { test, expect } from '@playwright/experimental-ct-react';
import { TranslationBulkBar } from '@/components/admin/translation-bulk-bar';

test.describe('<TranslationBulkBar>', () => {
  test('renders singular form when count is 1', async ({ mount }) => {
    const c = await mount(
      <TranslationBulkBar count={1} onRun={async () => undefined} onClear={() => undefined} />,
    );
    await expect(c).toContainText('1 seleccionado');
  });

  test('renders plural form when count > 1', async ({ mount }) => {
    const c = await mount(
      <TranslationBulkBar count={5} onRun={async () => undefined} onClear={() => undefined} />,
    );
    await expect(c).toContainText('5 seleccionados');
  });

  test('Review action fires onRun with "review" and no fields', async ({ mount }) => {
    const calls: Array<{ action: string; fields?: string[] }> = [];
    const c = await mount(
      <TranslationBulkBar
        count={2}
        onRun={async (action, fields) => {
          calls.push({ action, fields: fields?.map(String) });
        }}
        onClear={() => undefined}
      />,
    );
    await c.getByRole('button', { name: /^Review seleccionados$/ }).click();
    expect(calls.length).toBe(1);
    expect(calls[0].action).toBe('review');
    expect(calls[0].fields).toBeUndefined();
  });

  test('busy state disables actions', async ({ mount }) => {
    const c = await mount(
      <TranslationBulkBar count={3} busy onRun={async () => undefined} onClear={() => undefined} />,
    );
    await expect(c.getByRole('button', { name: /Review seleccionados/ })).toBeDisabled();
  });

  test('error message surfaces when provided', async ({ mount }) => {
    const c = await mount(
      <TranslationBulkBar
        count={1}
        error="Bulk apply failed: mock"
        onRun={async () => undefined}
        onClear={() => undefined}
      />,
    );
    await expect(c).toContainText('Bulk apply failed: mock');
  });

  test('visual — idle', async ({ mount }) => {
    const c = await mount(
      <TranslationBulkBar count={2} onRun={async () => undefined} onClear={() => undefined} />,
    );
    await expect(c).toHaveScreenshot('translation-bulk-bar-idle.png');
  });

  test('visual — error', async ({ mount }) => {
    const c = await mount(
      <TranslationBulkBar
        count={4}
        error="Bulk apply: 1 fallaron."
        onRun={async () => undefined}
        onClear={() => undefined}
      />,
    );
    await expect(c).toHaveScreenshot('translation-bulk-bar-error.png');
  });
});

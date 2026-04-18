import { test, expect } from '@playwright/experimental-ct-react';
import { AiFlagsPanel } from '@/components/admin/content-health/ai-flags-panel';
import type { AiField } from '@bukeer/website-contract';

const FIELDS: AiField[] = [
  { field: 'description', locked: false, generated_at: '2026-04-15T10:00:00Z', hash: 'abc' },
  { field: 'highlights', locked: true, generated_at: '2026-04-10T10:00:00Z', hash: 'def' },
];

test.describe('<AiFlagsPanel>', () => {
  test('empty — no renderiza si no hay campos', async ({ mount }) => {
    const c = await mount(<AiFlagsPanel productId="p-1" aiFields={[]} />);
    await expect(c.getByRole('region')).toHaveCount(0);
  });

  test('filled — muestra campos con lock state', async ({ mount }) => {
    const c = await mount(<AiFlagsPanel productId="p-1" aiFields={FIELDS} />);
    const items = c.getByRole('listitem');
    await expect(items).toHaveCount(2);
    await expect(c.getByRole('button', { name: /desbloquear campo highlights/i })).toBeVisible();
  });

  test('readOnly — toggles disabled', async ({ mount }) => {
    const c = await mount(<AiFlagsPanel productId="p-1" aiFields={FIELDS} readOnly />);
    const firstToggle = c.getByRole('button', { name: /bloquear|desbloquear/i }).first();
    await expect(firstToggle).toBeDisabled();
  });

  test('visual — filled', async ({ mount }) => {
    const c = await mount(<AiFlagsPanel productId="p-1" aiFields={FIELDS} />);
    await expect(c).toHaveScreenshot('ai-flags-panel-filled.png');
  });
});

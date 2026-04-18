import { test, expect } from '@playwright/experimental-ct-react';
import { Badge } from '@/components/ui/badge';

test.describe('<Badge>', () => {
  test('renders default variant', async ({ mount }) => {
    const component = await mount(<Badge>Active</Badge>);
    await expect(component).toHaveText('Active');
  });

  test('applies variant classes', async ({ mount }) => {
    const component = await mount(<Badge variant="emerald">Verified</Badge>);
    await expect(component).toHaveClass(/bg-brand-emerald/);
  });

  test('visual — default', async ({ mount }) => {
    const component = await mount(<Badge>Active</Badge>);
    await expect(component).toHaveScreenshot('badge-default.png');
  });

  test('visual — emerald', async ({ mount }) => {
    const component = await mount(<Badge variant="emerald">Verified</Badge>);
    await expect(component).toHaveScreenshot('badge-emerald.png');
  });

  test('visual — destructive', async ({ mount }) => {
    const component = await mount(<Badge variant="destructive">Error</Badge>);
    await expect(component).toHaveScreenshot('badge-destructive.png');
  });
});

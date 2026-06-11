import { renderToStaticMarkup } from 'react-dom/server';
import { AccountModule } from '@/components/admin-next/account-module';
import { accountFixture } from '@/lib/admin-next/fixtures/account';

describe('AccountModule', () => {
  it('renders account panels with agent test ids and Evolucion preset metadata', () => {
    const markup = renderToStaticMarkup(
      <AccountModule
        session={{
          status: 'authenticated',
          userId: 'user-1',
          email: 'agent@bukeer.test',
          accountId: 'account-1',
          role: 'admin',
          displayName: 'Agent One',
          permissions: ['admin_next.view'],
          flags: {
            adminNextPrototype: true,
          },
        }}
        fixture={accountFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-account-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-testid="admin-next-account-profile"');
    expect(markup).toContain('data-testid="admin-next-account-security"');
    expect(markup).toContain('data-testid="admin-next-account-notifications"');
    expect(markup).toContain('data-testid="admin-next-account-signature"');
    expect(markup).toContain('Carolina Ruiz');
    expect(markup).toContain('ColombiaTours.travel');
  });
});

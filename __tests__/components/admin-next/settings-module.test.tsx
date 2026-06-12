import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsModule } from '@/components/admin-next/settings-module';
import { settingsFixture } from '@/lib/admin-next/fixtures/settings';

describe('SettingsModule', () => {
  it('renders settings panels with agent test ids and Evolucion preset metadata', () => {
    const markup = renderToStaticMarkup(
      <SettingsModule
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
        fixture={settingsFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-settings-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-testid="admin-next-settings-agency"');
    expect(markup).toContain('data-testid="admin-next-settings-rules"');
    expect(markup).toContain('data-testid="admin-next-settings-billing"');
    expect(markup).toContain('data-testid="admin-next-settings-team"');
    expect(markup).toContain('data-testid="admin-next-settings-integrations"');
    expect(markup).toContain('ColombiaTours.travel');
    expect(markup).toContain('Cuotas pagadas inmutables');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { AgendaModule } from '@/components/admin-next/agenda-module';
import { agendaFixture } from '@/lib/admin-next/fixtures/agenda';

describe('AgendaModule', () => {
  it('renders agenda panels with agent test ids and Evolucion preset metadata', () => {
    const markup = renderToStaticMarkup(
      <AgendaModule
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
        fixture={agendaFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-agenda-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-testid="admin-next-agenda-toolbar"');
    expect(markup).toContain('data-testid="admin-next-agenda-day-jun-12"');
    expect(markup).toContain('data-testid="admin-next-agenda-service-flight-bog-adz"');
    expect(markup).toContain('data-testid="admin-next-agenda-ai-panel"');
    expect(markup).toContain('Vuelo BOG a ADZ');
    expect(markup).toContain('Hotel Las Islas');
  });
});

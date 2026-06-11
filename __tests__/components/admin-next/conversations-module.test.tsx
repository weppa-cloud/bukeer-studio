import { renderToStaticMarkup } from 'react-dom/server';
import { ConversationsModule } from '@/components/admin-next/conversations-module';
import { conversationsFixture } from '@/lib/admin-next/fixtures/conversations';

describe('ConversationsModule', () => {
  it('renders CRM conversation surfaces with Evolucion preset metadata', () => {
    const markup = renderToStaticMarkup(
      <ConversationsModule
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
        fixture={conversationsFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-conversations-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-testid="admin-next-conversations-inbox"');
    expect(markup).toContain('data-testid="admin-next-conversations-thread"');
    expect(markup).toContain('data-testid="admin-next-conversations-composer"');
    expect(markup).toContain('data-testid="admin-next-conversations-crm-panel"');
    expect(markup).toContain('data-testid="admin-next-conversations-ai-assist"');
    expect(markup).toContain(
      'data-testid="admin-next-conversations-linked-itinerary"',
    );
    expect(markup).toContain(
      'data-testid="admin-next-conversations-realtime-status"',
    );
    expect(markup).toContain('data-latency-contract="&lt;= Flutter/Chatwoot"');
    expect(markup).toContain(
      'data-testid="admin-next-conversations-lead-temperature"',
    );
    expect(markup).toContain('data-temperature="hot"');
    expect(markup).toContain(
      'data-testid="admin-next-conversations-create-request"',
    );
    expect(markup).toContain('data-testid="admin-next-conversations-close"');
    expect(markup).toContain('Laura Mejia');
  });
});

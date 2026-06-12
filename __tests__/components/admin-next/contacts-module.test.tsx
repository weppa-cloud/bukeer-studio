import { renderToStaticMarkup } from 'react-dom/server';
import { ContactsModule } from '@/components/admin-next/contacts-module';
import { contactsFixture } from '@/lib/admin-next/fixtures/contacts';

describe('ContactsModule', () => {
  it('renders contacts panels with agent test ids and Evolucion preset metadata', () => {
    const markup = renderToStaticMarkup(
      <ContactsModule
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
        fixture={contactsFixture}
        evolucionTheme={{
          presetSlug: 'evolucion',
          styles: {
            light: { ['--bukeer-test-token' as string]: 'light' },
            dark: { ['--bukeer-test-token' as string]: 'dark' },
          },
        }}
      />,
    );

    expect(markup).toContain('data-testid="admin-next-contacts-root"');
    expect(markup).toContain('data-theme-preset="evolucion"');
    expect(markup).toContain('data-testid="admin-next-contacts-toolbar"');
    expect(markup).toContain('data-testid="admin-next-contact-card-laura-martinez"');
    expect(markup).toContain('data-testid="admin-next-contacts-detail"');
    expect(markup).toContain('data-testid="admin-next-contacts-ai-panel"');
    expect(markup).toContain('Laura Martinez');
    expect(markup).toContain('Hotel Las Islas');
  });
});

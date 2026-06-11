import { notFound } from 'next/navigation';
import { ConversationsModule } from '@/components/admin-next';
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from '@/lib/admin-next/evolucion-theme';
import { conversationsFixture } from '@/lib/admin-next/fixtures/conversations';
import type { AdminNextSessionContext } from '@/lib/admin-next/session/get-admin-session-context';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Conversaciones Smoke | Bukeer Admin Next',
};

const smokeSession: Extract<AdminNextSessionContext, { status: 'authenticated' }> = {
  status: 'authenticated',
  userId: 'conversations-smoke-user',
  email: 'conversations-smoke@bukeer.local',
  accountId: 'conversations-smoke-account',
  role: 'admin',
  displayName: 'Conversations Smoke',
  permissions: ['admin_next.view', 'planner.view', 'trace.view'],
  flags: {
    adminNextPrototype: true,
    adminNextBetaReadonlyEnabled: false,
    adminNextBetaAccountAllowed: false,
    adminNextBetaRoleAllowed: false,
    adminNextBetaReadonly: false,
    adminNextExternalHandoff: false,
  },
};

export default function AdminNextConversationsSmokePage() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED !== 'true'
  ) {
    notFound();
  }

  return (
    <ConversationsModule
      session={smokeSession}
      fixture={conversationsFixture}
      evolucionTheme={{
        presetSlug: evolucionThemeMetadata.presetSlug,
        styles: {
          light: getEvolucionThemeStyle('light'),
          dark: getEvolucionThemeStyle('dark'),
        },
      }}
    />
  );
}

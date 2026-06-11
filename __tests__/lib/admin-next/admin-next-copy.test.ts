import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';

describe('adminNextCopy', () => {
  it('keeps stable shell navigation keys for agent selectors', () => {
    expect(adminNextCopy.shell.nav.map((item) => item.key)).toEqual([
      'dashboard',
      'planner',
      'conversations',
      'contacts',
      'agenda',
      'account',
      'settings',
    ]);
  });

  it('formats derived labels through the copy contract', () => {
    expect(adminNextCopy.tripRail.paxLabel(4)).toBe('4 pax');
    expect(adminNextCopy.tripRail.marginLabel('18%')).toBe('18% margin');
    expect(adminNextCopy.liveFeed.marginLabel('22%')).toBe('22% margin');
  });

  it('keeps prototype actions and runtime fallback messages in the copy contract', () => {
    expect(adminNextCopy.planningCanvas.traceAction).toBe('Trace');
    expect(adminNextCopy.prototype.lightModeAction).toBe('Light');
    expect(adminNextCopy.prototype.darkModeAction).toBe('Dark');
    expect(adminNextCopy.prototype.whatsappHandoffFallbackError).toContain('WhatsApp handoff');
  });

  it('keeps dashboard module copy centralized', () => {
    expect(adminNextCopy.dashboard.title).toBe('Dashboard');
    expect(adminNextCopy.dashboard.salesVsCostTitle).toBe('Ventas vs. costo');
    expect(adminNextCopy.dashboard.targetProgress(92)).toBe('92% de la meta');
  });

  it('keeps contacts module copy centralized', () => {
    expect(adminNextCopy.contacts.title).toBe('Contactos');
    expect(adminNextCopy.contacts.filters.map((filter) => filter.key)).toEqual([
      'all',
      'clients',
      'providers',
      'debt',
    ]);
    expect(adminNextCopy.contacts.totalLabel(6)).toBe('6 visibles');
  });

  it('keeps agenda module copy centralized', () => {
    expect(adminNextCopy.agenda.title).toBe('Agenda de servicios');
    expect(adminNextCopy.agenda.filters.map((filter) => filter.key)).toEqual([
      'all',
      'flights',
      'hotels',
      'transport',
      'services',
    ]);
    expect(adminNextCopy.agenda.itineraryLabel('2647')).toBe('ID 2647');
  });

  it('keeps account module copy centralized', () => {
    expect(adminNextCopy.account.title).toBe('Mi cuenta');
    expect(adminNextCopy.account.profileTitle).toBe('Perfil');
    expect(adminNextCopy.account.signOutAction).toBe('Cerrar sesion');
  });

  it('keeps signature UI copy and formatters centralized', () => {
    expect(adminNextCopy.signature.statusLabels.approval_required).toBe('Approval required');
    expect(adminNextCopy.signature.blockedBanner.missingFieldsPill(3)).toBe('3 fields missing');
    expect(adminNextCopy.signature.manifest.marginLabel('18%')).toBe('18% margin');
    expect(adminNextCopy.signature.approvalBar.permissionLabel('itineraries.approve')).toBe(
      'Permission: itineraries.approve',
    );
  });
});

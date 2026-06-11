import { adminNextCopy } from '@/lib/admin-next/admin-next-copy';

describe('adminNextCopy', () => {
  it('keeps stable shell navigation keys for agent selectors', () => {
    expect(adminNextCopy.shell.nav.map((item) => item.key)).toEqual([
      'dashboard',
      'planner',
      'conversations',
      'contacts',
      'products',
      'reports',
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

  it('keeps conversations module copy centralized', () => {
    expect(adminNextCopy.conversations.title).toBe('Conversaciones');
    expect(adminNextCopy.conversations.closeOutcomeLabels.no_purchase).toBe('No compro');
    expect(adminNextCopy.conversations.reasonRequiredLabel).toBe(
      'Motivo obligatorio para No compro',
    );
    expect(adminNextCopy.conversations.unreadLabel(3)).toBe('3 sin leer');
    expect(adminNextCopy.conversations.channelLabels.whatsapp).toBe('WhatsApp');
    expect(adminNextCopy.conversations.temperatureLabels.hot).toBe('Caliente');
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

  it('keeps products module copy centralized', () => {
    expect(adminNextCopy.products.title).toBe('Productos');
    expect(adminNextCopy.products.manageImagesAction(6)).toBe('Gestionar imagenes · 6');
    expect(adminNextCopy.products.activeRatesLabel(3)).toBe('3 vigentes');
    expect(adminNextCopy.products.resultsLabel(2)).toBe('2 productos visibles');
    expect(adminNextCopy.products.catalogContractLabel).toBe('Catalogo V2');
    expect(adminNextCopy.products.resolverActionLabels.rate_required).toBe('Vincular + tarifa');
    expect(adminNextCopy.products.cityFilterOptions.map((option) => option.key)).toEqual([
      'cartagena',
      'san-andres',
    ]);
    expect(adminNextCopy.products.priceRangeOptions.map((option) => option.key)).toEqual([
      'budget',
      'mid',
      'premium',
    ]);
    expect(adminNextCopy.products.importCsvResultLabel(3)).toBe('3 productos preparados');
    expect(adminNextCopy.products.importCsvMappings).toHaveLength(6);
    expect(adminNextCopy.products.importCsvPreviewRows).toHaveLength(3);
    expect(adminNextCopy.products.rateRequiredGateTitle).toBe('Tarifa obligatoria pendiente');
    expect(adminNextCopy.products.rateReadyGateTitle).toBe('Tarifa activa lista');
  });

  it('keeps reports module copy centralized', () => {
    expect(adminNextCopy.reports.title).toBe('Reportes');
    expect(adminNextCopy.reports.exportAction).toBe('Exportar CSV');
    expect(adminNextCopy.reports.urlStateLabel).toBe('URL-as-state');
    expect(adminNextCopy.reports.aiPanelTitle).toBe('Riesgos y gates');
  });

  it('keeps account module copy centralized', () => {
    expect(adminNextCopy.account.title).toBe('Mi cuenta');
    expect(adminNextCopy.account.profileTitle).toBe('Perfil');
    expect(adminNextCopy.account.signOutAction).toBe('Cerrar sesion');
  });

  it('keeps settings module copy centralized', () => {
    expect(adminNextCopy.settings.title).toBe('Configuracion');
    expect(adminNextCopy.settings.agencyTitle).toBe('Agencia');
    expect(adminNextCopy.settings.rulesTitle).toBe('Reglas de negocio');
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

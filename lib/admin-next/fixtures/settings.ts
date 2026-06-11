export type SettingsToggle = {
  id: string;
  label: string;
  detail: string;
  enabled: boolean;
};

export type SettingsItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type SettingsIntegration = {
  id: string;
  name: string;
  status: string;
  detail: string;
};

export type SettingsFixture = {
  agency: {
    name: string;
    website: string;
    locale: string;
    currency: string;
  };
  businessRules: SettingsToggle[];
  billing: SettingsItem[];
  team: SettingsItem[];
  integrations: SettingsIntegration[];
};

export const settingsFixture: SettingsFixture = {
  agency: {
    name: 'ColombiaTours.travel',
    website: 'colombiatours.travel',
    locale: 'Espanol (Colombia)',
    currency: 'COP · Peso colombiano',
  },
  businessRules: [
    {
      id: 'immutable-paid-installments',
      label: 'Cuotas pagadas inmutables',
      detail: 'Bloquea ediciones en pagos conciliados y deja trazabilidad.',
      enabled: true,
    },
    {
      id: 'closure-reason-required',
      label: 'Motivo de cierre obligatorio',
      detail: 'Exige razon al cerrar oportunidades perdidas o canceladas.',
      enabled: true,
    },
    {
      id: 'media-master-override',
      label: 'Fotos maestro con override',
      detail: 'Usa registro canonico de media y permite excepciones por producto.',
      enabled: true,
    },
  ],
  billing: [
    {
      id: 'tax-profile',
      label: 'Perfil fiscal',
      value: 'NIT 901.555.428-1',
      detail: 'Facturacion electronica activa para propuestas y recibos.',
    },
    {
      id: 'payment-terms',
      label: 'Condiciones de pago',
      value: '40% reserva · 60% antes del viaje',
      detail: 'Plantilla aplicada por defecto a nuevos itinerarios.',
    },
  ],
  team: [
    {
      id: 'default-role',
      label: 'Rol por defecto',
      value: 'Travel Planner',
      detail: 'Nuevos usuarios entran sin permisos administrativos.',
    },
    {
      id: 'approval-owner',
      label: 'Aprobador principal',
      value: 'Carolina Ruiz',
      detail: 'Recibe solicitudes de margen, cierres y pagos especiales.',
    },
  ],
  integrations: [
    {
      id: 'supabase',
      name: 'Supabase',
      status: 'Conectado',
      detail: 'Auth, base de datos, storage y edge functions disponibles.',
    },
    {
      id: 'chatwoot',
      name: 'Chatwoot',
      status: 'Observado',
      detail: 'Canal de conversaciones listo para handoff operacional.',
    },
    {
      id: 'stripe',
      name: 'Stripe',
      status: 'Pendiente',
      detail: 'Fee, webhooks y conciliacion requieren definicion final.',
    },
  ],
};

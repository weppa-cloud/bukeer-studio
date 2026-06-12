export type AccountPreference = {
  id: string;
  label: string;
  detail: string;
  enabled: boolean;
};

export type AccountInfoItem = {
  id: string;
  label: string;
  value: string;
};

export type AccountFixture = {
  profile: {
    initials: string;
    name: string;
    email: string;
    badges: string[];
    info: AccountInfoItem[];
  };
  security: AccountInfoItem[];
  preferences: AccountInfoItem[];
  notifications: AccountPreference[];
  signature: string[];
};

export const accountFixture: AccountFixture = {
  profile: {
    initials: 'CR',
    name: 'Carolina Ruiz',
    email: 'carolina@colombiatours.travel',
    badges: ['Admin', 'Travel Planner'],
    info: [
      { id: 'phone', label: 'Telefono', value: '+57 315 884 2210' },
      { id: 'role', label: 'Cargo', value: 'Travel Manager' },
      { id: 'account', label: 'Cuenta', value: 'ColombiaTours.travel' },
      { id: 'member-since', label: 'Miembro desde', value: 'Marzo 2024' },
    ],
  },
  security: [
    { id: 'password', label: 'Contrasena', value: 'Actualizada hace 3 meses' },
    { id: 'mfa', label: 'Autenticacion en dos pasos', value: 'App de autenticacion activa' },
    { id: 'sessions', label: 'Sesiones activas', value: '2 dispositivos · Bogota, Colombia' },
  ],
  preferences: [
    { id: 'language', label: 'Idioma', value: 'Espanol (Colombia)' },
    { id: 'timezone', label: 'Zona horaria', value: 'GMT-5 · Bogota' },
  ],
  notifications: [
    {
      id: 'assigned-conversations',
      label: 'Conversaciones asignadas',
      detail: 'Push y correo al recibir una conversacion',
      enabled: true,
    },
    {
      id: 'payments-received',
      label: 'Pagos recibidos',
      detail: 'Aviso inmediato por cada transaccion aprobada',
      enabled: true,
    },
    {
      id: 'installment-due',
      label: 'Vencimiento de cuotas',
      detail: 'Recordatorio 3 dias antes de cada vencimiento',
      enabled: true,
    },
    {
      id: 'weekly-summary',
      label: 'Resumen semanal por email',
      detail: 'Lunes 7:00 · ventas, cobros y agenda',
      enabled: false,
    },
  ],
  signature: [
    'Carolina Ruiz · Travel Manager',
    'ColombiaTours.travel · +57 315 884 2210',
  ],
};

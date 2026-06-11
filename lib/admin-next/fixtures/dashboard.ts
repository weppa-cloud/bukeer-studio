export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral' | 'live';
  badge: string;
  detail: string;
};

export type DashboardChartMonth = {
  month: string;
  salesPct: number;
  costPct: number;
};

export type DashboardReceivable = {
  id: string;
  customer: string;
  itinerary: string;
  amount: string;
  due: string;
  status: string;
  tone: 'danger' | 'warning' | 'neutral';
};

export type DashboardSeller = {
  id: string;
  rank: number;
  initials: string;
  name: string;
  total: string;
  progress: number;
  tone: 'primary' | 'live' | 'warning';
};

export type DashboardActivity = {
  id: string;
  label: string;
  meta: string;
  tone: 'success' | 'live' | 'warning';
};

export type DashboardSignal = {
  id: string;
  label: string;
  detail: string;
  tone: 'danger' | 'warning' | 'success';
};

export type DashboardFixture = {
  kpis: DashboardKpi[];
  chart: DashboardChartMonth[];
  receivables: DashboardReceivable[];
  sellers: DashboardSeller[];
  activity: DashboardActivity[];
  signals: DashboardSignal[];
};

export const dashboardFixture: DashboardFixture = {
  kpis: [
    {
      id: 'monthly-sales',
      label: 'Ventas del mes',
      value: '$342.4M',
      tone: 'success',
      badge: '+12,5%',
      detail: 'vs. mayo',
    },
    {
      id: 'receivables',
      label: 'Cuentas por cobrar',
      value: '$89.2M',
      tone: 'warning',
      badge: '18 facturas',
      detail: '6 vencen esta semana',
    },
    {
      id: 'payables',
      label: 'Cuentas por pagar',
      value: '$45.0M',
      tone: 'neutral',
      badge: '9 proveedores',
      detail: 'proximo corte 15 jun',
    },
    {
      id: 'active-itineraries',
      label: 'Itinerarios activos',
      value: '23',
      tone: 'live',
      badge: '5 por confirmar',
      detail: 'margen prom. 18,4%',
    },
  ],
  chart: [
    { month: 'Ene', salesPct: 62, costPct: 40 },
    { month: 'Feb', salesPct: 48, costPct: 34 },
    { month: 'Mar', salesPct: 74, costPct: 52 },
    { month: 'Abr', salesPct: 58, costPct: 44 },
    { month: 'May', salesPct: 86, costPct: 60 },
    { month: 'Jun', salesPct: 100, costPct: 72 },
  ],
  receivables: [
    {
      id: 'maria-fernanda-gomez',
      customer: 'Maria Fernanda Gomez',
      itinerary: 'Cartagena & Baru · 7 dias',
      amount: '$12.4M',
      due: 'Vence 12 jun',
      status: 'Vencida',
      tone: 'danger',
    },
    {
      id: 'andres-felipe-torres',
      customer: 'Andres Felipe Torres',
      itinerary: 'Eje Cafetero · 5 dias',
      amount: '$8.7M',
      due: 'Vence 15 jun',
      status: 'Por vencer',
      tone: 'warning',
    },
    {
      id: 'juliana-restrepo',
      customer: 'Juliana Restrepo',
      itinerary: 'San Andres · 4 dias',
      amount: '$6.2M',
      due: 'Vence 22 jun',
      status: 'Al dia',
      tone: 'neutral',
    },
  ],
  sellers: [
    {
      id: 'carolina-ruiz',
      rank: 1,
      initials: 'CR',
      name: 'Carolina Ruiz',
      total: '$158.2M',
      progress: 92,
      tone: 'primary',
    },
    {
      id: 'julian-pardo',
      rank: 2,
      initials: 'JP',
      name: 'Julian Pardo',
      total: '$112.6M',
      progress: 81,
      tone: 'live',
    },
    {
      id: 'mariana-velez',
      rank: 3,
      initials: 'MV',
      name: 'Mariana Velez',
      total: '$71.6M',
      progress: 70,
      tone: 'warning',
    },
  ],
  activity: [
    {
      id: 'reservation-confirmed',
      label: 'Reserva confirmada · Hotel Las Islas',
      meta: 'Hace 12 min · Itinerario 2641',
      tone: 'success',
    },
    {
      id: 'new-conversation',
      label: 'Nueva conversacion · Laura Martinez',
      meta: 'Hace 26 min · WhatsApp',
      tone: 'live',
    },
    {
      id: 'payment-received',
      label: 'Pago recibido · $4.150.000',
      meta: 'Hace 1 h · Juliana Restrepo',
      tone: 'warning',
    },
  ],
  signals: [
    {
      id: 'overdue-receivables',
      label: '6 cobros requieren accion',
      detail: 'Priorizar clientes con salida antes del 22 jun.',
      tone: 'danger',
    },
    {
      id: 'margin-watch',
      label: 'Margen promedio estable',
      detail: 'Itinerarios activos sostienen 18,4% sobre meta.',
      tone: 'success',
    },
    {
      id: 'seller-focus',
      label: '2 vendedores cerca de meta',
      detail: 'Carolina y Julian concentran oportunidades listas.',
      tone: 'warning',
    },
  ],
};

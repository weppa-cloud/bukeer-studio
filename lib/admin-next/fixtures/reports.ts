export type ReportId =
  | 'sales'
  | 'profitability'
  | 'receivables'
  | 'sales-intelligence'
  | 'response-time'
  | 'payments-treasury'
  | 'operations-suppliers';

export type ReportTone = 'primary' | 'success' | 'warning' | 'danger' | 'live';

export type ReportDefinition = {
  id: ReportId;
  label: string;
  description: string;
  value: string;
  delta: string;
  tone: ReportTone;
  href: string;
};

export type ReportInsight = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: ReportTone;
};

export type ReportRow = {
  id: string;
  label: string;
  owner: string;
  amount: string;
  status: string;
  tone: ReportTone;
};

export type ReportChartPoint = {
  label: string;
  primaryPct: number;
  secondaryPct: number;
};

export type ReportsFixture = {
  reports: ReportDefinition[];
  ranges: Array<{
    key: string;
    label: string;
  }>;
  priceRanges: Array<{
    key: string;
    label: string;
    min?: number;
    max?: number;
  }>;
  insights: ReportInsight[];
  tableRows: ReportRow[];
  chart: ReportChartPoint[];
  aiSignals: ReportInsight[];
};

export const reportsFixture: ReportsFixture = {
  reports: [
    {
      id: 'sales',
      label: 'Ventas',
      description: 'Ingresos confirmados por fecha de cierre y asesor.',
      value: '$184.2M',
      delta: '+14% vs. mayo',
      tone: 'primary',
      href: '/admin/reports?report=sales&range=30d',
    },
    {
      id: 'profitability',
      label: 'Rentabilidad',
      description: 'Margen bruto por destino, producto y vendedor.',
      value: '24.8%',
      delta: '+2.1 pts',
      tone: 'success',
      href: '/admin/reports?report=profitability&range=30d&min=500000',
    },
    {
      id: 'receivables',
      label: 'Cuentas por cobrar',
      description: 'CxC vencida, proxima y bloqueante por itinerario.',
      value: '$38.6M',
      delta: '7 vencimientos',
      tone: 'warning',
      href: '/admin/reports?report=receivables&range=30d&min=500000&max=15000000',
    },
    {
      id: 'sales-intelligence',
      label: 'Sales Intelligence',
      description: 'Embudo de perdida y motivos de No compro.',
      value: '18%',
      delta: 'precio lidera perdida',
      tone: 'danger',
      href: '/admin/reports?report=sales-intelligence&range=90d',
    },
    {
      id: 'response-time',
      label: 'Tiempo de respuesta',
      description: 'SLA de CRM por canal, agente y franja horaria.',
      value: '11 min',
      delta: '<= Flutter mirror',
      tone: 'live',
      href: '/admin/reports?report=response-time&range=7d',
    },
    {
      id: 'payments-treasury',
      label: 'Pagos y tesoreria',
      description: 'Cobros, pagos masivos y conciliacion por metodo.',
      value: '$62.9M',
      delta: '12 movimientos',
      tone: 'primary',
      href: '/admin/reports?report=payments-treasury&range=30d',
    },
    {
      id: 'operations-suppliers',
      label: 'Operaciones y proveedores',
      description: 'Servicios, proveedores pendientes y riesgo operativo.',
      value: '42',
      delta: '5 requieren accion',
      tone: 'warning',
      href: '/admin/reports?report=operations-suppliers&range=14d',
    },
  ],
  ranges: [
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
    { key: 'ytd', label: 'Ano corrido' },
  ],
  priceRanges: [
    { key: 'all', label: 'Todo valor' },
    { key: 'mid', label: '$500k - $15M', min: 500000, max: 15000000 },
    { key: 'premium', label: 'Mas de $15M', min: 15000000 },
  ],
  insights: [
    {
      id: 'conversion',
      label: 'Conversion por asesor',
      value: '31%',
      detail: 'Carolina sostiene la mayor conversion en leads calientes.',
      tone: 'success',
    },
    {
      id: 'lost-price',
      label: 'Motivo No compro',
      value: 'Precio',
      detail: 'Precio fuera de presupuesto aparece en 12 cierres.',
      tone: 'danger',
    },
    {
      id: 'cash-risk',
      label: 'Riesgo de caja',
      value: '$9.4M',
      detail: 'CxC vencida en 3 itinerarios de alto valor.',
      tone: 'warning',
    },
  ],
  tableRows: [
    {
      id: 'it-2647',
      label: 'San Andres familiar',
      owner: 'Carolina',
      amount: '$18.4M',
      status: 'Cobro parcial',
      tone: 'warning',
    },
    {
      id: 'it-2651',
      label: 'Corporativo Cartagena',
      owner: 'Daniel',
      amount: '$9.8M',
      status: 'Fee por definir',
      tone: 'danger',
    },
    {
      id: 'it-2654',
      label: 'Luna de miel Baru',
      owner: 'Carolina',
      amount: '$12.1M',
      status: 'Margen sano',
      tone: 'success',
    },
  ],
  chart: [
    { label: 'Ene', primaryPct: 42, secondaryPct: 31 },
    { label: 'Feb', primaryPct: 48, secondaryPct: 34 },
    { label: 'Mar', primaryPct: 54, secondaryPct: 38 },
    { label: 'Abr', primaryPct: 62, secondaryPct: 43 },
    { label: 'May', primaryPct: 71, secondaryPct: 50 },
    { label: 'Jun', primaryPct: 79, secondaryPct: 56 },
  ],
  aiSignals: [
    {
      id: 'url-state',
      label: 'URL-as-state',
      value: 'Activo',
      detail: 'Report, rango y precio se pueden reproducir por deep-link.',
      tone: 'primary',
    },
    {
      id: 'sla-watch',
      label: 'SLA',
      value: 'Definicion pendiente',
      detail: 'Tiempo de respuesta queda visible sin cerrar el calculo final.',
      tone: 'warning',
    },
    {
      id: 'stripe-watch',
      label: 'Stripe fee',
      value: 'Gate antes de Pagos',
      detail: 'Tesoreria se reporta en modo lectura hasta resolver fee por cuenta.',
      tone: 'danger',
    },
  ],
};

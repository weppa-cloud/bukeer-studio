export type AgendaTone = 'primary' | 'live' | 'warning' | 'success';

export type AgendaService = {
  id: string;
  type: 'flight' | 'hotel' | 'transport' | 'activity';
  title: string;
  supplier: string;
  customer: string;
  itineraryId: string;
  customerPayment: string;
  supplierPayment: string;
  notification: string;
  amount: string;
  tone: AgendaTone;
};

export type AgendaDay = {
  id: string;
  day: string;
  month: string;
  title: string;
  meta: string;
  services: AgendaService[];
};

export type AgendaSignal = {
  id: string;
  label: string;
  detail: string;
  tone: AgendaTone;
};

export type AgendaFixture = {
  rangeLabel: string;
  days: AgendaDay[];
  signals: AgendaSignal[];
};

export const agendaFixture: AgendaFixture = {
  rangeLabel: '10 jun - 10 jul',
  days: [
    {
      id: 'jun-12',
      day: '12',
      month: 'JUN',
      title: 'Jueves 12 de junio',
      meta: '3 servicios · $4.370.000',
      services: [
        {
          id: 'flight-bog-adz',
          type: 'flight',
          title: 'Vuelo BOG a ADZ · Avianca AV 8462',
          supplier: 'Avianca',
          customer: 'Laura Martinez',
          itineraryId: '2647',
          customerPayment: 'Cliente 50%',
          supplierPayment: 'Proveedor pendiente',
          notification: 'Notificado',
          amount: '$1.890.000',
          tone: 'primary',
        },
        {
          id: 'hotel-las-islas-premium',
          type: 'hotel',
          title: 'Hotel Las Islas · Hab. premium · 2N',
          supplier: 'Hotel Las Islas',
          customer: 'Maria Fernanda Gomez',
          itineraryId: '2641',
          customerPayment: 'Cliente pagado',
          supplierPayment: 'Proveedor pagado',
          notification: 'Notificado',
          amount: '$2.360.000',
          tone: 'live',
        },
        {
          id: 'transfer-adz-hotel',
          type: 'transport',
          title: 'Traslado aeropuerto a hotel · Privado',
          supplier: 'Transportes Marsol',
          customer: 'Laura Martinez',
          itineraryId: '2647',
          customerPayment: 'Cliente 50%',
          supplierPayment: 'Proveedor pendiente',
          notification: 'Sin notificar',
          amount: '$120.000',
          tone: 'success',
        },
      ],
    },
    {
      id: 'jun-13',
      day: '13',
      month: 'JUN',
      title: 'Viernes 13 de junio',
      meta: '2 servicios · $1.060.000',
      services: [
        {
          id: 'johnny-cay-tour',
          type: 'activity',
          title: 'Tour Johnny Cay + Acuario',
          supplier: 'Nautica SAI',
          customer: 'Laura Martinez',
          itineraryId: '2647',
          customerPayment: 'Cliente 50%',
          supplierPayment: 'Proveedor pendiente',
          notification: 'Notificado',
          amount: '$420.000',
          tone: 'warning',
        },
        {
          id: 'flight-mde-ctg',
          type: 'flight',
          title: 'Vuelo MDE a CTG · LATAM LA 4032',
          supplier: 'LATAM',
          customer: 'Andres Felipe Torres',
          itineraryId: '2638',
          customerPayment: 'Cliente pagado',
          supplierPayment: 'Proveedor pendiente',
          notification: 'Notificado',
          amount: '$640.000',
          tone: 'primary',
        },
      ],
    },
    {
      id: 'jun-14',
      day: '14',
      month: 'JUN',
      title: 'Sabado 14 de junio',
      meta: '4 servicios · $3.180.000',
      services: [],
    },
  ],
  signals: [
    {
      id: 'notify-transfer',
      label: '1 servicio sin notificar',
      detail: 'El traslado privado de Laura debe notificarse antes del cierre del dia.',
      tone: 'warning',
    },
    {
      id: 'supplier-payments',
      label: '3 proveedores pendientes',
      detail: 'Priorizar pagos de Avianca, Marsol y Nautica SAI por servicios de 12-13 jun.',
      tone: 'live',
    },
    {
      id: 'customer-paid',
      label: '2 servicios con cliente pagado',
      detail: 'Hotel Las Islas y LATAM estan listos para ejecucion operativa.',
      tone: 'success',
    },
  ],
};

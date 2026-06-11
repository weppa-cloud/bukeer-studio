export type ItineraryStatus = 'draft' | 'quoted' | 'won' | 'operating' | 'closed';
export type ItineraryViewMode = 'list' | 'kanban';
export type ItineraryTone = 'primary' | 'success' | 'warning' | 'danger' | 'live';

export type ItinerarySummary = {
  id: string;
  code: string;
  title: string;
  customer: string;
  owner: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: number;
  pax: number;
  status: ItineraryStatus;
  value: string;
  margin: string;
  marginTone: ItineraryTone;
  services: number;
  paidInstallments: number;
  totalInstallments: number;
  nextService: string;
  risk: string;
  href: string;
};

export type ItineraryColumn = {
  id: ItineraryStatus;
  label: string;
  description: string;
};

export type ItinerarySignal = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: ItineraryTone;
};

export type ItinerariesFixture = {
  statuses: ItineraryColumn[];
  owners: Array<{
    key: string;
    label: string;
  }>;
  itineraries: ItinerarySummary[];
  signals: ItinerarySignal[];
};

export const itinerariesFixture: ItinerariesFixture = {
  statuses: [
    {
      id: 'draft',
      label: 'Borrador',
      description: 'Aun no enviado al cliente.',
    },
    {
      id: 'quoted',
      label: 'Cotizado',
      description: 'Propuesta enviada, pendiente decision.',
    },
    {
      id: 'won',
      label: 'Confirmado',
      description: 'Venta cerrada, servicios por asegurar.',
    },
    {
      id: 'operating',
      label: 'En operacion',
      description: 'Servicios proximos o en curso.',
    },
    {
      id: 'closed',
      label: 'Cerrado',
      description: 'Viaje finalizado o archivado.',
    },
  ],
  owners: [
    { key: 'all', label: 'Todos' },
    { key: 'carolina', label: 'Carolina' },
    { key: 'daniel', label: 'Daniel' },
    { key: 'tesoreria', label: 'Tesoreria' },
  ],
  itineraries: [
    {
      id: 'it-2647',
      code: 'IT-2647',
      title: 'San Andres familiar',
      customer: 'Laura Perez',
      owner: 'Carolina',
      destination: 'San Andres',
      startDate: '2026-07-04',
      endDate: '2026-07-10',
      days: 7,
      pax: 4,
      status: 'quoted',
      value: '$18.4M',
      margin: '21%',
      marginTone: 'success',
      services: 8,
      paidInstallments: 1,
      totalInstallments: 3,
      nextService: 'Vuelo BOG-ADZ',
      risk: 'Cuota 2 vence en 72h',
      href: '/admin/itineraries?selected=it-2647',
    },
    {
      id: 'it-2651',
      code: 'IT-2651',
      title: 'Corporativo Cartagena',
      customer: 'Andes Legal',
      owner: 'Daniel',
      destination: 'Cartagena',
      startDate: '2026-06-18',
      endDate: '2026-06-21',
      days: 4,
      pax: 12,
      status: 'won',
      value: '$42.8M',
      margin: '16%',
      marginTone: 'warning',
      services: 14,
      paidInstallments: 2,
      totalInstallments: 4,
      nextService: 'Hotel check-in',
      risk: 'Proveedor sin pago agrupado',
      href: '/admin/itineraries?selected=it-2651',
    },
    {
      id: 'it-2654',
      code: 'IT-2654',
      title: 'Luna de miel Baru',
      customer: 'Camila Mora',
      owner: 'Carolina',
      destination: 'Baru',
      startDate: '2026-08-02',
      endDate: '2026-08-07',
      days: 6,
      pax: 2,
      status: 'draft',
      value: '$12.1M',
      margin: '24%',
      marginTone: 'success',
      services: 6,
      paidInstallments: 0,
      totalInstallments: 3,
      nextService: 'Hotel Las Islas',
      risk: 'Faltan pasajeros',
      href: '/admin/itineraries?selected=it-2654',
    },
    {
      id: 'it-2660',
      code: 'IT-2660',
      title: 'Eje Cafetero senior',
      customer: 'Familia Restrepo',
      owner: 'Tesoreria',
      destination: 'Armenia',
      startDate: '2026-06-13',
      endDate: '2026-06-19',
      days: 7,
      pax: 6,
      status: 'operating',
      value: '$26.6M',
      margin: '12%',
      marginTone: 'danger',
      services: 11,
      paidInstallments: 3,
      totalInstallments: 3,
      nextService: 'Traslado aeropuerto',
      risk: 'Margen bajo en operacion',
      href: '/admin/itineraries?selected=it-2660',
    },
    {
      id: 'it-2610',
      code: 'IT-2610',
      title: 'Medellin experiencias',
      customer: 'Nicolas Rueda',
      owner: 'Daniel',
      destination: 'Medellin',
      startDate: '2026-05-21',
      endDate: '2026-05-25',
      days: 5,
      pax: 3,
      status: 'closed',
      value: '$9.7M',
      margin: '19%',
      marginTone: 'primary',
      services: 5,
      paidInstallments: 2,
      totalInstallments: 2,
      nextService: 'Viaje finalizado',
      risk: 'Listo para feedback',
      href: '/admin/itineraries?selected=it-2610',
    },
  ],
  signals: [
    {
      id: 'paid-immutability',
      label: 'Cuotas pagadas',
      value: 'Protegidas',
      detail: 'La fase de detalle debe impedir regenerar cuotas ya pagadas.',
      tone: 'primary',
    },
    {
      id: 'supplier-payments',
      label: 'Proveedores',
      value: '1 riesgo',
      detail: 'Un itinerario confirmado necesita pago agrupado por proveedor.',
      tone: 'warning',
    },
    {
      id: 'low-margin',
      label: 'Margen',
      value: '12%',
      detail: 'Eje Cafetero opera por debajo del umbral objetivo.',
      tone: 'danger',
    },
  ],
};

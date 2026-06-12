export type ContactTone = 'primary' | 'live' | 'warning' | 'success';

export type ContactRecord = {
  id: string;
  initials: string;
  name: string;
  badges: string[];
  email: string;
  phone: string;
  city: string;
  document: string;
  lastActivity: string;
  openBalance: string;
  itineraries: number;
  totalSales: string;
  tone: ContactTone;
};

export type ContactDetail = {
  contact: ContactRecord;
  profile: Array<{ label: string; value: string }>;
  itineraries: ContactTimelineItem[];
  signals: ContactSignal[];
};

export type ContactTimelineItem = {
  id: string;
  title: string;
  meta: string;
  amount: string;
  status: string;
  tone: ContactTone;
};

export type ContactSignal = {
  id: string;
  label: string;
  detail: string;
  tone: ContactTone;
};

export type ContactsFixture = {
  contacts: ContactRecord[];
  selected: ContactRecord;
  timeline: ContactTimelineItem[];
  signals: ContactSignal[];
  details?: Record<string, ContactDetail>;
};

const contacts: ContactRecord[] = [
  {
    id: 'laura-martinez',
    initials: 'LM',
    name: 'Laura Martinez',
    badges: ['Cliente', 'VIP'],
    email: 'laura.martinez@gmail.com',
    phone: '+57 310 442 8190',
    city: 'Bogota, Colombia',
    document: 'CC 52.841.330',
    lastActivity: 'WhatsApp hace 26 min',
    openBalance: '$2.940.000',
    itineraries: 4,
    totalSales: '$9.3M',
    tone: 'warning',
  },
  {
    id: 'hotel-las-islas',
    initials: 'HL',
    name: 'Hotel Las Islas',
    badges: ['Proveedor', 'Hotel'],
    email: 'reservas@hotellasislas.com',
    phone: '+57 605 693 0440',
    city: 'Baru, Cartagena',
    document: 'NIT 900.412.318-2',
    lastActivity: 'Reserva confirmada ayer',
    openBalance: '$0',
    itineraries: 12,
    totalSales: '$48.0M',
    tone: 'live',
  },
  {
    id: 'decameron-isleno',
    initials: 'DI',
    name: 'Decameron Isleno',
    badges: ['Proveedor', 'Hotel'],
    email: 'mayoristas@decameron.com',
    phone: '+57 601 628 0000',
    city: 'San Andres',
    document: 'NIT 860.067.777-1',
    lastActivity: 'Tarifa revisada hoy',
    openBalance: '$4.500.000',
    itineraries: 8,
    totalSales: '$31.2M',
    tone: 'success',
  },
  {
    id: 'avianca',
    initials: 'AV',
    name: 'Avianca',
    badges: ['Proveedor', 'Vuelos'],
    email: 'agencias@avianca.com',
    phone: '+57 601 401 3434',
    city: 'Bogota, Colombia',
    document: 'NIT 890.100.577-6',
    lastActivity: 'Ticket emitido hoy',
    openBalance: '$1.890.000',
    itineraries: 16,
    totalSales: '$62.8M',
    tone: 'primary',
  },
  {
    id: 'juliana-restrepo',
    initials: 'JR',
    name: 'Juliana Restrepo',
    badges: ['Cliente', 'Referida'],
    email: 'juli.restrepo@gmail.com',
    phone: '+57 311 905 6612',
    city: 'Medellin, Colombia',
    document: 'CC 43.885.221',
    lastActivity: 'Pago recibido hace 1 h',
    openBalance: '$0',
    itineraries: 3,
    totalSales: '$6.2M',
    tone: 'success',
  },
  {
    id: 'andres-felipe-torres',
    initials: 'AT',
    name: 'Andres Felipe Torres',
    badges: ['Cliente'],
    email: 'aftorres@viajesandes.co',
    phone: '+57 300 871 5526',
    city: 'Cali, Colombia',
    document: 'CC 94.441.210',
    lastActivity: 'Cotizacion abierta',
    openBalance: '$8.700.000',
    itineraries: 2,
    totalSales: '$11.8M',
    tone: 'warning',
  },
];

export const contactsFixture: ContactsFixture = {
  contacts,
  selected: contacts[0],
  timeline: [
    {
      id: 'san-andres-family',
      title: 'San Andres Familiar · 4N',
      meta: 'Itinerario 2647 · 24-28 jul · 3 viajeros',
      amount: '$5.890.000',
      status: 'Presupuesto',
      tone: 'primary',
    },
    {
      id: 'stripe-installment',
      title: 'Tarjeta Stripe · cuota 2',
      meta: '9 jun 14:32 · ref. ch_3PqX99102',
      amount: '$1.183.000',
      status: 'Aprobado',
      tone: 'success',
    },
    {
      id: 'bank-transfer',
      title: 'Transferencia Bancolombia · anticipo',
      meta: '9 jun 10:05 · verificada por Carolina',
      amount: '$1.767.000',
      status: 'Aprobado',
      tone: 'success',
    },
  ],
  signals: [
    {
      id: 'open-balance',
      label: 'Saldo pendiente antes de salida',
      detail: 'Requiere cobro de cuota final antes del 10 jul.',
      tone: 'warning',
    },
    {
      id: 'supplier-link',
      label: 'Proveedor hotelero ya confirmado',
      detail: 'Hotel Las Islas tiene disponibilidad y costo vigente.',
      tone: 'live',
    },
    {
      id: 'profile-complete',
      label: 'Perfil listo para itinerario',
      detail: 'Documento, ciudad, etiquetas y canal de origen completos.',
      tone: 'success',
    },
  ],
  details: Object.fromEntries(
    contacts.map((contact) => [
      contact.id,
      {
        contact,
        profile: [
          { label: 'Ciudad', value: contact.city },
          { label: 'Documento', value: contact.document },
          { label: 'Email', value: contact.email },
          { label: 'Telefono', value: contact.phone },
        ],
        itineraries: [],
        signals: [],
      },
    ]),
  ),
};

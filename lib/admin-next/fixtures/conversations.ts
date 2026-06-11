export type ConversationChannel = 'whatsapp' | 'email' | 'web';
export type ConversationStatus = 'open' | 'waiting' | 'closed';
export type ConversationTone = 'primary' | 'live' | 'warning';
export type LeadTemperature = 'cold' | 'warm' | 'hot';
export type CloseOutcome = 'won' | 'no_purchase' | 'not_qualified';

export type ConversationSummary = {
  id: string;
  customerName: string;
  agencyLabel: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  tone: ConversationTone;
  temperature: LeadTemperature;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  itineraryId: string;
  valueLabel: string;
  owner: string;
  slaLabel: string;
};

export type ConversationMessage = {
  id: string;
  author: 'customer' | 'agent' | 'assistant';
  authorName: string;
  body: string;
  timestamp: string;
  state?: string;
};

export type ConversationNote = {
  id: string;
  title: string;
  body: string;
};

export type CloseReason = {
  id: string;
  label: string;
};

export type ConversationSignal = {
  id: string;
  label: string;
  value: string;
  tone: ConversationTone;
};

export type ConversationsFixture = {
  conversations: ConversationSummary[];
  selected: ConversationSummary & {
    messages: ConversationMessage[];
    notes: ConversationNote[];
    closeReasons: CloseReason[];
    crm: {
      contactId: string;
      phone: string;
      email: string;
      document: string;
      lastPurchase: string;
      totalValue: string;
      preference: string;
    };
    realtime: {
      provider: string;
      mirrorLabel: string;
      latencyLabel: string;
      updatedAt: string;
    };
    linkedItinerary: {
      id: string;
      title: string;
      state: string;
      margin: string;
    };
    requestDraft: {
      title: string;
      destination: string;
      pax: string;
      dates: string;
    };
  };
  signals: ConversationSignal[];
  templates: Array<{
    id: string;
    label: string;
    body: string;
  }>;
};

export const conversationsFixture: ConversationsFixture = {
  conversations: [
    {
      id: 'conv-1024',
      customerName: 'Laura Mejia',
      agencyLabel: 'Familia Mejia',
      channel: 'whatsapp',
      status: 'open',
      tone: 'primary',
      temperature: 'hot',
      lastMessage: 'Queremos cerrar San Andres hoy si el hotel incluye traslados.',
      lastMessageAt: 'Hace 4 min',
      unreadCount: 3,
      itineraryId: 'IT-2647',
      valueLabel: '$18.4M',
      owner: 'Carolina',
      slaLabel: 'SLA 12 min',
    },
    {
      id: 'conv-1025',
      customerName: 'Andres Pardo',
      agencyLabel: 'Viaje corporativo',
      channel: 'email',
      status: 'waiting',
      tone: 'warning',
      temperature: 'warm',
      lastMessage: 'Necesito confirmar si el fee de Stripe lo asumimos nosotros.',
      lastMessageAt: 'Hace 22 min',
      unreadCount: 0,
      itineraryId: 'IT-2651',
      valueLabel: '$9.8M',
      owner: 'Daniel',
      slaLabel: 'SLA 38 min',
    },
    {
      id: 'conv-1026',
      customerName: 'Maria Clara Ruiz',
      agencyLabel: 'Luna de miel',
      channel: 'whatsapp',
      status: 'open',
      tone: 'live',
      temperature: 'warm',
      lastMessage: 'Puedes enviarme una opcion mas economica para Baru?',
      lastMessageAt: 'Hace 51 min',
      unreadCount: 1,
      itineraryId: 'IT-2654',
      valueLabel: '$12.1M',
      owner: 'Carolina',
      slaLabel: 'SLA 1h',
    },
  ],
  selected: {
    id: 'conv-1024',
    customerName: 'Laura Mejia',
    agencyLabel: 'Familia Mejia',
    channel: 'whatsapp',
    status: 'open',
    tone: 'primary',
    temperature: 'hot',
    lastMessage: 'Queremos cerrar San Andres hoy si el hotel incluye traslados.',
    lastMessageAt: 'Hace 4 min',
    unreadCount: 3,
    itineraryId: 'IT-2647',
    valueLabel: '$18.4M',
    owner: 'Carolina',
    slaLabel: 'SLA 12 min',
    messages: [
      {
        id: 'msg-1',
        author: 'customer',
        authorName: 'Laura Mejia',
        body: 'Hola Caro, ya revisamos la propuesta de San Andres.',
        timestamp: '09:18',
      },
      {
        id: 'msg-2',
        author: 'agent',
        authorName: 'Carolina',
        body: 'Perfecto. El hotel recomendado conserva la tarifa activa hasta las 18:00.',
        timestamp: '09:21',
        state: 'Entregado',
      },
      {
        id: 'msg-3',
        author: 'customer',
        authorName: 'Laura Mejia',
        body: 'Queremos cerrar hoy si el hotel incluye traslados.',
        timestamp: '09:24',
      },
      {
        id: 'msg-4',
        author: 'assistant',
        authorName: 'IA Bukeer',
        body: 'Sugerencia: confirmar traslado incluido y enviar link de pago parcial.',
        timestamp: '09:25',
        state: 'No enviado',
      },
    ],
    notes: [
      {
        id: 'note-1',
        title: 'Intencion',
        body: 'Alta probabilidad de cierre si se confirma traslado incluido.',
      },
      {
        id: 'note-2',
        title: 'Riesgo',
        body: 'Bloquear envio si la tarifa activa cambia antes del pago.',
      },
    ],
    closeReasons: [
      { id: 'price', label: 'Precio fuera de presupuesto' },
      { id: 'dates', label: 'Fecha no disponible' },
      { id: 'destination', label: 'Cambio de destino' },
    ],
    crm: {
      contactId: 'CT-8841',
      phone: '+57 300 456 7788',
      email: 'laura.mejia@example.com',
      document: 'CC 52.555.110',
      lastPurchase: 'Cartagena · dic 2025',
      totalValue: '$44.8M',
      preference: 'Hoteles familiares con traslados incluidos',
    },
    realtime: {
      provider: 'Chatwoot mirror',
      mirrorLabel: 'Mirror conectado',
      latencyLabel: '<= Flutter/Chatwoot',
      updatedAt: '09:25:18',
    },
    linkedItinerary: {
      id: 'IT-2647',
      title: 'San Andres familiar · junio',
      state: 'Cotizacion lista',
      margin: '21%',
    },
    requestDraft: {
      title: 'Solicitud activa',
      destination: 'San Andres',
      pax: '4 pax',
      dates: '21-25 jun',
    },
  },
  signals: [
    { id: 'latency', label: 'Realtime', value: '<= Flutter mirror', tone: 'live' },
    { id: 'close-rule', label: 'Cierre No compro', value: 'Motivo obligatorio', tone: 'warning' },
    { id: 'pipeline', label: 'Pipeline', value: 'Lead caliente', tone: 'primary' },
  ],
  templates: [
    {
      id: 'confirm-transfer',
      label: 'Confirmar traslado',
      body: 'Confirmo traslado incluido y vigencia de tarifa hasta las 18:00.',
    },
    {
      id: 'payment-link',
      label: 'Enviar link de pago',
      body: 'Te envio link de pago parcial para bloquear la reserva.',
    },
  ],
};

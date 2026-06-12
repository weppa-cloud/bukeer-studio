export type ItineraryStatus =
  | "draft"
  | "quoted"
  | "won"
  | "operating"
  | "closed";
export type ItineraryViewMode = "list" | "kanban";
export type ItineraryDetailTab =
  | "services"
  | "passengers"
  | "suppliers"
  | "payments"
  | "preview";
export type ItineraryPaymentMethod = "card" | "bank_transfer" | "cash";
export type ItineraryInstallmentStatus = "paid" | "pending" | "overdue";
export type ItineraryPublicPage = "cover" | "itinerary" | "checkout";
export type ItineraryMobileScreen =
  | "home"
  | "search"
  | "itinerary"
  | "services"
  | "passengers"
  | "suppliers"
  | "payments"
  | "preview"
  | "chat"
  | "notifications"
  | "profile";
export type ItineraryTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "live";

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

export type ItineraryDetailItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: ItineraryTone;
  locked?: boolean;
  passenger?: {
    firstName: string;
    lastName: string;
    documentType: string;
    documentNumber: string;
    nationality: string;
    birthDate: string;
    email: string;
    phoneNumber: string;
    gender: string;
    isMainPassenger: boolean;
  };
  payment?: {
    date: string;
    amount: number | null;
    paymentMethod: string;
    type: string;
    reference: string;
    voucherUrl: string;
  };
  supplier?: {
    providerName: string;
    providerEmail: string;
    providerImage: string;
    itemCount: number;
    confirmedCount: number;
    pendingCount: number;
    totalCost: number;
    paidCost: number;
    pendingCost: number;
    totalCostLabel: string;
    paidCostLabel: string;
    pendingCostLabel: string;
    items: Array<{
      itemId: string;
      productName: string;
      productType: string;
      rateName: string;
      serviceDate: string;
      reservationStatus: string;
      reserved: boolean;
      totalCost: number;
      paidCost: number;
      pendingCost: number;
      totalCostLabel: string;
      paidCostLabel: string;
      pendingCostLabel: string;
      messageCount: number;
    }>;
  };
  preview?: {
    dayNumber: number | null;
    serviceDate: string;
    productName: string;
    productType: string;
    destination: string;
    providerName: string;
    amountLabel: string;
    reserved: boolean;
    reservationStatus: string;
  };
  service?: {
    type: string;
    source: string;
    provider: string;
    reservation: string;
    catalogStatus: string;
    quantity: string;
    unitCost: string;
    unitPrice: string;
    totalCost: string;
    totalPrice: string;
    markup: string;
  };
};

export type ItineraryDetail = Record<ItineraryDetailTab, ItineraryDetailItem[]>;

export type ItineraryPaymentMethodOption = {
  id: ItineraryPaymentMethod;
  label: string;
  fee: string;
  total: string;
  feeIncluded: boolean;
  tone: ItineraryTone;
};

export type ItineraryInstallment = {
  id: string;
  label: string;
  amount: string;
  dueDate: string;
  status: ItineraryInstallmentStatus;
  locked: boolean;
  tone: ItineraryTone;
};

export type ItineraryPaymentPlan = {
  methods: ItineraryPaymentMethodOption[];
  installments: ItineraryInstallment[];
};

export type ItineraryPublicProposalPage = {
  id: ItineraryPublicPage;
  title: string;
  headline: string;
  body: string;
  primaryMetric: string;
  secondaryMetric: string;
  tone: ItineraryTone;
};

export type ItineraryPublicProposal = {
  shareUrl: string;
  pages: ItineraryPublicProposalPage[];
};

export type ItineraryMobileScreenSpec = {
  id: ItineraryMobileScreen;
  label: string;
  title: string;
  summary: string;
  tone: ItineraryTone;
};

export type ItinerariesFixture = {
  statuses: ItineraryColumn[];
  owners: Array<{
    key: string;
    label: string;
  }>;
  itineraries: ItinerarySummary[];
  details: Record<string, ItineraryDetail>;
  paymentPlans: Record<string, ItineraryPaymentPlan>;
  publicProposals: Record<string, ItineraryPublicProposal>;
  mobileScreens: ItineraryMobileScreenSpec[];
  signals: ItinerarySignal[];
};

const itinerarySummaries: ItinerarySummary[] = [
  {
    id: "it-2647",
    code: "IT-2647",
    title: "San Andres familiar",
    customer: "Laura Perez",
    owner: "Carolina",
    destination: "San Andres",
    startDate: "2026-07-04",
    endDate: "2026-07-10",
    days: 7,
    pax: 4,
    status: "quoted",
    value: "$18.4M",
    margin: "21%",
    marginTone: "success",
    services: 8,
    paidInstallments: 1,
    totalInstallments: 3,
    nextService: "Vuelo BOG-ADZ",
    risk: "Cuota 2 vence en 72h",
    href: "/admin/itineraries?selected=it-2647",
  },
  {
    id: "it-2651",
    code: "IT-2651",
    title: "Corporativo Cartagena",
    customer: "Andes Legal",
    owner: "Daniel",
    destination: "Cartagena",
    startDate: "2026-06-18",
    endDate: "2026-06-21",
    days: 4,
    pax: 12,
    status: "won",
    value: "$42.8M",
    margin: "16%",
    marginTone: "warning",
    services: 14,
    paidInstallments: 2,
    totalInstallments: 4,
    nextService: "Hotel check-in",
    risk: "Proveedor sin pago agrupado",
    href: "/admin/itineraries?selected=it-2651",
  },
  {
    id: "it-2654",
    code: "IT-2654",
    title: "Luna de miel Baru",
    customer: "Camila Mora",
    owner: "Carolina",
    destination: "Baru",
    startDate: "2026-08-02",
    endDate: "2026-08-07",
    days: 6,
    pax: 2,
    status: "draft",
    value: "$12.1M",
    margin: "24%",
    marginTone: "success",
    services: 6,
    paidInstallments: 0,
    totalInstallments: 3,
    nextService: "Hotel Las Islas",
    risk: "Faltan pasajeros",
    href: "/admin/itineraries?selected=it-2654",
  },
  {
    id: "it-2660",
    code: "IT-2660",
    title: "Eje Cafetero senior",
    customer: "Familia Restrepo",
    owner: "Tesoreria",
    destination: "Armenia",
    startDate: "2026-06-13",
    endDate: "2026-06-19",
    days: 7,
    pax: 6,
    status: "operating",
    value: "$26.6M",
    margin: "12%",
    marginTone: "danger",
    services: 11,
    paidInstallments: 3,
    totalInstallments: 3,
    nextService: "Traslado aeropuerto",
    risk: "Margen bajo en operacion",
    href: "/admin/itineraries?selected=it-2660",
  },
  {
    id: "it-2610",
    code: "IT-2610",
    title: "Medellin experiencias",
    customer: "Nicolas Rueda",
    owner: "Daniel",
    destination: "Medellin",
    startDate: "2026-05-21",
    endDate: "2026-05-25",
    days: 5,
    pax: 3,
    status: "closed",
    value: "$9.7M",
    margin: "19%",
    marginTone: "primary",
    services: 5,
    paidInstallments: 2,
    totalInstallments: 2,
    nextService: "Viaje finalizado",
    risk: "Listo para feedback",
    href: "/admin/itineraries?selected=it-2610",
  },
];

function createItineraryDetail(itinerary: ItinerarySummary): ItineraryDetail {
  return {
    services: [
      {
        id: `${itinerary.id}-svc-1`,
        label: itinerary.nextService,
        value: itinerary.startDate,
        detail: `${itinerary.destination} · ${itinerary.pax} pasajeros`,
        tone: statusToneForDetail(itinerary.status),
      },
      {
        id: `${itinerary.id}-svc-2`,
        label: "Alojamiento y experiencias",
        value: `${itinerary.services} servicios`,
        detail: `Ventana ${itinerary.startDate} - ${itinerary.endDate}`,
        tone: itinerary.marginTone,
      },
    ],
    passengers: [
      {
        id: `${itinerary.id}-pax-1`,
        label: itinerary.customer,
        value: "Principal",
        detail:
          itinerary.paidInstallments > 0
            ? "Documento validado"
            : "Documento pendiente",
        tone: itinerary.paidInstallments > 0 ? "success" : "warning",
      },
      {
        id: `${itinerary.id}-pax-2`,
        label: "Acompanantes",
        value: `${Math.max(itinerary.pax - 1, 0)} viajeros`,
        detail:
          itinerary.pax > 2
            ? "Habitaciones y edades por confirmar"
            : "Datos base completos",
        tone: itinerary.pax > 2 ? "warning" : "success",
      },
    ],
    suppliers: [
      {
        id: `${itinerary.id}-sup-1`,
        label: "Proveedor principal",
        value: itinerary.nextService,
        detail:
          itinerary.status === "won"
            ? "Pago agrupado pendiente antes de operar"
            : "Contrato operativo en revision",
        tone: itinerary.status === "won" ? "warning" : "primary",
      },
      {
        id: `${itinerary.id}-sup-2`,
        label: "Margen proveedor",
        value: itinerary.margin,
        detail: "Comparado contra umbral objetivo de la agencia",
        tone: itinerary.marginTone,
      },
    ],
    payments: [
      {
        id: `${itinerary.id}-pay-1`,
        label: "Cuotas pagadas",
        value: `${itinerary.paidInstallments}/${itinerary.totalInstallments}`,
        detail: "Las cuotas pagadas son inmutables y no se regeneran.",
        tone: itinerary.paidInstallments > 0 ? "success" : "warning",
        locked: itinerary.paidInstallments > 0,
      },
      {
        id: `${itinerary.id}-pay-2`,
        label: "Total a pagar",
        value: itinerary.value,
        detail:
          "Incluye fee de pasarela cuando el metodo seleccionado lo exige.",
        tone: "primary",
      },
    ],
    preview: [
      {
        id: `${itinerary.id}-preview-1`,
        label: "Propuesta publica",
        value: itinerary.status === "draft" ? "Borrador" : "Lista",
        detail: "Landing de 3 paginas preparada para el siguiente slice.",
        tone: itinerary.status === "draft" ? "warning" : "success",
      },
      {
        id: `${itinerary.id}-preview-2`,
        label: "Senal comercial",
        value: itinerary.risk,
        detail: "Se muestra al agente antes de compartir con cliente.",
        tone: itinerary.marginTone,
      },
    ],
  };
}

function createPaymentPlan(itinerary: ItinerarySummary): ItineraryPaymentPlan {
  return {
    methods: [
      {
        id: "card",
        label: "Tarjeta",
        fee: "$128k",
        total: `${itinerary.value} + fee`,
        feeIncluded: true,
        tone: "primary",
      },
      {
        id: "bank_transfer",
        label: "Transferencia",
        fee: "$0",
        total: itinerary.value,
        feeIncluded: false,
        tone: "success",
      },
      {
        id: "cash",
        label: "Efectivo",
        fee: "$0",
        total: itinerary.value,
        feeIncluded: false,
        tone: "warning",
      },
    ],
    installments: Array.from(
      { length: itinerary.totalInstallments },
      (_, index) => {
        const number = index + 1;
        const paid = number <= itinerary.paidInstallments;
        const overdue =
          !paid &&
          itinerary.status === "operating" &&
          number === itinerary.totalInstallments;

        return {
          id: `${itinerary.id}-installment-${number}`,
          label: `Cuota ${number}`,
          amount: installmentAmount(
            itinerary.value,
            itinerary.totalInstallments,
          ),
          dueDate: installmentDueDate(itinerary.startDate, index),
          status: paid ? "paid" : overdue ? "overdue" : "pending",
          locked: paid,
          tone: paid ? "success" : overdue ? "danger" : "warning",
        };
      },
    ),
  };
}

function createPublicProposal(
  itinerary: ItinerarySummary,
): ItineraryPublicProposal {
  return {
    shareUrl: `/propuesta/${itinerary.code.toLowerCase()}`,
    pages: [
      {
        id: "cover",
        title: "Portada",
        headline: itinerary.title,
        body: `${itinerary.destination} para ${itinerary.customer}`,
        primaryMetric: itinerary.value,
        secondaryMetric: `${itinerary.days} dias · ${itinerary.pax} pax`,
        tone: "primary",
      },
      {
        id: "itinerary",
        title: "Dia a dia",
        headline: itinerary.nextService,
        body: `Servicios principales entre ${itinerary.startDate} y ${itinerary.endDate}`,
        primaryMetric: `${itinerary.services} servicios`,
        secondaryMetric: itinerary.risk,
        tone: itinerary.marginTone,
      },
      {
        id: "checkout",
        title: "Reserva",
        headline: "Pago y confirmacion",
        body: "El cliente revisa cuotas, metodo y condiciones antes de confirmar.",
        primaryMetric: `${itinerary.paidInstallments}/${itinerary.totalInstallments} cuotas`,
        secondaryMetric:
          itinerary.status === "draft"
            ? "Borrador no compartido"
            : "Lista para compartir",
        tone: itinerary.status === "draft" ? "warning" : "success",
      },
    ],
  };
}

function installmentAmount(value: string, totalInstallments: number): string {
  return `${value}/${totalInstallments}`;
}

function installmentDueDate(startDate: string, index: number): string {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 30 + index * 15);
  return date.toISOString().slice(0, 10);
}

function statusToneForDetail(status: ItineraryStatus): ItineraryTone {
  if (status === "won" || status === "operating") return "live";
  if (status === "closed") return "success";
  if (status === "draft") return "warning";
  return "primary";
}

export const itinerariesFixture: ItinerariesFixture = {
  statuses: [
    {
      id: "draft",
      label: "Borrador",
      description: "Aun no enviado al cliente.",
    },
    {
      id: "quoted",
      label: "Cotizado",
      description: "Propuesta enviada, pendiente decision.",
    },
    {
      id: "won",
      label: "Confirmado",
      description: "Venta cerrada, servicios por asegurar.",
    },
    {
      id: "operating",
      label: "En operacion",
      description: "Servicios proximos o en curso.",
    },
    {
      id: "closed",
      label: "Cerrado",
      description: "Viaje finalizado o archivado.",
    },
  ],
  owners: [
    { key: "all", label: "Todos" },
    { key: "carolina", label: "Carolina" },
    { key: "daniel", label: "Daniel" },
    { key: "tesoreria", label: "Tesoreria" },
  ],
  itineraries: itinerarySummaries,
  details: Object.fromEntries(
    itinerarySummaries.map((itinerary) => [
      itinerary.id,
      createItineraryDetail(itinerary),
    ]),
  ) as Record<string, ItineraryDetail>,
  paymentPlans: Object.fromEntries(
    itinerarySummaries.map((itinerary) => [
      itinerary.id,
      createPaymentPlan(itinerary),
    ]),
  ) as Record<string, ItineraryPaymentPlan>,
  publicProposals: Object.fromEntries(
    itinerarySummaries.map((itinerary) => [
      itinerary.id,
      createPublicProposal(itinerary),
    ]),
  ) as Record<string, ItineraryPublicProposal>,
  mobileScreens: [
    {
      id: "home",
      label: "Inicio",
      title: "Resumen",
      summary: "KPIs compactos, siguiente servicio y riesgos principales.",
      tone: "primary",
    },
    {
      id: "search",
      label: "Buscar",
      title: "Busqueda",
      summary: "Clientes, destinos e itinerarios con entrada rapida.",
      tone: "live",
    },
    {
      id: "itinerary",
      label: "Itinerario",
      title: "Detalle",
      summary: "Cabecera del viaje, estado comercial y margen.",
      tone: "primary",
    },
    {
      id: "services",
      label: "Servicios",
      title: "Servicios",
      summary: "Agenda operativa en tarjetas apiladas.",
      tone: "success",
    },
    {
      id: "passengers",
      label: "Pasajeros",
      title: "Pasajeros",
      summary: "Datos faltantes, documentos y rooming list.",
      tone: "warning",
    },
    {
      id: "suppliers",
      label: "Proveedores",
      title: "Proveedores",
      summary: "Reservas, pagos agrupados y contactos.",
      tone: "warning",
    },
    {
      id: "payments",
      label: "Pagos",
      title: "Pagos",
      summary: "Cuotas, metodo, fee y total a pagar.",
      tone: "primary",
    },
    {
      id: "preview",
      label: "Preview",
      title: "Propuesta",
      summary: "Vista cliente de 3 paginas en formato movil.",
      tone: "success",
    },
    {
      id: "chat",
      label: "Chat",
      title: "Conversacion",
      summary: "Handoff WhatsApp y notas del agente.",
      tone: "live",
    },
    {
      id: "notifications",
      label: "Alertas",
      title: "Alertas",
      summary: "Vencimientos, aprobaciones y bloqueos.",
      tone: "danger",
    },
    {
      id: "profile",
      label: "Perfil",
      title: "Perfil",
      summary: "Cuenta, firma y preferencias del asesor.",
      tone: "primary",
    },
  ],
  signals: [
    {
      id: "paid-immutability",
      label: "Cuotas pagadas",
      value: "Protegidas",
      detail: "La fase de detalle debe impedir regenerar cuotas ya pagadas.",
      tone: "primary",
    },
    {
      id: "supplier-payments",
      label: "Proveedores",
      value: "1 riesgo",
      detail: "Un itinerario confirmado necesita pago agrupado por proveedor.",
      tone: "warning",
    },
    {
      id: "low-margin",
      label: "Margen",
      value: "12%",
      detail: "Eje Cafetero opera por debajo del umbral objetivo.",
      tone: "danger",
    },
  ],
};

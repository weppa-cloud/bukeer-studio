export type ProductCategory = {
  key: string;
  label: string;
  count: number;
};

export type ProductRecord = {
  id: string;
  name: string;
  type: string;
  location: string;
  provider: string;
  providerKey: string;
  status: string;
  rating: string;
  reviews: number;
  fromPrice: string;
  priceAmount: number;
  priceUnit: string;
  rateState: 'active' | 'review';
  features: string[];
  imageCount: number;
  tone: 'primary' | 'live' | 'warning';
};

export type ProductRate = {
  id: string;
  name: string;
  detail: string;
  cost: string;
  margin: string;
  sale: string;
};

export type ProductGalleryImage = {
  url: string;
  alt: string;
  source: 'master' | 'override';
};

export type ProductSignal = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type ProductCatalogResolution = {
  id: string;
  sourceName: string;
  masterName: string;
  confidence: string;
  action: 'link' | 'create' | 'rate_required';
};

export type ProductsFixture = {
  categories: ProductCategory[];
  products: ProductRecord[];
  selected: ProductRecord & {
    code: string;
    description: string;
    galleryStatus: string;
    masterCatalogStatus: string;
    providerNit: string;
    providerEmail: string;
    providerPhone: string;
    galleryImages: ProductGalleryImage[];
    operationalDetails: Array<{ label: string; value: string }>;
  };
  rates: ProductRate[];
  signals: ProductSignal[];
  catalogResolutions: ProductCatalogResolution[];
};

export const productsFixture: ProductsFixture = {
  categories: [
    { key: 'all', label: 'Todos', count: 42 },
    { key: 'hotels', label: 'Hoteles', count: 18 },
    { key: 'activities', label: 'Actividades', count: 12 },
    { key: 'transfers', label: 'Traslados', count: 7 },
    { key: 'flights', label: 'Vuelos', count: 5 },
  ],
  products: [
    {
      id: 'prd-0148',
      name: 'Hotel Las Islas',
      type: 'Hotel',
      location: 'Baru, Cartagena',
      provider: 'Hotel Las Islas',
      providerKey: 'hotel-las-islas',
      status: 'Activo',
      rating: '4.9',
      reviews: 212,
      fromPrice: '$1.450.000',
      priceAmount: 1450000,
      priceUnit: 'noche',
      rateState: 'active',
      features: ['Desayuno', 'Playa privada', 'Spa'],
      imageCount: 6,
      tone: 'primary',
    },
    {
      id: 'prd-0204',
      name: 'Tour Johnny Cay + Acuario',
      type: 'Actividad',
      location: 'San Andres Isla',
      provider: 'Sea Tours San Andres',
      providerKey: 'sea-tours',
      status: 'Activo',
      rating: '4.8',
      reviews: 148,
      fromPrice: '$180.000',
      priceAmount: 180000,
      priceUnit: 'persona',
      rateState: 'active',
      features: ['Lancha', 'Almuerzo', 'Guia'],
      imageCount: 4,
      tone: 'live',
    },
    {
      id: 'prd-0087',
      name: 'Traslado aeropuerto privado',
      type: 'Traslado',
      location: 'Cartagena',
      provider: 'Transportes Marsol',
      providerKey: 'marsol',
      status: 'Revisar tarifa',
      rating: '4.6',
      reviews: 89,
      fromPrice: '$120.000',
      priceAmount: 120000,
      priceUnit: 'servicio',
      rateState: 'review',
      features: ['Privado', '3 pax', 'Equipaje'],
      imageCount: 2,
      tone: 'warning',
    },
  ],
  selected: {
    id: 'prd-0148',
    code: 'PRD-0148',
    name: 'Hotel Las Islas',
    type: 'Hotel',
    location: 'Baru, Cartagena',
    provider: 'Hotel Las Islas',
    providerKey: 'hotel-las-islas',
    providerNit: 'NIT 900.412.318',
    providerEmail: 'reservas@hotellasislas.com',
    providerPhone: '+57 605 693 0440',
    galleryImages: [],
    status: 'Activo',
    rating: '4.9',
    reviews: 212,
    fromPrice: '$1.450.000',
    priceAmount: 1450000,
    priceUnit: 'noche',
    rateState: 'active',
    features: ['Desayuno', 'Playa privada', 'Spa', 'Wifi', 'Kids club'],
    imageCount: 6,
    galleryStatus: '6 de 10 imagenes',
    masterCatalogStatus: 'Vinculado al catalogo maestro · override disponible',
    description:
      'Resort de lujo sobre el mar en Baru, con cabanas elevadas, playa privada y experiencias de isla. Ideal para parejas y familias que buscan exclusividad.',
    operationalDetails: [
      { label: 'Check-in / Check-out', value: '15:00 · 12:00' },
      { label: 'Ninos', value: 'Desde 5 anos' },
      { label: 'Cancelacion', value: 'Sin costo hasta 72 h' },
      { label: 'Usado en itinerarios', value: '14 este ano' },
    ],
    tone: 'primary',
  },
  rates: [
    {
      id: 'std',
      name: 'Hab. estandar · 2 pax',
      detail: 'Por noche · desayuno incluido',
      cost: '$1.160.000',
      margin: '20%',
      sale: '$1.450.000',
    },
    {
      id: 'sea',
      name: 'Hab. superior vista al mar · 2 pax',
      detail: 'Por noche · desayuno incluido',
      cost: '$1.480.000',
      margin: '19%',
      sale: '$1.820.000',
    },
    {
      id: 'family',
      name: 'Suite familiar · 2 ad + 2 ninos',
      detail: 'Por noche · desayuno + kids club',
      cost: '$1.950.000',
      margin: '18%',
      sale: '$2.380.000',
    },
  ],
  signals: [
    {
      id: 'mandatory-rate',
      label: 'Tarifa obligatoria',
      value: '3 vigentes',
      detail: 'El producto queda vendible porque tiene al menos una tarifa activa.',
    },
    {
      id: 'master-gallery',
      label: 'Fotos maestro/override',
      value: 'Override listo',
      detail: 'Si no hay fotos propias, hereda del catalogo maestro y permite restablecer.',
    },
    {
      id: 'price-review',
      label: 'Riesgo de tarifa',
      value: '1 traslado',
      detail: 'Marsol tiene margen por debajo del objetivo y requiere revision antes del corte.',
    },
  ],
  catalogResolutions: [
    {
      id: 'hotel-las-islas',
      sourceName: 'Hotel Las Islas',
      masterName: 'Hotel Las Islas · master PRD-0148',
      confidence: '96%',
      action: 'link',
    },
    {
      id: 'tour-manglares-baru',
      sourceName: 'Tour manglares Baru',
      masterName: 'Sin coincidencia segura',
      confidence: '42%',
      action: 'create',
    },
    {
      id: 'traslado-aeropuerto-hotel',
      sourceName: 'Traslado aeropuerto hotel',
      masterName: 'Traslado aeropuerto privado · master PRD-0087',
      confidence: '88%',
      action: 'rate_required',
    },
  ],
};

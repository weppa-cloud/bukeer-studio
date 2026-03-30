// Static enrichment data for Colombian destinations
// Used by destination detail pages for content that doesn't come from the database

export interface DestinationFact {
  label: string;
  value: string;
}

export interface DestinationContent {
  description: string;
  highlights: string[];
  bestTimeToVisit: string;
  weather: string;
  heroImage: string;
  facts: DestinationFact[];
}

const DESTINATION_CONTENT: Record<string, DestinationContent> = {
  'Cartagena de Indias': {
    description:
      'Cartagena de Indias es una joya del Caribe colombiano, famosa por su centro historico amurallado declarado Patrimonio de la Humanidad por la UNESCO. Sus calles empedradas, balcones cubiertos de buganvilias y arquitectura colonial crean un escenario romantico e inolvidable. Es el destino perfecto para combinar historia, playa y gastronomia de clase mundial.',
    highlights: [
      'Ciudad Amurallada y sus plazas coloniales',
      'Islas del Rosario y Baru con playas cristalinas',
      'Castillo de San Felipe de Barajas',
      'Gastronomia caribena y vida nocturna en Getsemani',
    ],
    bestTimeToVisit:
      'De diciembre a abril es la temporada seca ideal, con cielos despejados y temperaturas perfectas para disfrutar de la playa y recorrer la ciudad.',
    weather: '25-32°C todo el ano. Clima tropical humedo con brisa marina.',
    heroImage:
      'https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '2 m.s.n.m.' },
      { label: 'Poblacion', value: '1,028,736' },
      { label: 'Aeropuerto', value: 'CTG' },
      { label: 'Idioma', value: 'Espanol' },
    ],
  },
  'Santa Marta': {
    description:
      'Santa Marta es la ciudad mas antigua de Colombia, ubicada entre la Sierra Nevada y el mar Caribe. Ofrece una combinacion unica de playas virgenes, selva tropical y la majestuosa Ciudad Perdida. Es la puerta de entrada al Parque Nacional Tayrona, uno de los parques naturales mas espectaculares de Sudamerica.',
    highlights: [
      'Parque Nacional Natural Tayrona',
      'Trekking a Ciudad Perdida',
      'Playa Cristal y Bahia Concha',
      'Sierra Nevada de Santa Marta',
    ],
    bestTimeToVisit:
      'De diciembre a marzo y de julio a agosto son los mejores meses, con clima seco perfecto para trekking y actividades al aire libre.',
    weather: '24-33°C todo el ano. Clima tropical seco con influencia de la Sierra Nevada.',
    heroImage:
      'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '6 m.s.n.m.' },
      { label: 'Poblacion', value: '538,198' },
      { label: 'Aeropuerto', value: 'SMR' },
      { label: 'Idioma', value: 'Espanol' },
    ],
  },
  Medellin: {
    description:
      'Medellin, la Ciudad de la Eterna Primavera, se ha transformado en uno de los destinos mas innovadores de Latinoamerica. Enclavada en el Valle de Aburra, combina un clima perfecto con una vibrante escena cultural, gastronomica y de vida nocturna. Su sistema de transporte publico, parques y museos la convierten en una ciudad fascinante para explorar.',
    highlights: [
      'Comuna 13 y su transformacion urbana',
      'Parque Arvi y Metrocable',
      'Plaza Botero y Museo de Antioquia',
      'Guatape y la Piedra del Penol (excursion de un dia)',
    ],
    bestTimeToVisit:
      'Todo el ano gracias a su clima primaveral, aunque diciembre a febrero y junio a agosto tienen menos lluvias.',
    weather: '18-28°C todo el ano. Clima subtropical de montana, primaveral constante.',
    heroImage:
      'https://images.unsplash.com/photo-1577281083643-2b8c8e6e8b24?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '1,495 m.s.n.m.' },
      { label: 'Poblacion', value: '2,569,007' },
      { label: 'Aeropuerto', value: 'MDE' },
      { label: 'Idioma', value: 'Espanol' },
    ],
  },
  Bogota: {
    description:
      'Bogota, la capital de Colombia, es una metropolis vibrante a 2,640 metros de altura en la Cordillera de los Andes. Su centro historico La Candelaria alberga museos de clase mundial como el Museo del Oro y el Museo Botero. La ciudad ofrece una escena gastronomica sofisticada, vida cultural intensa y vistas espectaculares desde el cerro de Monserrate.',
    highlights: [
      'Cerro de Monserrate y vista panoramica',
      'Museo del Oro y Museo Botero',
      'La Candelaria y arte callejero',
      'Zona G y gastronomia de autor',
    ],
    bestTimeToVisit:
      'De diciembre a marzo es la temporada mas seca. Junio a agosto tambien son buenos meses con menos precipitaciones.',
    weather: '8-19°C todo el ano. Clima frio de montana, llevar siempre una chaqueta.',
    heroImage:
      'https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '2,640 m.s.n.m.' },
      { label: 'Poblacion', value: '7,901,653' },
      { label: 'Aeropuerto', value: 'BOG' },
      { label: 'Idioma', value: 'Espanol' },
    ],
  },
  'San Andres': {
    description:
      'San Andres es una isla paradisiaca en el Caribe colombiano, famosa por su mar de siete colores que va del turquesa al azul profundo. Con influencia raizal, la isla ofrece una cultura unica que mezcla tradiciones caribenas, africanas y britanicas. Es el destino ideal para snorkel, buceo y relajacion total en playas de arena blanca.',
    highlights: [
      'Mar de los Siete Colores y Cayo Bolivar',
      'Hoyo Soplador y La Piscinita',
      'Acuario y snorkel en Johnny Cay',
      'West View y cueva de Morgan',
    ],
    bestTimeToVisit:
      'De enero a abril es la temporada seca con mar en calma, ideal para buceo y snorkel con visibilidad excepcional.',
    weather: '26-30°C todo el ano. Clima tropical oceanico con brisa constante.',
    heroImage:
      'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '1 m.s.n.m.' },
      { label: 'Poblacion', value: '79,524' },
      { label: 'Aeropuerto', value: 'ADZ' },
      { label: 'Idioma', value: 'Espanol / Creole' },
    ],
  },
  Cali: {
    description:
      'Cali es la capital mundial de la salsa y el corazon del Valle del Cauca. Con un clima calido y una energia contagiosa, la ciudad vibra al ritmo de la musica y el baile. Ademas de su legendaria vida nocturna, Cali ofrece una gastronomia deliciosa, zoologico de primer nivel y acceso al Pacifico colombiano.',
    highlights: [
      'Escuelas de salsa y rumba en Juanchito',
      'Cristo Rey y mirador de la ciudad',
      'Zoologico de Cali, el mejor de Latinoamerica',
      'Barrio San Antonio y su bohemia',
    ],
    bestTimeToVisit:
      'Todo el ano es buen momento para visitar. La Feria de Cali en diciembre es el evento mas espectacular con desfiles y conciertos de salsa.',
    weather: '19-31°C todo el ano. Clima tropical seco con noches frescas.',
    heroImage:
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '1,018 m.s.n.m.' },
      { label: 'Poblacion', value: '2,252,616' },
      { label: 'Aeropuerto', value: 'CLO' },
      { label: 'Idioma', value: 'Espanol' },
    ],
  },
  Pereira: {
    description:
      'Pereira es la puerta de entrada al Eje Cafetero, declarado Paisaje Cultural Cafetero por la UNESCO. Rodeada de montanas verdes y fincas cafeteras, ofrece una experiencia inmersiva en la cultura del cafe colombiano. Desde aqui se accede facilmente a Salento, el Valle de Cocora y los termales de Santa Rosa de Cabal.',
    highlights: [
      'Recorrido por fincas cafeteras',
      'Termales de Santa Rosa de Cabal',
      'Jardin Botanico de la Universidad Tecnologica',
      'Parque Regional Natural Ucumari',
    ],
    bestTimeToVisit:
      'De junio a agosto y de diciembre a febrero son los meses mas secos, ideales para recorrer las fincas cafeteras y hacer senderismo.',
    weather: '17-27°C todo el ano. Clima templado de montana con lluvias moderadas.',
    heroImage:
      'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '1,411 m.s.n.m.' },
      { label: 'Poblacion', value: '477,027' },
      { label: 'Aeropuerto', value: 'PEI' },
      { label: 'Idioma', value: 'Espanol' },
    ],
  },
  Salento: {
    description:
      'Salento es un encantador pueblo colonial en el corazon del Eje Cafetero, famoso por sus casas coloridas y el espectacular Valle de Cocora con sus palmas de cera, el arbol nacional de Colombia. Es el destino perfecto para los amantes del cafe, el senderismo y la tranquilidad de los pueblos andinos.',
    highlights: [
      'Valle de Cocora y palmas de cera gigantes',
      'Calle Real y artesanias locales',
      'Degustacion de cafe de origen',
      'Mirador de Salento y paisaje cafetero',
    ],
    bestTimeToVisit:
      'De junio a agosto y de diciembre a febrero para aprovechar los dias soleados en el Valle de Cocora y las caminatas por la montana.',
    weather: '15-25°C todo el ano. Clima templado de montana, fresco en las mananas.',
    heroImage:
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '1,895 m.s.n.m.' },
      { label: 'Poblacion', value: '7,247' },
      { label: 'Aeropuerto', value: 'PEI (Pereira)' },
      { label: 'Idioma', value: 'Espanol' },
    ],
  },
  Guatape: {
    description:
      'Guatape es un pueblo magico a dos horas de Medellin, famoso por la imponente Piedra del Penol y su embalse de aguas turquesa. El pueblo encanta con sus fachadas decoradas con zocalos coloridos que narran la historia de sus habitantes. Es una excursion imperdible para quienes visitan la region antioquena.',
    highlights: [
      'Piedra del Penol (740 escalones, vista 360°)',
      'Embalse de Guatape en lancha',
      'Zocalos coloridos del pueblo',
      'Deportes nauticos y paseo en kayak',
    ],
    bestTimeToVisit:
      'Todo el ano es bueno para visitar. Los fines de semana pueden estar mas concurridos; entre semana se disfruta con mas tranquilidad.',
    weather: '18-26°C todo el ano. Clima templado humedo con lluvias frecuentes por la tarde.',
    heroImage:
      'https://images.unsplash.com/photo-1577281083643-2b8c8e6e8b24?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '1,890 m.s.n.m.' },
      { label: 'Poblacion', value: '5,747' },
      { label: 'Aeropuerto', value: 'MDE (Medellin)' },
      { label: 'Idioma', value: 'Espanol' },
    ],
  },
  Quindio: {
    description:
      'El Quindio es el corazon del Paisaje Cultural Cafetero, un departamento pequeno pero lleno de maravillas naturales y culturales. Desde fincas cafeteras hasta parques tematicos como Panaca y el Parque del Cafe, ofrece experiencias para toda la familia. Sus pueblos como Filandia, Circasia y Montenegro complementan la oferta turistica.',
    highlights: [
      'Parque Nacional del Cafe',
      'Filandia y su mirador del Valle',
      'Panaca: parque tematico agropecuario',
      'Ruta de fincas cafeteras con cata de cafe',
    ],
    bestTimeToVisit:
      'De junio a agosto y de diciembre a febrero son las mejores temporadas, con clima seco que permite disfrutar de todas las actividades al aire libre.',
    weather: '18-28°C dependiendo de la altitud. Clima templado cafetero con lluvias moderadas.',
    heroImage:
      'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=80',
    facts: [
      { label: 'Altitud', value: '1,000-2,000 m.s.n.m.' },
      { label: 'Poblacion', value: '575,010' },
      { label: 'Aeropuerto', value: 'AXM (Armenia)' },
      { label: 'Idioma', value: 'Espanol' },
    ],
  },
};

/**
 * Get destination content with fuzzy matching.
 * Matches partial city names (e.g., "Cartagena" matches "Cartagena de Indias").
 */
export function getDestinationContent(
  cityName: string
): DestinationContent | null {
  // Exact match first
  if (DESTINATION_CONTENT[cityName]) {
    return DESTINATION_CONTENT[cityName];
  }

  // Normalize for comparison
  const normalized = cityName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const [key, content] of Object.entries(DESTINATION_CONTENT)) {
    const normalizedKey = key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Check if either contains the other
    if (normalizedKey.includes(normalized) || normalized.includes(normalizedKey)) {
      return content;
    }
  }

  // Try matching first word (e.g., "Medellin" from "Medellin, Antioquia")
  const firstWord = normalized.split(/[,\s]+/)[0];
  if (firstWord.length >= 4) {
    for (const [key, content] of Object.entries(DESTINATION_CONTENT)) {
      const normalizedKey = key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (normalizedKey.startsWith(firstWord) || firstWord.startsWith(normalizedKey.split(/[,\s]+/)[0])) {
        return content;
      }
    }
  }

  return null;
}

export default DESTINATION_CONTENT;

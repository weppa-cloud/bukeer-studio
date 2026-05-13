import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

const WEBSITE_ID = '894545b7-73ca-4dae-b76a-da5b6a3f8441';
const SUBDOMAIN = 'colombiatours';
const DOMAIN = 'https://colombiatours.travel';
const WHATSAPP = 'https://wa.me/573206129003';
const HERO_IMAGE =
  'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/landings/cartagena-skyline.jpg';
const MEDELLIN_IMAGE =
  'https://wzlxbpicdcdvxvdcvgas.supabase.co/storage/v1/object/public/images/colombiatours/library/2018/12/medellin-2429413_960_720.jpg';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function wa(text) {
  return `${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function section(type, content, variant = '') {
  return { id: randomUUID(), type, content, variant };
}

const trustByLocale = {
  pt: {
    travelerLabel: 'viajantes atendidos',
    certs: ['RNT 35323', 'Especialistas locais na Colômbia'],
  },
  fr: {
    travelerLabel: 'voyageurs accompagnés',
    certs: ['RNT 35323', 'Spécialistes locaux en Colombie'],
  },
  de: {
    travelerLabel: 'betreute Reisende',
    certs: ['RNT 35323', 'Lokale Kolumbien-Planer'],
  },
  es: {
    travelerLabel: 'viajeros atendidos',
    certs: ['RNT 35323', 'Planners locales en Colombia'],
  },
};

function trust(localeKey) {
  const t = trustByLocale[localeKey];
  return section('trust_bar', {
    rating: { score: 4.9, count: 153, source: 'Google' },
    sslBadge: true,
    travelerCount: 12400,
    travelerLabel: t.travelerLabel,
    certifications: t.certs.map((name) => ({ name })),
  });
}

const pages = [
  {
    title: 'Pacotes de viagem para a Colombia',
    slug: 'pacotes-colombia',
    locale: 'pt-BR',
    target_keyword: 'pacotes colombia',
    seo_title: 'Pacotes para a Colombia sob medida | ColombiaTours',
    seo_description:
      'Pacotes de viagem para a Colombia com roteiro privado por Cartagena, Medellin, Eixo Cafeeiro, San Andres e Caribe. Fale com um planner local por WhatsApp.',
    hero_config: {
      eyebrow: 'Para viajantes do Brasil · Planner local na Colombia',
      title: 'Pacotes de viagem para a Colombia, feitos sob medida',
      subtitle:
        'Monte um roteiro privado de 8 a 15 dias por Cartagena, Medellin, Eixo Cafeeiro, San Andres e Caribe colombiano, com apoio local antes e durante a viagem.',
      ctaText: 'Pedir cotacao por WhatsApp',
      cta_text: 'Pedir cotacao por WhatsApp',
      ctaUrl: wa('Ola ColombiaTours, sou do Brasil e quero cotar um pacote de viagem para a Colombia.'),
      cta_action: 'whatsapp',
      secondaryCtaText: 'Ver rotas sugeridas',
      secondaryCtaUrl: '#pricing',
      backgroundImage: HERO_IMAGE,
      background_image: HERO_IMAGE,
    },
    intro_content: {
      text:
        'Esta pagina e para quem procura um pacote completo para a Colombia, nao apenas voo ou hotel. Um planner local ajuda a ajustar destinos, ritmo, hospedagem, traslados e experiencias conforme seu estilo de viagem.',
      highlights: [
        'Roteiros privados de 8 a 15 dias',
        'Cartagena, Medellin, Eixo Cafeeiro e Caribe',
        'Cotacao por WhatsApp',
        'Acompanhamento local na Colombia',
      ],
    },
    cta_config: {
      title: 'Quer uma rota clara antes de reservar?',
      subtitle: 'Envie datas, numero de viajantes e estilo de viagem. Respondemos com uma proposta concreta.',
      buttonText: 'Falar com um planner',
      buttonLink: wa('Ola ColombiaTours, quero montar minha rota pela Colombia saindo do Brasil.'),
    },
    sections: [
      trust('pt'),
      section('text_image', {
        eyebrow: 'Roteiro sem improviso',
        headline: 'A Colombia funciona melhor quando a rota e bem coordenada.',
        body:
          'Cartagena, Medellin, Eixo Cafeeiro e San Andres parecem proximos no mapa, mas exigem boa combinacao de voos internos, traslados e noites. Nossa equipe organiza a sequencia para evitar deslocamentos cansativos.',
        image: MEDELLIN_IMAGE,
        imageAlt: 'Medellin em um roteiro privado pela Colombia',
        imagePosition: 'right',
        ctaText: 'Cotizar minha viagem',
        ctaUrl: wa('Ola, quero uma rota pela Colombia com Cartagena, Medellin e Eixo Cafeeiro.'),
      }),
      section('features_grid', {
        title: 'O que o pacote pode incluir',
        items: [
          { icon: 'verified', title: 'Rota privada', description: 'Itinerario ajustado a datas, ritmo e interesses.' },
          { icon: 'support_agent', title: 'Planner local', description: 'Acompanhamento por WhatsApp antes e durante a viagem.' },
          { icon: 'local_offer', title: 'Preco claro', description: 'Cotacao com servicos definidos antes de reservar.' },
          { icon: 'security', title: 'Logistica coordenada', description: 'Traslados, atividades e suporte local em cada etapa.' },
        ],
      }),
      section('pricing', {
        anchorLabel: 'Rotas base',
        title: 'Ideias de viagem para comecar',
        subtitle: 'Os valores finais dependem de datas, categoria de hotel e numero de viajantes.',
        currency: 'USD',
        tiers: [
          {
            name: 'Colombia Essencial 8-10 dias',
            price: '1490',
            period: 'desde',
            perPerson: true,
            description: 'Cartagena, Medellin e Eixo Cafeeiro.',
            features: ['Hospedagem selecionada', 'Traslados principais', 'Experiencias guiadas', 'Suporte por WhatsApp'],
            ctaText: 'Cotar esta rota',
            ctaUrl: wa('Ola, quero cotar a rota Colombia Essencial para viajantes do Brasil.'),
            highlighted: true,
          },
          {
            name: 'Caribe + San Andres',
            price: '1890',
            period: 'desde',
            perPerson: true,
            description: 'Cartagena, ilhas e praia no Caribe colombiano.',
            features: ['Rota de praia', 'Traslados locais', 'Sugestao de hoteis', 'Planner local'],
            ctaText: 'Quero Caribe colombiano',
            ctaUrl: wa('Ola, quero um pacote com Cartagena e San Andres.'),
          },
        ],
      }),
      section('faq_accordion', {
        title: 'Perguntas frequentes',
        faqs: [
          {
            question: 'O pacote inclui voo internacional do Brasil?',
            answer:
              'Normalmente trabalhamos o roteiro terrestre e voos internos na Colombia. Se precisar, orientamos como alinhar o voo internacional com a rota.',
          },
          {
            question: 'Quantos dias sao ideais para conhecer a Colombia?',
            answer:
              'Para uma primeira viagem, 8 a 15 dias funcionam melhor. Com menos tempo, recomendamos escolher duas regioes para evitar correria.',
          },
          {
            question: 'Posso viajar em familia ou lua de mel?',
            answer:
              'Sim. Ajustamos ritmo, hoteis e experiencias conforme perfil: familia, casal, amigos, viagem privada ou comemoracao.',
          },
        ],
      }),
    ],
  },
  {
    title: 'Voyage sur mesure en Colombie',
    slug: 'voyage-colombie-sur-mesure',
    locale: 'fr-FR',
    target_keyword: 'voyage sur mesure colombie',
    seo_title: 'Voyage sur mesure en Colombie | ColombiaTours',
    seo_description:
      'Voyage organise et sur mesure en Colombie avec planner local: Carthagene, Medellin, region du cafe, Tayrona et Caraibes. Demandez un devis par WhatsApp.',
    hero_config: {
      eyebrow: 'Voyage organise · Planner local en Colombie',
      title: 'Voyage sur mesure en Colombie, sans itineraire standard',
      subtitle:
        'Construisez un circuit prive de 8 a 15 jours entre Carthagene, Medellin, la region du cafe, Tayrona et les Caraibes, avec une equipe locale qui coordonne la logistique.',
      ctaText: 'Demander un devis',
      cta_text: 'Demander un devis',
      ctaUrl: wa('Bonjour ColombiaTours, je souhaite un devis pour un voyage sur mesure en Colombie.'),
      cta_action: 'whatsapp',
      secondaryCtaText: 'Voir les idees de circuit',
      secondaryCtaUrl: '#pricing',
      backgroundImage: HERO_IMAGE,
      background_image: HERO_IMAGE,
    },
    intro_content: {
      text:
        'Ce voyage est pense pour les voyageurs qui veulent decouvrir la Colombie avec une route claire, des hotels coherents, des transferts coordonnes et du temps pour profiter de chaque region.',
      highlights: ['Circuit prive', 'Planner local', 'Carthagene, Medellin, cafe et Caraibes', 'Devis par WhatsApp'],
    },
    cta_config: {
      title: 'Vous voulez comparer une vraie route avant de reserver?',
      subtitle: 'Envoyez vos dates, le nombre de voyageurs et votre style de voyage.',
      buttonText: 'Parler a un planner',
      buttonLink: wa('Bonjour, je veux preparer un circuit prive en Colombie.'),
    },
    sections: [
      trust('fr'),
      section('text_image', {
        eyebrow: 'Un circuit realiste',
        headline: 'La valeur du sur mesure est dans le rythme, pas seulement dans la liste des villes.',
        body:
          'La Colombie se vit mieux avec une sequence logique: arrivee, acclimatation, vols internes, transferts et journees moins chargees. Nous adaptons le parcours pour eviter un voyage trop fragmente.',
        image: HERO_IMAGE,
        imageAlt: 'Carthagene dans un voyage sur mesure en Colombie',
        imagePosition: 'right',
        ctaText: 'Construire mon circuit',
        ctaUrl: wa('Bonjour, je veux construire un circuit sur mesure en Colombie.'),
      }),
      section('features_grid', {
        title: 'Ce que nous coordonnons',
        items: [
          { icon: 'verified', title: 'Circuit prive', description: 'Une route adaptee a vos dates et a votre rythme.' },
          { icon: 'support_agent', title: 'Support local', description: 'Un planner suit votre dossier par WhatsApp.' },
          { icon: 'local_offer', title: 'Devis clair', description: 'Services inclus et options visibles avant reservation.' },
          { icon: 'security', title: 'Logistique terrain', description: 'Transferts, guides et activites coordonnes en Colombie.' },
        ],
      }),
      section('pricing', {
        anchorLabel: 'Circuits types',
        title: 'Idees de circuit en Colombie',
        subtitle: 'Chaque devis est ajuste selon les dates, hotels et experiences choisies.',
        currency: 'EUR',
        tiers: [
          {
            name: 'Colombie classique 10 jours',
            price: '1590',
            period: 'a partir de',
            perPerson: true,
            description: 'Carthagene, Medellin et region du cafe.',
            features: ['Hotels selectionnes', 'Transferts principaux', 'Experiences guidees', 'Support local'],
            ctaText: 'Demander ce circuit',
            ctaUrl: wa('Bonjour, je veux un devis pour un circuit Colombie classique de 10 jours.'),
            highlighted: true,
          },
          {
            name: 'Colombie complete 15 jours',
            price: '2290',
            period: 'a partir de',
            perPerson: true,
            description: 'Carthagene, Medellin, cafe, Tayrona et Caraibes.',
            features: ['Itineraire multi-regions', 'Rythme plus confortable', 'Guides et transferts', 'Planner local'],
            ctaText: 'Voir la route complete',
            ctaUrl: wa('Bonjour, je veux un devis pour un voyage complet de 15 jours en Colombie.'),
          },
        ],
      }),
      section('faq_accordion', {
        title: 'Questions frequentes',
        faqs: [
          {
            question: 'Combien de jours faut-il pour un premier voyage en Colombie?',
            answer:
              'Dix jours permettent une bonne premiere route. Quinze jours donnent un rythme plus confortable pour ajouter Tayrona, San Andres ou une extension nature.',
          },
          {
            question: 'Le voyage est-il accompagne en permanence?',
            answer:
              'Le voyage peut inclure des guides sur certaines activites. Le suivi global se fait avec notre equipe locale et votre planner.',
          },
          {
            question: 'Pouvez-vous adapter le circuit a une famille ou un couple?',
            answer:
              'Oui. Le rythme, les hotels et les experiences peuvent etre ajustes selon l age, le style de voyage et les priorites.',
          },
        ],
      }),
    ],
  },
  {
    title: 'Kolumbien Rundreise privat planen',
    slug: 'kolumbien-rundreise',
    locale: 'de-DE',
    target_keyword: 'kolumbien rundreise',
    seo_title: 'Kolumbien Rundreise privat planen | ColombiaTours',
    seo_description:
      'Private Kolumbien Rundreise mit lokalen Planern: Cartagena, Medellin, Kaffeeregion, Tayrona und Karibik. Route von 10 bis 15 Tagen per WhatsApp anfragen.',
    hero_config: {
      eyebrow: 'Private Kolumbien Rundreise · Lokale Planung',
      title: 'Kolumbien Rundreise mit lokaler Planung',
      subtitle:
        'Planen Sie eine private 10- bis 15-taegige Route durch Cartagena, Medellin, die Kaffeeregion, Tayrona und die Karibik mit einem lokalen Team in Kolumbien.',
      ctaText: 'Route per WhatsApp anfragen',
      cta_text: 'Route per WhatsApp anfragen',
      ctaUrl: wa('Hallo ColombiaTours, ich moechte eine private Kolumbien Rundreise planen.'),
      cta_action: 'whatsapp',
      secondaryCtaText: 'Routen ansehen',
      secondaryCtaUrl: '#pricing',
      backgroundImage: HERO_IMAGE,
      background_image: HERO_IMAGE,
    },
    intro_content: {
      text:
        'Diese Seite richtet sich an Reisende, die Kolumbien nicht als schnelle Staedteliste erleben wollen. Wir planen eine realistische Route mit passenden Inlandsfluegen, Transfers, Hotels und lokalen Erlebnissen.',
      highlights: ['Private Rundreise', 'Lokaler Planner', '10 bis 15 Tage', 'Cartagena, Medellin, Kaffee und Karibik'],
    },
    cta_config: {
      title: 'Sie moechten eine Route vor der Buchung sehen?',
      subtitle: 'Senden Sie Reisedaten, Personenanzahl und Reisestil. Wir antworten mit einem konkreten Vorschlag.',
      buttonText: 'Mit Planner sprechen',
      buttonLink: wa('Hallo, ich moechte eine private Kolumbien Rundreise planen.'),
    },
    sections: [
      trust('de'),
      section('text_image', {
        eyebrow: 'Route statt Zufall',
        headline: 'Eine gute Kolumbien Rundreise braucht die richtige Reihenfolge.',
        body:
          'Die Entfernungen in Kolumbien werden oft unterschaetzt. Wir kombinieren Regionen so, dass Transfers, Inlandsfluege und Erlebnisse zusammenpassen und die Reise nicht zu hektisch wird.',
        image: MEDELLIN_IMAGE,
        imageAlt: 'Medellin als Station einer Kolumbien Rundreise',
        imagePosition: 'right',
        ctaText: 'Meine Route planen',
        ctaUrl: wa('Hallo, ich moechte eine Route mit Cartagena, Medellin und Kaffeeregion planen.'),
      }),
      section('features_grid', {
        title: 'Was geplant werden kann',
        items: [
          { icon: 'verified', title: 'Private Route', description: 'Individuell nach Daten, Tempo und Interessen.' },
          { icon: 'support_agent', title: 'Lokaler Kontakt', description: 'Planung und Betreuung per WhatsApp.' },
          { icon: 'local_offer', title: 'Klares Angebot', description: 'Leistungen und Optionen vor der Buchung sichtbar.' },
          { icon: 'security', title: 'Vor-Ort Logistik', description: 'Transfers, Guides und Aktivitaeten sinnvoll koordiniert.' },
        ],
      }),
      section('pricing', {
        anchorLabel: 'Routenbeispiele',
        title: 'Ideen fuer Ihre Kolumbien Rundreise',
        subtitle: 'Endpreise haengen von Datum, Hotelkategorie und Reiseprofil ab.',
        currency: 'EUR',
        tiers: [
          {
            name: 'Kolumbien Klassisch 10 Tage',
            price: '1590',
            period: 'ab',
            perPerson: true,
            description: 'Cartagena, Medellin und Kaffeeregion.',
            features: ['Ausgewaehlte Hotels', 'Wichtige Transfers', 'Gefuehrte Erlebnisse', 'Lokaler Support'],
            ctaText: 'Diese Route anfragen',
            ctaUrl: wa('Hallo, ich moechte ein Angebot fuer eine 10-taegige Kolumbien Rundreise.'),
            highlighted: true,
          },
          {
            name: 'Kolumbien Intensiv 15 Tage',
            price: '2290',
            period: 'ab',
            perPerson: true,
            description: 'Mehr Zeit fuer Karibik, Kaffee und Natur.',
            features: ['Mehrere Regionen', 'Ruhigeres Tempo', 'Guides und Transfers', 'Planner in Kolumbien'],
            ctaText: '15 Tage planen',
            ctaUrl: wa('Hallo, ich moechte eine 15-taegige private Kolumbien Rundreise planen.'),
          },
        ],
      }),
      section('faq_accordion', {
        title: 'Haeufige Fragen',
        faqs: [
          {
            question: 'Wie viele Tage sollte eine Kolumbien Rundreise dauern?',
            answer:
              'Fuer die erste Reise empfehlen wir 10 bis 15 Tage. So lassen sich zwei bis vier Regionen sinnvoll kombinieren.',
          },
          {
            question: 'Ist die Reise privat oder eine Gruppenreise?',
            answer:
              'Der Fokus dieser Seite ist eine private, individuell geplante Reise. Einzelne Ausfluege koennen privat oder in kleinen Gruppen organisiert werden.',
          },
          {
            question: 'Koennen Familien oder Paare die Route anpassen?',
            answer:
              'Ja. Tempo, Hotels und Erlebnisse koennen fuer Familien, Paare, Freunde oder eine besondere Reise angepasst werden.',
          },
        ],
      }),
    ],
  },
  {
    title: 'Viajes a Colombia desde Argentina',
    slug: 'viajes-a-colombia-desde-argentina',
    locale: 'es-CO',
    target_keyword: 'viaje a colombia desde argentina',
    seo_title: 'Viajes a Colombia desde Argentina | Paquetes a medida',
    seo_description:
      'Cotiza viajes a Colombia desde Argentina con planner local. Rutas por Cartagena, Medellin, Eje Cafetero, San Andres y Caribe colombiano.',
    hero_config: {
      eyebrow: 'Para viajeros desde Argentina · Planner local en Colombia',
      title: 'Viajes a Colombia desde Argentina, con ruta a medida',
      subtitle:
        'Arma un viaje privado por Cartagena, Medellin, Eje Cafetero, San Andres y Caribe colombiano con una agencia local que coordina traslados, hoteles y experiencias.',
      ctaText: 'Cotizar por WhatsApp',
      cta_text: 'Cotizar por WhatsApp',
      ctaUrl: wa('Hola ColombiaTours, soy de Argentina y quiero cotizar un viaje a Colombia.'),
      cta_action: 'whatsapp',
      secondaryCtaText: 'Ver rutas base',
      secondaryCtaUrl: '#pricing',
      backgroundImage: HERO_IMAGE,
      background_image: HERO_IMAGE,
    },
    intro_content: {
      text:
        'Esta landing filtra viajeros que buscan un paquete real a Colombia: ruta, hoteles, traslados, actividades y soporte local. No esta pensada para vuelos sueltos ni busquedas de hotel solamente.',
      highlights: ['Rutas de 8 a 15 dias', 'Cartagena, Medellin, Eje Cafetero y San Andres', 'Cotizacion por WhatsApp', 'Planner local'],
    },
    cta_config: {
      title: 'Contanos como queres viajar por Colombia',
      subtitle: 'Fechas, cantidad de viajeros, destinos de interes y presupuesto aproximado alcanzan para empezar.',
      buttonText: 'Armar mi ruta',
      buttonLink: wa('Hola, quiero armar una ruta a Colombia desde Argentina.'),
    },
    sections: [
      trust('es'),
      section('text_image', {
        eyebrow: 'Paquete completo, no solo vuelo',
        headline: 'La clave es elegir bien las regiones para no perder el viaje en traslados.',
        body:
          'Colombia combina Caribe, montana, cafe, ciudades y playas. Te ayudamos a ordenar la ruta segun dias disponibles, estilo de viaje y presupuesto para que cada tramo tenga sentido.',
        image: HERO_IMAGE,
        imageAlt: 'Cartagena en un viaje a Colombia desde Argentina',
        imagePosition: 'right',
        ctaText: 'Cotizar mi paquete',
        ctaUrl: wa('Hola, quiero cotizar un paquete a Colombia desde Argentina.'),
      }),
      section('features_grid', {
        title: 'Como armamos tu viaje',
        items: [
          { icon: 'verified', title: 'Ruta a medida', description: 'Elegimos destinos segun dias, presupuesto y tipo de viaje.' },
          { icon: 'support_agent', title: 'Atencion por WhatsApp', description: 'Un planner responde dudas antes de reservar.' },
          { icon: 'local_offer', title: 'Propuesta clara', description: 'Servicios y opciones visibles antes del pago.' },
          { icon: 'security', title: 'Soporte local', description: 'Equipo en Colombia para coordinar la experiencia.' },
        ],
      }),
      section('pricing', {
        anchorLabel: 'Rutas base',
        title: 'Ideas de paquetes a Colombia',
        subtitle: 'Los valores finales dependen de fechas, hoteles y numero de viajeros.',
        currency: 'USD',
        tiers: [
          {
            name: 'Colombia esencial 8-10 dias',
            price: '1490',
            period: 'desde',
            perPerson: true,
            description: 'Cartagena, Medellin y Eje Cafetero.',
            features: ['Hoteles seleccionados', 'Traslados principales', 'Experiencias guiadas', 'Soporte por WhatsApp'],
            ctaText: 'Cotizar esta ruta',
            ctaUrl: wa('Hola, quiero cotizar Colombia esencial desde Argentina.'),
            highlighted: true,
          },
          {
            name: 'Caribe colombiano',
            price: '1790',
            period: 'desde',
            perPerson: true,
            description: 'Cartagena, islas y opcion San Andres.',
            features: ['Ruta de playa', 'Asesoria de hoteles', 'Traslados locales', 'Planner local'],
            ctaText: 'Quiero Caribe',
            ctaUrl: wa('Hola, quiero un paquete de Caribe colombiano desde Argentina.'),
          },
        ],
      }),
      section('faq_accordion', {
        title: 'Preguntas frecuentes',
        faqs: [
          {
            question: 'El paquete incluye vuelo internacional desde Argentina?',
            answer:
              'Por defecto cotizamos la ruta en Colombia y podemos orientar la coordinacion con tu vuelo internacional. La propuesta aclara que servicios quedan incluidos.',
          },
          {
            question: 'Que destinos conviene combinar en una primera visita?',
            answer:
              'Cartagena, Medellin y Eje Cafetero funcionan muy bien en 8 a 10 dias. Con mas tiempo se puede sumar San Andres, Tayrona o Santa Marta.',
          },
          {
            question: 'Puedo pedir un viaje familiar o de pareja?',
            answer:
              'Si. Ajustamos ritmo, hoteles y actividades segun edades, intereses y nivel de comodidad esperado.',
          },
        ],
      }),
    ],
  },
];

async function fetchExisting(slug) {
  const { data, error } = await supabase
    .from('website_pages')
    .select('id, slug, title, locale, is_published, robots_noindex, seo_title, seo_description, target_keyword, hero_config, intro_content, cta_config, sections')
    .eq('website_id', WEBSITE_ID)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Fetch ${slug}: ${error.message}`);
  return data;
}

async function ensureLocales() {
  const { data: website, error } = await supabase
    .from('websites')
    .select('id, supported_locales')
    .eq('id', WEBSITE_ID)
    .single();
  if (error) throw new Error(`Fetch website: ${error.message}`);

  const current = Array.isArray(website.supported_locales) ? website.supported_locales : [];
  const required = ['es', 'en', 'es-CO', 'en-US', 'pt-BR', 'fr-FR', 'de-DE'];
  const next = [...new Set([...current, ...required])];
  if (JSON.stringify(current) === JSON.stringify(next)) {
    return { changed: false, before: current, after: next };
  }

  const { error: updateError } = await supabase
    .from('websites')
    .update({ supported_locales: next })
    .eq('id', WEBSITE_ID);
  if (updateError) throw new Error(`Update locales: ${updateError.message}`);
  return { changed: true, before: current, after: next };
}

async function upsertPage(page, navOrderBase) {
  const before = await fetchExisting(page.slug);
  const payload = {
    website_id: WEBSITE_ID,
    title: page.title,
    slug: page.slug,
    locale: page.locale,
    page_type: 'custom',
    is_published: true,
    robots_noindex: false,
    show_in_nav: false,
    nav_order: navOrderBase,
    display_order: navOrderBase,
    header_mode: 'default',
    category_type: 'landing',
    target_keyword: page.target_keyword,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    seo_keywords: [page.target_keyword],
    hero_config: page.hero_config,
    intro_content: page.intro_content,
    cta_config: page.cta_config,
    sections: page.sections,
    updated_at: new Date().toISOString(),
  };

  if (before?.id) {
    const { data, error } = await supabase
      .from('website_pages')
      .update(payload)
      .eq('id', before.id)
      .select('id, slug, locale, title')
      .single();
    if (error) throw new Error(`Update ${page.slug}: ${error.message}`);
    return { action: 'updated', before, after: data };
  }

  const { data, error } = await supabase
    .from('website_pages')
    .insert({
      ...payload,
      id: randomUUID(),
      translation_group_id: randomUUID(),
      created_at: new Date().toISOString(),
    })
    .select('id, slug, locale, title')
    .single();
  if (error) throw new Error(`Insert ${page.slug}: ${error.message}`);
  return { action: 'inserted', before: null, after: data };
}

async function revalidate(path) {
  if (!REVALIDATE_SECRET) {
    return { skipped: true, reason: 'missing_REVALIDATE_SECRET' };
  }
  const response = await fetch(`${DOMAIN}/api/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${REVALIDATE_SECRET}`,
    },
    body: JSON.stringify({ subdomain: SUBDOMAIN, path }),
  });
  const body = await response.text();
  return { status: response.status, ok: response.ok, body: body.slice(0, 500) };
}

async function main() {
  const localeResult = await ensureLocales();

  const { data: lastPages, error: orderError } = await supabase
    .from('website_pages')
    .select('nav_order')
    .eq('website_id', WEBSITE_ID)
    .order('nav_order', { ascending: false })
    .limit(1);
  if (orderError) throw new Error(`Fetch nav order: ${orderError.message}`);
  const baseOrder = Number(lastPages?.[0]?.nav_order ?? 100) + 1;

  const results = [];
  for (let index = 0; index < pages.length; index += 1) {
    results.push(await upsertPage(pages[index], baseOrder + index));
  }

  const revalidations = [];
  for (const page of pages) {
    const lang = page.locale.split('-')[0];
    const publicPath = page.locale === 'es-CO' ? `/${page.slug}` : `/${lang}/${page.slug}`;
    revalidations.push({ path: publicPath, result: await revalidate(`/site/${SUBDOMAIN}${publicPath}`) });
  }

  console.log(JSON.stringify({
    website_id: WEBSITE_ID,
    locales: localeResult,
    pages: results.map((result) => ({
      action: result.action,
      id: result.after.id,
      slug: result.after.slug,
      locale: result.after.locale,
      public_url:
        result.after.locale === 'es-CO'
          ? `${DOMAIN}/${result.after.slug}`
          : `${DOMAIN}/${result.after.locale.split('-')[0]}/${result.after.slug}`,
      rollback: result.before
        ? { type: 'restore_previous_row', id: result.before.id }
        : { type: 'delete_inserted_row', id: result.after.id },
    })),
    revalidations,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

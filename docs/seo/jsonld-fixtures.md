# JSON-LD Fixtures — Rich Results Validation

Sample `application/ld+json` payloads emitted by `components/seo/product-schema.tsx` for each supported product type. These fixtures mirror typical ColombiaTours data shape and can be pasted into the [Schema Markup Validator](https://validator.schema.org/) or the Google Rich Results Test:

- Rich Results Test (paste URL or HTML): <https://search.google.com/test/rich-results>
- Schema.org Validator: <https://validator.schema.org/>

To test a live page with Rich Results, use:
`https://search.google.com/test/rich-results?url=<encoded-url>`

Representative live URLs (replace with actual subdomain/slug when testing):
- Activity: <https://search.google.com/test/rich-results?url=https%3A%2F%2Fcolombiatours.bukeer.com%2Factividades%2Fcascada-salto-del-tequendama>
- Hotel: <https://search.google.com/test/rich-results?url=https%3A%2F%2Fcolombiatours.bukeer.com%2Fhoteles%2Fhotel-boutique-cartagena>
- Transfer: <https://search.google.com/test/rich-results?url=https%3A%2F%2Fcolombiatours.bukeer.com%2Ftraslados%2Faeropuerto-bogota-centro>
- Package: <https://search.google.com/test/rich-results?url=https%3A%2F%2Fcolombiatours.bukeer.com%2Fpaquetes%2Fcolombia-magica-10-dias>

## Conventions for fixtures

- Prices are illustrative (USD, COP) and reflect current public catalog ranges.
- `aggregateRating` appears ONLY when the catalog row has both `user_rating` (number) and `review_count > 0`. Activity fixture demonstrates this; transfer fixture omits it because no real rating exists.
- `inLanguage` reads from `websites.language` via `normalizeLanguage()`; default fallback `"es"`.
- `priceValidUntil` is ISO `YYYY-MM-DD`, 1 year from emission.
- Each page emits up to three schemas: the product schema, a `BreadcrumbList`, and optionally `FAQPage`.

---

## 1. Activity — `TouristAttraction`

```json
[
  {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    "name": "Tour Cascada Salto del Tequendama",
    "description": "Caminata guiada de medio dia al Salto del Tequendama con almuerzo campesino incluido.",
    "image": "https://cdn.bukeer.com/activities/tequendama-hero.jpg",
    "url": "https://colombiatours.bukeer.com/actividades/cascada-salto-del-tequendama",
    "inLanguage": "es",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Soacha",
      "addressCountry": "CO"
    },
    "location": {
      "name": "Parque Salto del Tequendama",
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 4.5806,
        "longitude": -74.2983
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": 4.7,
      "reviewCount": 184
    },
    "offers": {
      "@type": "Offer",
      "price": 95,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2027-04-16"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "inLanguage": "es",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://colombiatours.bukeer.com" },
      { "@type": "ListItem", "position": 2, "name": "Destinos", "item": "https://colombiatours.bukeer.com/destinos" },
      { "@type": "ListItem", "position": 3, "name": "Bogota", "item": "https://colombiatours.bukeer.com/destinos/bogota" },
      { "@type": "ListItem", "position": 4, "name": "Actividades", "item": "https://colombiatours.bukeer.com/actividades" },
      { "@type": "ListItem", "position": 5, "name": "Tour Cascada Salto del Tequendama" }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "inLanguage": "es",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Que incluye el tour?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Transporte ida y vuelta desde Bogota, guia bilingue, entrada al parque y almuerzo tipico."
        }
      },
      {
        "@type": "Question",
        "name": "Que dificultad tiene la caminata?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Dificultad media: 3 km de sendero con tramos empinados. Apta para personas con buena condicion fisica."
        }
      }
    ]
  }
]
```

## 2. Hotel — `LodgingBusiness`

```json
[
  {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": "Hotel Boutique Casa del Virrey",
    "description": "Hotel boutique en el centro historico de Cartagena con patio colonial y piscina.",
    "image": "https://cdn.bukeer.com/hotels/casa-del-virrey.jpg",
    "url": "https://colombiatours.bukeer.com/hoteles/hotel-boutique-cartagena",
    "inLanguage": "es",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Cartagena",
      "addressCountry": "CO"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 10.4236,
      "longitude": -75.5511
    },
    "containsPlace": {
      "name": "Centro Historico de Cartagena",
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 10.4236,
        "longitude": -75.5511
      }
    },
    "starRating": {
      "@type": "Rating",
      "ratingValue": 4
    },
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "WiFi gratis", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Piscina", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Desayuno incluido", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Aire acondicionado", "value": true }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": 4.6,
      "reviewCount": 312
    },
    "offers": {
      "@type": "Offer",
      "price": 185,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2027-04-16"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "inLanguage": "es",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://colombiatours.bukeer.com" },
      { "@type": "ListItem", "position": 2, "name": "Destinos", "item": "https://colombiatours.bukeer.com/destinos" },
      { "@type": "ListItem", "position": 3, "name": "Cartagena", "item": "https://colombiatours.bukeer.com/destinos/cartagena" },
      { "@type": "ListItem", "position": 4, "name": "Hoteles", "item": "https://colombiatours.bukeer.com/hoteles" },
      { "@type": "ListItem", "position": 5, "name": "Hotel Boutique Casa del Virrey" }
    ]
  }
]
```

## 3. Transfer — `TaxiService`

No `aggregateRating` emitted because the DB row has no `user_rating`. This is by-design: never synthesize ratings.

```json
[
  {
    "@context": "https://schema.org",
    "@type": "TaxiService",
    "name": "Traslado Aeropuerto El Dorado - Centro de Bogota",
    "description": "Servicio privado puerta a puerta desde el aeropuerto hasta cualquier hotel en el centro. Vehiculo con AC, chofer bilingue.",
    "image": "https://cdn.bukeer.com/transfers/eldorado-centro.jpg",
    "url": "https://colombiatours.bukeer.com/traslados/aeropuerto-bogota-centro",
    "inLanguage": "es",
    "areaServed": {
      "@type": "Place",
      "name": "Aeropuerto Internacional El Dorado",
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 4.7016,
        "longitude": -74.1469
      }
    },
    "offers": {
      "@type": "Offer",
      "price": 35,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2027-04-16"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "inLanguage": "es",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://colombiatours.bukeer.com" },
      { "@type": "ListItem", "position": 2, "name": "Destinos", "item": "https://colombiatours.bukeer.com/destinos" },
      { "@type": "ListItem", "position": 3, "name": "Bogota", "item": "https://colombiatours.bukeer.com/destinos/bogota" },
      { "@type": "ListItem", "position": 4, "name": "Traslados", "item": "https://colombiatours.bukeer.com/traslados" },
      { "@type": "ListItem", "position": 5, "name": "Traslado Aeropuerto El Dorado - Centro de Bogota" }
    ]
  }
]
```

## 4. Package — `TouristTrip` with `subTrip`

```json
[
  {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "name": "Colombia Magica 10 dias",
    "description": "Recorrido completo por Bogota, Eje Cafetero, Medellin y Cartagena con guias locales y traslados incluidos.",
    "image": "https://cdn.bukeer.com/packages/colombia-magica.jpg",
    "url": "https://colombiatours.bukeer.com/paquetes/colombia-magica-10-dias",
    "inLanguage": "es",
    "touristType": "Leisure",
    "offers": {
      "@type": "Offer",
      "price": 2450,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2027-04-16"
    },
    "itinerary": {
      "@type": "ItemList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Llegada a Bogota" },
        { "@type": "ListItem", "position": 2, "name": "Bogota - City tour + Monserrate" },
        { "@type": "ListItem", "position": 3, "name": "Vuelo a Armenia - Hacienda cafetera" },
        { "@type": "ListItem", "position": 4, "name": "Valle de Cocora" },
        { "@type": "ListItem", "position": 5, "name": "Traslado a Medellin - Comuna 13" },
        { "@type": "ListItem", "position": 6, "name": "Guatape y Piedra del Penol" },
        { "@type": "ListItem", "position": 7, "name": "Vuelo a Cartagena - Ciudad amurallada" },
        { "@type": "ListItem", "position": 8, "name": "Islas del Rosario" },
        { "@type": "ListItem", "position": 9, "name": "Dia libre en Cartagena" },
        { "@type": "ListItem", "position": 10, "name": "Retorno" }
      ]
    },
    "subTrip": [
      {
        "@type": "TouristTrip",
        "name": "Llegada a Bogota",
        "description": "Recepcion en el aeropuerto El Dorado y traslado al hotel en el centro historico."
      },
      {
        "@type": "TouristTrip",
        "name": "Bogota - City tour + Monserrate",
        "description": "Recorrido por La Candelaria, Plaza Bolivar y ascenso al Cerro de Monserrate."
      },
      {
        "@type": "TouristTrip",
        "name": "Vuelo a Armenia - Hacienda cafetera",
        "description": "Traslado al aeropuerto, vuelo a Armenia y visita a una hacienda cafetera tradicional."
      },
      {
        "@type": "TouristTrip",
        "name": "Valle de Cocora",
        "description": "Caminata por el Valle de Cocora entre palmas de cera, el arbol nacional de Colombia."
      },
      {
        "@type": "TouristTrip",
        "name": "Traslado a Medellin - Comuna 13",
        "description": "Recorrido urbano por la Comuna 13 con guia local, graffiti tour y escaleras electricas."
      },
      {
        "@type": "TouristTrip",
        "name": "Guatape y Piedra del Penol",
        "description": "Dia de excursion a Guatape, subida a la Piedra y paseo en lancha por el embalse."
      },
      {
        "@type": "TouristTrip",
        "name": "Vuelo a Cartagena - Ciudad amurallada",
        "description": "Vuelo a Cartagena y tour por la ciudad amurallada al atardecer."
      },
      {
        "@type": "TouristTrip",
        "name": "Islas del Rosario",
        "description": "Paseo en lancha a las Islas del Rosario con almuerzo y snorkel."
      },
      {
        "@type": "TouristTrip",
        "name": "Dia libre en Cartagena",
        "description": "Dia libre para explorar Getsemani, disfrutar de playas o shopping."
      },
      {
        "@type": "TouristTrip",
        "name": "Retorno",
        "description": "Traslado al aeropuerto Rafael Nunez para el vuelo de regreso."
      }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "inLanguage": "es",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://colombiatours.bukeer.com" },
      { "@type": "ListItem", "position": 2, "name": "Paquetes", "item": "https://colombiatours.bukeer.com/paquetes" },
      { "@type": "ListItem", "position": 3, "name": "Colombia Magica 10 dias" }
    ]
  }
]
```

---

## Validation checklist

For every fixture above, expected Rich Results Test output:

- [ ] `@context` = `https://schema.org`
- [ ] No "missing field" warnings for required schema.org fields
- [ ] `Offer.priceValidUntil` within 1 year of test run
- [ ] `AggregateRating` absent when not shown (activity YES, hotel YES, transfer NO, package NO)
- [ ] `inLanguage` = `es` (or the website's configured language)
- [ ] All `BreadcrumbList.position` values are contiguous integers starting at 1
- [ ] `FAQPage.mainEntity` only contains entries where both `question` and `answer` are present

## Regenerating fixtures

These are hand-authored samples. To regenerate from live data, render a product landing page in dev (`npm run dev:session`), view-source, and copy the three `<script type="application/ld+json">` blocks.

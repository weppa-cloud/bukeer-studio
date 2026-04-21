# editorial-v1 — Copy Catalog

Source: `themes/references/claude design 1/project/` (data.jsx + sections.jsx + details.jsx + planners.jsx + experiences.jsx + blog.jsx + pages.jsx + waflow.jsx + switcher.jsx)
Target: `websites.sections.content` for pilot ColombiaTours (id `894545b7-73ca-4dae-b76a-da5b6a3f8441`, subdomain `colombiatours`) + hardcoded template strings.

## How to read this file

- **EDITORIAL** copy is ported verbatim into `websites.sections.content` during the migration (seed script).
- **UI** copy belongs to the template layer (hardcoded in the React components), not the DB.
- **CATALOG** items are for reference only and will be replaced by real data from Supabase — do not seed them.
- `<em>…</em>` markers preserve the designer's italic-serif emphasis inside headings (see `styles.css` `h1 em` / `h2 em` rules).

---

## Global brand strings

EDITORIAL:
- Brand name: "ColombiaTours.travel"
- Brand tagline (footer): "Viaja más hondo."
- Legal line (footer): "© 2026 ColombiaTours.travel · RNT 83412 · NIT 900.xxx.xxx-9"
- About blurb (footer): "Somos un operador local con sede en Medellín. Diseñamos viajes por Colombia desde 2011, con guías locales y alojamientos familiares."

UI:
- RNT badge (trust bar): "RNT 83412"

---

## Navigation (header)

UI (hardcoded link labels):
- "Destinos" (page: home)
- "Paquetes" (page: listing)
- "Experiencias" (page: experiences)
- "Travel Planners" (page: planners)
- "Blog" (page: blog)

UI (icon-btn labels / tooltips):
- "Buscar" (search icon)
- "Cotizar viaje" (primary CTA in header)

---

## Hero (home)

EDITORIAL:
- eyebrow: "Operador local · 14 años en Colombia"
- headline (with emphasis markers):
  ```
  Colombia
  <em>como la cuenta</em>
  quien la camina.
  ```
- subtitle/lead: "Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía."
- primary CTA: `{ label: "Planea mi viaje", action: openFlow }`
- secondary CTA: `{ label: "Ver paquetes" }`
- hero side list eyebrow: "Destino del mes"
- hero side list items (editorial highlight sequence):
  - `{ k: "01", n: "Cartagena", s: "Caribe" }`
  - `{ k: "02", n: "Tayrona", s: "Sierra" }`
  - `{ k: "03", n: "Eje Cafetero", s: "Andes" }`
  - `{ k: "04", n: "Medellín", s: "Antioquia" }`
- hero meta prefix: "Presentando · {region}"

UI (hero-search widget):
- field labels: "Destino", "Cuándo", "Viajeros"
- placeholder values: "Caribe · Colombia", "Octubre 2026 · 7 noches", "2 viajeros"
- go-button label: "Buscar"

---

## Trust band (below hero)

EDITORIAL:
- label: "Reconocidos por"
- logo strip (brand names, left-to-right):
  - "ProColombia"
  - "ANATO"
  - "Travellers' Choice"
  - "MinCIT"
  - "Rainforest"
  - "RNT 83412"

---

## Trust bar F1 (Fase 1 — shown below hero as alternative)

EDITORIAL:
- item 1: "<b>Planners en línea</b> · responden en ~3 min"
- item 2: "<b>RNT 83412</b> · Operador local desde 2011"
- item 3: "<b>Revisado por humanos</b> · cada itinerario"
- item 4: "<b>4.9/5</b> · 3,200+ reseñas verificadas"

---

## Destinations section

EDITORIAL:
- eyebrow: "Destinos"
- title: "Ocho Colombias <span class='serif'>en un mismo viaje.</span>"
- subtitle: "Del mar de siete colores al desierto de La Guajira. Cada región con sus guías, sus sabores y su ritmo."

UI:
- view-toggle labels: "Lista" (grid icon), "Mapa" (pin icon)
- map aria-label (list view): "Mapa interactivo de destinos en Colombia"
- map aria-label (region view): "Mapa de Colombia — destinos por región"

CATALOG: (skip — use real destinations from Supabase)
Reference only — designer fixtures contain 8 destinations:
`cartagena`, `san-andres`, `eje-cafetero`, `tayrona`, `medellin`, `guatape`, `desierto` (La Guajira), `amazonas`.

---

## Explore Map section (home)

EDITORIAL:
- eyebrow: "Explora Colombia"
- title: "Un país <span class='serif'>en cada región.</span>"
- subtitle: "Del Caribe al Amazonas, de los Andes al Pacífico. Pasa el cursor por el mapa para ver a dónde puedes ir — o filtra por región."
- region filter chips: "Todos", "Caribe", "Andes", "Selva"
- primary CTA: "Ver paquetes"
- secondary CTA: "Buscar destino"

---

## Packages section (home carousel/grid)

EDITORIAL:
- eyebrow: "Paquetes"
- title: "Itinerarios pensados, <span class='serif'>listos para ajustarse a ti.</span>"
- filter tabs: "Todos", "Playa", "Aventura", "Cultura", "Naturaleza"
- "view all" link: "Ver los 42 paquetes" (flag: count will need to match real DB)

UI (card labels):
- price prefix: "Desde · por persona"
- CTA on card: "Ver ruta"
- meta icons labels: "{days} días / {nights} noches", "{group}"
- badge labels when present: "Más vendido" (chip-accent), "Eco", "Aventura", "City", "Off-grid", "Comunidad", "Nuevo", "Premium", "Adrenalina", "Imprescindible", "Gratis"

CATALOG: (skip — use real `package_kits` rows)

---

## Activities / Experiences section

EDITORIAL (page hero):
- eyebrow: "Experiencias"
- title: "Actividades"
- emphasis: "para sumar a tu viaje."
- subtitle: "Oficios, caminatas, cocina, mar, selva. Reservables sueltas o como add-on a cualquier paquete."

EDITORIAL (category tiles — EXP_CATS):
- `{ k: "all", l: "Todas", sub: "14 experiencias" }` (flag: count will need real value)
- `{ k: "aventura", l: "Aventura", sub: "caminar, volar, escalar" }`
- `{ k: "gastronomia", l: "Gastronomía", sub: "cocina, café, mercados" }`
- `{ k: "cultura", l: "Cultura", sub: "música, historia, pueblos" }`
- `{ k: "naturaleza", l: "Naturaleza", sub: "fauna y selva" }`
- `{ k: "mar", l: "Mar", sub: "buceo y navegación" }`
- `{ k: "bienestar", l: "Bienestar", sub: "retiros y silencio" }`

EDITORIAL (duration buckets — DUR_BUCKETS):
- "Cualquiera", "Menos de 4h", "Medio día", "Día completo", "Multi-día"

EDITORIAL (level labels):
- "Fácil", "Moderado", "Exigente"

EDITORIAL (featured block):
- chip: "Imprescindible del mes"
- meta labels: "Duración", "Salida", "Nivel", "Desde"
- CTA: "Ver detalles"

EDITORIAL (reviews section):
- title: "Reseñas <span class='serif'>destacadas.</span>"
- meta label: "Últimos 30 días"

EDITORIAL (cross-sell block):
- label: "Cross-sell"
- title: "Sumá cualquier experiencia <em>a un paquete.</em>"
- body: "Si ya elegiste un paquete, tu planner asignado puede agregar estas actividades al itinerario sin complicaciones — ajustando horarios, traslados y comidas."
- CTA: "Ver paquetes"

EDITORIAL (final CTA block):
- label: "No encuentras lo tuyo"
- title: "Diseñamos experiencias <em>a medida.</em>"
- body: "Si tu idea no está en el catálogo, cuéntanos. Un planner local la arma en 24h."
- CTA: "Contarle a un planner"

UI (toolbar + filters):
- search placeholder: "Buscar experiencias…"
- sort options: "Más populares", "Mejor calificadas", "Precio · menor a mayor", "Precio · mayor a menor", "Duración · más cortas"
- filter labels: "Región", "Nivel", "Precio máx"
- clear button: "Limpiar todo"
- count format: "<b>{n}</b> de {total} experiencias"
- empty state heading: "Nada con esos criterios"
- empty state body: "Ajusta los filtros o empieza de cero."
- empty state CTA: "Limpiar filtros"

UI (activity card):
- price prefix when free: "Gratis"
- price prefix otherwise: "Desde · ${price} USD"
- subtitle prefix: "— {subtitle}."

CATALOG: (skip — use real `activities` rows + catalog-sourced reviews)

---

## Hotels section

Not present as a standalone home section in the designer. Hotels render only inside `PackageDetailV2` under "Alojamientos seleccionados" (see Detail page below).

---

## Stats section

EDITORIAL (static marketing claims — flagged for ops verification):
- headline: (none — just the stats row)
- metrics:
  - `{ num: "12.4k", suffix: "+", label: "viajeros en 14 años" }`
  - `{ num: "4.9", suffix: "/5", label: "promedio en 3,200 reseñas" }`
  - `{ num: "96", suffix: "%", label: "recomendaría a un amigo" }`
  - `{ num: "32", suffix: "", label: "destinos únicos en Colombia" }`

Ambiguity: These numbers also appear in trust-bar ("3,200+ reseñas", "4.9/5"), footer-adjacent areas, and detail pages ("12 años, 3,200 reseñas"). Consider whether any should be computed from real data (reviews count, destinations count) vs kept editorial.

---

## Promise / Why us section

EDITORIAL:
- eyebrow: "Por qué ColombiaTours"
- title: "Un viaje bien hecho <em>se nota.</em>"
- subtitle: "No vendemos cupos: diseñamos viajes. Cada ruta pasa por manos de un planner local que la conoce porque la ha caminado."
- primary CTA: "Hablar con un planner"
- feature cards:
  - `{ icon: "pin", title: "Operador local, no intermediario", desc: "Somos la agencia. Sin triangulaciones ni sorpresas de último momento." }`
  - `{ icon: "shield", title: "Viaje asegurado de punta a punta", desc: "Asistencia médica, cobertura de cancelación y atención 24/7 en español, inglés y francés." }`
  - `{ icon: "leaf", title: "Turismo con impacto", desc: "Alojamientos familiares, guías de las comunidades y operaciones bajas en huella." }`
  - `{ icon: "sparkle", title: "Diseño a tu medida", desc: "Tu planner asignado ajusta itinerario, hoteles y ritmo hasta que sea exactamente tu viaje." }`

---

## Planners section (home)

EDITORIAL:
- eyebrow: "Tu planner"
- title: "Una persona <span class='serif'>que te conoce</span> de principio a fin."
- subtitle: "Emparejamos tu perfil con el planner que más sabe de la región o experiencia que buscas."
- "view all" CTA: "Ver todos"

UI (planner card template):
- years label format: "{years} años diseñando viajes a medida."

CATALOG: (skip — use real planner records from `contacts` or dedicated table)

---

## Planners list page

EDITORIAL (page hero):
- eyebrow: "Nuestros planners"
- title: "Una persona"
- emphasis: "que conoce su tierra."
- subtitle: "Seis especialistas locales. Cada uno con una región, un oficio y 5–11 años diseñando viajes a medida por Colombia."

EDITORIAL (intro block):
- eyebrow: "Por qué un planner local"
- title: "No somos un motor de reservas — <em>somos seis personas</em> que han caminado Colombia."
- body: "Cuando reservas con nosotros, no hablas con un call center. Te emparejamos con la persona que vive en la región donde quieres ir, habla tu idioma, y conoce a los chefs, guías, y familias que harán tu viaje distinto al de los demás."

EDITORIAL (stats row):
- `{ b: "6", small: "Planners locales" }`
- `{ b: "4.97/5", small: "Reseñas promedio" }`
- `{ b: "939", small: "Viajes diseñados" }`
(Flag: these values may need to recompute from real catalog.)

EDITORIAL (tab labels):
- "Todos", "Caribe", "Eje Cafetero", "Amazonas / Pacífico", "Aventura", "Medellín", "Pacífico Sur"

EDITORIAL (matchmaker block):
- eyebrow: "Encuentra tu planner"
- title: "Dinos qué buscas <em>y te emparejamos</em> en 30 segundos."
- body: "No todos los planners hacen todas las regiones. Cuéntanos dónde quieres ir y qué te mueve — nosotros sabemos quién firma ese viaje."
- CTA: "Hablar con mi match"
- quiz label 1: "¿A qué región vas?"
- quiz region options: "Caribe", "Andes", "Amazonas", "Pacífico", "Aventura"
- quiz label 2: "¿Qué estilo de viaje?"
- quiz style options: "Cultura", "Aventura", "Naturaleza", "Gastronomía", "Boutique"
- match suggestion label: "Match sugerido"

UI (planner list card):
- sort hint: "{n} planner/planners · ordenar por reseñas"
- "view profile" link: "Ver perfil"
- availability status dot + text (from planner record)

CATALOG: (skip — planner records)

---

## Planner detail page

EDITORIAL (section headings — verbatim with `<em>` markers):
- quote block: (no heading — large pull quote)
- bio section: "Sobre <em>{firstName}</em>"
- differentiators: "Lo que <em>hace diferente</em>"
- specialties sub-label: "Especialidades" (uppercase eyebrow style)
- regions sub-label: "Regiones" (uppercase eyebrow style)
- signature trip: "Viaje <em>firma</em>"
- signature chip: "Firma de {firstName}"
- signature sub-label: "ITINERARIO DESTACADO"
- hallmark packages: "Otros paquetes <em>que diseña</em>"
- fun facts: "Detalles <em>personales</em>"
- reviews: 'Lo que dicen <em>viajeros de {firstName}</em>'
- other planners (bottom): "Otros <em>planners</em>"

EDITORIAL (rail/sidebar):
- label: "Hablar con"
- KPI labels: "Experiencia", "Viajes", "Rating", "Idiomas"
- meta rows: "Tiempo de respuesta", "Desde", "Idiomas"
- primary CTA: "Escribir a {firstName}" (with WhatsApp icon)
- secondary CTA: "Pedir propuesta"
- footnote: "Sin compromiso · Primera propuesta en <2h hábiles"

UI (signature card CTAs):
- "Ver itinerario"
- "Pedirle a {firstName}" (with WhatsApp icon)

CATALOG: (skip — planner bio, quote, funFacts, hallmarks, signature, reviews)

---

## Testimonials section

EDITORIAL:
- eyebrow: "Testimonios"
- title: "El recuerdo <span class='serif'>después del viaje.</span>"
- rating chip: "4.9 · 3,218 reseñas verificadas" (flag: verify count matches live data; replace if using real Google reviews widget)

UI:
- quote mark: `"` (typographic opening quote)

CATALOG: (skip — use real Google reviews; designer TESTIMONIALS array is for reference only)

---

## FAQ section (home)

EDITORIAL:
- eyebrow: "Preguntas frecuentes"
- title: "Lo que <span class='serif'>nos preguntan</span> antes de reservar."
- helper text: "¿No encuentras la respuesta? Escribe a tu planner — respondemos en <2h hábiles."
- secondary CTA: "Chat por WhatsApp"
- items (6 — verbatim):
  - Q: "¿Es seguro viajar a Colombia hoy?"
    A: "Sí. Nuestros destinos son áreas turísticas consolidadas, con protocolos de seguridad y guías locales certificados. Hacemos monitoreo permanente y ajustamos rutas si hace falta."
  - Q: "¿Qué incluye el precio del paquete?"
    A: "Alojamiento, traslados terrestres/aéreos especificados, tours guiados, entradas a parques y desayunos. Revisa la ficha de cada paquete — marcamos con check lo incluido y con dash lo opcional."
  - Q: "¿Puedo personalizar el itinerario?"
    A: "Todos los paquetes son punto de partida. Tu planner asignado puede agregar días, cambiar hoteles, sumar actividades o reemplazar destinos. Sin costo por ajustar antes de confirmar."
  - Q: "¿Cómo se paga la reserva?"
    A: "30% para confirmar, saldo 30 días antes del viaje. Aceptamos tarjeta internacional, PSE, transferencia y, para USA/EU, también PayPal y link de pago."
  - Q: "¿Qué pasa si tengo que cancelar?"
    A: "Cancelación flexible hasta 45 días antes (reembolso 90%). Entre 45 y 15 días, 50%. Menos de 15 días, el anticipo queda como crédito de viaje por 12 meses."
  - Q: "¿Necesito vacunas o visa?"
    A: "La mayoría de pasaportes no requiere visa por menos de 90 días. Fiebre amarilla es recomendada (no obligatoria) para Amazonas y Pacífico. Te enviamos la checklist exacta según tu nacionalidad."

---

## CTA band (below FAQ)

EDITORIAL:
- eyebrow: "Empieza hoy"
- title: "Tu Colombia, <em>en 3 pasos.</em>"
- subtitle: "Cuéntanos qué buscas, recibe una propuesta en 24h con 2–3 rutas posibles, y ajusta con tu planner hasta que sea el viaje que quieres."
- primary CTA: "Planea mi viaje"
- secondary CTA: "Chat WhatsApp" (with WhatsApp icon)

---

## How It Works (Fase 1 — 3-step section)

EDITORIAL:
- eyebrow: "Cómo funciona"
- title: "Tu viaje <em>en 3 pasos,</em> sin formularios largos."
- subtitle: "Dejamos atrás los PDFs con precios genéricos. Hoy diseñamos contigo por WhatsApp — rápido como mensajear a un amigo, pero con la mano de un planner experto."
- steps:
  - `{ n: "01", title: "Cuéntanos en 30 segundos.", desc: "Destino, fechas aproximadas y quiénes viajan. Nada de formularios largos — 5 campos, chips para tocar.", meta: "30 segundos" }`
  - `{ n: "02", title: "WhatsApp con un humano.", desc: "Un planner de carne y hueso te escribe. Usa IA para ser rápido; revisa cada propuesta antes de enviártela.", meta: "Responde en 3 min" }`
  - `{ n: "03", title: "Propuesta en 24h.", desc: "Recibes 2–3 rutas posibles con precio, hoteles y actividades. Ajustas con tu planner hasta que sea tuya.", meta: "En 24h hábiles" }`
- bottom CTA: "Empezar por WhatsApp" (with WhatsApp icon)
- bottom footnote: "Sin costo · sin compromiso · respuesta en ~3 min"

---

## Footer

EDITORIAL:
- tagline (brand block): "Viaja más hondo."
- about blurb: "Somos un operador local con sede en Medellín. Diseñamos viajes por Colombia desde 2011, con guías locales y alojamientos familiares."
- column 1 title: "Destinos"
  - links: "Cartagena", "Eje Cafetero", "Tayrona", "San Andrés", "Amazonas", "Ver todos"
- column 2 title: "Viajar"
  - links: "Paquetes", "Buscar", "Hoteles boutique", "Luna de miel", "Grupos y corporativo"
- column 3 title: "Agencia"
  - links: "Sobre nosotros", "Nuestros planners", "Blog", "Prensa", "Contacto"
- column 4 title: "Recibe historias"
  - body: "Un correo al mes con rincones que nos enamoran y descuentos."
  - input placeholder: "tu@correo.com"
  - CTA: "Suscribirme"
- legal line: "© 2026 ColombiaTours.travel · RNT 83412 · NIT 900.xxx.xxx-9"
- legal links: "Privacidad", "Términos", "Política de cancelación"
- social labels (icon-btn aria): "Instagram", "Facebook", "TikTok"
- preferences block:
  - label: "Preferencias"
  - description: "Elige tu idioma y la moneda en que quieres ver los precios."

---

## WhatsApp bubble / FAB (floating)

EDITORIAL (bubble text):
- heading: "¿Planeas un viaje?"
- body: "Chatea con un planner — responde en ~3 min"
- close aria: "Cerrar bocadillo"
- button aria: "Chat por WhatsApp"

---

## Package listing page

EDITORIAL (page hero):
- eyebrow: "Catálogo"
- title: "Paquetes"
- emphasis: "por toda Colombia."
- subtitle: "Itinerarios diseñados por planners locales. Ajustables, flexibles, punto de partida para tu viaje."

UI (filters sidebar):
- heading: "Filtros"
- clear button: "Limpiar"
- filter group titles: "Destino", "Tipo de viaje", "Duración (días)", "Precio máx (USD)", "Mes de salida"
- type chips: "Playa", "Aventura", "Cultura", "Naturaleza"
- month chip abbreviations: "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
- range display format: "≤ {days}", "${priceMax}"

UI (listing top):
- count format: "<b>{n}</b> de {total} paquetes"
- clear filters link: "limpiar filtros"
- view toggle: "Lista" / "Mapa"
- sort options: "Ordenar: Más populares", "Precio · menor a mayor", "Precio · mayor a menor", "Duración · más largos", "Mejor calificados"
- load more CTA: "Cargar más"

UI (empty state):
- heading: "Ningún paquete con esos filtros"
- body: "Prueba ensanchando el rango o limpiando filtros."
- CTA: "Limpiar filtros"

---

## Package detail page (PackageDetailV2)

EDITORIAL (overview bar labels):
- "Duración", "Destinos", "Grupo", "Dificultad", "Mejor época", "Idiomas"
- static values in template: dificulty → "Moderada"; mejor época → "Dic – Abr"; idiomas → "ES · EN · FR"

EDITORIAL (gallery strip CTA): "Ver {count*4} fotos" (e.g., "Ver 24 fotos")

EDITORIAL (intro section):
- heading: "Un viaje que <em>sabe a Colombia.</em>"
- body template: "Este paquete recorre {subtitle.toLowerCase()} en {days} días hechos a la medida del viajero que quiere ver, comer, caminar y quedarse un rato más. Nada de listas infinitas: paramos donde hay que parar, caminamos cuando hay que caminar, y dejamos espacio para lo que nadie planea pero todo mundo recuerda."

EDITORIAL (highlights grid — 6 cards):
- `{ icon: "sparkle", title: "Ruta a ritmo humano", desc: "Ni carrera ni relleno." }`
- `{ icon: "users", title: "Guías que viven allá", desc: "Conocen personas, no solo lugares." }`
- `{ icon: "leaf", title: "Hoteles con historia", desc: "Fincas y boutiques, no cadenas." }`
- `{ icon: "shield", title: "Asistencia 24/7", desc: "Planner respondiendo en menos de 2h." }`
- `{ icon: "compass", title: "Logística resuelta", desc: "Todo coordinado, un contacto." }`
- `{ icon: "award", title: "12 años, 3,200 reseñas", desc: "RNT vigente, seguros verificados." }`

(Legacy `PackageDetail` in `pages.jsx` has a slightly different highlights list — use PackageDetailV2 version.)

EDITORIAL (itinerary section):
- heading: "Itinerario <em>día a día</em>"
- subtitle: "Cada día con horario, transporte, comidas y alojamiento. Todo ajustable por tu planner."

EDITORIAL (day event category labels — EVENT_LABELS):
- "Transporte", "Actividad", "Comida", "Alojamiento", "Tiempo libre"

EDITORIAL (day templates for synthetic itinerary — buildItinerary):
- day 1 intro event title: "Vuelo de llegada · traslado al hotel"
- day 1 intro event note: "Recogida privada en el aeropuerto. Check-in y bienvenida con frutas y agua de panela."
- mid-trip comida template: `{ time: "13:30", title: "Almuerzo regional", note: "Cocina local con productos de temporada." }`
- mid-trip actividad template: `{ time: "16:30", title: "Caminata por el centro", note: "Recorrido a pie para reconocer el barrio con tu guía." }`
- nightly alojamiento note: "Habitación doble con desayuno incluido."
- last-day transporte template: `{ time: "14:00", title: "Traslado al aeropuerto", note: "Según hora de vuelo, con 3h de anticipación." }`

EDITORIAL (hotels section):
- heading: "Alojamientos <em>seleccionados</em>"
- subtitle: "Hoteles boutique y fincas curadas por tu planner. Se pueden subir o bajar de categoría sin cambiar el resto del viaje."

EDITORIAL (flights section):
- heading: "Vuelos <em>domésticos</em>"
- subtitle: "Incluidos en el paquete. Horarios confirmados al cotizar."

EDITORIAL (include/exclude section):
- heading: "Qué <em>incluye y no</em> incluye"
- col 1 title: "Incluido en el precio"
- included list (template):
  - "Traslados aeropuerto ↔ hotel (privados)"
  - "{nights} noches de alojamiento en hotel boutique"
  - "Vuelos domésticos especificados"
  - "Tours guiados en cada destino"
  - "Entradas a parques y sitios"
  - "Desayuno diario · 2 cenas de bienvenida/despedida"
  - "Asistencia telefónica 24/7 en español e inglés"
  - "Seguro médico básico"
- col 2 title: "No incluido"
- excluded list:
  - "Vuelos internacionales"
  - "Comidas no especificadas"
  - "Bebidas alcohólicas"
  - "Propinas a guías y conductores"
  - "Gastos personales"
  - "Seguro de cancelación opcional (+6% del total)"

EDITORIAL (pricing tiers):
- heading: "Opciones <em>de precio</em>"
- subtitle: "Elige la línea que mejor te acomode — tu planner puede mezclar hoteles entre categorías."
- tiers (formula-based prices, static feature lists):
  - `{ k: "essential", name: "Esencial", prFactor: 0.85, feats: ["Hoteles 3★ bien ubicados", "Traslados compartidos", "Tours grupales"] }`
  - `{ k: "standard",  name: "Clásico",  prFactor: 1.00, feats: ["Hoteles 4★ boutique", "Traslados privados", "Tours privados con guía"], featured: true }`
  - `{ k: "premium",   name: "Premium",  prFactor: 1.45, feats: ["Hoteles 5★ destacados", "Chofer privado todo el viaje", "Cenas en restaurantes curados"] }`
- per-person label: "por persona · habitación doble"
- CTA format: "Elegir {name}"

EDITORIAL (trust section):
- heading: "Viaja <em>con respaldo</em>"
- trust badges (4 items, repeated in ActivityDetail too):
  - `{ icon: "shield", title: "RNT vigente", sub: "Registro Nacional de Turismo · MinCIT" }`
  - `{ icon: "award", title: "4.9/5 · 3,200 reseñas", sub: "Google, Tripadvisor, Trustpilot" }`
  - `{ icon: "check", title: "Protocolos de seguridad", sub: "Verificados en cada destino" }`
  - `{ icon: "users", title: "Guías certificados", sub: "Todos con seguro y bilingües" }`

EDITORIAL (FAQ section — package detail, differs from home FAQ):
- heading: "Preguntas <em>frecuentes</em>"
- items (5):
  - Q: "¿Qué nivel de forma física necesito?" A: "Para este paquete basta con caminatas cortas de hasta 2h. Las rutas más exigentes son opcionales y siempre con guía."
  - Q: "¿Es apto para niños?" A: "Sí, desde los 6 años. Tenemos variantes familiares con habitaciones conectadas y actividades adaptadas."
  - Q: "¿Qué pasa si hay mal tiempo?" A: "Ofrecemos plan B por día. Si una actividad debe cancelarse por clima, se reprograma o se reembolsa ese tramo."
  - Q: "¿Puedo extender el viaje?" A: "Totalmente. Al momento de confirmar, tu planner te propone extensiones (Amazonía, Pacífico, San Andrés)."
  - Q: "¿Cómo es el proceso de reserva?" A: "Reservas con 30% de anticipo, el saldo 30 días antes. Firmamos contrato digital y recibes documento de viaje consolidado 2 semanas antes."

EDITORIAL (planner section):
- heading: "Tu planner <em>asignado</em>"
- planner quote template (interpolates destination name): "{pkg.dest.name} es mi territorio. Conozco el chef que hace el mejor plato, al guía que sabe la historia real, y los rincones donde la gente local todavía va."

EDITORIAL (similar packages):
- heading: "Paquetes <em>similares</em>"

EDITORIAL (rail — sticky sidebar):
- price label: "Desde · por persona"
- price meta: "{days} días · hab. doble · temp. media"
- form labels: "Fecha salida", "Viajeros", "Categoría"
- month options: "Oct 2026", "Nov 2026", "Dic 2026", "Ene 2027", "Feb 2027", "Mar 2027"
- category options: "Esencial", "Clásico", "Premium"
- primary CTA: "Solicitar cotización"
- secondary CTA: "Chat directo" (WhatsApp icon)
- save button: "Guardado" / "Guardar"
- share button: "Compartir"
- trust lines:
  - "Cancelación flexible 45d antes"
  - "Sin cargo por reservar"
  - "Contrato digital"

UI (lightbox):
- photo counter: "Foto {n} de {total}"

UI (mobile bar):
- price prefix: "Desde"
- CTA: "Cotizar"

---

## Activity detail page (ActivityDetail)

EDITORIAL (overview bar labels):
- "Duración", "Salida", "Nivel", "Idiomas", "Grupo", "Reseñas"
- static values: idiomas → "ES · EN"; grupo → "Hasta 10"

EDITORIAL (gallery CTA): "Ver 12 fotos"

EDITORIAL (intro section):
- heading: "Qué esperar <em>de esta experiencia.</em>"

EDITORIAL (timeline section):
- heading: "Programa <em>paso a paso</em>"
- subtitle: "Tiempos aproximados — ajustables por clima y ritmo del grupo."

EDITORIAL (meeting point section):
- heading: "Punto de <em>encuentro</em>"
- address label: "Dirección"
- body: "Encuentro con tu guía en el punto acordado. Te enviamos la ubicación exacta con indicaciones al confirmar la reserva."
- detail rows:
  - "Llegada: 10 min antes de las {time}"
  - "Cómo llegar: taxi, Uber o caminando"
  - "Tu guía lleva camiseta de ColombiaTours"
- chip label: "Meeting point"

EDITORIAL (options section):
- heading: "Opciones <em>disponibles</em>"
- options (formula-based prices, static features):
  - `{ k: "economy",  name: "Compartida", prFactor: 0.8, feats: ["Grupo de hasta 10", "Transporte compartido", "Guía general"] }`
  - `{ k: "standard", name: "Regular",    prFactor: 1.0, feats: ["Grupo de hasta 6", "Traslado desde hotel", "Guía especializado"], featured: true }`
  - `{ k: "private",  name: "Privada",    prFactor: 1.8, feats: ["Solo tu grupo", "Horario personalizable", "Guía senior"] }`
- per-person label: "por persona"
- CTA states: "Seleccionada" / "Elegir"

EDITORIAL (include section):
- heading: "Qué <em>incluye</em>"
- col 1 title: "Incluido"
- col 2 title: "No incluido"
- excluded list (template):
  - "Traslado desde/al hotel (opcional)"
  - "Propinas al guía"
  - "Bebidas extra"
  - "Gastos personales"

EDITORIAL (recommendations section):
- heading: "Recomendaciones <em>para el día</em>"
- items (labels + descriptions):
  - `{ t: "Ropa", d: "Cómoda y por capas. Zapatos cerrados con agarre." }`
  - `{ t: "Llevar", d: "Agua, cámara, protector solar y repelente." }`
  - `{ t: "No llevar", d: "Valores innecesarios ni zapatos nuevos." }`
  - `{ t: "Nivel", d: "{LEVEL_LABELS[act.level]} · apto si puedes caminar a paso medio." }`

EDITORIAL (trust section):
- heading: "Con <em>respaldo</em>"

EDITORIAL (FAQ section — activity detail):
- heading: "Preguntas <em>frecuentes</em>"
- items (4 — two have conditional answers):
  - Q: "¿Se puede cancelar?" A: "Sí. Cancelación gratuita hasta 48h antes. Después de ese plazo, se retiene 50%."
  - Q: "¿Qué pasa si llueve?" A: "La experiencia se realiza con lluvia ligera. Si la lluvia es fuerte, se reprograma sin costo."
  - Q: "¿Incluye recogida en hotel?" A: "Sí, si tu hotel está dentro del radio urbano del meeting point. De lo contrario, acuerdan punto cercano."
  - Q: "¿Los niños pueden participar?" A (if level === "exigente"): "No recomendado para menores de 14 años por nivel físico." A (else): "Sí, desde los 7 años con acompañante."

EDITORIAL (similar activities):
- heading: "Experiencias <em>similares</em>"

EDITORIAL (rail):
- price label: "Desde · por persona"
- free variant: "Gratis"
- option meta format: "Opción {option.name.toLowerCase()}"
- form labels: "Fecha", "Personas", "Opción"
- date options: "Próxima disponibilidad", "Mañana", "Este fin de semana", "Próxima semana", "Elegir fecha…"
- primary CTA: "Reservar experiencia"
- secondary CTA: "Sumar a un paquete"
- trust lines:
  - "Cancelación hasta 48h antes"
  - "Guía bilingüe certificado"
  - "Grupos pequeños"

UI (activity timeline templates — buildActivityTimeline):
- short activities meeting: "Inicio + encuadre", note "Encuentro en el meeting point con tu guía."
- short activities closing: "Despedida", note "Fin del recorrido en punto cercano al inicio."
- long activities meeting: "Recogida / meeting point", note "Encuentro con el guía en el punto acordado."
- long activities lunch: "Almuerzo", note "Incluido — cocina regional."
- long activities closing: "Regreso", note "Devolución al punto de encuentro."
- multi-day Día 1 events: "Llegada + yoga matinal", "Almuerzo orgánico", "Caminata a río sagrado", "Cena + círculo de palabra"
- multi-day Día 1 notes: "Recepción en el eco-lodge y sesión de apertura.", "Ingredientes de la huerta del lodge.", "Con guía kogui que explica el territorio.", "Conversación con mamo invitado."
- multi-day Día 2 events: "Meditación al amanecer", "Desayuno y cierre", "Regreso"
- multi-day Día 2 notes: "Vista al mar y a la sierra.", "", "Traslado a Santa Marta o Minca."

---

## Search page

EDITORIAL (page hero):
- eyebrow: "Buscar"
- title: "¿Adónde"
- emphasis: "te llevamos?"
- subtitle: "Busca por destino, paquete, actividad o pregunta."

UI (search interface):
- input placeholder: "Cartagena, Eje Cafetero, caminata..."
- submit button: "Buscar"

UI (result groups):
- group titles: "Destinos", "Paquetes", "Actividades"
- "view all" links: "Ver todos →" / "Ver todas →"

UI (empty state):
- heading: 'Nada para "{q}"'
- body: "Prueba con otra palabra, o mira lo más buscado abajo."

---

## Contact page

EDITORIAL (page hero):
- eyebrow: "Contacto"
- title: "Cuéntanos"
- emphasis: "qué sueñas."
- subtitle: "Un planner te responde en <2 horas hábiles con una primera propuesta."

EDITORIAL (info column):
- title: "Tres formas <em>de escribirnos.</em>"
- body: "Siempre responde una persona — no un bot ni un formulario en cola. Si quieres hablar antes de escribir, el WhatsApp es el camino más rápido."
- contact ways:
  - WhatsApp: `{ label: "WhatsApp", value: "+57 310 123 4567 · Responde en <15 min" }`
  - Email: `{ label: "hola@colombiatours.travel", value: "Correo · respuesta en <2h hábiles" }`
  - Address: `{ label: "Cr 43A #14-52, El Poblado", value: "Medellín, Colombia · Lun–Vie 9:00–18:00" }`

EDITORIAL (form):
- heading: "Cuéntanos de tu viaje"
- subtitle: "Campos con * son necesarios — el resto nos ayuda a ajustar mejor."
- topic label: "¿Sobre qué quieres hablar? *"
- topic chips:
  - `{ k: "paquete", l: "Un paquete específico" }`
  - `{ k: "personalizado", l: "Algo a la medida" }`
  - `{ k: "grupo", l: "Grupo / corporativo" }`
  - `{ k: "info", l: "Información general" }`
- field labels: "Nombre *", "Correo *", "Teléfono / WhatsApp", "Viajeros", "Fechas aproximadas", "Presupuesto por persona", "Cuéntanos más (opcional)"
- traveler options: "1 persona", "2 personas", "3–4 personas", "5+ personas"
- budget options: "< $1,000 USD", "$1,000 – $2,000", "$2,000 – $4,000", "$4,000+", "Flexible"
- date placeholder: "Oct – Nov 2026"
- phone placeholder: "+57 310 ..."
- email placeholder: "tu@correo.com"
- name placeholder: "Tu nombre"
- textarea placeholder: "Qué te interesa, con quién viajas, si es aniversario, primera vez en Colombia, etc."
- submit CTA: "Enviar mensaje"
- submit helper: "Respondemos en <2h hábiles"

EDITORIAL (success state):
- heading: "¡Enviado!"
- body: "Mariana o alguien del equipo te escribe en las próximas 2 horas hábiles."
- secondary CTA: "Enviar otro"

---

## WhatsApp Flow (waflow — drawer + messages)

EDITORIAL (common header):
- availability eyebrow (variant A, B, D all): "Planners en línea ahora"
- response time (constant used in several strings): "3 min"

EDITORIAL (variant A — from hero):
- title: "Cuéntanos <em>qué sueñas.</em>"
- subtitle: "Te contactamos en WhatsApp con un planner humano. Respondemos en promedio en 3 min."

EDITORIAL (variant B — from destination card):
- title: "Viaja a <em>{destination.name}</em>."
- subtitle: "Cuéntanos los detalles básicos y tu planner te arma una propuesta en 24h."
- context pill: "📍 {destination.name} · {destination.region}"

EDITORIAL (variant D — from package card):
- title: "<em>{pkg.title}</em> — hazlo tuyo."
- subtitle: "Ajustamos fechas, hoteles y actividades hasta que sea el viaje que quieres."
- context pill: "📦 {pkg.title} · {pkg.days}D/{pkg.nights}N · desde {pkg.currency}{pkg.price.toLocaleString()}"

EDITORIAL (form field labels):
- destination label (variant A): "¿Ya tienes un destino en mente?" + "Opcional"
- destination chips (variant A): "Cartagena", "Eje Cafetero", "Tayrona", "San Andrés", "Amazonas", "No sé aún"
- when label: "¿Cuándo te gustaría viajar?" + "Aprox"
- when options (WHEN_OPTIONS): "Este mes", "Próximo mes", "En 2–3 meses", "En 6 meses", "Fin de año", "Flexible"
- travelers label: "¿Cuántos viajeros?"
- adults label: "Adultos" + "13+ años"
- children label: "Niños" + "0–12 años"
- interests label (A/B): "¿Qué te interesa? (máx. 3)" + "Opcional"
- base interests (BASE_INTERESTS): "Relax", "Aventura", "Cultura", "Gastronomía", "Naturaleza", "Familiar"
- per-destination interest overrides (DEST_INTERESTS):
  - cartagena: "Relax", "Playa", "Historia", "Gastronomía", "Vida nocturna", "Familiar"
  - san-andres: "Playa", "Buceo", "Relax", "Familiar", "Gastronomía", "Aventura"
  - eje-cafetero: "Naturaleza", "Aventura", "Café", "Cultura", "Avistamiento", "Familiar"
  - tayrona: "Aventura", "Playa", "Naturaleza", "Senderismo", "Cultura", "Relax"
  - medellin: "Cultura", "Gastronomía", "Vida nocturna", "Arte urbano", "Naturaleza", "Familiar"
  - guatape: "Naturaleza", "Aventura", "Relax", "Familiar", "Cultura", "Gastronomía"
  - desierto: "Aventura", "Cultura", "Naturaleza", "Off-grid", "Etnoturismo", "Familiar"
  - amazonas: "Naturaleza", "Aventura", "Etnoturismo", "Avistamiento", "Cultura", "Familiar"
- adjust label (variant D): "¿Quieres ajustar algo del paquete?" + "Opcional"
- adjust options (PKG_ADJUST): "Está perfecto así", "Agregar días", "Cambiar hotel", "Agregar actividades", "Cambiar fechas"
- name label: "Tu nombre" + "Requerido"
- name placeholder: "Juan Pérez"
- phone label: "Tu WhatsApp" + "Requerido"
- phone placeholder (for CO): "300 123 4567"
- phone placeholder (other): "número"

EDITORIAL (validation messages):
- name error: "Escribe tu nombre"
- phone error: "Número de {len} dígitos para {country.name}"
- context error (variant A): "Cuéntanos algo: destino, fechas o un interés"

EDITORIAL (countries — COUNTRIES):
- `{ c: "CO", name: "Colombia", code: "+57", len: 10 }`
- `{ c: "US", name: "Estados Unidos", code: "+1", len: 10 }`
- `{ c: "MX", name: "México", code: "+52", len: 10 }`
- `{ c: "ES", name: "España", code: "+34", len: 9 }`
- `{ c: "FR", name: "Francia", code: "+33", len: 9 }`
- `{ c: "DE", name: "Alemania", code: "+49", len: 11 }`
- `{ c: "AR", name: "Argentina", code: "+54", len: 10 }`
- `{ c: "CL", name: "Chile", code: "+56", len: 9 }`
- `{ c: "PE", name: "Perú", code: "+51", len: 9 }`
- `{ c: "BR", name: "Brasil", code: "+55", len: 11 }`
- `{ c: "CA", name: "Canadá", code: "+1", len: 10 }`
- `{ c: "GB", name: "Reino Unido", code: "+44", len: 10 }`
- `{ c: "IT", name: "Italia", code: "+39", len: 10 }`

EDITORIAL (footer/submit block):
- live status: "Planners en línea"
- response time: "Responden en ~3 min"
- submit labels (per variant):
  - A: "Continuar en WhatsApp"
  - B: "Planear mi viaje a {destination.name}"
  - D: "Continuar con este paquete"
- skip link: "Prefiero contarlo en el chat →"
- privacy note: "Tu número se usa solo para este viaje. Sin spam. Sin llamadas automáticas."

EDITORIAL (success step):
- eyebrow: "Conectando"
- heading: "WhatsApp se abrió en una pestaña nueva."
- body: "Si no se abrió, toca el botón verde. Tu planner responde en promedio en 3 min y te escribe también desde nuestro lado."
- primary CTA: "Abrir WhatsApp"
- secondary CTA: "Seguir explorando"
- ref badge prefix: "Ref:"

EDITORIAL (WhatsApp message templates — buildWAMessage):
- variant A greeting: "¡Hola! Quiero planear un viaje por Colombia 👋"
- variant A destination line (fallback): "📍 Destino: por definir"
- variant A destination line: "📍 Destino: {destination}"
- variant B greeting: "¡Hola! Quiero planear un viaje a {destFull} 👋"
- variant D greeting: '¡Hola! Me interesa el paquete "{pkg.title}" 👋'
- variant D package line: "📦 Paquete: {pkg.title} · {pkg.days}D/{pkg.nights}N"
- common when line: "📅 Cuándo: {when}"
- common pax line: "👥 Viajeros: {paxStr}"
- interests lines:
  - A: "✨ Intereses: {list}"
  - B: "✨ Me interesa: {list}"
- adjust line (D): "🛠️ Ajustes: {list}"
- signature: "— {name}"
- ref line: "#ref: {ref}"
- skip/quick variant message (A): "¡Hola! Quiero planear un viaje por Colombia 👋\n\n#ref: {ref}"
- skip variant (B): "¡Hola! Quiero planear un viaje a {destination.name} 👋\n\n#ref: {ref}"
- skip variant (D): '¡Hola! Me interesa el paquete "{pkg.title}" 👋\n\n#ref: {ref}'

---

## Blog listing

EDITORIAL (page hero):
- eyebrow: "Blog"
- title: "Historias"
- emphasis: "desde adentro."
- subtitle: "Escrito por los planners que caminan Colombia todos los meses. Guías, itinerarios, oficios y rincones."

UI (toolbar):
- search placeholder: "Buscar historias…"
- category "all" label: "Todo"
- read article CTA (featured): "Leer artículo"
- load more CTA: "Cargar más historias"
- date format: locale `es-CO`, `{day: "2-digit", month: "short", year: "numeric"}`

UI (empty state):
- heading: "Nada con esos criterios"
- body: "Prueba otra categoría o palabra."

---

## Blog detail page

EDITORIAL (author card block):
- bio template: "{post.authorRole}. Diseña rutas en Colombia para viajeros que quieren ir más hondo que la guía."
- profile CTA: "Ver perfil"

EDITORIAL (inline CTA block):
- eyebrow: "¿Te gustaría vivirlo?"
- title: "Diseñamos un viaje a tu medida <em>por esta región.</em>"
- body: "Cuéntale a {author.firstName} qué te interesa y recibe una propuesta en 24h."
- primary CTA: "Planear mi viaje"
- secondary CTA: "WhatsApp"

EDITORIAL (related section):
- heading: "Sigue <span class='serif'>leyendo.</span>"
- "all blog" CTA: "Ver todo el blog"

UI (post rail):
- share label: "Compartir"
- tags label: "Etiquetas"
- author eyebrow: "Escrito por"

UI (meta line):
- format: "{author} · {date} · {read} min de lectura" (listing)
- format: "{author} · {read} min" (card)

CATALOG: (skip — BLOG_POSTS array; real posts to come from CMS)

---

## Market Switcher (language + currency)

EDITORIAL (popover header):
- title: "Personaliza tu <em>experiencia</em>"
- description: "Idioma del sitio y moneda de precios."
- sub-label 1: "Idioma"
- sub-label 2: "Moneda"
- footer note: "Guardado en este navegador"

EDITORIAL (locales — LOCALES):
- `{ code: 'es', flag: '🇨🇴', native: 'Español' }`
- `{ code: 'en', flag: '🇺🇸', native: 'English' }`
- `{ code: 'pt', flag: '🇧🇷', native: 'Português' }`
- `{ code: 'fr', flag: '🇫🇷', native: 'Français' }`
- `{ code: 'de', flag: '🇩🇪', native: 'Deutsch' }`
- `{ code: 'it', flag: '🇮🇹', native: 'Italiano' }`
- `{ code: 'nl', flag: '🇳🇱', native: 'Nederlands' }`

EDITORIAL (currencies — CURRENCIES):
- `{ code: 'COP', sym: '$',    name: 'Peso colombiano' }`
- `{ code: 'USD', sym: '$',    name: 'US Dollar' }`
- `{ code: 'EUR', sym: '€',    name: 'Euro' }`
- `{ code: 'MXN', sym: 'Mex$', name: 'Peso mexicano' }`
- `{ code: 'BRL', sym: 'R$',   name: 'Real' }`

EDITORIAL (loading state):
- body: "Cargando en <em>{native}</em>…"

UI (aria labels):
- pill aria: "Idioma {native}, moneda {code}"
- popover aria: "Personaliza tu experiencia"
- footer selects aria: "Cambiar idioma", "Cambiar moneda"

---

## CATALOG reference (for cross-check only — DO NOT SEED)

The following designer fixtures exist but must be **replaced by real Supabase rows** before the site ships. Listed here so seeders skip them and so catalog QA can confirm each domain is populated:

- **DESTINATIONS (8)** — cartagena, san-andres, eje-cafetero, tayrona, medellin, guatape, desierto (La Guajira), amazonas.
- **PACKAGES (6)** — p1 Caribe Esencial, p2 Cafeteros & Cocora, p3 Aventura Tayrona, p4 Medellín Vibrante, p5 Guajira Ancestral, p6 Amazonas Profundo.
- **ACTIVITIES (14)** — a1…a14 (Cocora caminata, Islas del Rosario velero, Tour café, delfines rosados, Comuna 13 free walking, Peñón Guatapé, taller cocina caribeña, retiro Sierra Nevada, buceo San Andrés, Pueblito Chairama, San Basilio de Palenque, caminata nocturna selva, salsa caleña, parapente Chicamocha).
- **PLANNERS (6)** — pl1 Mariana Vélez, pl2 Andrés Restrepo, pl3 Luisa Carrizosa, pl4 Juan David Ortiz, pl5 Camila Duarte, pl6 Esteban Caicedo.
- **PLANNER_REVIEWS (6)** — pr1…pr6 with real-name reviewers.
- **TESTIMONIALS (4)** — t1 Camille Laurent (París), t2 Daniel Oster (Berlín), t3 Sofía Herrera (CDMX), t4 Mark & Anna Thompson (Toronto). Each has `short`, `long` (with `<em>` emphasis), and `rating`. Real Google reviews should replace these.
- **EXP_REVIEWS (3)** — Emma S. Londres, Julien P. Lyon, Ava K. NYC.
- **BLOG_POSTS (6)** — cartagena-secretos, cocora-caminata, amazonas-primer-viaje, cafe-de-origen, tayrona-pueblito, san-andres-buceo.

---

## Ambiguity / flags for the migration team

1. **Marketing-claim numbers** — "12.4k+ viajeros", "14 años", "3,200 reseñas", "4.9/5", "96%", "32 destinos", "42 paquetes" appear hardcoded in multiple sections (Stats, Trust Bar F1, Trust badges, Promise section, Package detail highlights). Decide per-value whether it's editorial (keep static until updated) or catalog-computed.
2. **Planner counts** in planners list ("6 Planners locales", "939 Viajes diseñados") are likely computed from catalog. The "4.97/5" average is also catalog-derived.
3. **"Ver los 42 paquetes"** button count is a runtime count — EDITORIAL placeholder that should be replaced by `{PACKAGES.length}` equivalent.
4. **Trust badge "4.9/5 · 3,200 reseñas"** in `TrustBadges` (appears in both detail page templates) — same marketing value as stats. Decide authoritative source.
5. **Contact info** ("+57 310 123 4567", "hola@colombiatours.travel", "Cr 43A #14-52, El Poblado") are placeholders; confirm real values with ops before seeding.
6. **Package detail planner quote** `"{pkg.dest.name} es mi territorio…"` is inline template copy, not the planner's own quote — editorial template string with destination interpolation.
7. **FAQ divergence** — home FAQ (6 items) vs package detail FAQ (5 items) vs activity detail FAQ (4 items with conditional answers) are three distinct sets. Seed all three; do not deduplicate.
8. **Pricing tier feature lists** — the same 3-tier schema (Esencial/Clásico/Premium) appears in both legacy `PackageDetail` and `PackageDetailV2`. PackageDetailV2 is canonical.
9. **Destination "Destino del mes" hero rail** — 4 hardcoded highlights in `Hero.sideList` (Cartagena/Tayrona/Eje Cafetero/Medellín). Editorial curation — not a random selection.
10. **WhatsApp business number** (`WA_BUSINESS_NUMBER = "573001234567"`) — placeholder in the designer; confirm real number with ops.

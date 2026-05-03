# Estructura de Campaña Meta Ads: España — v2.0 (Definitiva)

> **Versión:** 2.0 — Aplica todas las mejoras de la [auditoría de growth hacking](file:///Users/angelaaragon/.gemini/antigravity/brain/a1c93aeb-8c81-4869-bfa3-dc9b58ed73d6/audit_meta_ads_spain.md)  
> **Presupuesto total:** $2.000.000 COP (~$476 USD / ~€440)  
> **Duración:** 21 días (14 días aprendizaje + 7 días optimización)  
> **Metodología:** Matriz 3:2:2:2 con Dynamic Creative Optimization (3 Creativos, 2 Textos, 2 Titulares, 2 Descripciones)

---

## 💰 Distribución de Presupuesto

| Fase | % | Presupuesto Total | Diario (~21 días) | Diario USD |
|---|:---:|---:|---:|---:|
| **TOFU** | 55% | $1.100.000 COP | ~$52.380 COP/día | ~$12.50 |
| **MOFU** | 30% | $600.000 COP | ~$28.570 COP/día | ~$6.80 |
| **BOFU** | 15% | $300.000 COP | ~$14.285 COP/día | ~$3.40 |
| **Total** | 100% | **$2.000.000 COP** | **~$95.238 COP/día** | **~$22.70** |

> [!IMPORTANT]
> **Estrategia de presupuesto ajustado:** Con ~$23 USD/día, se ejecuta **1 Ad Set con Dynamic Creative por fase**. NO fragmentar en múltiples ad sets — el algoritmo necesita concentración de datos para salir de la fase de aprendizaje (~50 conversiones en 7 días). TOFU lleva la mayor inversión porque alimenta las audiencias de retargeting para MOFU/BOFU.

### Calendario de Ejecución

| Período | Acción | Presupuesto |
|---|---|---|
| **Días 1-3** | Solo TOFU activo. Poblar audiencias de retargeting | 100% a TOFU (~$23/día) |
| **Días 4-7** | Activar MOFU con retargeting de video viewers 50%+ | TOFU 60% + MOFU 40% |
| **Días 8-14** | Activar BOFU con visitantes de LP. Revisar métricas | Distribución estándar (55/30/15) |
| **Días 15-21** | Escalar ganadores, pausar perdedores, rotar creativos | Reasignar según ROAS |

---

## ⚙️ Configuración General de la Campaña

- **Objetivo de Campaña:** Clientes Potenciales (Lead Generation) optimizado para mensajes en WhatsApp.
- **Estructura: 2 Campañas** (optimizado para presupuesto ajustado):
  - **Campaña 1 — "Descubrimiento Colombia" (TOFU):** Objetivo Tráfico/Awareness. 1 ad set con Dynamic Creative.
  - **Campaña 2 — "Conversión Colombia" (MOFU + BOFU):** Objetivo Leads (WA). 2 ad sets bajo CBO — el algoritmo distribuye presupuesto dinámicamente entre MOFU y BOFU según cuál convierta mejor. Esto evita que BOFU (~$3.40/día) quede atrapado en learning phase.
- **Segmentación Geográfica:**
  - 🔵 **Prioridad 1 (70% del gasto):** Área Metropolitana de Madrid (MAD)
  - 🟠 **Prioridad 2 (30% del gasto):** Área Metropolitana de Barcelona (BCN)
- **Segmentación Demográfica:** 30 a 55 años.
- **Intereses:** Broad Targeting — el algoritmo Advantage+ optimiza basado en las +1.000 señales predictivas y el contenido creativo.
- **Idioma del anuncio:** Español (España). *Nota: Evaluar 1 headline en catalán para BCN en Semana 3 si CTR Barcelona < Madrid.*

### 🚫 Lógica de Exclusión Cruzada (OBLIGATORIA)

| Campaña | Excluir de la entrega |
|---|---|
| **TOFU** | Custom Audience: "Conversaciones WA iniciadas últimos 30d" + "Compradores 180d" |
| **MOFU** | Custom Audience: "Compradores últimos 180d" |
| **BOFU** | Custom Audience: "Compradores últimos 90d" |

### 🕐 Ventanas de Atribución

| Fase | Ventana | Justificación |
|---|---|---|
| TOFU | 1-day view / 7-day click | Medir awareness + clics iniciales |
| MOFU | 7-day click | Capturar leads que evalúan antes de escribir |
| BOFU | 7-day click (idealmente 28-day si disponible) | Ciclo de decisión high-ticket es largo |

---

## 🟢 FASE 1: TOFU (Inspiración y Descubrimiento)

**Objetivo:** Captar atención (Awareness/Tráfico) interceptando al usuario con intención latente.  
**CTA:** *Más información (Learn More)* → Landing Page  
**Métrica norte:** Costo por ThruPlay < $0.05 USD

### 🎥 3 Creativos (Visuales)

1. **Creativo 1: Reel Inmersivo UGC — POV (Autenticidad)**
   - *Formato:* Video vertical 9:16, 15-30 segundos.
   - *Idea:* Grabado estilo "selfie" / POV. Comienza caminando por los callejones coloridos de La Candelaria (Bogotá) y corta rápidamente a una terraza gastronómica en Medellín. Ritmo rápido, cortes cada 3-4 segundos. Sonido ambiente real + música trending.
   - *Hook visual (primeros 3s):* Texto en pantalla grande: **"El secreto de Sudamérica a un vuelo directo de Madrid ✈️🇨🇴"**
   - *Cierre (últimos 3s):* Logo ColombiaTours.Travel + "Abre tu ventana a Colombia"

2. **Creativo 2: Split-Screen "Expectativa vs. Realidad" ⚡**
   - *Formato:* Imagen estática 1:1 o 4:5, dividida verticalmente.
   - *Lado izquierdo:* Foto estereotipada/gris de "lo que crees que es Colombia" (selva densa, imagen genérica).
   - *Lado derecho:* Foto real vibrante de un hotel boutique en El Poblado, Medellín, o un restaurante gourmet en la Zona G de Bogotá.
   - *Texto superpuesto centrado:* **"Colombia no es lo que imaginas. Es mucho mejor."**
   - *Objetivo:* Romper el patrón cognitivo (3.2x más engagement que paisajes puros según benchmarks Meta Travel 2025). Genera curiosidad y click.

3. **Creativo 3: Gráfico de Confianza (Checkmarks de Seguridad)**
   - *Formato:* Imagen estática 4:5, diseño limpio.
   - *Idea:* Fondo sutil de calle en Cartagena o paisaje natural difuminado. 3 insignias flotantes con checkmarks de confianza, grandes y legibles.
   - *Viñetas:* ✅ Vuelos directos desde España ✅ Guías expertos locales ✅ Traslados privados y seguros
   - *Objetivo:* Comunicar de un vistazo que logística y seguridad están resueltas.

### 📝 2 Textos Principales (Primary Text)

> [!NOTE]
> **Longitud optimizada:** 50-70 palabras por texto. Instagram trunca a ~125 caracteres en feed; el hook debe estar completo en la primera línea visible.

1. **Ángulo Emocional / Descubrimiento (62 palabras):**

   > ¿Los destinos europeos de siempre ya no te sorprenden? ✈️
   >
   > Colombia está a un vuelo directo de Madrid. Callejones históricos en Bogotá, gastronomía de autor en Medellín, playas privadas en Cartagena — con transporte privado y seguridad garantizada en cada paso.
   >
   > Abre tu ventana a Colombia y colecciona memorias que no encontrarás en ningún catálogo europeo.
   >
   > 👉 Explora los itinerarios.

2. **Ángulo Racional / Sin Fricción (58 palabras):**

   > ¿Quieres viajar a Colombia pero te frena la logística y la seguridad? Lo hacemos fácil.
   >
   > Paquetes exclusivos desde Madrid y Barcelona: vuelos directos, corredores turísticos seguros, transporte privado y guías locales expertos. Cada detalle cubierto de aeropuerto a aeropuerto.
   >
   > 👉 Descubre itinerarios de 7 noches todo incluido.

### 🏷️ 2 Titulares (Headlines)

1. **"7 noches en Colombia desde Madrid. Todo incluido."** ← Dato concreto + propuesta clara
2. **"73% de los viajeros repiten Colombia. Descubre por qué."** ← Prueba social numérica

### 📄 2 Descripciones (Descriptions)

> Aparecen debajo del titular en el feed. Máximo ~30 palabras. Refuerzan el headline con un beneficio secundario o dato de confianza.

1. **"Vuelos directos desde Madrid y Barcelona. Transporte privado y guías locales en todo el recorrido."**
2. **"Paquetes premium con logística blindada. Más de 500 viajeros nos han elegido."**

---

## 🟡 FASE 2: MOFU (Consideración e Intención)

**Objetivo:** Conversión a Lead cualificado y resolución de barreras psicológicas (seguridad).  
**CTA:** *Más información (Learn More)* → Landing Page (el botón Waflow en LP filtra hacia WhatsApp)  
**Métrica norte:** Costo por Lead (conversación WA iniciada desde LP) < $5 USD  
**Audiencia:** Custom Audience: Video viewers 50%+ de TOFU (últimos 14 días) + Lookalike 1% de compradores high-value

### 🎥 3 Creativos (Visuales)

1. **Creativo 1: Carrusel Descriptivo (Día por Día) 🏆**
   - *Formato:* Carrusel de 4-5 tarjetas, ratio 1:1.
   - *Tarjeta 1 (Portada):* "Tu viaje a Colombia, día por día →" con imagen hero.
   - *Tarjeta 2:* "Día 1: Llegada segura a Bogotá. Transporte privado al hotel boutique."
   - *Tarjeta 3:* "Día 3: Ruta gastronómica en Medellín con chef local."
   - *Tarjeta 4:* "Día 5: Cartagena — playa privada + ciudad amurallada."
   - *Tarjeta 5 (CTA):* "¿Listo? Diseña tu ruta personalizada →" con logo + CTA.

2. **Creativo 2: Prueba Social en Video (Testimonial Español)**
   - *Formato:* Video vertical 9:16, 20-40 segundos.
   - *Idea:* Turista español o pareja española real frente a cámara contando su experiencia. Grabado en locación (hotel, restaurante, paisaje colombiano).
   - *Frase clave obligatoria:* "Teníamos dudas sobre la seguridad, pero con el transporte privado y los guías nos sentimos seguros desde que aterrizamos."
   - *Subtítulos:* Obligatorios. El 85% de los Reels se ven sin sonido.
   - *Cierre:* "ColombiaToursTravel.com" + botón visual de WhatsApp.

3. **Creativo 3: Infografía "Mapa del Corredor Seguro" 🗺️ ⚡**
   - *Formato:* Imagen estática 4:5, estilo infográfico moderno.
   - *Idea:* Mapa visual simplificado que muestre el recorrido real del viajero: ✈️ Aeropuerto El Dorado → 🚗 Transporte privado → 🏨 Hotel boutique zona segura → 🍽️ Restaurantes curados → 📞 Soporte 24/7 en cada punto.
   - *Iconos:* Escudo de seguridad en cada punto de contacto. Línea conectora dorada.
   - *Texto inferior:* "Cada paso del camino, blindado. Así viajan nuestros clientes."
   - *Objetivo:* Desmantelar la objeción de seguridad de forma **visual**, no verbal. Diferenciado del C3 TOFU (que usa checkmarks textuales).

### 📝 2 Textos Principales (Primary Text)

1. **Ángulo Prueba Social / Confianza (68 palabras):**

   > 3 razones por las que tu próximo gran viaje debe ser a Colombia con expertos:
   >
   > 1️⃣ Inmersión real — recorre Monserrate con historiadores locales, no con guías de folleto.
   > 2️⃣ Seguridad blindada — traslados privados y operación exclusiva en corredores turísticos verificados.
   > 3️⃣ Vuelos directos desde Madrid y Barcelona — maximiza tu tiempo de disfrute.
   >
   > Cruza la ventana que abre Colombia al mundo con total tranquilidad.
   > 💬 Descubre el itinerario completo.

2. **Ángulo Cotización en Euros (55 palabras):**

   > Tu paquete ideal, cotizado en euros y sin sorpresas.
   >
   > Diseñamos fechas, alojamientos boutique y traslados privados a tu medida. Nuestro equipo te acompaña desde España hasta tu regreso — toda la logística gestionada para que solo disfrutes.
   >
   > 💬 Escríbenos por WhatsApp y diseñemos juntos tu ruta por Colombia.

### 🏷️ 2 Titulares (Headlines)

1. **"Habla con un asesor local por WhatsApp."** ← CTA directo, canal claro
2. **"Tu viaje a Colombia, diseñado a medida en euros."** ← Propuesta de valor + moneda local

### 📄 2 Descripciones (Descriptions)

1. **"Cotización en euros sin sorpresas. Alojamiento boutique + traslados privados incluidos."**
2. **"Corredores turísticos seguros y acompañamiento 24/7 desde tu llegada."**

---

## 🔴 FASE 3: BOFU (Conversión y Ventas)

**Objetivo:** Cierre de venta High-Ticket generando urgencia.  
**CTA:** *Más información (Learn More)* → Landing Page con precio visible → Waflow a WhatsApp  
**Métrica norte:** Costo por Conversación Cualificada (WA con intención de reserva) < $15 USD  
**Audiencia:** Visitantes web LP (últimos 14 días) + Interacciones WA sin compra (últimos 30 días)

### 🎥 3 Creativos (Visuales)

1. **Creativo 1: Imagen Estática de Urgencia (Plazas Limitadas)**
   - *Formato:* Imagen estática 4:5, alta resolución.
   - *Idea:* Foto impactante de hotel boutique o experiencia VIP con overlay rojo/dorado sutil.
   - *Texto overlay principal:* **"Últimas 4 plazas para [MES ESPECÍFICO]"** ← Número concreto + fecha real.
   - *Texto overlay secundario:* "Tarifa preferencial + upgrades incluidos"
   - *Nota:* Actualizar el número y mes cada semana para mantener veracidad.

2. **Creativo 2: Gráfico de Incentivo con Fecha Límite Concreta**
   - *Formato:* Imagen estática 4:5, diseño elegante y limpio.
   - *Texto principal grande:* **"Confirma antes del [FECHA] y asegura upgrade en alojamiento boutique."**
   - *Subtexto:* "Traslados privados + acompañamiento 24/7 incluidos en tu tarifa."
   - *Nota:* Reemplazar [FECHA] con fecha real (ej. "15 de junio"). Nunca usar "esta semana" — es vago y genera desconfianza.

3. **Creativo 3: Video Cinemático de Cierre (15-20 segundos) ⚡**
   - *Formato:* Video vertical 9:16, **15-20 segundos** (no 5s — insuficiente para high-ticket).
   - *Estructura segundo a segundo:*
     - **(0-3s)** Hook: Texto en pantalla "Tu itinerario te está esperando" + toma aérea dramática de Colombia.
     - **(3-10s)** Montaje cinemático rápido: hotel boutique → cena gourmet → paisaje → transporte privado.
     - **(10-15s)** Overlay con la oferta: "7 noches todo incluido. Tarifa preferencial hasta [FECHA]."
     - **(15-20s)** CTA animado: Logo + "Reserva tu cupo ahora → WhatsApp" con ícono de WA.
   - *Música:* Instrumental elegante, crescendo hacia el CTA.

### 📝 2 Textos Principales (Primary Text)

1. **Ángulo Urgencia / FOMO (65 palabras):**

   > Tu itinerario exclusivo por Bogotá y Medellín está a un paso de confirmarse. 🇨🇴✨
   >
   > Confirma hoy tu paquete de 7 noches y asegura tarifas preferenciales: upgrades en alojamiento boutique + traslados privados incluidos.
   >
   > Abre la ventana que abre Colombia al mundo antes de que otros lo hagan por ti.
   >
   > 🔒 Plazas limitadas para este semestre.
   > ✈️ Reserva ahora →

2. **Ángulo Exclusividad / Retargeting (58 palabras):**

   > Estás a un paso de confirmar el viaje de tu vida a Colombia.
   >
   > Tarifas y cupos en alojamientos boutique de zonas premium se agotan esta temporada. Cierra tu reserva por WhatsApp y asegura logística privada confirmada bajo tu nombre.
   >
   > Haz que cada euro valga con nuestro respaldo 24/7.
   > ✈️ Finaliza tu reserva →

### 🏷️ 2 Titulares (Headlines)

1. **"Últimas 4 plazas VIP. Reserva hoy."** ← Número concreto genera urgencia real
2. **"Tu tarifa preferencial expira pronto. Asegúrala."** ← Urgencia temporal

### 📄 2 Descripciones (Descriptions)

1. **"Upgrade en alojamiento boutique + traslados privados incluidos en tu tarifa."**
2. **"Confirma hoy y asegura la mejor tarifa de temporada. Plazas extremadamente limitadas."**

---

## 📋 Instrucciones Operativas para Meta Ads Manager

### 1. CTA y Destino del Tráfico

| Fase | Botón CTA | Destino | Lógica |
|---|---|---|---|
| TOFU | *Más información* | Landing Page | Generar curiosidad, poblar pixel |
| MOFU | *Más información* | Landing Page → Waflow WA | LP educa y filtra; solo leads informados llegan a WA |
| BOFU | *Más información* | Landing Page → Waflow WA | LP muestra precio → WA cierra |

> **Test A/B (solo si CPL sube >$8 USD en Semana 3):** Activar variante MOFU con CTA *"Enviar mensaje de WhatsApp"* directo al 20% del presupuesto para comparar calidad de lead.

### 2. Dynamic Creative (Contenido Dinámico)

Subir los 3 creativos + 2 textos + 2 titulares + 2 descripciones en **un solo Anuncio Dinámico por ad set**. El algoritmo encuentra la combinación ganadora en 48-72 horas. NO crear anuncios individuales — con $23/día no hay presupuesto para fragmentar.

> **Combinaciones posibles por ad set:** 3 × 2 × 2 × 2 = **24 variaciones** que Meta prueba automáticamente.

### 3. Públicos a Construir para Retargeting

| Público | Fuente | Ventana | Uso |
|---|---|---|---|
| Video Viewers 50%+ | Reels TOFU | 14 días | Alimenta MOFU |
| Video Viewers 75%+ | Reels TOFU | 30 días | Alimenta MOFU (alta intención) |
| Lookalike 1% (España) | Base de compradores CRM | Evergreen | Alimenta MOFU |
| Visitantes LP paquetes | Pixel web | 14 días | Alimenta BOFU |
| Interacciones WA sin compra | WhatsApp Business | 30 días | Alimenta BOFU |
| Compradores | CRM / CAPI | 90-180 días | **Excluir** de todas las fases |

### 4. Gestión de Fatiga Creativa (Anti-Saturación)

| Señal de alerta | Umbral | Acción |
|---|---|---|
| Frecuencia del ad set | > 2.5 | Pausar creativo con menor CTR, rotar nuevo |
| CTR cae | > 20% caída vs. Semana 1 | Introducir 1 creativo fresco al Dynamic Creative |
| CPM sube | > 30% incremento sostenido 3 días | Evaluar si la audiencia está saturada; ampliar geo o ajustar edad |
| CPC sube | > $1.50 USD sostenido | Revisar relevancia del copy vs. landing page |

**Pipeline de creativos:** Tener **2 creativos de respaldo** listos antes de lanzar. Al pausar un perdedor, sustituir inmediatamente para mantener siempre 3 activos.

### 5. Protocolo de Revisión Semanal

Cada lunes revisar en Meta Ads Manager + Events Manager:

- [ ] **CPM y CPC** por fase — ¿dentro de benchmarks España ($0.85 CPC)?
- [ ] **Frecuencia** por ad set — ¿debajo de 2.5?
- [ ] **Event Match Quality Score** — ¿arriba de 6.0?
- [ ] **Desglose Dynamic Creative** — ¿qué combinación creativo+texto+headline gana?
- [ ] **Costo por conversación WA** — ¿dentro del target por fase?
- [ ] **Pipeline de creativos** — ¿hay 2 piezas de respaldo listas?

---

## 📊 Proyección de Resultados (21 días, $476 USD)

| Métrica | Estimación conservadora | Estimación optimista |
|---|---|---|
| Impresiones totales | 25.000 - 35.000 | 40.000 - 55.000 |
| Clics a LP | 350 - 450 | 500 - 650 |
| Conversaciones WA iniciadas | 8 - 15 | 18 - 30 |
| Leads cualificados (con presupuesto) | 3 - 6 | 8 - 12 |
| Ventas cerradas (ciclo 30-60 días) | 0 - 1 | 1 - 3 |
| ROAS potencial (si 1 venta de €2.000+) | 4.2x | 12.5x+ |

> [!TIP]
> **Con presupuesto ajustado, el objetivo real de estos 21 días NO es generar ventas masivas.** Es **validar el embudo**: confirmar qué creativos funcionan, qué ángulo de copy convierte, y cuál es el costo real por lead cualificado en España. Con esos datos, se justifica escalar a $5M-$10M COP/mes con confianza matemática.

---

## 🔄 Changelog desde v1.0

| Mejora | Antes (v1) | Ahora (v2) |
|---|---|---|
| Presupuesto | Sin definir | $2M COP distribuidos por fase con calendario |
| C2 TOFU | Paisaje genérico (Guatapé) | Split "Expectativa vs. Realidad" (3.2x engagement) |
| C3 MOFU | Gráfico checkmarks (redundante con C3 TOFU) | Infografía "Mapa del Corredor Seguro" |
| C3 BOFU | Video 5 segundos | Video cinemático 15-20s con estructura de cierre |
| Primary Texts | 80-95 palabras | 55-68 palabras (optimizado para truncamiento) |
| Headlines TOFU | Genéricos sin datos | Con número concreto y prueba social |
| Exclusiones | No existían | Lógica cruzada entre 3 fases |
| Atribución | No definida | Ventanas por fase (1d/7d/28d) |
| Fatiga creativa | No gestionada | Umbrales + pipeline de respaldo |
| Tagline | Ausente en creativos | Integrado orgánicamente ("Abre tu ventana...") |
| Revisión semanal | No existía | Protocolo con checklist de 6 puntos |
| Calendario | No existía | 4 fases de 21 días con activación escalonada |
| Descripciones | No existían | 2 descripciones por fase (campo debajo del headline) |
| Arquitectura | 3 campañas (1 por fase) | 2 campañas (TOFU separada + MOFU/BOFU bajo CBO) |

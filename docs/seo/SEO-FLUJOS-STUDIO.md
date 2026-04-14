# SEO Flujos — Guía de Usuario Bukeer Studio

> Última actualización: Abril 2026
> Para referencia técnica ver: [SEO-IMPLEMENTATION.md](./SEO-IMPLEMENTATION.md)

Este documento explica cómo un usuario de la agencia ejecuta cada flujo SEO directamente desde el Studio, sin necesidad de herramientas externas ni conocimiento técnico. Cada flujo tiene una ruta clara en la interfaz, pasos concretos y un resultado esperado.

---

## Tabla de flujos disponibles

| Flujo | Objetivo | Ruta en el Studio | Tiempo estimado |
|-------|----------|-------------------|-----------------|
| **0 — Configuración inicial** | Conectar integraciones y definir objetivos SEO | Analytics → banner de bienvenida | 5–15 min |
| **1 — Health Check** | Detectar errores técnicos que bloquean el posicionamiento | Analytics → Health | 30–45 min |
| **2 — Métricas orgánicas** | Revisar tráfico, CTR y posiciones de los últimos 28 días | Analytics → Overview | 15–20 min |
| **3 — Investigar keywords** | Descubrir términos relevantes con potencial real de tráfico | Analytics → Keywords | 45–60 min |
| **4 — Análisis de competidores** | Comparar posicionamiento y detectar brechas de contenido | Analytics → Competidores | 30–45 min |
| **5 — Optimizar un hotel** | Mejorar el posicionamiento de una página de hotel | Contenido → fila hotel → Flujo SEO | 45–75 min |
| **6 — Optimizar una actividad** | Mejorar el posicionamiento de una página de actividad | Contenido → fila actividad → Flujo SEO | 40–60 min |
| **7 — Optimizar un paquete** | Mejorar el posicionamiento de una página de paquete | Contenido → fila paquete → Flujo SEO | 45–75 min |
| **8 — Optimizar un destino** | Construir una página pilar de destino con autoridad | Contenido → fila destino → Flujo SEO | 60–90 min |
| **9 — Optimizar un blog post** | Mantener, mejorar o eliminar artículos del blog | Contenido → fila blog → Flujo SEO | 30–45 min |
| **10 — Backlog de quick wins** | Priorizar las páginas con mayor potencial esta semana | Contenido → Backlog | 20–30 min |
| **11 — Arquitectura de contenido** | Planificar topic clusters y estructura de enlaces internos | Analytics → Keywords → Ver Arquitectura | 30 min |
| **12 — Multi-locale y hreflang** | Configurar idiomas y etiquetas de regionalización | Analytics → Config → Locale Settings | 10 min |
| **13 — Visibilidad en AI** | Monitorear presencia en ChatGPT, Perplexity y Gemini | Analytics → AI Visibility | 20 min |

---

## Flujo 0: Configuración inicial (una sola vez)

### Objetivo
Dejar el módulo SEO listo para trabajar: integraciones conectadas, keywords semilla definidas, competidores identificados y objetivos establecidos. Este flujo se hace una sola vez al activar el sitio; luego no es necesario repetirlo.

### Pre-requisitos
- Tener acceso de administrador a Google Search Console (GSC) con el sitio ya verificado.
- Tener acceso a Google Analytics 4 (GA4) con el property ID del sitio.
- Tener en mente 3 a 5 palabras clave con las que la agencia quiere aparecer en Google.
- Conocer 2 o 3 competidores directos (nombres de dominio, ej. `agenciaX.com`).

### Pasos en el Studio

1. → Ir a **Analytics** desde el menú lateral del dashboard.
2. El Studio mostrará un **banner de bienvenida** ("Configura tu SEO para empezar a crecer"). Hacer clic en **"Iniciar configuración"**.
3. Se abrirá el **Asistente de configuración** con 7 pasos. Completarlos en orden:
   - **Paso 1 — Nombre del sitio**: confirmar el nombre de la agencia tal como debe aparecer en resultados de búsqueda.
   - **Paso 2 — Keywords semilla**: ingresar entre 3 y 5 términos base (ej. "tours Colombia", "ecoturismo Eje Cafetero", "paquetes todo incluido Cartagena"). No es necesario ser exhaustivo aquí; se amplían después.
   - **Paso 3 — Competidores**: ingresar los dominios de 2 a 3 competidores directos.
   - **Paso 4 — Conectar Google Search Console**: hacer clic en **"Conectar GSC"** y autorizar el acceso con la cuenta de Google que administra el sitio.
   - **Paso 5 — Conectar Google Analytics 4**: hacer clic en **"Conectar GA4"** e ingresar el Property ID (formato G-XXXXXXXXXX).
   - **Paso 6 — OKRs**: definir los objetivos de posicionamiento para los próximos 7, 30 y 90 días (ej. "llegar al top 10 en 'paquetes Cartagena' en 90 días").
   - **Paso 7 — Revisión**: confirmar todos los datos y hacer clic en **"Finalizar configuración"**.
4. → Ir al tab **Config** dentro de Analytics para verificar que GSC y GA4 muestran estado **"Conectado"** en verde.
5. → Dentro de **Config**, revisar la sección **Configuración de Idiomas**: confirmar que el locale principal es `es-CO` o ajustarlo si el sitio opera en otro mercado.

### Resultado esperado
- El panel de Analytics deja de mostrar el banner de bienvenida y empieza a cargarse con datos.
- Los tabs Overview, Keywords y Competidores muestran información real (puede tomar hasta 48 horas en sincronizarse con GSC por primera vez).
- El tab Config muestra ambas integraciones en verde.

### Tiempo estimado: 5–15 minutos

---

## Flujo 1: Health Check & Auditoría Técnica

### Objetivo
Identificar y corregir problemas técnicos que impiden que Google rastree, indexe o posicione correctamente las páginas del sitio: velocidad de carga deficiente, errores en los datos estructurados, fallas en los Core Web Vitals o elementos de la lista de verificación técnica incompletos.

### Ruta: Analytics → tab **Health**

### Pasos en el Studio

**Sección Auditoría Técnica (parte superior del tab)**

1. → Hacer clic en **"Ejecutar análisis de velocidad"** para disparar una medición PageSpeed del sitio. El proceso tarda aproximadamente 60–90 segundos.
2. Revisar los **Core Web Vitals por plantilla**: el Studio muestra LCP, CLS e INP separados por tipo de página (inicio, hotel, actividad, paquete, destino, blog). Las métricas en verde están aprobadas; en amarillo requieren atención; en rojo son críticas.
3. Revisar la **Lista de verificación técnica**: una serie de ítems como "sitemap.xml accesible", "robots.txt correcto", "redireccionamientos canónicos", "imágenes con alt text", entre otros. Marcar los ítems resueltos a medida que se corrigen desde el editor de contenido del Studio.

**Sección Gestor de Schemas (parte inferior del tab)**

4. → Revisar la **tabla de schemas**: muestra qué tipos de datos estructurados (JSON-LD) están implementados en cada tipo de página (LodgingBusiness, TouristAttraction, TourPackage, etc.) y cuáles están faltantes o con errores.
5. Para validar un schema específico, hacer clic en **"Validar JSON-LD"** junto al ítem correspondiente. El Studio muestra si el schema es válido o si contiene errores, junto con el fragmento de código para revisión (útil para reportar al equipo técnico si hay algo que corregir).

### Criterios de éxito
- Todos los Core Web Vitals en verde (LCP < 2.5s, CLS < 0.1, INP < 200ms).
- Lista de verificación técnica al 80% o más de ítems en verde.
- Los schemas principales (inicio, hoteles, actividades) validados sin errores.

### Tiempo estimado: 30–45 minutos

---

## Flujo 2: Ver métricas de tráfico orgánico (28 días)

### Objetivo
Entender el estado actual del tráfico orgánico: cuántos clics llegan desde Google, cuál es la tasa de clics promedio, en qué posición aparece el sitio, y si los OKRs de la semana, el mes y el trimestre van por buen camino.

### Ruta: Analytics → tab **Overview**

### Pasos en el Studio

**Panel de KPIs 28D (parte superior)**

1. → Al entrar al tab **Overview**, revisar los cuatro indicadores principales de los últimos 28 días: **Clics orgánicos**, **Impresiones**, **CTR promedio** y **Posición promedio**.
2. Usar el toggle **Brand / Non-Brand** para separar el tráfico de marca (búsquedas con el nombre de la agencia) del tráfico no-marca (búsquedas genéricas como "tours Colombia"). El tráfico no-marca es el que más importa para el crecimiento orgánico.
3. Comparar con el período anterior (los 28 días previos) usando la etiqueta de variación porcentual que aparece bajo cada indicador.

**Panel de Ciclos OKR (sección media)**

4. → Revisar el **ciclo semanal**: muestra las páginas con mayor variación de posición en los últimos 7 días. Si una página subió de posición 15 a posición 9, aparece destacada como "quick win de la semana".
5. → Revisar el **ciclo mensual**: progreso hacia los objetivos de 30 días definidos en la configuración inicial.
6. → Revisar el **ciclo trimestral**: tendencia de largo plazo. Este panel es el que se usa en reuniones de estrategia.

**Panel de Atribución de Revenue (sección inferior)**

7. → Revisar el **embudo keyword → conversión**: muestra qué términos de búsqueda están generando consultas de viaje o reservas. Esto ayuda a entender cuáles keywords tienen valor comercial real, no solo tráfico.

### Criterios de éxito
- Tráfico non-brand con tendencia positiva semana a semana.
- Al menos 1–2 quick wins identificados (páginas que subieron de posición esta semana).
- El equipo puede responder: "¿de dónde viene el tráfico que convierte?".

### Tiempo estimado: 15–20 minutos

---

## Flujo 3: Investigar keywords nuevas

### Objetivo
Descubrir términos de búsqueda con potencial real para el negocio de la agencia, clasificarlos por intención de búsqueda (informativa, comparativa, transaccional) y obtener un brief inicial para crear o mejorar contenido.

### Ruta: Analytics → tab **Keywords** → sub-tab "Investigar"

### Pasos en el Studio

**Configurar la investigación**

1. → Seleccionar el **tipo de contenido** para el que se investigan keywords: hotel, actividad, paquete, destino, o blog.
2. → Seleccionar el **país** objetivo (ej. Colombia, México, España) y el **idioma** (ej. español).
3. → En el campo de **seeds**, ingresar entre 3 y 5 términos base separados por comas (ej. "tour Cartagena, excursión Islas del Rosario, paquete Cartagena todo incluido"). Estos son el punto de partida para la expansión.
4. → Hacer clic en **"Investigar"**. El Studio genera una lista expandida de keywords en 30–60 segundos.

**Interpretar los resultados**

5. Revisar la lista de keywords. Cada una incluye: volumen de búsqueda mensual, dificultad (0–100), intención de búsqueda (**TOFU** = informativa, **MOFU** = comparativa, **BOFU** = transaccional) y un badge de prioridad.
6. Las keywords **BOFU** son las más valiosas comercialmente (el usuario está listo para reservar). Priorizar estas para páginas de hotel, actividad y paquete.
7. Las keywords **TOFU** son ideales para artículos de blog que generen tráfico de descubrimiento.
8. → Hacer clic en **"Ver brief"** junto a una keyword para obtener: estructura de contenido sugerida, longitud recomendada, secciones esenciales y ejemplos del tipo de página que Google prefiere posicionar para ese término.

**Sub-flujo: Analizar la SERP de una keyword específica**

9. → Cambiar al sub-tab **"SERP"** dentro de Keywords.
10. → Ingresar la keyword que se quiere analizar y hacer clic en **"Analizar SERP"**.
11. Revisar: tipo de SERP (¿hay featured snippet? ¿hay mapa? ¿hay anuncios?), top 10 de resultados actuales, **content gap** (temas que los competidores cubren y el sitio no), términos NLP relevantes (palabras relacionadas que Google espera ver en el contenido), y las **People Also Ask** (preguntas frecuentes que aparecen en Google para esa búsqueda).
12. Usar la información de content gap y PAA para enriquecer el contenido existente o como guía para crear contenido nuevo.

### Criterios de éxito
- Identificar al menos 5 keywords BOFU con volumen > 100 búsquedas/mes y dificultad < 50 para el sitio.
- Tener un brief de contenido para al menos 2 keywords prioritarias.
- Conocer las preguntas PAA más frecuentes para incluirlas en el contenido como sección de FAQ.

### Tiempo estimado: 45–60 minutos

---

## Flujo 4: Análisis de competidores

### Objetivo
Entender cómo se posiciona el sitio frente a los competidores directos, detectar keywords donde estos tienen ventaja (keyword gap), y monitorear el perfil de backlinks de la competencia para identificar oportunidades de link building.

### Ruta: Analytics → tab **Competidores**

### Pasos en el Studio

**Tabla de competidores**

1. → Al entrar al tab **Competidores**, revisar la **tabla principal** con los dominios de la competencia definidos en la configuración. Las columnas principales son: dominio, autoridad de dominio (DR), tráfico orgánico estimado, número de keywords en top 10, y posición promedio.
2. → Hacer clic en el encabezado de cualquier columna para ordenar la tabla. Ordenar por "keywords en top 10" para ver qué competidor domina más términos relevantes.

**Keyword gap**

3. → Revisar la sección **Keyword Gap**: muestra keywords para las que los competidores están en top 10 pero el sitio no tiene contenido o no aparece en las primeras posiciones. Estas son oportunidades directas de contenido.
4. → Filtrar por intención BOFU para enfocarse en keywords con valor comercial inmediato.

**Distribución de anchors**

5. → Revisar la sección **Distribución de anchors**: muestra los textos de enlace más frecuentes con los que otros sitios enlazan a la competencia. Esto da pistas sobre cómo posicionan sus páginas principales y qué términos consideran más importantes.

**Link velocity**

6. → Revisar la **velocidad de adquisición de backlinks**: cuántos backlinks nuevos está ganando cada competidor por mes. Un competidor que crece rápido en backlinks probablemente tiene una estrategia activa de link building.

**Ruta adicional: perfil de backlinks propio**

7. → Ir al tab **Backlinks** en Analytics para revisar el perfil de backlinks del propio sitio: DR actual, número de dominios referenciantes, distribución de anchors y velocidad de adquisición. Comparar con los números de la competencia vistos en el paso anterior.

### Criterios de éxito
- Identificar al menos 10 keywords del gap que el sitio puede atacar con contenido existente (optimizando) o nuevo (creando).
- Conocer la velocidad de backlinks de los principales competidores para tener una referencia de cuánto link building se necesita.

### Tiempo estimado: 30–45 minutos

---

## Flujo 5: Optimizar un hotel

### Objetivo
Mejorar el posicionamiento de la página de un hotel específico: desde elegir la keyword correcta hasta completar todos los elementos on-page que Google espera ver en una página de alojamiento.

### Ruta: Contenido → fila del hotel → botón **"Flujo SEO →"**

### Pasos en el Studio

**Abrir el flujo**

1. → Ir a **Contenido** desde el menú lateral.
2. → Localizar el hotel en la tabla (usar el buscador o filtrar por tipo "Hotel").
3. → Hacer clic en **"Flujo SEO →"** en la fila del hotel. Se abre un panel lateral con un stepper de 4 pasos.

**Paso 1 — Research (Investigación)**

4. El panel muestra las keywords actuales del hotel (si ya tiene tráfico). → Hacer clic en **"Investigar keywords"** para abrir el buscador de keywords en contexto del hotel.
5. Ingresar seeds relacionados con el hotel (nombre del hotel, ciudad, tipo de alojamiento). Revisar los resultados y seleccionar la **keyword principal** (la más relevante y con mejor relación volumen/dificultad).
6. → Hacer clic en **"Seleccionar como keyword principal"** para fijarla al hotel.

**Paso 2 — SERP (Análisis de resultados)**

7. → El Studio analiza automáticamente la SERP de la keyword principal seleccionada. Revisar:
   - ¿Qué tipo de páginas están rankeando? (otras agencias, Booking.com, TripAdvisor)
   - ¿Qué contenido incluyen que la página del hotel no tiene?
   - ¿Qué preguntas PAA son más frecuentes para esa búsqueda?
8. Tomar nota del content gap para incluirlo en los siguientes pasos.

**Paso 3 — On-Page (Lista de verificación)**

9. → El panel muestra la **lista de verificación de 12 ítems** para páginas de hotel. Revisar y completar cada uno:
   - **H1**: el título principal de la página debe incluir la keyword y el nombre del hotel.
   - **Meta description**: entre 140 y 160 caracteres, con la keyword y una llamada a la acción.
   - **Imagen og:image**: foto de alta calidad configurada como imagen de vista previa para redes sociales.
   - **Galería de imágenes**: mínimo 5 fotos del hotel (habitaciones, fachada, áreas comunes).
   - **Calificación por estrellas**: visible en la página, preferiblemente above-the-fold.
   - **Precio visible**: tarifa base accesible sin necesidad de hacer scroll.
   - **Amenidades**: al menos 8 servicios listados (Wi-Fi, parqueadero, piscina, desayuno, etc.).
   - **Política de check-in / check-out**: horarios claramente indicados.
   - **Mapa de ubicación**: mapa embebido o enlace con la dirección exacta.
   - **Schema LodgingBusiness**: datos estructurados JSON-LD implementados (verificar en tab Health).
   - **Reseñas**: al menos 1 reseña visible o sección de testimonios.
   - **CTA principal**: botón de "Reservar" o "Consultar disponibilidad" visible en la mitad superior de la página.
10. Para cada ítem pendiente, → hacer clic en **"Ir al editor"** para abrirlo directamente en el editor de contenido del Studio y completarlo.
11. Marcar cada ítem como completado al terminar.

**Paso 4 — Medir (Seguimiento)**

12. → Hacer clic en **"Registrar línea base"** para guardar la posición actual del hotel en la keyword principal.
13. → Ir a Analytics → Overview en 7–14 días para comparar el antes y el después.

**Complemento: Content Score**

14. → Desde el panel del hotel, ir al tab **Content Score** (Score de Contenido) para ver la puntuación desagregada:
    - **D1 — On-Page** (0–20): elementos técnicos y de contenido básico.
    - **D2 — Semántico** (0–20): cobertura de temas relacionados y términos NLP.
    - **D3 — Schema** (0–20): calidad e integridad de los datos estructurados.
    - **D4 — Conversión** (0–20): elementos que facilitan la reserva.
    - **D5 — Competitivo** (0–20): comparación con las páginas que rankean para la misma keyword.
15. Identificar las dimensiones con puntuación más baja y trabajar primero en esas.

### Criterios de éxito
- Lista de verificación de 12 ítems al 100%.
- Content Score total ≥ 75/100.
- Keyword principal definida y registrada como línea base.

### Tiempo estimado: 45–75 minutos por hotel

---

## Flujo 6: Optimizar una actividad

### Objetivo
Mejorar el posicionamiento de la página de una actividad turística específica: tours, excursiones, senderismo, avistamiento de aves, deportes de aventura, u otras experiencias que la agencia ofrece.

### Ruta: Contenido → fila de la actividad → botón **"Flujo SEO →"**

### Pasos en el Studio

1. → Ir a **Contenido** y localizar la actividad en la tabla.
2. → Hacer clic en **"Flujo SEO →"**. Se abre el panel con stepper de 4 pasos (mismo flujo que hoteles, adaptado para actividades).

**Paso 1 — Research**: ingresar seeds relacionados con la actividad (tipo de experiencia, destino, duración). Seleccionar keyword principal.

**Paso 2 — SERP**: revisar qué tipo de páginas rankea Google para esa actividad. Prestar atención a si hay featured snippets de tipo "cómo hacer" o "qué esperar" — señal de que Google valora contenido educativo para esa búsqueda.

**Paso 3 — On-Page**: completar la **lista de verificación de 10 ítems** para actividades:
   - **H1** con keyword y nombre de la actividad.
   - **Meta description** con beneficio principal + llamada a la acción.
   - **Descripción detallada**: mínimo 300 palabras describiendo la experiencia.
   - **Duración y nivel de dificultad**: visible en la parte superior.
   - **Qué incluye / qué no incluye**: lista clara de servicios.
   - **Punto de encuentro y logística**: dónde y cómo llegar.
   - **Precio y disponibilidad**: tarifa visible y formulario de consulta accesible.
   - **Galería de fotos o video**: mínimo 3 imágenes de la actividad en acción.
   - **Schema TouristAttraction**: datos estructurados JSON-LD implementados.
   - **CTA principal**: botón de reserva o consulta visible above-the-fold.

**Paso 4 — Medir**: registrar línea base y hacer seguimiento en 7–14 días.

### Criterios de éxito
- Lista de 10 ítems al 100%.
- Content Score total ≥ 70/100.
- La página responde las preguntas PAA más frecuentes para la keyword principal.

### Tiempo estimado: 40–60 minutos por actividad

---

## Flujo 7: Optimizar un paquete

### Objetivo
Mejorar el posicionamiento de la página de un paquete turístico: itinerarios completos, paquetes todo incluido, combinaciones de destinos, o propuestas especiales de la agencia.

### Ruta: Contenido → fila del paquete → botón **"Flujo SEO →"**

### Pasos en el Studio

1. → Ir a **Contenido** y localizar el paquete en la tabla.
2. → Hacer clic en **"Flujo SEO →"**. Se abre el panel con stepper de 4 pasos.

**Paso 1 — Research**: ingresar seeds relacionados (destino, duración, tipo de viajero, ej. "paquete familia Cartagena 5 días", "viaje de novios San Andrés todo incluido"). Seleccionar keyword principal de intención transaccional (BOFU).

**Paso 2 — SERP**: los paquetes suelen competir con OTAs (Booking, Despegar, Expedia). Revisar qué elementos diferenciales incluyen las páginas que rankean (itinerario día a día, precio total claro, testimonios de viajeros).

**Paso 3 — On-Page**: completar la **lista de verificación de 11 ítems** para paquetes:
   - **H1** con destino, duración y tipo de viaje.
   - **Meta description** con precio desde + beneficio principal.
   - **Itinerario día a día**: descripción de cada día del paquete.
   - **Precio total y qué incluye**: desglose claro (vuelos, hotel, traslados, guía, etc.).
   - **Precio "desde"**: tarifa base visible en la parte superior.
   - **Galería**: fotos de los destinos y experiencias incluidas (mínimo 5).
   - **Calificación del paquete**: valoraciones de viajeros anteriores.
   - **Mapa del recorrido**: ruta del itinerario visualizada.
   - **Política de cancelación**: condiciones claras.
   - **Schema TourPackage**: datos estructurados JSON-LD implementados.
   - **CTA principal**: botón de "Solicitar cotización" o "Reservar paquete" con formulario accesible.

**Paso 4 — Medir**: registrar línea base y hacer seguimiento en 14–21 días (los paquetes tardan más en posicionar por la competencia de OTAs).

### Criterios de éxito
- Lista de 11 ítems al 100%.
- Content Score total ≥ 72/100.
- El precio y el itinerario están visibles sin necesidad de hacer scroll excesivo.

### Tiempo estimado: 45–75 minutos por paquete

---

## Flujo 8: Optimizar un destino (Página Pilar)

### Objetivo
Construir o mejorar una página de destino con autoridad temática suficiente para posicionar para términos amplios y de alto volumen (ej. "turismo en Cartagena", "qué hacer en el Eje Cafetero"). Las páginas de destino son el núcleo de la arquitectura de contenido de la agencia.

### Ruta: Contenido → fila del destino → botón **"Flujo SEO →"**

### Pasos en el Studio

1. → Ir a **Contenido** y localizar el destino en la tabla.
2. → Hacer clic en **"Flujo SEO →"**. Se abre el panel con stepper de 4 pasos.

**Paso 1 — Research**: los destinos requieren un análisis de keywords más amplio. Ingresar seeds que cubran las tres intenciones:
   - Informativa (TOFU): "qué visitar en X", "cómo llegar a X", "clima en X".
   - Comparativa (MOFU): "mejores hoteles en X", "tours recomendados en X".
   - Transaccional (BOFU): "paquetes X", "tours X precio".
   Seleccionar una keyword principal amplia (TOFU/MOFU con alto volumen) y guardar las BOFU para las páginas de hotel/actividad/paquete que enlazan desde esta.

**Paso 2 — SERP**: las páginas de destino compiten con Wikipedia, blogs de viaje y guías de turismo gubernamentales. Revisar la profundidad de contenido que rankea (generalmente son páginas largas y comprehensivas) y el número de subtemas cubiertos.

**Paso 3 — On-Page**: completar la **lista de verificación de 10 ítems** para destinos:
   - **H1** con "Qué hacer en [Destino]" o "Guía de turismo [Destino]".
   - **Meta description** con el atractivo principal del destino + llamada a la acción.
   - **Introducción**: párrafo de 150–200 palabras que defina el destino y su atractivo principal.
   - **Secciones temáticas**: qué hacer, dónde hospedarse, cómo llegar, cuándo ir, gastronomía, cultura.
   - **Links internos a hoteles**: al menos 3 hoteles de la agencia en ese destino enlazados desde esta página.
   - **Links internos a actividades**: al menos 3 actividades en el destino enlazadas desde esta página.
   - **Links internos a paquetes**: al menos 2 paquetes que incluyan el destino enlazados.
   - **Galería del destino**: mínimo 8 fotos representativas del lugar.
   - **Schema TouristDestination**: datos estructurados JSON-LD implementados.
   - **CTA contextual**: llamada a la acción diferente según la sección (reservar tour, ver hoteles, descargar guía).

**Paso 4 — Medir**: registrar línea base. Las páginas de destino tardan 30–60 días en mostrar resultados significativos por la alta competencia.

**Complemento: Arquitectura de contenido**

4. → Ir a la ruta **Analytics → Keywords → botón "Ver Arquitectura →"** para revisar el **topic cluster** del destino.
5. Verificar que la página del destino aparece como **pillar page** del cluster y que las páginas de hoteles, actividades y paquetes del mismo destino están correctamente interconectadas.
6. Revisar la **tabla de click depth**: la página del destino debe estar a 1 click del inicio. Las páginas de hoteles y actividades que pertenecen al destino deben estar a 2 clicks máximo.

### Criterios de éxito
- Lista de 10 ítems al 100%.
- Content Score total ≥ 78/100.
- La página tiene al menos 8 links internos salientes hacia contenido relacionado de la agencia.
- La página aparece correctamente en el topic cluster de su destino.

### Tiempo estimado: 60–90 minutos por destino

---

## Flujo 9: Optimizar un blog post

### Objetivo
Revisar el estado SEO de un artículo de blog y decidir si mantenerlo (Keeper), mejorarlo (Optimize) o eliminarlo (Prune). Los blogs son el principal canal de tráfico TOFU y su mantenimiento periódico evita que el contenido obsoleto dañe la autoridad del sitio.

### Ruta: Contenido → fila del blog → botón **"Flujo SEO →"**

### Pasos en el Studio

1. → Ir a **Contenido** y localizar el artículo en la tabla (filtrar por tipo "Blog").
2. → Hacer clic en **"Flujo SEO →"**. El panel muestra automáticamente un **badge de estado** en la parte superior:
   - **Keeper** (verde, puntuación ≥ 70): el artículo está funcionando bien. Mantener con actualizaciones menores anuales.
   - **Optimize** (amarillo, puntuación 40–69): el artículo tiene potencial pero necesita trabajo. Seguir el flujo completo.
   - **Prune** (rojo, puntuación < 40): el artículo no genera tráfico ni tiene potencial. Considerar eliminarlo o redirigirlo.

**Si el badge es Keeper**: revisar la fecha de última actualización. Si tiene más de 12 meses, actualizar datos, estadísticas y fechas para mantenerlo fresco.

**Si el badge es Optimize**: completar el flujo completo:

**Paso 1 — Research**: confirmar que la keyword objetivo del artículo sigue siendo relevante. Si el artículo no tiene keyword definida, asignarle una ahora.

**Paso 2 — SERP**: analizar qué contenido está rankeando actualmente para esa keyword. Comparar con el artículo actual e identificar:
   - Temas cubiertos por los competidores que el artículo no menciona.
   - Preguntas PAA que el artículo debería responder.
   - Formato preferido por Google (listas, tablas, how-to, etc.).

**Paso 3 — On-Page**: completar la **lista de verificación de 10 ítems** para blog posts:
   - **H1** con keyword principal al inicio del título.
   - **Meta description** con el principal beneficio del artículo + keyword.
   - **Introducción**: responder la intención del usuario en los primeros 100 palabras.
   - **Estructura de encabezados**: H2 y H3 organizados de forma lógica.
   - **Longitud**: al menos 800 palabras (para keywords informativas competitivas, 1500+).
   - **Imágenes**: al menos 2, con alt text descriptivo.
   - **Links internos**: al menos 2 enlaces a páginas de producto relacionadas (hoteles, actividades, paquetes).
   - **FAQ**: sección que responda las People Also Ask de la SERP.
   - **Fecha de actualización**: visible en la página ("Actualizado: mes año").
   - **CTA contextual**: invitar al lector a explorar un tour, actividad o paquete relacionado.

**Paso 4 — Medir**: registrar fecha de actualización y línea base de posición.

**Si el badge es Prune**: antes de eliminar, verificar si el artículo tiene backlinks entrantes (revisar en tab Backlinks). Si tiene backlinks, redirigir (301) hacia un artículo relacionado más fuerte en vez de eliminar.

### Criterios de éxito
- Artículos con badge Keeper: actualizados si tienen más de 12 meses.
- Artículos con badge Optimize: lista de 10 ítems al 90%+, nuevo score ≥ 70 al terminar.
- Artículos con badge Prune: decisión tomada (eliminar con 301 o consolidar con otro artículo).

### Tiempo estimado: 30–45 minutos por artículo

---

## Flujo 10: Revisar el backlog de quick wins

### Objetivo
Identificar y priorizar las páginas del sitio con mayor potencial de mejora inmediata, sin necesidad de crear contenido nuevo. Los quick wins son optimizaciones que pueden generar resultados en 7–21 días.

### Ruta: Contenido → sección **Backlog** (parte inferior de la página de Contenido)

### Pasos en el Studio

1. → Ir a **Contenido**. Al bajar la página, encontrar la sección **Backlog SEO** con 3 columnas principales.

**Columna 1 — Striking Distance (Posiciones 8–20)**

2. → Revisar la lista de páginas que aparecen en posiciones 8 a 20 de Google para sus keywords principales. Estas páginas están "a punto de llegar" al top 10 con optimizaciones menores.
3. Para cada página en esta lista: → hacer clic en **"Optimizar snippet"** para mejorar el título y la meta description con la keyword exacta de búsqueda.
4. Priorizar las páginas con más impresiones y posición más cercana a 10 (ej. posición 11 o 12 es más accionable que posición 19).

**Columna 2 — Low CTR (CTR por debajo del promedio)**

5. → Revisar las páginas con CTR inferior al promedio del sitio a pesar de tener buena posición. Esto indica que el snippet (título + meta description) no es atractivo.
6. → Hacer clic en **"Mejorar snippet"** para editar el título y la meta description directamente. Usar verbos de acción, números específicos y el beneficio principal del destino o servicio.

**Columna 3 — Canibalización (páginas que compiten entre sí)**

7. → Revisar si hay pares de páginas que compiten por la misma keyword (el Studio los detecta automáticamente). La canibalización confunde a Google y divide la autoridad.
8. Para cada par canibalizante, decidir: ¿cuál es la página más fuerte? Consolidar el contenido de la más débil en la más fuerte y redirigir (301) la más débil.

**Kanban de prioridades**

9. → Organizar las tareas identificadas en el kanban de la sección Backlog:
   - **P1 — Esta semana**: acciones con mayor impacto potencial (páginas en posición 8–12).
   - **P2 — Este mes**: acciones de mediano plazo (Low CTR, posiciones 13–20).
   - **P3 — Backlog**: acciones importantes pero no urgentes (canibalización compleja, páginas en posición > 20).

### Criterios de éxito
- Al menos 3–5 páginas de Striking Distance con snippet mejorado cada semana.
- CTR promedio del sitio sube semana a semana.
- Sin pares de canibalización activos para keywords de alto volumen.

### Tiempo estimado: 20–30 minutos (revisión semanal recomendada)

---

## Flujo 11: Arquitectura de contenido & Topic Clusters

### Objetivo
Revisar y planificar la estructura de contenido del sitio para construir autoridad temática: asegurarse de que las páginas de destino actúan como pilares, que las páginas de hoteles/actividades/paquetes son satélites bien conectados, y que ninguna página importante está enterrada a más de 3 clicks del inicio.

### Ruta: Analytics → tab **Keywords** → botón **"Ver Arquitectura →"**

### Pasos en el Studio

1. → Ir a **Analytics → Keywords**. En la parte superior derecha, hacer clic en **"Ver Arquitectura →"**. Se abre la vista de arquitectura de contenido en pantalla completa.

**Revisar los Topic Clusters**

2. → El Studio muestra los clusters temáticos detectados automáticamente (ej. Colombia, Ecoturismo, Hoteles). Cada cluster tiene:
   - Una **pillar page** (página principal del destino o tema).
   - Páginas **satélite** (hoteles, actividades, blogs relacionados) conectadas a la pillar.
3. → Hacer clic en un cluster para expandirlo y ver todas las páginas que lo componen. Verificar que cada satélite tiene al menos 1 enlace interno hacia la pillar page y viceversa.
4. Si hay páginas sin cluster asignado ("huérfanas"), identificarlas para agregarlas al cluster correspondiente mediante un enlace interno.

**Revisar la tabla de Click Depth**

5. → Revisar la **tabla de profundidad de click**: muestra cuántos clicks se necesitan desde el inicio para llegar a cada página:
   - **1 click**: solo el inicio debería estar aquí.
   - **2 clicks**: páginas de destino (pillar pages) y categorías principales.
   - **3 clicks**: páginas de hotel, actividad, paquete y blog.
   - **4+ clicks**: señal de alerta. Estas páginas son difíciles de descubrir por Google y por los usuarios.
6. Para cualquier página importante (hoteles, actividades, paquetes) que esté a 4+ clicks, agregar un enlace interno desde una página más cercana al inicio para reducir la profundidad.

**Revisar el árbol de enlaces internos**

7. → Revisar el **árbol de enlaces internos**: visualización de cómo las páginas del sitio se interconectan. Las páginas con más enlaces entrantes internos son las que reciben más "autoridad" de enlace.
8. Verificar que las pillar pages de destino tienen más enlaces internos que cualquier otra página del sitio.

### Criterios de éxito
- Todas las páginas importantes (hoteles, actividades, paquetes) a máximo 3 clicks del inicio.
- Cada pillar page tiene al menos 5 enlaces internos entrantes.
- Sin páginas importantes sin cluster asignado.

### Tiempo estimado: 30 minutos (mensual o cuando se agrega contenido nuevo)

---

## Flujo 12: Configurar multi-locale y hreflang

### Objetivo
Indicarle a Google en qué idiomas y regiones opera el sitio, y cuál es la versión canónica para cada mercado. Esto es especialmente importante si la agencia tiene clientes en varios países hispanohablantes o en mercados de habla inglesa.

### Ruta: Analytics → tab **Config** → sección **Configuración de Idiomas**

### Pasos en el Studio

1. → Ir a **Analytics → Config**. Desplazarse hasta la sección **Configuración de Idiomas**.
2. → Revisar los **locales activos** ya configurados (ej. `es-CO` para Colombia en español). Si el sitio solo opera en Colombia, este único locale es suficiente.
3. → Para agregar un nuevo mercado, hacer clic en **"Agregar locale"** y seleccionar el código correspondiente:
   - `es-MX` — México
   - `es-ES` — España
   - `en-US` — Estados Unidos en inglés
   - `en-GB` — Reino Unido en inglés
   - (y otros según los mercados objetivo de la agencia)
4. → Definir el **locale principal** (x-default): es la versión que Google muestra cuando no puede determinar la ubicación exacta del usuario. Para la mayoría de agencias colombianas, `es-CO` es el x-default apropiado.
5. → Hacer clic en **"Generar preview de hreflang"** para ver las etiquetas que el Studio insertará automáticamente en el código del sitio. Verificar que la sintaxis es correcta (ej. `<link rel="alternate" hreflang="es-CO" href="..."/>`).
6. → Guardar los cambios. El Studio actualiza automáticamente las etiquetas hreflang en todas las páginas del sitio.

### Criterios de éxito
- Al menos un locale activo configurado correctamente.
- El x-default apunta al mercado principal de la agencia.
- El preview de hreflang no muestra errores de sintaxis.

### Tiempo estimado: 10 minutos

---

## Flujo 13: Monitorear visibilidad en AI (ChatGPT, Perplexity, Gemini)

### Objetivo
Saber si el sitio aparece cuando usuarios hacen preguntas de viaje en asistentes de IA como ChatGPT, Perplexity o Google Gemini, y tomar acciones para aumentar esa visibilidad (GEO — Generative Engine Optimization).

### Ruta: Analytics → tab **AI Visibility**

### Pasos en el Studio

**Tracker de presencia en AI Overview**

1. → Al entrar al tab **AI Visibility**, revisar el **panel de presencia en AI Overview**: muestra si el sitio está siendo mencionado en los resúmenes de IA que Google muestra antes de los resultados orgánicos (anteriormente llamados "AI Overviews" o SGE).
2. → Revisar la tendencia: ¿aumentaron o disminuyeron las menciones en AI Overview en los últimos 30 días?
3. → Identificar para qué keywords el sitio aparece en AI Overview. Estas son keywords donde el sitio tiene autoridad suficiente para que Google lo cite en sus resúmenes.

**Segmentos de tráfico LLM en GA4**

4. → Revisar la sección **Tráfico referenciado por LLMs**: muestra sesiones que llegaron al sitio con referrer de ChatGPT (`chat.openai.com`), Perplexity (`perplexity.ai`), You.com, u otros asistentes de IA.
5. → Si hay tráfico de LLMs, revisar qué páginas están recibiendo esas visitas. Esas páginas son las que los asistentes de IA están recomendando.

**Lista de verificación GEO (Generative Engine Optimization)**

6. → Revisar el **checklist GEO** con 5 estrategias para aumentar la visibilidad en asistentes de IA:
   - **Autoridad de autor**: el sitio incluye información sobre quiénes escriben el contenido (experiencia en turismo, años en el sector).
   - **Citabilidad**: el contenido incluye datos, estadísticas, listas ordenadas y definiciones que los LLMs pueden citar fácilmente.
   - **Frescura**: el contenido tiene fechas de actualización visibles. Los LLMs prefieren contenido reciente.
   - **Estructura clara**: uso de H2/H3 bien organizados que los LLMs pueden procesar para generar resúmenes.
   - **FAQ estructurado**: preguntas y respuestas explícitas en el contenido (y en el schema FAQ en JSON-LD).
7. → Para cada ítem incompleto del checklist, hacer clic en **"Cómo mejorar"** para ver la acción específica recomendada.

### Criterios de éxito
- Al menos 1 keyword estratégica con presencia confirmada en AI Overview.
- Checklist GEO al 60%+ completado.
- Tráfico de LLMs registrado y en tendencia positiva (aunque sea pequeño al inicio).

### Tiempo estimado: 20 minutos

---

## Ciclo operativo recomendado

La siguiente tabla resume con qué frecuencia ejecutar cada flujo y cuánto tiempo reservar:

| Frecuencia | Flujos | Tiempo total | Objetivo principal |
|------------|--------|--------------|-------------------|
| **Diario** | — | — | El módulo SEO no requiere revisión diaria. Enfocarse en crear contenido de calidad. |
| **Semanal** | Flujo 2 (métricas orgánicas) + Flujo 10 (backlog de quick wins) | 35–50 min | Mantener el momentum: revisar el tráfico de la semana y priorizar las optimizaciones de mayor impacto. |
| **Mensual** | Flujo 3 (investigar keywords) + Flujo 4 (competidores) + 2 a 3 optimizaciones de contenido (Flujos 5–9) | 3–4 horas | Optimización activa: encontrar nuevas oportunidades y mejorar el contenido existente. |
| **Trimestral** | Flujo 1 (health check) + Flujo 11 (arquitectura) + Flujo 13 (AI Visibility) + revisión de OKRs 90 días | 4–6 horas | Estrategia: evaluar resultados vs. objetivos, ajustar la arquitectura de contenido y planificar el siguiente trimestre. |
| **Una sola vez** | Flujo 0 (configuración inicial) + Flujo 12 (multi-locale) | 15–25 min | Setup inicial del módulo SEO. |

### Nota sobre el ritmo de resultados

Los resultados SEO no son inmediatos. Como referencia orientativa:

- **Quick wins de snippet** (Flujo 10): resultados visibles en 7–21 días.
- **Optimización de páginas existentes** (Flujos 5–9): resultados en 4–8 semanas.
- **Páginas de destino nuevas** (Flujo 8): resultados en 2–4 meses.
- **Construcción de autoridad de dominio**: proceso continuo de 6–12 meses.

La consistencia importa más que la intensidad puntual. Ejecutar el ciclo semanal sin falta durante 3 meses tiene más impacto que hacer un sprint intensivo de 2 semanas y luego abandonar.

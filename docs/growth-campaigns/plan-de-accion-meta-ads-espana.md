# Plan de Acción a 8 Días: Lanzamiento Meta Ads Colombia Tours - Mercado Español

Este plan de acción operativo está estructurado para llevar la estrategia de adquisición de viajeros españoles de alto valor desde la teoría hasta la ejecución en 8 días, garantizando que la campaña salga a producción con la arquitectura de datos correcta, los creativos optimizados y el embudo de conversión listo.

**Mercado objetivo:** Madrid y Barcelona (España)
**Perfil del viajero:** Alto valor / High-Ticket
**Eje de confianza:** "La ventana que abre Colombia al mundo"
**Presupuesto inicial:** 50 USD/día
**Estructura inicial:** 30 USD prospecting / 15 USD retargeting / 5 USD reserva táctica
**Objetivo de negocio:** ROAS por reserva confirmada (`booking_confirmed`)

---

## Día 1: Auditoría de Infraestructura y Gobernanza de Datos (Fundamentos)

**Objetivo:** Garantizar el rastreo perfecto sin depender de cookies de terceros y asegurar el cumplimiento de privacidad.

*   **Acciones:**
    *   [ ] Verificar y auditar la implementación del Píxel de Meta en todo el ecosistema web.
    *   [ ] Implementar/Auditar la **API de Conversiones de Meta (CAPI)** en el servidor web y el CRM.
    *   [ ] Revisar la Puntuación de Calidad de Coincidencia de Eventos (Event Match Quality Score) en el administrador de eventos (objetivo > 7/10).
    *   [ ] Validar los eventos clave actuales: *ViewContent*, *Contact* (Click-to-WhatsApp), *Lead* (WAFlow) y *booking_confirmed* como métrica interna de ROAS.
    *   [ ] Mantener *Purchase* fuera del go-live hasta certificar la fuente real de booking/revenue y su deduplicación.

---

## Día 2: Arquitectura de Audiencias y Sincronización CRM

**Objetivo:** Crear los clústeres de segmentación basados en valor y preparar las exclusiones.

*   **Acciones:**
    *   [ ] Sincronizar la base de datos de clientes históricos (First-Party Data) con Meta para crear **Públicos Personalizados (Custom Audiences)**.
    *   [ ] Crear **Públicos Similares basados en Valor (Value-Based Lookalikes)** al 1%, 2% y 3% en España.
    *   [ ] Definir las zonas geográficas objetivo en el Business Manager: Delimitar áreas metropolitanas y códigos postales de alto valor en **Madrid** y **Barcelona** exclusivamente.
    *   [ ] Configurar reglas de exclusión: excluir a los clientes recientes o usuarios que ya han reservado en los últimos 30 días.

---

## Día 3: Preparación de Activos de Conversión (Landings & WhatsApp)

**Objetivo:** Eliminar la fricción post-clic y preparar el ecosistema comercial.

**Landings existentes validadas:**
- https://colombiatours.travel/paquetes/bogota-esencial-cultura-y-sal-4-dias
- https://colombiatours.travel/paquetes/colombia-imperdible-9-dias-bogota-medellin-y-cartagena
- https://colombiatours.travel/paquetes/escapada-colombia-7-dias-medellin-y-cartagena
- https://colombiatours.travel/paquetes/medellin-y-guatape-5-dias-ciudad-de-la-eterna-primavera

**Notas de validación:**
- ✅ Moneda dinámica por IP (COP para Colombia, EUR para Europa) — ya implementado.
- ⚠️ Pendiente: Módulo de Seguridad/FAQ (desmitificar riesgos con "corredores turísticos seguros").
- ⚠️ Pendiente: Contexto de conectividad (vuelos desde Madrid/Barcelona en hero o descripción).
- ⚠️ Pendiente: Alineación copy con eje "La ventana que abre Colombia al mundo".

*   **Acciones:**
    *   [ ] Añadir sección FAQ de seguridad (corredores seguros, transporte privado 24/7) a las 4 landings.
    *   [ ] Incluir contexto de conectividad en la sección hero o descripción.
    *   [ ] Alinear el copy con el mensaje "La ventana que abre Colombia al mundo".
    *   [ ] Configurar respuestas rápidas en **WhatsApp Business** (agente IA ya configurado ✅).
    *   [ ] Habilitar y configurar la estrategia de **Max-Price Bidding** para los mensajes de WhatsApp.

---

## Día 4: Producción y Ensamblaje Creativo - Fase TOFU (Inspiración)

**Objetivo:** Preparar los ganchos visuales que alimentarán la parte superior del embudo.

*   **Acciones:**
    *   [ ] Seleccionar/Editar **Videos UGC** verticales (Reels/Stories) priorizando autenticidad (Ej: Monserrate, La Candelaria, terrazas de Medellín).
    *   [ ] Ensamblar 3 variaciones visuales utilizando el gancho de las "3 Razones" y "El secreto mejor guardado de Sudamérica".
    *   [ ] Redactar 2 variaciones de copy principal (uno emocional, otro más descriptivo) y 2 titulares para la matriz 3:2:2.
    *   [ ] Asegurar que el mensaje "La ventana que abre Colombia al mundo" sea el eje de confianza.

---

## Día 5: Producción y Ensamblaje Creativo - Fases MOFU y BOFU (Consideración y Cierre)

**Objetivo:** Desarrollar los activos de retargeting profundo y respuesta directa.

*   **Acciones:**
    *   [ ] **MOFU:** Diseñar **Carruseles** que desglosen visualmente el itinerario día por día de los paquetes "Bogotá Urbana", "Medellín Creativa" y combinados.
    *   [ ] **MOFU:** Editar videos de **Prueba Social (Testimoniales)** de viajeros españoles destacando la seguridad y logística.
    *   [ ] **BOFU:** Crear **Imágenes estáticas de alto contraste** con texto superpuesto (overlays) indicando "Plazas Limitadas" o urgencia estacional.
    *   [ ] Redactar copys con llamados a la acción (CTAs) directos hacia Click-to-WhatsApp.

---

## Día 6: Montaje Estructural en Meta Ads Manager (El Sistema 3:2:2)

**Objetivo:** Dejar las campañas parametrizadas en la plataforma listas para revisión.

*   **Acciones:**
    *   [ ] Crear una campaña unificada **ES | Colombia Tours | High-Ticket | WhatsApp + Sales Proxy | Madrid-Barcelona**.
    *   [ ] Configurar **Prospecting / TOFU-MOFU** con 30 USD/día: broad Madrid + Barcelona, Advantage+, placements automáticos y matriz 3:2:2.
    *   [ ] Configurar **Retargeting / MOFU-BOFU** con 15 USD/día: visitantes 30-180 días, video 50%+, engagers IG/FB y clics WhatsApp sin lead.
    *   [ ] Reservar 5 USD/día para duplicar ganadores, probar urgencia BOFU o reforzar la audiencia con mejor señal.
    *   [ ] Diferenciar Madrid/Barcelona por copy, creatividad y `utm_content`; no separar campañas al inicio para no romper aprendizaje.

---

## Día 7: Quality Assurance (QA) y Pruebas de Estrés

**Objetivo:** Validar que todo el ecosistema fluya sin errores antes de invertir dinero.

*   **Acciones:**
    *   [ ] Realizar pruebas de envío de formularios y clics en enlaces Click-to-WhatsApp desde dispositivos móviles y de escritorio.
    *   [ ] Validar usando la extensión *Meta Pixel Helper* y el panel de *Eventos de Prueba* de CAPI que los eventos se disparan y dediplican correctamente.
    *   [ ] Revisar ortografía, gramática y tono de los copys (asegurar que el español sea el adecuado para el mercado ibérico, sin modismos latinos confusos).
    *   [ ] Comprobar tiempos de carga de las landing pages adaptadas.

---

## Día 8: Lanzamiento Oficial y Monitoreo Inicial (Go-Live)

**Objetivo:** Encender campañas y vigilar métricas tempranas de estabilidad.

*   **Acciones:**
    *   [ ] **Activar las campañas** (preferiblemente en horario de mañana de España para maximizar la ventana de aprobación).
    *   [ ] Monitorear en las primeras 24 horas: Costo por Mil Impresiones (CPM) y el Costo por Clic Saliente (Outbound CTR) en la capa TOFU.
    *   [ ] Asegurar que el equipo comercial esté alineado para gestionar el flujo entrante de WhatsApp.
    *   [ ] Agendar la primera reunión de revisión de iteración ganadora del sistema 3:2:2 para el Día 11 (72 horas post-lanzamiento).

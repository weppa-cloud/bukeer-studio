# ColombiaTours Meta Ads Expert Opportunity Audit

Fecha: 2026-05-19  
Ventana auditada: 2025-08-19 a 2026-05-19  
Modo: read-only. No se crearon, editaron, pausaron, activaron ni mutaron campañas.  
Cuenta: Colombiatours.Travel24 (`act_1249829212995679`)  

## Veredicto Ejecutivo

ColombiaTours no debe escalar Meta Ads todavía como adquisición amplia de leads high-ticket. Sí puede lanzar un piloto controlado si antes se separa la data útil de la data contaminante y se cierra el ciclo CRM/CAPI para que Meta aprenda de leads calificados, no de formularios fáciles.

La cuenta gastó COP 19.880.400 en los últimos 9 meses auditados y generó 445 leads de plataforma. El problema es que solo aparecen 31 eventos first-party atribuidos a Meta y 8 requests CRM atribuidas. Eso significa que la data de Meta sirve muy bien para minar creativos, mercados, placement y audiencias, pero no alcanza como verdad de calidad comercial.

La oportunidad principal está en reconstruir una estrategia de Meta desde México, usando los ganadores históricos de `ABO | Leads | Web | Form Submit`, pero cambiando el objetivo operativo hacia WAFlow/CRM calificado, no hacia lead barato.

## Prueba Read-Only

- Meta Ads mutations applied: `0`.
- Supabase writes applied: `0`.
- Runner base: `scripts/meta-ads/audit-colombiatours-meta-historical-ads.cjs`.
- Evidencia principal: `artifacts/meta-ads/2026-05-19-colombiatours-meta-ads-9m-audit/meta-ads-historical-audit.json`.
- Reporte base generado: `docs/audits/2026-05-19-colombiatours-meta-ads-9m-audit.md`.

## Como Haría La Auditoría Exhaustiva

1. Medición y gobierno de datos: Pixel, CAPI, eventos browser/server, deduplicación, UTMs, `fbclid`, `fbc`, `fbp`, `ctwa`, `reference_code`, dominio, consentimiento y consistencia de nombres.
2. Calidad downstream: cruce de leads Meta con `waflow_submit`, conversaciones útiles, `chatwoot_label_qualified`, `crm_quote_sent`, oportunidad e itinerario confirmado.
3. Contaminación de aprendizaje: separar campañas de recruiting, tráfico local Colombia, RRHH, awareness genérico y leads sin intención de compra.
4. Estructura de campañas: objetivo, evento de optimización, ubicación de conversión, cantidad de ad sets, presupuestos y fragmentación de aprendizaje.
5. Mercados y geos: evaluar país, ciudad, conectividad aérea, ticket potencial y coherencia de landing.
6. Placement/device: evaluar Facebook, Instagram, Audience Network, Threads, mobile app, desktop y mobile web por calidad, no solo CPL.
7. Audiencias: custom audiences, retargeting, lookalikes, seeds CRM, exclusiones y tamaño suficiente para aprendizaje.
8. Creativos y ofertas: identificar ángulos ganadores, claims, precio, formato, prueba social, UGC, destino, duración y fricción de formulario.
9. Landings y promesa: revisar si la landing cumple lo que promete el anuncio, si filtra barato/vuelos/hotel-only y si captura tracking.
10. Plan de experimentos: diseñar piloto con gates de calidad CRM, no con presupuesto abierto.

## Investigación Externa Aplicada

- Meta presenta Conversions API como conexión directa entre data de marketing y sistemas de optimización/medición de Meta. Para ColombiaTours esto implica que el algoritmo debe recibir eventos de calidad CRM, no solamente leads de plataforma. Fuente: [Meta Business Help: About Conversions API](https://www.facebook.com/business/help/AboutConversionsAPI).
- El playbook técnico de Conversions API recomienda enviar eventos a lo largo del embudo, idealmente en tiempo real, usar browser + server, deduplicar con `event_id`, y mejorar Event Match Quality con parámetros como email/teléfono hasheados, IP, user agent, `fbc`, `fbp` y `external_id`. Fuente: [Conversions API Direct Integration Playbook](https://storage.googleapis.com/lr-tech-docs-resources/PDFs/Conversions-API-Direct-Integration-Playbook_English.pdf).
- El mismo playbook indica que eventos con más de 7 días de retraso no deben usarse como backfill CAPI operativo. Por eso la data histórica de 9 meses se debe reutilizar para audiencias, exclusiones, creativos y análisis, no para subir conversiones antiguas como si fueran recientes.
- Meta Advantage+ Audience usa señales como listas de clientes o intereses como guía y puede expandir más allá de ellas, pero permite controles estrictos como ubicación, idioma, edad mínima y exclusiones. Para ColombiaTours: usar broad/Advantage+ solo dentro de ciudades/países aprobados y con exclusiones limpias. Fuente: [Meta Advantage+ Audience](https://www.facebook.com/business/ads/meta-advantage-plus/audience).
- Meta indica que Custom Audiences pueden crearse con listas, Pixel, SDK y engagement, y que Lookalike ayuda a encontrar personas similares a los mejores clientes. Para ColombiaTours: la semilla debe ser `quote_sent`, oportunidad o booking, no todos los leads. Fuente: [Meta Help: About reaching new audiences](https://www.facebook.com/help/157306091096340).
- Meta exige derechos/permisos y tratamiento adecuado para Customer List Custom Audiences; los datos se usan hasheados. Para ColombiaTours: audiencias CRM solo con base legal y campos normalizados. Fuente: [Meta Customer List Custom Audiences Terms](https://www.facebook.com/legal/terms/customaudience).
- La literatura de lookalike/audience expansion confirma que partir de seed users puede encontrar usuarios similares con probabilidad de cumplir el objetivo, pero advierte riesgo de overfitting cuando la semilla es pequeña o poco representativa. Fuente: [Zhu et al., KDD 2021 / arXiv 2105.14688](https://arxiv.org/abs/2105.14688).
- Auditorías recientes de expertos en Meta Ads coinciden en que optimizar por formularios genera volumen, no calidad; el salto real aparece cuando se devuelven señales de qualified lead, oportunidad o cierre por CAPI/CRM. Fuente: [27Five: Meta lead quality](https://27five.com/blog/meta-ads-b2b-lead-quality-fix/).
- Las mejores prácticas de aprendizaje recomiendan suficiente volumen por evento de optimización, evitar cambios fuertes, consolidar estructura y no fragmentar demasiado el presupuesto. Fuente: [27Five: Meta learning phase](https://27five.com/blog/meta-learning-phase-ecommerce/).

## Hallazgos Cuantitativos

### Cuenta

| Métrica | Resultado |
| --- | ---: |
| Spend auditado 9m | COP 19.880.400 |
| Impressions | 2.884.072 |
| Clicks | 60.067 |
| Landing page views | 16.800 |
| Leads plataforma | 445 |
| CPL plataforma | COP 44.675 |
| First-party events atribuidos a Meta | 31 |
| Requests CRM atribuidas a Meta | 8 |
| `fbc` coverage en first-party Meta events | 45,16% |
| `fbp` coverage en first-party Meta events | 45,16% |
| Recruiting spend detectado | COP 246.059 |

Interpretación: la cuenta consiguió volumen barato de leads en ciertos momentos, pero la señal de calidad cerrada en CRM es baja. La optimización futura debe mirar CPQL/CPO, no CPL.

### Evolución Mensual

| Mes | Spend | Leads plataforma | CPL | Lectura |
| --- | ---: | ---: | ---: | --- |
| 2025-11 | COP 1.368.480 | 81 | COP 16.895 | Mes de buena eficiencia plataforma |
| 2025-12 | COP 2.154.674 | 181 | COP 11.904 | Mejor mes de leads plataforma |
| 2026-01 | COP 2.318.324 | 149 | COP 15.559 | Todavía eficiente |
| 2026-02 | COP 2.764.156 | 5 | COP 552.831 | Ruptura fuerte de calidad/estructura/oferta |
| 2026-03 | COP 4.359.691 | 6 | COP 726.615 | Gasto alto con bajo retorno |
| 2026-04 | COP 4.023.361 | 13 | COP 309.489 | Mejora leve, aún débil |

Interpretación: algo cambió después de enero de 2026. La auditoría debe comparar estructura, creativos, landing, tracking y audiencias entre la etapa ganadora de noviembre-enero y el deterioro de febrero-abril.

### Mercados

| Mercado | Spend | Leads | CPL | Decisión |
| --- | ---: | ---: | ---: | --- |
| MX | COP 16.889.744 | 406 | COP 41.600 | Mercado base para piloto controlado |
| ES | COP 1.020.045 | 2 | COP 510.023 | No escalar; solo test con landing y tracking cerrados |
| AR | COP 503.195 | 0 | n/a | Hold hasta validar Search o retargeting |
| CO | COP 836.853 | 37 | COP 22.618 | Separar/excluir de estrategia internacional high-ticket |
| CL | COP 6.707 | 0 | n/a | Sin señal suficiente |
| US | COP 3.870 | 0 | n/a | Sin señal suficiente |
| BR | COP 0 | 0 | n/a | Sin histórico Meta; aprender primero en Search/landing |

### Placements

| Placement | Spend | Leads | CPL | Lectura |
| --- | ---: | ---: | ---: | --- |
| Facebook | COP 13.232.007 | 227 | COP 58.291 | Volumen, pero menor eficiencia plataforma |
| Instagram | COP 6.203.641 | 214 | COP 28.989 | Mejor CPL y mejor tasa LPV -> lead |
| Audience Network | COP 393.459 | 2 | COP 196.730 | Excluir en piloto de calidad |
| Threads | COP 49.358 | 2 | COP 24.679 | Señal pequeña; observar, no decidir |

Interpretación: para high-ticket, Audience Network no debe ser parte del primer piloto. Instagram merece prioridad creativa, pero validada por CRM.

### Edad/Género

Los segmentos 25-54 concentran el mejor balance de spend y leads. 18-24 puede generar leads baratos, pero no debe alimentar semillas high-ticket sin validación CRM. 55+ tiene engagement alto en algunos cortes, pero menor eficiencia de lead; mantener como observación si el ticket promedio lo justifica.

## Creativos Y Ofertas Que Sí Deben Minarse

Estos activos no se deben relanzar sin cambios, pero sí son la base para nuevos conceptos:

| Activo | Señal | Acción |
| --- | --- | --- |
| `AD_IMG_VIAJAR_CO_MX_2025_v1` | COP 1.290.890, 140 leads, CPL COP 9.221 | Rehacer como high-ticket/WAFlow con filtro de presupuesto |
| `AD_IMG_DESCUBRECOLOMBIA_ESCAPATEINVIERNO_CO_MX_2025_v1` | 119 leads en una variante, CPL COP 10.163 | Usar el insight estacional, no repetir variantes deterioradas |
| `AD_BOFU_BF_PACK12D_CO_MX_2025_v1 - Copia` | 63 leads, CPL COP 12.757 | Mantener paquete 12 días como ángulo BOFU |
| `BOFU - UGC Experiencias CO - Ad 1` | CTR 5,5%, 49 leads, CPL COP 14.204 | Priorizar UGC/testimonio como formato |
| `AD_VIDEO_TESTIMONIAL_EJECAFETERO_CAFEEXPERIENCE_CO_MX_2025_v1` | CTR 7,47%, 6 leads | Usar testimonio como prueba social, no como volumen principal |
| `AD_IMG_CARTAGENA_LUXURY_1240USD_MX_v1` | 3 leads con bajo gasto y precio claro | Probar price-anchor para filtrar low-quality |
| `AD_VID_MEDELLIN_LUXURY_1010USD_MX_v1` | CTR 8,86%, 1 lead con bajo gasto | Probar como creativo de descubrimiento con retargeting |

Oportunidad: los anuncios que incluyen destino, experiencia concreta, duración, precio o prueba social filtran mejor que promesas genéricas de "viajar a Colombia".

## Señales Que No Deben Usarse Como Verdad

| Señal | Riesgo | Decisión |
| --- | --- | --- |
| Leads nativos sin CRM | Meta aprende a conseguir formularios, no viajeros high-ticket | No usar como objetivo final |
| Campañas de recruiting/RRHH | Contaminan audiencias y lookalikes | Excluir de datasets |
| Tráfico local Colombia | Puede ser barato pero no representa comprador internacional | Separar o excluir |
| Awareness/tráfico con CTR alto y cero lead | Buen gancho creativo, mala señal de compra | Usar solo para inspiración creativa |
| Audience Network | Mucho clic/LPV, muy poca conversión | Excluir en piloto |
| AR histórico | Gasto con cero leads | Hold hasta tener mejor landing/Search signal |
| ES histórico | CPL muy alto | Solo test pequeño con ciudad y landing específica |

## Oportunidades De Data Histórica

### 1. Semillas CRM Limpias

Crear cuatro audiencias base, sin mezclar calidad:

- `CT_META_Qualified_Quotes_180_365d`: `crm_quote_sent`, oportunidad, booking, itinerario confirmado.
- `CT_META_Useful_WAFlow_180d`: `waflow_submit` + conversación útil o Chatwoot calificado.
- `CT_META_Engaged_No_Submit_30_90d`: landing views, WAFlow open, WhatsApp click sin submit.
- `CT_META_Exclude_LowQuality_365d`: recruiting, empleo, vuelos/hotel-only, CO local si no aplica, leads descartados por ventas.

Uso: la primera y segunda son seeds de lookalike/Advantage+ suggestions. La tercera es retargeting. La cuarta es exclusión.

### 2. Mining De Cambio Nov-Ene Vs Feb-Abr

Objetivo: encontrar qué variable rompió el rendimiento después de enero.

Comparar:

- Ad sets activos y cambios de audiencias.
- Creativos agregados o retirados.
- Landing URLs.
- Formularios usados.
- Optimización y conversion location.
- Placement expansion.
- UTMs.
- Cambios de presupuesto.

Resultado esperado: detectar si el deterioro vino por fatiga creativa, estructura, landing, tracking o ampliación de audiencia.

### 3. Retargeting De Alta Intención

Crear campaña nueva, pausada hasta aprobación, con públicos:

- Visitantes de landings ColombiaTours 30/60/90 días.
- WAFlow open sin submit.
- WhatsApp CTA click sin submit.
- Usuarios que vieron creativos UGC/testimonio al 50% o 75%.
- Excluir submitted/qualified recientes para no malgastar.

Oferta: "Diseñamos tu viaje privado a Colombia, con itinerario y asesor local. Paquetes desde USD 1.000+ por persona, sin vuelos sueltos".

### 4. Reconstrucción Prospecting México

México es la única base con señal suficiente. La reconstrucción no debe copiar la campaña vieja; debe usar:

- Geos: Ciudad de México y Monterrey como prioridad.
- Ubicación: personas presentes en la ciudad/mercado permitido.
- Formato: UGC/testimonio + carrusel de itinerarios + price-anchor.
- Landing: `/paquetes-colombia-desde-mexico`.
- Optimización inicial: `waflow_submit` o evento equivalente si volumen permite; si no, `waflow_open` solo como temporal y con evaluación CRM.
- Exclusiones: low-quality leads, recruiting, empleados/travel planners, CO local, viajeros solo-vuelo/hotel si detectables.

### 5. Audiencias Lookalike/Advantage+ Con Semillas Correctas

No crear lookalike de todos los leads. Crear cuando exista volumen mínimo de calidad:

- Seed 1: personas con `crm_quote_sent` o oportunidad.
- Seed 2: bookings/itinerarios confirmados con valor.
- Seed 3: WAFlow submit + Chatwoot qualified.

Si el volumen es bajo, usar estas listas como audience suggestions en Advantage+ Audience y mantener controles estrictos de ciudad/país, idioma y edad.

### 6. Matriz Creativa Por Intención

| Etapa | Objetivo | Creativo | CTA |
| --- | --- | --- | --- |
| Cold high-ticket | Despertar deseo y filtrar presupuesto | Colombia privada 8-12 días, precio desde, destinos icónicos | Ver itinerario |
| Warm intent | Probar confianza | Testimonio, UGC, planner local, casos reales | Diseñar mi viaje |
| BOFU | Capturar oportunidad | Paquete Cartagena/Medellín/Eje, cupos/temporada, asesor local | Cotizar por WhatsApp |
| Retargeting | Recuperar indecisos | "Ya tienes fechas/destinos? armamos ruta privada" | Hablar con experto |

## Diseño De Piloto Recomendado

### Fase 0: Preparación Sin Pauta

- Confirmar CAPI para `waflow_submit`, `crm_lead_stage_qualified`, `crm_quote_sent`, oportunidad e itinerario confirmado.
- Confirmar deduplicación browser/server con `event_id`.
- Subir/normalizar audiencias CRM con permisos y hash correcto.
- Estándar UTM: `utm_source=meta`, `utm_medium=paid_social`, `utm_campaign`, `utm_content`, `utm_term`.
- Confirmar que `reference_code`, `fbclid`, `fbc`, `fbp` y `ctwa` sobreviven desde landing hasta CRM.

### Fase 1: Retargeting High-Intent

- Campaña: `META_RT_Colombia_HighIntent_2026_06_NEXT`.
- Estado futuro: `PAUSED` hasta aprobación.
- Objetivo: Leads/Website o WhatsApp/Website según implementación.
- Público: visitantes landing, WAFlow open, WhatsApp click, video viewers cualificados.
- Exclusiones: leads recientes, CRM descartados, recruiting/RRHH.
- Presupuesto sugerido: COP 20.000-30.000/día.
- Gate: mantener solo si genera `waflow_submit` + conversación útil o CRM stage.

### Fase 2: Prospecting México City-Gated

- Campaña: `META_MX_SearchLift_Colombia_HighTicket_2026_06_NEXT`.
- Estado futuro: `PAUSED` hasta aprobación.
- Geos: Ciudad de México y Monterrey.
- Audiencia: broad/Advantage+ con seed suggestions de CRM, sin intereses excesivos.
- Placement: excluir Audience Network en piloto inicial por historial de baja calidad.
- Presupuesto sugerido: COP 40.000-60.000/día.
- Creativos: UGC experiencias, paquete 12 días, price-anchor Cartagena/Medellín/Eje.
- Landing: `/paquetes-colombia-desde-mexico`.

### Fase 3: ES/CL Solo Después De Señal

- ES: Madrid/Barcelona solo si landing España y CAPI están cerrados.
- CL: Santiago solo si landing Chile y Search/CRM muestran intención.
- AR: no activar Meta prospecting hasta que Search valide calidad.
- BR: no lanzar Meta frío hasta tener señal Search/landing en portugués.

## Reglas De Decisión

- No escalar por CPL plataforma.
- Mantener si hay `waflow_submit` y al menos una conversación útil.
- Escalar solo con `crm_lead_stage_qualified`, `crm_quote_sent` u oportunidad atribuible a Meta.
- Pausar si COP 300.000 de spend no produce ningún `waflow_submit`.
- Pausar si más del 25% de leads son vuelos, empleo, hotel-only, Colombia local no objetivo o consultas sin presupuesto.
- No hacer cambios grandes durante los primeros 7 días de aprendizaje salvo tracking roto, landing equivocada u oferta incorrecta.
- Si se aumenta presupuesto, hacerlo gradualmente y con una sola variable por cambio.

## Checklist Antes De Activar Meta

- `fbc` y `fbp` capturados en landing y persistidos al CRM.
- `reference_code` único por sesión/lead.
- UTMs de campaña, ad set y ad consistentes.
- CAPI server events con `event_id` único.
- Event Match Quality objetivo: 6+ como mínimo operativo.
- Browser + Server para eventos principales.
- Audiencias de exclusión cargadas.
- Recruiting y leads malos excluidos de seeds.
- Landing con precio/paquete/asesor local/WhatsApp/WAFlow.
- Dashboard de ventas preparado para marcar útil/no útil.

## Conclusión

La inversión histórica no está perdida. Se puede minar para tres cosas de alto valor:

1. Creativos y ofertas que sí generaron intención: México, UGC, paquetes 12 días, price anchors, destinos concretos.
2. Audiencias first-party: retargeting de alta intención, exclusiones de baja calidad y seeds CRM para futuros lookalikes.
3. Diagnóstico de estructura: el deterioro de febrero-abril indica que no hay que copiar la campaña antigua, sino reconstruir con medición de calidad.

La recomendación es no activar Meta en escala amplia. El siguiente movimiento correcto es preparar audiencias/CAPI y lanzar un piloto pequeño de retargeting + México city-gated, con gates de CRM. Meta puede funcionar para high-ticket, pero solo si el algoritmo recibe señales de calidad comercial y la creatividad filtra desde el anuncio.

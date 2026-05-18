# SPEC: Human-Agent Experience & GUI Foundation

> **Status**: Draft v1
> **Fecha**: 2026-05-18
> **Owner**: Bukeer Platform + Product Design
> **Epic relacionada**: `weppa-cloud/bukeer-flutter#823`
> **Fase**: 0.25, antes de `AdminShell` definitivo
> **Repo destino**: `weppa-cloud/bukeer-studio`

---

## 1. Resumen

La migracion de Bukeer Admin de Flutter Web a Next.js no debe producir una copia 1:1 de pantallas. Esta fase define el fundamento visual y operativo para que Bukeer sea un sistema de gestion de viajes humano-agente: humanos operan, deciden y corrigen; agentes AI proponen, preparan borradores, explican, se bloquean cuando corresponde y dejan trazas auditables.

v0 se usara como herramienta de exploracion GUI/UX, no como autoridad de arquitectura. Los outputs de v0 deben convertirse en especificaciones, componentes y criterios de aceptacion antes de construir pantallas definitivas.

Decision 2026-05-18: la Fase 0.25B se ejecuta como **Design Lock Code-First**. La fuente de verdad no es un archivo Figma obligatorio, sino la combinacion de registry v0, tokens Bukeer, contratos de componentes Next y prototype readiness. Figma queda como soporte opcional para revision visual o comentarios externos.

## 2. Investigacion y seniales usadas

Esta fase toma como input tendencias y patrones de lideres de AI/producto:

- OpenAI: agentes como combinacion de modelo, tools e instrucciones; guardrails, evaluacion y human intervention como parte de produccion, no como extra.
- OpenAI Agents SDK HITL: las tools sensibles pueden pausar ejecucion hasta aprobacion/rechazo humano y pueden reanudarse manteniendo estado.
- Anthropic: preferir patrones simples y herramientas bien disenadas antes de orquestaciones complejas; elegir single-agent, workflows o multi-agent segun valor y complejidad.
- Google PAIR: disenar sistemas AI desde la participacion, explicabilidad, utilidad, confianza y mental models humanos.
- Vercel v0: usar prompt-to-UI para acelerar exploracion visual con React/Tailwind/shadcn, manteniendo revision humana, permisos y contratos fuera del generador.
- v0 design systems: los mejores resultados requieren tokens, componentes y registry propios; no solo prompts escritos.

Fuentes base:

- https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
- https://openai.github.io/openai-agents-python/human_in_the_loop/
- https://resources.anthropic.com/building-effective-ai-agents
- https://pair.withgoogle.com/
- https://v0.app/docs/api

## 3. Usuarios objetivo

### Travel agent / planner

Necesita responder rapido, entender al viajero, cotizar, armar itinerarios, pedir datos faltantes, controlar margen y enviar propuestas sin perder contexto.

### Agency manager

Necesita visibilidad operativa: leads, conversaciones, conversion, margen, productividad, riesgo, aprobaciones pendientes y salud de agentes AI.

### Admin / platform operator

Necesita permisos, auditoria, rollback, tenant isolation, impersonacion segura, flags y controles de autonomia.

### Beta partner

Necesita entender que el cambio no es solo una interfaz nueva: Bukeer pasa de "software donde registro cosas" a "sistema operativo de agencia donde humanos y agentes colaboran bajo control".

## 4. Principios de experiencia

1. **Humano en control**: la IA no oculta decisiones sensibles ni ejecuta acciones criticas sin aprobacion cuando el dominio lo requiere.
2. **Propuesta antes que accion**: la IA prepara borradores, comparaciones, replies, itinerarios o cambios, y el humano acepta, edita o rechaza.
3. **Trazabilidad visible**: cada sugerencia muestra fuente, razon, confianza, datos usados, riesgos y accion requerida.
4. **Densidad operativa**: la UI debe servir para agencias reales, con tablas, paneles, filtros, atajos y escaneo rapido.
5. **No marketing interno**: evitar heroes, slogans, dashboards genericos y composiciones tipo landing page.
6. **Estados AI explicitos**: normal, loading, empty, error, no permission, AI suggestion, AI blocked, approval required.
7. **Permisos primero**: si el usuario no puede ejecutar una accion, la UI debe explicarlo y ofrecer rutas permitidas.
8. **Correccion como flujo normal**: el usuario puede editar la propuesta de la IA, explicar por que falla y guardar feedback para BukeerBench.
9. **Autonomia gradual**: A0 read-only y A1 suggest primero; A2 draft por flag; A3 confirmed write solo con aprobacion y trazas.
10. **Consistencia cross-surface**: el mismo vocabulario y estados deben aparecer en planner, conversaciones, itinerarios, reportes y control plane.

## 5. Journey norte

Steel thread prioritario:

1. Lead entra por website/WhatsApp/campana.
2. Conversacion se abre con contexto del viajero, origen y ultimas interacciones.
3. AI sugiere calificacion, resumen, datos faltantes y respuesta.
4. Planner revisa, ajusta y envia respuesta humana.
5. AI crea borrador de itinerario con productos candidatos, restricciones y supuestos.
6. Planner compara opciones, ajusta fechas/proveedores/margen.
7. Pricing guard detecta riesgos de margen o politicas.
8. Accion sensible pasa a approval required si aplica.
9. Propuesta queda lista para enviar con audit trail.
10. Manager puede ver trazas, aprobaciones, tiempos y conversion.

## 6. Ontologia B1 para beta partners

La Ontologia B1 es el lenguaje comun de Bukeer para que humanos, UI, servicios y agentes hablen de las mismas entidades. No es una pantalla ni un chatbot: es el mapa de conceptos que evita que cada modulo entienda "cliente", "viajero", "cotizacion" o "reserva" de forma distinta.

Entidades iniciales:

- Lead
- Traveler
- Contact
- Agency
- Agent
- Conversation
- Itinerary
- Quote
- Offer
- Order
- Booking
- Supplier
- Product
- Rate
- Availability
- Policy
- Payment
- Voucher
- Media Asset
- Campaign
- Work Item

Beneficios esperados:

- Menos duplicidad entre CRM, itinerarios, productos, finanzas y website.
- Agentes AI con contexto gobernado y no con dumps libres.
- Mejor trazabilidad: se sabe que entidad toco cada sugerencia o accion.
- Mejores evals: BukeerBench puede probar workflows completos con fixtures.
- Mejor explicacion para beta partners: el sistema aprende el negocio de viajes con un vocabulario estable.

Retos:

- Alinear nombres historicos de Flutter, Supabase y Studio.
- Decidir ownership de entidades ambiguas como quote/order/booking.
- Evitar sobre-modelar antes de validar workflows reales.
- Mantener compatibilidad mientras Flutter y Next conviven.

## 7. Arquitectura de informacion destino

Primer nivel:

- Apps / Launcher
- Dashboard operacional
- Planner Workbench
- Conversaciones
- Itinerarios
- Contactos
- Productos y catalogo
- Package kits
- Website Studio
- Reportes
- Manager Control Plane
- Platform Admin
- Agent Control / Audit

Regla: el Planner Workbench es la primera experiencia prioritaria porque concentra el cambio de paradigma humano-agente.

## 8. Fundamento GUI Code-First

Componentes obligatorios para explorar en Fase 0.25:

- Bukeer signature tokens: morado como identidad estructural, teal para estado live/realtime y naranja para human-in-the-loop/aprobacion.
- Bukeer v0/shadcn registry: componentes de dominio como `TripRail`, `PlanningCanvas`, `LiveFeedColumn`, `TraceNode`, `ApprovalCommandBar` y `MarginGuard`.
- Design System Lock Code-First: tokens, component contracts, responsive rules and agentic states must be sufficient for engineering to start a Next prototype without waiting on Figma.
- Admin shell: sidebar, topbar, account switcher, global search/command palette, status strip.
- Workbench layout: inbox/context left rail, main workspace, AI copilot/right rail, trace drawer.
- Dense data tables: filtros persistentes, columnas configurables, bulk actions, estados de permisos.
- Detail pages: summary header, tabs, activity/audit timeline, side panels.
- Approval cards: accion propuesta, impacto, datos usados, riesgo, approve/edit/reject.
- AI suggestion cards: rationale, confidence, sources, missing data, edit before apply.
- Blocked state: policy reason, permission reason, escalation path.
- Trace timeline: prompt/context/tool/result/approval/outcome sin exponer secretos.
- Manager control widgets: queue, SLA, conversion, margin risk, agent performance, approval backlog.

## 9. Estados obligatorios

Cada concepto de v0 debe incluir:

| Estado | Que debe comunicar |
|---|---|
| Normal | Operacion diaria con datos realistas |
| Loading | Carga de datos, tool call o generacion AI |
| Empty | No hay items, con siguiente accion permitida |
| Error | Error tecnico o de validacion con retry/diagnostico |
| No permission | Permiso faltante y owner/escalacion |
| AI suggestion | Propuesta editable con razon y fuentes |
| AI blocked | Politica, datos insuficientes o riesgo |
| Approval required | Accion detenida hasta decision humana |

## 10. Direccion visual

Debe sentirse:

- Profesional, calmada, densa y utilitaria.
- Para trabajo repetido de agencia, no para demo comercial.
- Con contraste, jerarquia clara, tablas legibles y paneles compactos.
- Con iconografia lucide para acciones y estados.
- Con cards de radio <= 8px salvo convencion existente.

Debe evitar:

- Hero sections.
- Ilustraciones decorativas.
- Gradientes dominantes.
- Paleta de un solo color.
- Dashboards SaaS genericos con metric cards sin contexto.
- Texto visible explicando como usar la app.
- Acciones AI sin audit/approval/blocked states.

## 11. Handoff para UI designer y engineering

El UI designer debe trabajar contra el Design Lock Code-First. Su entrega debe ser implementable por engineering, no solo visual.

Entregables obligatorios:

- Direccion visual principal y alternativa.
- Token proposal: color roles, surfaces, text, borders, focus, statuses y agentic states.
- Component inventory y variantes.
- Layout specs para desktop y responsive basico.
- Flujos principales: Planner Workbench, Conversation Copilot, Itinerary Builder, Manager Control Plane.
- Estado por flujo: normal/loading/empty/error/no permission/AI suggestion/AI blocked/approval required.
- Approval pattern y trace pattern.
- Redlines o medidas para componentes criticos cuando el contrato de componentes no sea suficiente.
- Reglas de accesibilidad: focus, labels, keyboard, contrast, dialogs.
- Ajustes concretos sobre registry/v0 outputs o componentes Next, expresados como tokens, variantes, props o reglas responsive.

Figma es opcional:

- Se usa si beta partners, stakeholders o UI designer necesitan un espacio comentable.
- No bloquea Sprint 0.25C si tokens, registry, contrato y prototype readiness estan aprobados.
- Si Figma contradice `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`, el design lock code-first gana salvo decision explicita de producto/diseno.

## 12. Prompt pack v0

Ubicacion:

`docs/design/human-agent-v0/`

Prompts:

1. `01_human_agent_design_system.md`
2. `02_admin_shell.md`
3. `03_planner_workbench.md`
4. `04_conversation_copilot.md`
5. `05_itinerary_builder.md`
6. `06_manager_control_plane.md`
7. `07_agent_trace_approval_ui.md`

Runs creados:

- `docs/design/human-agent-v0/SIGNATURE_VISUAL_DIRECTION_2026-05-18.md`
- `docs/design/human-agent-v0/V0_SIGNATURE_PROMPTING_GUIDE_2026-05-18.md`
- `docs/design/human-agent-v0/BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
- `docs/design/human-agent-v0/V0_DESIGN_SYSTEM_REGISTRY_PLAN_2026-05-18.md`
- `docs/design/human-agent-v0/V0_REGISTRY_USAGE_GUIDE_2026-05-18.md`
- `docs/design/human-agent-v0/V0_MAX_QUALITY_PLAYBOOK_2026-05-18.md`
- `docs/design/human-agent-v0/VISUAL_QA_RUBRIC_2026-05-18.md`
- `docs/design/human-agent-v0/EVALUATION_SIGNATURE_V2_2026-05-18.md`
- `docs/design/human-agent-v0/EXPERT_UX_UI_AUDIT_2026-05-18.md`
- `docs/design/human-agent-v0/DESIGN_REVISION_BACKLOG_2026-05-18.md`
- `docs/design/human-agent-v0/AGENTIC_UI_STATE_MODEL_2026-05-18.md`
- `docs/design/human-agent-v0/APPROVAL_PACKET_AND_LONG_SPRINT_2026-05-18.md`
- `docs/design/human-agent-v0/SPRINT_0_25B_PLAN_2026-05-18.md`
- `docs/design/human-agent-v0/DESIGN_LOCK_CODE_FIRST_2026-05-18.md`
- `docs/design/human-agent-v0/FIGMA_FOUNDATION_BRIEF_2026-05-18.md` (optional support artifact, not the canonical gate)
- `docs/design/human-agent-v0/BETA_PLANNER_WORKBENCH_REVIEW_SCRIPT_2026-05-18.md`
- `docs/design/human-agent-v0/registry/README.md`
- `docs/design/human-agent-v0/registry-dist/registry.json`
- `public/r/bukeer-admin-next/registry.json`
- `docs/design/human-agent-v0/V0_RUNS.md`
- `docs/design/human-agent-v0/EVALUATION_2026-05-18.md`
- `docs/design/human-agent-v0/UI_DESIGNER_BRIEF_2026-05-18.md`
- `docs/design/human-agent-v0/BETA_PARTNER_BRIEF_2026-05-18.md`
- `docs/design/human-agent-v0/NEXT_COMPONENT_CONTRACT_2026-05-18.md`
- `docs/design/human-agent-v0/08_signature_planner_workbench_v2.md`
- `docs/design/human-agent-v0/09_signature_conversation_copilot_v2.md`
- `docs/design/human-agent-v0/10_signature_itinerary_builder_v2.md`
- `docs/design/human-agent-v0/11_signature_trace_approval_v2.md`
- `docs/design/human-agent-v0/12_registry_planner_workbench_v3.md`
- `docs/design/human-agent-v0/13_registry_conversation_copilot_v3.md`
- `docs/design/human-agent-v0/14_registry_trace_approval_v3.md`
- `docs/design/human-agent-v0/15_itinerary_manifest_v3.md`

Uso:

1. Ejecutar cada prompt en v0.
2. Pedir React + Tailwind + shadcn/Radix.
3. Exportar o copiar el resultado a una rama de exploracion, no a produccion.
4. Evaluar con checklist.
5. Seleccionar 1 direccion principal y 1 alternativa.
6. Convertir en especificacion implementable antes de tocar componentes reales.

## 13. Checklist de evaluacion

- El humano entiende que propone la IA.
- Se ve que accion requiere aprobacion.
- La razon/fuente/confianza de la sugerencia es visible.
- Hay traza de contexto, tools, resultados y decision humana.
- Se puede operar rapido con tablas/paneles/atajos.
- No hay automatizacion peligrosa.
- El layout sirve para una agencia real.
- No parece landing, demo marketing ni dashboard generico.
- Se muestra no permission y AI blocked de forma accionable.
- El responsive basico no rompe informacion critica.
- Los estados de error/loading/empty no son decorativos.
- Los controles destructivos tienen confirmacion o rollback.

## 14. Criterios de aceptacion de Fase 0.25

- La spec queda referenciada desde la epic #823.
- El prompt pack existe y es usable manualmente en v0.dev o via API si el plan lo permite.
- Cada output cubre los 8 estados obligatorios.
- Planner Workbench queda como primera experiencia a prototipar.
- El equipo selecciona direccion principal + alternativa.
- El equipo rechaza outputs genericos y documenta por que.
- Los outputs visuales pasan `VISUAL_QA_RUBRIC_2026-05-18.md` y usan `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`.
- El registry plan queda aprobado antes de convertir conceptos en componentes productivos.
- El Design Lock Code-First queda aprobado antes de iniciar Sprint 0.25C.
- Figma no es requisito de implementacion si el registry, tokens y component contract estan aprobados.
- No se implementa `AdminShell` final sin aprobacion de GUI foundation.
- Ninguna decision de arquitectura se delega a v0.

## 15. Issues GitHub

- #825: Fase 0.25: Human-Agent UX Strategy y GUI Foundation.
- #826: Fase 0.25: Evaluar outputs v0 y seleccionar direccion visual.
- #827: Fase 0.25: Planner Workbench prototype y beta review.
- #828: Fase 0.25: Agent Trace & Approval UI pattern.
- #829: Fase 0.25: Publicar y validar Bukeer v0 registry.
- #830: Fase 0.25: Design System Lock Code-First desde Signature V3.
- #831: Fase 0.25: Beta review de Planner Workbench con agencias.
- #832: Fase 0.25: Definir Agentic UI State Model y contrato de estados.
- #833: Fase 0.25: Ejecutar v0 V3 registry-backed revision pack.
- #834: Fase 0.25: Rebuild Itinerary Builder como Itinerary Manifest.

## 16. Implementacion code-first actual

Decision 2026-05-18: la primera pantalla implementable no debe heredar el shell visual de Bukeer Studio. Bukeer Studio sigue siendo el producto de websites/editor; Bukeer Admin Next debe sentirse como un ERP operativo de viajes con agentes, aprobaciones y trazabilidad.

Ruta de prototipo:

- `/admin/prototype/planner-workbench`

Componentes fuente de verdad para el lock visual:

- `components/admin-next/signature-ui.tsx`
- `components/admin-next/planner-workbench-prototype.tsx`
- `app/globals.css` variables `--bukeer-structural`, `--bukeer-live`, `--bukeer-human-loop`, `--bukeer-success`, `--bukeer-warning`, `--bukeer-surface-rail`

Reglas de continuidad:

- `planner-workbench-prototype.tsx` debe quedar como composicion y estado local, no como biblioteca visual monolitica.
- `signature-ui.tsx` es el contrato code-first para extraer variantes y conectar datos read-only.
- No se debe volver a montar `AdminShell` generico de Studio como shell visual principal de Bukeer Admin Next.
- Los componentes Signature deben conservar dominio visible de viajes: itinerario, proveedor, margen, datos faltantes, aprobacion, traza y sugerencia AI.
- Cualquier futura pantalla admin debe usar estados agentic explicitos y trazabilidad antes de permitir writes.

## 17. Sprint 0.25D recomendado

Nombre: **Read-Only Agentic Admin Foundation**.

Objetivo: conectar la direction Signature a datos reales de lectura sin writes, manteniendo el prototipo protegido y auditable.

Entregables:

- Travel Ontology v1 aplicada a datos de planner.
- Domain Tool Registry inicial en modo read-only.
- Queries server-side para oportunidades, itinerarios, proveedores y trazas.
- Normalizacion de fixtures contra datos reales.
- Modelo AgentRun / ToolInvocation / Approval ledger definido antes de ejecutar writes.
- AdminShell Signature separado del shell de Studio.
- Planner Workbench navegable con datos reales read-only.

Criterio de salida:

- La UI mantiene identidad Bukeer y densidad operativa al reemplazar fixtures por datos reales.
- No hay writes Supabase ni ejecuciones de tools desde la ruta.
- Toda sugerencia o bloqueo tiene trace visible.
- Toda accion sensible muestra impacto, riesgo, permiso requerido y estado humano.

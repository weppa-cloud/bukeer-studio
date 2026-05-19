# v0 Prompt Pack: Human-Agent UX Foundation

Este directorio contiene prompts, registry, evaluaciones y contratos para cerrar la GUI/UX humano-agente del admin Next de Bukeer. La meta es explorar y bloquear direccion visual desde v0, tokens y componentes implementables; no definir arquitectura ni contratos de dominio.

## Decision vigente

Sprint 0.25B usa un flujo **Design Lock Code-First**:

1. v0 genera o refina conceptos desde el registry Bukeer.
2. El equipo rechaza outputs genericos.
3. Se selecciona direccion principal + alternativa.
4. Se bloquean tokens, variantes, estados y contratos de componentes.
5. Sprint 0.25C puede iniciar un prototype Next sin esperar un Figma completo.
6. La direccion aprobada avanza a Sprint 0.25D para conectar contratos, registry read-only y trazabilidad sin writes reales.

Figma queda como soporte opcional para comentarios visuales o beta review, no como fuente canonica ni bloqueo de implementacion.

Decision 2026-05-18: **Bukeer Signature Planner Workbench** queda aprobado como direccion principal. El panel de gobierno aprobado es **Trace Inspector** lateral tokenizado, con light/dark mode, no un modal generico.

## Orden recomendado

1. `01_human_agent_design_system.md`
2. `02_admin_shell.md`
3. `03_planner_workbench.md`
4. `04_conversation_copilot.md`
5. `05_itinerary_builder.md`
6. `06_manager_control_plane.md`
7. `07_agent_trace_approval_ui.md`

## Reglas para evaluar outputs

- Deben ser React + Tailwind + shadcn/Radix.
- Desktop first con responsive basico.
- Operacion densa y escaneable, no landing page.
- Usar datos realistas de agencia de viajes.
- Mostrar estos estados: normal, loading, empty, error, no permission, AI suggestion, AI blocked, approval required.
- Explicar visualmente que propone la IA, por que, con que datos, que riesgo tiene y que necesita del humano.
- Rechazar outputs que parezcan dashboard SaaS generico, marketing o demo superficial.

## Flujo de trabajo

1. Inicializar v0 con Project/registry/files-first cuando sea posible.
2. Guardar screenshots y codigo generado en una rama/proyecto de exploracion.
3. Evaluar contra el checklist de `SPEC_HUMAN_AGENT_EXPERIENCE_GUI_FOUNDATION.md`.
4. Seleccionar 1 direccion principal y 1 alternativa.
5. Convertir el resultado elegido en `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`, tokens y `NEXT_COMPONENT_CONTRACT_2026-05-18.md`.
6. Usar Figma solo si hace falta un board comentable para beta partners o UI designer.

## Runs creados

Los chats iniciales creados via API estan documentados en `V0_RUNS.md`.

La primera evaluacion visual esta en `EVALUATION_2026-05-18.md`.

Briefs de handoff:

- `SIGNATURE_VISUAL_DIRECTION_2026-05-18.md`
- `V0_SIGNATURE_PROMPTING_GUIDE_2026-05-18.md`
- `BUKEER_SIGNATURE_TOKENS_2026-05-18.md`
- `V0_DESIGN_SYSTEM_REGISTRY_PLAN_2026-05-18.md`
- `V0_REGISTRY_USAGE_GUIDE_2026-05-18.md`
- `V0_MAX_QUALITY_PLAYBOOK_2026-05-18.md`
- `VISUAL_QA_RUBRIC_2026-05-18.md`
- `EVALUATION_SIGNATURE_V2_2026-05-18.md`
- `EXPERT_UX_UI_AUDIT_2026-05-18.md`
- `DESIGN_REVISION_BACKLOG_2026-05-18.md`
- `AGENTIC_UI_STATE_MODEL_2026-05-18.md`
- `DESIGN_LOCK_CODE_FIRST_2026-05-18.md`
- `APPROVAL_PACKET_AND_LONG_SPRINT_2026-05-18.md`
- `SPRINT_0_25B_PLAN_2026-05-18.md`
- `SPRINT_0_25D_PLAN_2026-05-18.md`
- `UI_DESIGNER_BRIEF_2026-05-18.md`
- `BETA_PARTNER_BRIEF_2026-05-18.md`
- `NEXT_COMPONENT_CONTRACT_2026-05-18.md`
- `FIGMA_FOUNDATION_BRIEF_2026-05-18.md`
- `BETA_PLANNER_WORKBENCH_REVIEW_SCRIPT_2026-05-18.md`
- `registry/README.md`
- `registry-dist/registry.json`
- `public/r/bukeer-admin-next/registry.json`
- `08_signature_planner_workbench_v2.md`
- `09_signature_conversation_copilot_v2.md`
- `10_signature_itinerary_builder_v2.md`
- `11_signature_trace_approval_v2.md`
- `12_registry_planner_workbench_v3.md`
- `13_registry_conversation_copilot_v3.md`
- `14_registry_trace_approval_v3.md`
- `15_itinerary_manifest_v3.md`

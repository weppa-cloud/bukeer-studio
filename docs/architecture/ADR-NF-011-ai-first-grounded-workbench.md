# ADR-NF-011 — AI-First Workbench Must Be Grounded and Auditable

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-006]], [[ADR-NF-003]], [[ADR-NF-007]]

## Context

The Evolucion shell includes a contextual AI panel and agent trace surfaces. AI output must be useful without inventing hidden state or bypassing governance.

## Decision

AI in Bukeer Next is grounded in the current module/entity context and produces auditable suggestions.

1. Suggestions cite trace ids, data used and confidence where applicable.
2. The contextual panel reads URL/module/entity state.
3. Hidden chain-of-thought is not exposed; evidence and tool results are.
4. AI output cannot execute production actions without the human approval boundary.

## Consequences

- Agents and humans can inspect why a suggestion exists.
- Workbench context is reproducible through URLs and trace ids.
- AI UI can expand without weakening operational controls.

## Verification

- Trace drawer/component tests for evidence visibility.
- Route tests before any AI-backed write endpoint ships.


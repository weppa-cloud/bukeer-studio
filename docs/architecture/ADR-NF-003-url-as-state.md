# ADR-NF-003 — URL as Durable Workspace State

**Status:** Accepted  
**Date:** 2026-06-11  
**Scope:** Bukeer Next Evolucion, Fase 0 (#613)  
**Related:** [[ADR-004]], [[ADR-009]], [[ADR-NF-011]]

## Context

Agents and humans will resume long implementation and review sessions. Hidden client state makes handoff fragile, especially for workbench module, selected entity, filters, tabs, drawer state and future AI context.

## Decision

Durable workspace state belongs in the URL when it affects navigation, collaboration or reproducible evidence.

1. Module, entity id, active tab, search/filter and selected panel state use path or query params.
2. Ephemeral UI state such as hover, transient loading and animation stays local.
3. Deep links must restore the same primary workbench context after refresh.
4. Agent evidence should cite URLs that reproduce the reviewed state.

## Consequences

- QA and GitHub evidence can link to reproducible views.
- Browser history works naturally for operators.
- Components need explicit mapping between URL state and view models.

## Verification

- Playwright smokes for deep links as modules leave prototype state.
- Page tests for invalid or unauthorized URL state.


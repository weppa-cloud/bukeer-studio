# Auditoría: `seo-content-workflow` skill

**Fecha:** 2026-05-12
**Comparado contra:** Hermes skills (subagent-driven-development, writing-plans), Google EEAT, industry best practices

---

## 1. Estructura del Skill vs Estándar Hermes

### ✅ Fortalezas

| Dimensión | Skill nuestro | Referencia Hermes | Veredicto |
|-----------|--------------|-------------------|-----------|
| Frontmatter completo | ✅ name, description, tags | ✅ writing-plans | 🟢 Igual |
| Filosofía clara | ✅ "Colombia como la cuenta quien la camina" | ✅ "A good plan makes implementation obvious" | 🟢 Mejor (tiene identidad) |
| Pipeline visual | ✅ Diagrama de flujo de 7 fases | ✅ writing-plans tiene rollout variant | 🟢 Bien |
| Phase gates | ✅ Gate de entrada en Fase 3 (solo editar si tiene tráfico) | ❌ No tiene gates explícitos | 🟢 SUPERIOR |
| Anti-patrones | ✅ Tabla completa NO HACER | ❌ writing-plans tiene "Common Mistakes" | 🟢 Más completo |
| Tools integration | ✅ Comandos reales de DataForSEO, MCPs | ❌ No incluye tool examples | 🟢 Mejor |
| Checklists | ✅ Checklist por fase (edición, investigación, EEAT, SEO) | ❌ No tiene checklists | 🟢 Más accionable |

### ❌ Debilidades Detectadas

| Dimensión | Problema | Referencia Hermes | Mejora Necesaria |
|-----------|----------|-------------------|------------------|
| **Task granularity** | Las fases son grandes, no hay tareas atómicas | writing-plans: "cada tarea 2-5 min" | Falta desglosar fases en tareas ejecutables |
| **Verification commands** | No hay comandos exactos con output esperado | writing-plans: "Run: pytest..., Expected: PASS" | Falta: "qué output esperar" en cada paso |
| **Red flags** | No hay sección de "nunca hagas esto" dentro de cada fase | subagent-driven-dev tiene red flags section | Falta red flags por fase |
| **Execution handoff** | No dice "cómo ejecutar esto" | writing-plans: "Ready to execute using subagent-driven-development" | Falta handoff claro |
| **Quality gates** | No hay puntuación de salida por fase | subagent-driven-dev tiene 2-stage review | Falta "cómo sé que esta fase está bien hecha" |
| **Trigger conditions** | No dice cuándo cargar este skill | writing-plans tiene trigger conditions | Falta: "cargar cuando el usuario diga X" |
| **Dependencies per phase** | Las dependencias están al final, no por fase | subagent-driven-dev: dependencias en cada task | Falta dependencias por fase individual |
| **Rollback plan** | No hay plan de "si esto falla" | ❌ Ningún skill lo tiene | 🟡 Opcional pero valioso |

---

## 2. Cobertura EEAT vs Google Standards

| Google EEAT | Nuestro skill | Gap |
|-------------|---------------|-----|
| **Experience** | ✅ Checklist en Fase 3: "refleja haber estado?" | 🟢 Bien |
| **Expertise** | ✅ Autor con bio, fuentes locales | 🟢 Bien |
| **Authoritativeness** | ✅ Enlaces internos, menciones operador | 🟢 Bien |
| **Trustworthiness** | ✅ Contacto, políticas, testimonios | 🟢 Bien |
| **Content freshness** | ✅ Fase 2B: fuentes últimos 6 meses | 🟢 Bien |
| **Original research** | ✅ Fase 2B: datos propios, ángulo único | 🟢 Bien |
| **Comprehensive coverage** | ❌ No hay "content hub" mapping explícito | 🟡 Falta agrupar en clusters/pillars |
| **Author entity** | ❌ Menciona "autor" pero no structured data de author | 🔴 Google premia author markup |

---

## 3. Brechas de Industria (vs investigación previa)

| Mejores prácticas investigadas | Nuestro skill | Gap |
|-------------------------------|---------------|-----|
| Keyword clustering | ✅ Sí, 8 clusters definidos | 🟢 |
| SERP intent analysis | ✅ INFORMATIONAL/COMMERCIAL/TRANSACTIONAL | 🟢 |
| Internal linking strategy | ✅ Mínimo 3 enlaces | 🟢 |
| Content hub architecture | ❌ No hay modelo pillar-cluster | 🟡 Añadir |
| Author schema markup | ❌ No implementado | 🔴 Añadir |
| Video content strategy | ❌ No menciona video/YouTube como formato | 🟡 Opcional |
| Competitor content audit | ✅ Fase 0: gap analysis matrix | 🟢 |
| EEAT signals automation | ❌ No hay template de author bio/structured data | 🟡 Añadir template |
| AI detection avoidance | ✅ Anti-patrones documentados | 🟢 |
| Post-publish iteration | ✅ Día 30 re-optimización | 🟢 |

---

## 4. Nota Final: 8/10

✅ **Lo mejor del skill:**
- Pipeline completo de 7 fases (competencia → research → brief → editar → crear → transcrear → medir)
- Investigación transversal con AI (Fase 2B es lo más diferencial)
- Anti-patrones documentados en cada fase
- Integración con herramientas reales (DataForSEO, MCPs)
- Checklist EEAT exhaustivo

❌ **Lo que hay que mejorar:**
- **Faltan tareas atómicas ejecutables** (no solo fases, sino pasos concretos)
- **Falta structured data de author** (Google premia Author markup)
- **Falta modelo pillar-cluster** (content hub architecture)
- **Faltan comandos exactos con output esperado** (cómo verificar cada paso)
- **Faltan trigger conditions** (cuándo cargar este skill)

# Debugger — Pre-Commit Checklist

Complete this checklist before committing any bug fix.

---

## Evidence

- [ ] Bug reproduced before fix (screenshot or console output captured)
- [ ] Root cause identified and documented (not a blind/trial-and-error fix)
- [ ] Hypothesis stated explicitly before applying fix

## Fix Quality

- [ ] Fix is the minimal change needed (no refactoring, no "improvements")
- [ ] Fix addresses root cause (not a symptom workaround)
- [ ] No unrelated files modified
- [ ] Existing code style and patterns preserved
- [ ] No new dependencies added (unless absolutely necessary)

## Build Verification

- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npm run lint` — zero lint errors
- [ ] `npm run build` — production build succeeds

## Visual Verification

- [ ] Screenshot AFTER fix confirms the issue is resolved
- [ ] Before/after comparison shows the expected change
- [ ] No visual regressions in surrounding components

## Regression Check

- [ ] Related sections/pages still render correctly
- [ ] Theme tokens still apply (if theme-related fix)
- [ ] Dark mode still works (if CSS/style fix)
- [ ] Other subdomains not affected (if multi-tenant fix)

## ADR Compliance (if applicable)

- [ ] ADR consulted if fix touches architecture boundary
- [ ] RSC/client boundary respected (ADR-001)
- [ ] Zod validation present for data changes (ADR-003)
- [ ] No secrets in client code (ADR-005)
- [ ] Edge-compatible APIs used (ADR-007)

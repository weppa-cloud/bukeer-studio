# Reference Files

## Architecture & Patterns

| Document | Path | Use For |
|----------|------|---------|
| Architecture | `docs/02-architecture/ARCHITECTURE.md` | Overall architecture |
| ADR Decisions | `docs/02-architecture/decisions/` | All ADR files |
| Defensive Patterns | `docs/02-architecture/patterns/DEFENSIVE_DATA_PATTERNS.md` | Data access rules |
| Auth Patterns | `docs/02-architecture/patterns/AUTHENTICATION_PATTERNS.md` | Auth flows |
| Performance | `docs/02-architecture/patterns/PERFORMANCE_OPTIMIZATION_GUIDE.md` | Perf patterns |
| Safe Delete | `docs/02-architecture/patterns/SAFE_DELETE_PATTERN.md` | Delete operations |

## M3 Design System & Tokens

| Document | Path | Use For |
|----------|------|---------|
| M3 Quickstart | `docs/04-design-system/M3_IMPLEMENTATION_QUICKSTART.md` | M3 compliance rules |
| M3 Foundations | `docs/04-design-system/M3_FOUNDATIONS.md` | Complete token reference |
| M3 Playbook | `docs/04-design-system/M3_IMPLEMENTATION_PLAYBOOK.md` | Implementation patterns |
| M3 UI Patterns | `docs/04-design-system/M3_UI_PATTERNS.md` | Anti-overflow, tabs, dropdowns |
| M3 Architecture | `docs/04-design-system/M3_ARCHITECTURE_DECISIONS.md` | Design ADRs (002, 006) |
| Reusability | `docs/04-design-system/REUSABILITY_CHECKLIST.md` | Component scoring & levels |
| UX Patterns | `docs/04-design-system/UX_PATTERNS_GUIDE.md` | UX requirements |
| Motion System | `docs/04-design-system/M3_MOTION.md` | Animation tokens |

## Token Source Files

| Token | Path | Class |
|-------|------|-------|
| Colors | `lib/design_system/theme/m3_color_scheme.dart` | `BukeerM3ColorScheme` |
| Typography | `lib/design_system/theme/m3_text_theme.dart` | `BukeerM3TextTheme` |
| Spacing | `lib/design_system/tokens/spacing.dart` | `BukeerSpacing` |
| Elevation | `lib/design_system/tokens/elevation.dart` | `BukeerElevation` |
| Border Radius | `lib/design_system/tokens/elevation.dart` | `BukeerBorderRadius` |
| Borders | `lib/design_system/tokens/borders.dart` | `BukeerBorders` |
| Animations | `lib/design_system/tokens/animations.dart` | `BukeerAnimations` |
| Components | `lib/design_system/components/index.dart` | All DS components |

## Domain-Specific

| Document | Path | Use For |
|----------|------|---------|
| Chatwoot Arch | `docs/05-business-systems/chatwoot/ARCHITECTURE.md` | Chatwoot specifics |
| CRM Pipeline | `docs/11-guides/chatwoot/CRM_PIPELINE_ARCHITECTURE.md` | Pipeline/stage system |
| Notifications | `docs/05-business-systems/chatwoot/REALTIME_ALERTS_SYSTEM.md` | Realtime alerts |

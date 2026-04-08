# Documentation Structure

## Main Directories

```
docs/
├── 01-getting-started/    # Setup, onboarding
│   ├── SETUP.md
│   └── QUICKSTART.md
│
├── 02-architecture/       # Architecture, patterns
│   ├── ARCHITECTURE.md    # Main reference
│   ├── BEST_PRACTICES.md
│   └── SERVICE_LAYER.md
│
├── 03-design-system/      # UI, M3, components
│   ├── M3_CODING_GUIDE.md
│   ├── M3_IMPLEMENTATION_QUICKSTART.md
│   └── BUKEER_DESIGN_TOKENS.md
│
├── 04-business-systems/   # Business domains
│   ├── payments/
│   ├── itineraries/
│   └── crm/
│
├── 05-modules/            # Feature modules
│   ├── hotels/
│   ├── flights/
│   ├── activities/
│   └── gateway/
│
├── 06-api/                # API documentation
│   ├── edge-functions/
│   └── rpc-functions/
│
├── 07-testing/            # Testing guides
│   ├── TESTING_GUIDE.md
│   ├── E2E_TESTING_GUIDE.md
│   └── TESTING_PATTERNS.md
│
├── 08-guides/             # How-to guides
│   └── chatwoot/
│
├── archive/               # Historical docs
│   ├── 2024/
│   └── 2025/
│
├── INDEX.md               # Documentation index
└── README.md              # Overview
```

## Claude Configuration

```
.claude/
├── skills/                # AI skill definitions
│   ├── flutter-developer/
│   ├── backend-dev/
│   ├── testing-agent/
│   ├── flutter-ui-components/
│   ├── architecture-analyzer/
│   └── docs-keeper/
│
├── commands/              # Custom commands
│   ├── execute-prp.md
│   ├── orchestrate.md
│   └── start-testing.md
│
├── agents/                # Subagent definitions
│   ├── code-explorer.md
│   ├── test-runner.md
│   └── feature-planner.md
│
└── settings.json          # Claude settings
```

## Product Requirements

```
PRPs/                      # Product Requirement Plans
├── active/                # Current requirements
├── completed/             # Implemented PRPs
└── templates/             # PRP templates
```

## File Placement Rules

| File Type | Location |
|-----------|----------|
| Getting started | `docs/01-getting-started/` |
| Architecture | `docs/02-architecture/` |
| Design system | `docs/03-design-system/` |
| Business logic | `docs/04-business-systems/` |
| Feature modules | `docs/05-modules/` |
| API docs | `docs/06-api/` |
| Testing | `docs/07-testing/` |
| How-to guides | `docs/08-guides/` |
| Outdated docs | `docs/archive/[year]/` |
| AI skills | `.claude/skills/` |
| AI commands | `.claude/commands/` |
| Requirements | `PRPs/` |

## Root Directory Files

**Allowed in root:**
- README.md
- CLAUDE.md
- CONTRIBUTING.md
- LICENSE
- pubspec.yaml
- analysis_options.yaml
- Configuration files (.gitignore, etc.)

**NOT allowed in root:**
- Feature documentation → `docs/`
- Historical docs → `docs/archive/`
- Temporary files → delete or move

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Guide files | UPPER_SNAKE.md | `TESTING_GUIDE.md` |
| Reference files | UPPER_SNAKE.md | `ARCHITECTURE.md` |
| Index files | lowercase | `README.md`, `index.md` |
| Directories | kebab-case or numbers | `01-getting-started/` |

## Cross-Reference Format

```markdown
<!-- Reference another doc -->
See [ARCHITECTURE.md](../02-architecture/ARCHITECTURE.md)

<!-- Reference a class -->
Uses [AppServices] for service access

<!-- Reference with anchor -->
See [Error Handling](../02-architecture/ARCHITECTURE.md#error-handling)
```

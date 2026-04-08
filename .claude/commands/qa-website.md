---
description: "Triple-context QA loop — Flutter builder (:8080) + Next.js Studio dashboard (:3000/dashboard) + Next.js public renderer (:3000/site)"
argument-hint: "[max_cycles=10] [budget_minutes=45] [subdomain=auto] | scan | fix [max_cycles=5] | test template=<flow_key> | test template=all | verify [commit=HEAD~1] | render [subdomain=<slug>] [pages=home,blog,products] | studio [max_cycles=N] | studio template=<studio_template>"
allowed-tools: mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__evaluate_script,
  mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__list_console_messages,
  mcp__chrome-devtools__get_console_message, mcp__chrome-devtools__take_snapshot,
  mcp__chrome-devtools__list_pages, mcp__chrome-devtools__select_page,
  mcp__chrome-devtools__click, mcp__chrome-devtools__fill,
  mcp__chrome-devtools__type_text, mcp__chrome-devtools__press_key,
  mcp__chrome-devtools__wait_for, mcp__chrome-devtools__hover,
  mcp__chrome-devtools__new_page, mcp__chrome-devtools__close_page,
  mcp__supabase__execute_sql,
  mcp__dart__list_running_apps, mcp__dart__connect_dart_tooling_daemon,
  mcp__dart__hot_reload, mcp__dart__hot_restart, mcp__dart__launch_app,
  mcp__dart__analyze_files, mcp__dart__run_tests,
  Bash(git:*), Bash(lsof:*), Bash(kill:*), Bash(flutter:*), Bash(grep:*),
  Bash(cat:*), Bash(echo:*), Bash(date:*), Bash(head:*), Bash(printf:*),
  Bash(sleep:*), Bash(timeout:*), Bash(python3:*), Bash(test:*), Bash(gh:*),
  Bash(wc:*), Bash(sort:*), Bash(awk:*), Bash(tail:*),
  Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(curl:*),
  Read, Edit, Write, Glob, Grep
---

# QA Website — Triple-Context Loop (Karpathy Autoresearch)

Tests the **Website module** across its three contexts:
- **Flutter builder** (`:8080`): Legacy admin dashboard at `/website` with 6 tabs (DEPRECATED when `website_standalone_admin` ON)
- **Next.js Studio dashboard** (`:3000/dashboard`): New admin with 8 tabs, auth, wizard, auto-save
- **Next.js public renderer** (`:3000/site`): Public agency sites via `web-public/`

Applies Karpathy autoresearch: single scalar metric (`website_qa_score`), fixed time budget,
binary keep/discard, autonomous loop with cross-context validation.

```
/qa-website                                        → LOOP autónomo (default)
/qa-website max_cycles=5 budget_minutes=30         → LOOP con parámetros custom
/qa-website scan                                   → Auditoría read-only todos los contextos
/qa-website fix                                    → Solo arreglar backlog (source=qa-website)
/qa-website fix max_cycles=3                       → Fix con límite
/qa-website test template=manage_blog              → Journey específico (Flutter)
/qa-website test template=studio_auth              → Journey específico (Dashboard)
/qa-website test template=cross_validate           → Cross-validation Flutter→Next.js
/qa-website test template=all                      → Ejecutar TODOS los templates en secuencia
/qa-website verify                                 → Verificar último commit
/qa-website verify commit=HEAD~2                   → Verificar commits específicos
/qa-website render                                 → Solo Next.js rendering (auto subdomain)
/qa-website render subdomain=demo-travel           → Next.js rendering para subdomain específico
/qa-website render subdomain=demo pages=home,blog  → Páginas específicas
/qa-website studio                                 → Solo dashboard Studio (skip Flutter)
/qa-website studio max_cycles=5                    → Studio con límite de ciclos
/qa-website studio template=studio_auth            → Template específico de Studio
```

---

## 1. MODE SELECTION

Parse the first word of `$ARGUMENTS`:

| First word | Mode | Example |
|-----------|------|---------|
| _(empty)_ | LOOP | `/qa-website` |
| `max_cycles`, `budget_minutes`, `subdomain`, or `key=value` | LOOP | `/qa-website max_cycles=5` |
| `scan` | SCAN | `/qa-website scan` |
| `fix` | FIX | `/qa-website fix max_cycles=3` |
| `test` | TEST | `/qa-website test template=manage_blog` |
| `verify` | VERIFY | `/qa-website verify commit=HEAD~1` |
| `render` | RENDER | `/qa-website render subdomain=demo` |
| `studio` | STUDIO | `/qa-website studio` |
| _anything else_ | **ERROR** | Print usage and stop |

**Fail-fast rules**:
- `/qa-website test` without `template=` → print available templates, stop
- Unknown first word → print usage error, stop

**Default parameters (LOOP)**: `max_cycles=10`, `budget_minutes=45`, `subdomain=auto`

**Available TEST templates**:

Flutter-side: `create_website`, `edit_theme`, `edit_brand`, `manage_blog`, `manage_pages`, `manage_products`, `ai_generate`, `cross_validate`, `puck_editor`

Studio-side: `studio_auth`, `studio_dashboard`, `studio_wizard`, `studio_pages`, `studio_blog`, `studio_design`, `studio_content`, `studio_leads`, `studio_settings`, `studio_cross_validate`

**`template=all` behavior**: Run ALL templates in sequence with a single preflight. Order:
`edit_theme` → `edit_brand` → `manage_blog` → `manage_pages` → `manage_products` → `ai_generate` → `cross_validate` → `puck_editor` → `studio_auth` → `studio_dashboard` → `studio_wizard` → `studio_pages` → `studio_blog` → `studio_design` → `studio_content` → `studio_leads` → `studio_settings` → `studio_cross_validate` → `create_website`.
`create_website` runs last because it only tests empty state/wizard when a website already exists.
After each template, record its score. At the end, produce a consolidated report with per-template scores and an aggregate `website_qa_score`.

**STUDIO mode** behaves like LOOP but skips Flutter steps. Can accept `template=` to run specific studio templates only.

---

## 2. DUAL-SERVER PREFLIGHT

All modes share this preflight. It MUST pass before any mode executes.
RENDER mode skips Flutter steps (2.2, 2.3, 2.4, 2.5).

### 2.1 Static analysis (Flutter modes only)

```bash
Bash: flutter analyze --no-fatal-warnings --no-fatal-infos 2>&1 | tail -5
```

If `error •` lines exist → stop, write preflight row to `qa-website-results.tsv` with `status=preflight_failed`.

### 2.2 Ensure Flutter running on :8080 WITH SEMANTICS

```bash
Bash: lsof -i :8080 | grep LISTEN
```

If running, **verify semantics are enabled**:
```javascript
mcp__chrome-devtools__evaluate_script
function: () => {
  const host = document.querySelector('flt-semantics-host');
  const children = host ? host.querySelectorAll('*').length : 0;
  return { hasSemanticsHost: !!host, semanticsChildren: children };
}
```

> **HARD REQUIREMENT**: `ENABLE_FLT_SEMANTICS=true` is MANDATORY.
> Without it, `flt-semantics-host` has 0 children and MCP `click`/`take_snapshot`
> cannot interact with Flutter widgets. Only large clickable areas (e.g., app launcher
> cards) respond to pointer events. Small buttons like "Crear Sitio Web" are **unreachable**.
> If semantics are not active, **kill and restart** the app with the flag.

If not running OR semantics not active (`semanticsChildren === 0`):
```bash
Bash: kill $(lsof -ti :8080) 2>/dev/null; sleep 1
Bash: flutter run -d chrome --dart-define-from-file=.env --dart-define=ENABLE_FLT_SEMANTICS=true --web-port=8080 &
Bash: APP_PID=$!; timeout 90 bash -c "until lsof -i :8080 | grep LISTEN; do kill -0 $APP_PID 2>/dev/null || { echo 'APP_DEAD'; exit 1; }; sleep 3; done"
```

If `APP_DEAD` → stop with `status=preflight_failed`.

**Post-start verification**: After Flutter loads, re-check semantics:
```javascript
mcp__chrome-devtools__evaluate_script
function: async () => {
  await new Promise(r => setTimeout(r, 5000));
  const host = document.querySelector('flt-semantics-host');
  const children = host ? host.querySelectorAll('*').length : 0;
  if (children === 0) {
    // Try clicking the "Enable accessibility" button
    const placeholder = document.querySelector('flt-semantics-placeholder');
    if (placeholder) {
      const btn = placeholder.querySelector('button');
      if (btn) btn.click();
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return {
    semanticsActive: host ? host.querySelectorAll('*').length > 0 : false,
    childCount: host ? host.querySelectorAll('*').length : 0
  };
}
```

If `semanticsActive === false` after retry → set `$FLUTTER_BUILDER_BLOCKED = true`.
Log warning: "Flutter semantics not active — builder tab testing will be skipped. Only Next.js probing available."
Continue with Next.js-only testing (do NOT stop the entire run).

### 2.3 Ensure Next.js running on :3000

```bash
Bash: lsof -i :3000 | grep LISTEN
```

If not running:

```bash
# Check node_modules exist
Bash: test -d web-public/node_modules || (cd web-public && npm install)

# Verify .env.local has required vars
Bash: grep -q 'NEXT_PUBLIC_SUPABASE_URL' web-public/.env.local 2>/dev/null || { echo "MISSING_NEXTJS_ENV"; }
```

If `MISSING_NEXTJS_ENV`:
```bash
# Auto-create .env.local from main .env
Bash: grep -E '^SUPABASE_URL=' .env | sed 's/SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL/' > web-public/.env.local
Bash: grep -E '^SUPABASE_ANON_KEY=' .env | sed 's/SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY/' >> web-public/.env.local
```

**Puck editor feature flag check**:
```bash
Bash: grep -q 'NEXT_PUBLIC_PUCK_EDITOR' web-public/.env.local 2>/dev/null && echo "PUCK_FLAG_SET" || echo "PUCK_FLAG_MISSING"
```

Store `$PUCK_ENABLED` from the env file value. If `NEXT_PUBLIC_PUCK_EDITOR=true` → Puck mode. If missing or `false` → legacy mode.
This affects how the Editor tab (index 0) is tested — see Section 9.9 `puck_editor` template.

Start Next.js:
```bash
Bash: cd web-public && nohup npm run dev > /tmp/nextjs-qa-website.log 2>&1 &
Bash: NEXT_PID=$!; timeout 60 bash -c "until curl -s http://localhost:3000 > /dev/null 2>&1; do kill -0 $NEXT_PID 2>/dev/null || { echo 'NEXT_DEAD'; exit 1; }; sleep 2; done"
```

If `NEXT_DEAD` → `tail -30 /tmp/nextjs-qa-website.log` and stop with `status=preflight_failed`.

### 2.3a Dashboard Auth (Supabase SSR — STUDIO + LOOP + SCAN modes)

Open a new Chrome DevTools page for the dashboard:

```
mcp__chrome-devtools__new_page → navigate to http://localhost:3000/login
```

Wait for login page to render. Verify "Website Studio" or "Sign in" heading visible.

Fill credentials (same as Flutter auth — default: `demo@demo.bukeer.com` / `demo@demo.bukeer.com`):

```
mcp__chrome-devtools__fill → email input with $QA_AUTH_EMAIL
mcp__chrome-devtools__fill → password input with $QA_AUTH_PASSWORD
mcp__chrome-devtools__click → "Sign in" button
```

Wait for redirect to `/dashboard`:

```javascript
mcp__chrome-devtools__evaluate_script
function: async () => {
  await new Promise(r => setTimeout(r, 5000));
  return {
    url: window.location.pathname,
    authenticated: window.location.pathname.startsWith('/dashboard'),
    title: document.title
  };
}
```

If `authenticated === true`:
- Store `$DASHBOARD_PAGE_ID` from `mcp__chrome-devtools__list_pages`
- Set `$STUDIO_AUTH_BLOCKED = false`

If login failed (still on `/login`):
- Set `$STUDIO_AUTH_BLOCKED = true`
- Log warning: "Dashboard auth failed — studio testing will be skipped"
- Continue with Flutter-only testing (do NOT stop the entire run)

> **STUDIO mode**: If `$STUDIO_AUTH_BLOCKED = true` in STUDIO mode → stop with `status=preflight_failed`.

### 2.3b Feature Flag Detection

```sql
mcp__supabase__execute_sql:
SELECT value FROM feature_flags
WHERE key = 'website_standalone_admin'
AND (account_id = '{account_id}' OR account_id IS NULL)
ORDER BY account_id NULLS LAST LIMIT 1;
```

Store `$STANDALONE_ADMIN_FLAG` (`true` or `false`). If no row found → `false`.

This flag determines:
- Weight distribution in scoring (Section 3)
- Whether Flutter builder is primary or legacy context
- Whether dashboard testing gets higher priority in LOOP mode

### 2.4 Connect DTD (Flutter)

```
mcp__dart__list_running_apps
mcp__dart__connect_dart_tooling_daemon (if URI available)
```

### 2.5 Auth injection (Flutter side)

**Step 5a — Read credentials from `.env`**:

```bash
Bash: grep -E '^(SUPABASE_URL|SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|QA_TEST_EMAIL|QA_TEST_PASSWORD|TEST_EMAIL|TEST_PASSWORD)=' .env .env.local web-public/.env.local 2>/dev/null | head -10
```

Credential resolution:
- `email`: `QA_TEST_EMAIL` → `TEST_EMAIL` → `demo@demo.bukeer.com`
- `password`: `QA_TEST_PASSWORD` → `TEST_PASSWORD` → `demo@demo.bukeer.com`
- `SUPABASE_URL`: `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL` (from `.env.local` or `web-public/.env.local`)
- `SUPABASE_ANON_KEY`: `SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Known defaults** (hardcoded fallback if env vars missing):
```
QA_AUTH_EMAIL     = demo@demo.bukeer.com
QA_AUTH_PASSWORD  = demo@demo.bukeer.com
SUPABASE_URL      = https://wzlxbpicdcdvxvdcvgas.supabase.co
ACCOUNT_ID        = a0000000-de00-0000-0000-000000000001
WEBSITE_ID        = caffedd9-13db-4f12-b8ed-cfe3a20ea043
SUBDOMAIN         = demo-travel
```

If `SUPABASE_URL` or `SUPABASE_ANON_KEY` missing from ALL env files → stop with `status=preflight_failed`.

**Step 5b — Navigate and inject session**:

```javascript
mcp__chrome-devtools__navigate_page
type: url
url: http://localhost:8080/?e2e=1
```

```javascript
mcp__chrome-devtools__evaluate_script
function: async () => {
  const SUPABASE_URL = '{{SUPABASE_URL}}';
  const SUPABASE_ANON_KEY = '{{SUPABASE_ANON_KEY}}';
  const email = '{{QA_AUTH_EMAIL}}';
  const password = '{{QA_AUTH_PASSWORD}}';
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json();
  const authPayload = JSON.stringify({
    access_token: data.access_token, refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now()/1000) + (data.expires_in || 3600),
    expires_in: data.expires_in || 3600, token_type: 'bearer', user: data.user
  });
  const ref = SUPABASE_URL.match(/\/\/([^.]+)\./)?.[1] || 'unknown';
  const knownKeys = [...Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))];
  knownKeys.push(`sb-${ref}-auth-token`);
  [...new Set(knownKeys)].forEach(k => localStorage.setItem(k, authPayload));
  return { ok: true, email: data.user?.email, account_id: data.user?.user_metadata?.account_id };
}
```

Store `$ACCOUNT_ID` from the response.

### 2.6 Resolve subdomain and website ID

```sql
mcp__supabase__execute_sql:
SELECT subdomain, id, status, content->>'siteName' as site_name FROM websites
WHERE account_id = '{account_id}' AND deleted_at IS NULL
ORDER BY updated_at DESC LIMIT 1;
```

> **Note**: `websites` table has NO `name` column. Use `content->>'siteName'` instead.
> Account ID lookup: NOT in `auth.users.raw_user_meta_data` — query `user_roles` table instead.

Store `$SUBDOMAIN`, `$WEBSITE_ID`, `$WEBSITE_STATUS`.

**Resolution priority**:
1. If `subdomain=<slug>` passed as argument → use that directly
2. If account has a website → use it (same-account, enables cross-validation)
3. If account has NO website → **cross-account fallback** for Next.js testing:

```sql
mcp__supabase__execute_sql:
SELECT subdomain, id, status FROM websites
WHERE deleted_at IS NULL AND status = 'published'
ORDER BY updated_at DESC LIMIT 1;
```

Store fallback as `$NEXTJS_SUBDOMAIN` (different from `$WEBSITE_ID` which stays null).
Set `$CROSS_ACCOUNT_MODE = true` — this disables cross-validation (Flutter builder
edits can't be verified on a different account's site) but enables full Next.js
render probing.

- If no website exists for account → Flutter builder shows "Crear Sitio Web" empty state.
  Set `$HAS_WEBSITE = false`. Builder tab testing limited to empty state + wizard.
  RENDER mode → use fallback subdomain, or stop with `status=no_website` if none found.
  Other modes → continue with Next.js fallback + Flutter empty state testing.

### 2.7 Health check — Flutter

Navigate to the website dashboard and verify render:

```javascript
mcp__chrome-devtools__navigate_page
type: url
url: http://localhost:8080/#/website?e2e=1
```

```javascript
mcp__chrome-devtools__evaluate_script
function: async () => {
  await new Promise(r => setTimeout(r, 5000));
  const glass = document.querySelector('flt-glass-pane');
  const host = document.querySelector('flt-semantics-host');
  function countLabels(root, depth = 0) {
    if (depth > 10) return 0;
    let c = 0;
    for (const el of root.querySelectorAll('[aria-label]')) c++;
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) c += countLabels(el.shadowRoot, depth + 1);
    }
    return c;
  }
  const ariaCount = countLabels(document);
  function hasInteractive(root, depth = 0) {
    if (depth > 10) return false;
    const sel = '[role="button"], button, input, [role="link"], [role="tab"]';
    if (root.querySelector(sel)) return true;
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot && hasInteractive(el.shadowRoot, depth + 1)) return true;
    }
    return false;
  }
  return {
    pathname: window.location.hash.replace('#', '') || window.location.pathname,
    hasSemanticsHost: !!host,
    hasGlassPane: !!glass,
    ariaCount,
    hasInteractiveUI: hasInteractive(document),
    title: document.title
  };
}
```

**Blocker conditions** (ANY → stop):

| Condition | Meaning |
|-----------|---------|
| `hasGlassPane === false` | Flutter not rendered |
| `hasSemanticsHost === false` | Semantics tree not enabled |
| `hasInteractiveUI === false` | Blank screen or crash |

**Retry once**: If blocking, wait 10s and re-check. Still failing → hard stop.

### 2.8 Health check — Next.js

```bash
Bash: curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/site/${SUBDOMAIN}"
```

- `200` → Next.js rendering works
- `404` → website not published or subdomain wrong (log, continue Flutter-only in LOOP/SCAN)
- Connection refused → Next.js died (stop with `status=nextjs_dead`)

Also check API endpoints:
```bash
Bash: curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/sitemap?subdomain=${SUBDOMAIN}"
Bash: curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/robots.txt"
```

### 2.8a Dashboard Health Check

If `$STUDIO_AUTH_BLOCKED === false`, verify dashboard loads:

```
mcp__chrome-devtools__select_page → $DASHBOARD_PAGE_ID
mcp__chrome-devtools__navigate_page → http://localhost:3000/dashboard
```

```javascript
mcp__chrome-devtools__evaluate_script
function: async () => {
  await new Promise(r => setTimeout(r, 3000));
  return {
    url: window.location.pathname,
    hasWebsiteCards: !!document.querySelector('[class*="grid"]'),
    hasTopbar: !!document.querySelector('header'),
    hasSidebar: !!document.querySelector('aside, nav'),
    title: document.title
  };
}
```

If `$WEBSITE_ID` exists, also navigate to `/dashboard/${WEBSITE_ID}/pages`:

```javascript
mcp__chrome-devtools__evaluate_script
function: async () => {
  await new Promise(r => setTimeout(r, 3000));
  return {
    url: window.location.pathname,
    hasTabBar: document.querySelectorAll('a[href*="/dashboard/"]').length >= 4,
    hasContent: document.body.innerText.length > 100,
    tabLabels: Array.from(document.querySelectorAll('a[href*="/dashboard/"]')).map(a => a.textContent?.trim()).filter(Boolean)
  };
}
```

If dashboard fails to render → set `$STUDIO_HEALTH_BLOCKED = true`, log warning, continue.

### 2.9 Chrome DevTools — triple page management

This command needs UP TO THREE browser pages: Flutter, public renderer, and dashboard.

```
mcp__chrome-devtools__list_pages → identify Flutter page on :8080
```

Store `$FLUTTER_PAGE_ID`. Then open Next.js public page:

```
mcp__chrome-devtools__new_page → navigate to http://localhost:3000/site/${SUBDOMAIN}
```

Store `$NEXTJS_PAGE_ID`.

Dashboard page (`$DASHBOARD_PAGE_ID`) was already created in step 2.3a.

**Switching protocol**:
- Before Flutter interactions: `mcp__chrome-devtools__select_page → $FLUTTER_PAGE_ID`
- Before Next.js public probing: `mcp__chrome-devtools__select_page → $NEXTJS_PAGE_ID`
- Before dashboard interactions: `mcp__chrome-devtools__select_page → $DASHBOARD_PAGE_ID`

> **STUDIO mode**: Only `$DASHBOARD_PAGE_ID` and `$NEXTJS_PAGE_ID` are used. No Flutter page.

### 2.10 Bootstrap artifacts

```bash
Bash: test -f qa-website-results.tsv || echo -e "cycle\tcommit\twebsite_qa_score\tbuilder_nav\tbuilder_interaction\trender_health\tcross_validation\tseo_compliance\tconsole_clean\tblog_health\tstatus\tdescription" > qa-website-results.tsv
Bash: test -f qa-website-render.tsv || echo -e "cycle\tsubdomain\tpage\thttp_status\trender_ok\tconsole_errors\tload_time_ms\tjson_ld_present\tmeta_ok\tnotes" > qa-website-render.tsv
Bash: test -f qa-website-cross.tsv || echo -e "cycle\taction\tflutter_field\tflutter_value\tnextjs_verified\tlatency_ms\tnotes" > qa-website-cross.tsv
Bash: test -f qa-website-playbook.jsonl && echo "PLAYBOOK_EXISTS" || echo "PLAYBOOK_NEW"
Bash: test -f qa-improvement-backlog.tsv || echo -e "run_id\tflow_id\tissue_id\tmodule\troute\tissue_type\tseverity\trepro_steps\texpected\tactual\tsuggested_fix\tconfidence\tstatus\tsource\tcreated_at" > qa-improvement-backlog.tsv
Bash: date -u +"%Y%m%d-%H%M%S"
```

`run_id`: `website-{YYYYMMDD-HHMMSS}`

### 2.11 Seed playbook (if new)

```bash
Bash: test -f qa-website-playbook.jsonl && [ "$(wc -l < qa-website-playbook.jsonl)" -gt 0 ] || cat >> qa-website-playbook.jsonl << 'SEED'
{"type":"pattern","key":"tab_click_by_index","value":"Website dashboard tabs: click role=tab elements by index. Index 0=Editor, 1=Diseno, 2=Marca, 3=Contenido, 4=Secciones, 5=Paginas, 6=Productos, 7=Landings, 8=Blog, 9=Cotizaciones, 10=Analytics, 11=Versiones","confidence":1.0,"source":"qa-website"}
{"type":"pattern","key":"tab_wait_after_click","value":"Wait 2s after tab click for content to load. Some tabs (Editor, Analytics) may need 5s.","confidence":0.9,"source":"qa-website"}
{"type":"pattern","key":"nextjs_subdomain_routing","value":"Next.js local dev uses path-based routing: http://localhost:3000/site/{subdomain}/. Production uses subdomain.bukeer.com.","confidence":1.0,"source":"qa-website"}
{"type":"pattern","key":"cross_validate_revalidate","value":"After Flutter changes, trigger ISR revalidation via POST /api/revalidate before checking Next.js","confidence":1.0,"source":"qa-website"}
{"type":"pattern","key":"editor_tab_iframe","value":"Editor tab (index 0) loads an iframe pointing to Next.js /editor/{websiteId}. Wait for iframe to load before probing.","confidence":0.9,"source":"qa-website"}
{"type":"pattern","key":"publish_button_location","value":"Publish/Unpublish button is in AppBar actions (top-right). Only visible if canPublishWebsites() returns true.","confidence":1.0,"source":"qa-website"}
{"type":"pattern","key":"puck_editor_detection","value":"When NEXT_PUBLIC_PUCK_EDITOR=true + puck_editor feature flag: Editor tab shows Puck (full-width canvas, no Flutter inspector). canvas:state includes editorMode='puck'. When OFF: legacy canvas + SectionInspectorPanel 360px sidebar.","confidence":1.0,"source":"qa-website"}
{"type":"pattern","key":"puck_unsaved_changes_guard","value":"When Puck has unsaved changes (hasUnsavedChanges=true in canvas:state), switching away from Editor tab (index 0) shows confirmation dialog: 'Cambios sin guardar' with Cancel/Discard. Tab switch is reverted until user confirms.","confidence":1.0,"source":"qa-website"}
{"type":"pattern","key":"dashboard_user_context","value":"getDashboardUserContext(supabase) in lib/admin/user-context.ts is the canonical way to get auth + accountId. Returns status: authenticated|missing_role|unauthenticated. Queries: auth.getUser() → contacts (display name) → user_roles (account_id + role). ALWAYS use instead of manual getUser() + profile query.","confidence":1.0,"source":"qa-website-studio"}
{"type":"pattern","key":"mobile_sidebar_drawer","value":"Dashboard sidebar uses fixed+transform for mobile: -translate-x-full (hidden) / translate-x-0 (visible). md:relative md:translate-x-0 for desktop. Hamburger toggle in topbar (md:hidden). Backdrop overlay when open. Auto-close via onNavigate callback.","confidence":1.0,"source":"qa-website-studio"}
{"type":"pattern","key":"logout_cookie_cleanup","value":"On logout, clear cookie sb-auth-token (document.cookie = 'sb-auth-token=; path=/; max-age=0') to prevent stale middleware auth. Without this, middleware still allows /dashboard access after signOut.","confidence":1.0,"source":"qa-website-studio"}
{"type":"pattern","key":"studio_table_naming","value":"All website-related tables use 'website_' prefix: website_blog_posts, website_blog_categories, website_blog_tags, website_quote_requests, website_pages, website_versions. blog_posts (without prefix) is a separate table for the SEO pipeline.","confidence":1.0,"source":"qa-website-studio"}
SEED
```

### 2.12 Preflight summary

```
══════════════════════════════════════════════════════
 PREFLIGHT COMPLETE
 Flutter:    ✓ :8080 (website dashboard loaded)
 Next.js:    ✓ :3000 ({subdomain} renders)
 Dashboard:  ✓ :3000/dashboard (authenticated as {email})
 Auth:       ✓ {email}
 Website:    {name} ({subdomain}) — status: {status}
 Flag:       website_standalone_admin = {ON/OFF}
 Playbook:   {N} entries loaded
 Run ID:     {run_id}
══════════════════════════════════════════════════════
```

**If mode is `scan` with no further args → proceed to SCAN mode.**

---

## 3. THE SCALAR METRIC: `website_qa_score`

```
website_qa_score = (
    builder_nav * W_BN          ← % of 6 Flutter tabs navigable with content
  + builder_interaction * W_BI  ← % Flutter CTAs responsive (save, publish, add, etc.)
  + studio_health * W_SH        ← composite dashboard health (see below)
  + render_health * 0.20        ← % Next.js public pages HTTP 200 without errors
  + cross_validation * 0.15     ← % changes verified across admin→public renderer
  + seo_compliance * 0.10       ← % expected meta tags present in Next.js HTML
  + console_clean * 0.05        ← 1.0 if 0 real errors all contexts, 0.5 if <3, 0.0 if >=3
  + blog_health * 0.10          ← blog listing + post detail accessible
)
```

**Dynamic weights** based on `$STANDALONE_ADMIN_FLAG`:

| Flag State | `W_BN` (builder_nav) | `W_BI` (builder_interact) | `W_SH` (studio_health) |
|------------|---------------------|--------------------------|----------------------|
| `OFF` (migration: Flutter primary) | 0.12 | 0.12 | 0.06 |
| `ON` (migration: Dashboard primary) | 0.05 | 0.05 | 0.20 |
| STUDIO mode (skip Flutter) | 0.00 | 0.00 | 0.30 |

**`studio_health` sub-components**:
```
studio_health = (
    studio_auth_ok * 0.15           ← login + redirect + session refresh
  + studio_nav_ok * 0.20            ← 8 tabs navigable with content
  + studio_wizard_ok * 0.15         ← create wizard completes
  + studio_crud_ok * 0.20           ← page/blog/content CRUD works
  + studio_autosave_ok * 0.10       ← dirty state + auto-save functional
  + studio_cmd_palette_ok * 0.05    ← Cmd+K opens + searches
  + studio_console_clean * 0.15     ← 0 runtime errors in dashboard
)
```

Each component is 0.0 to 1.0. `website_qa_score` is 0.0 to 1.0 (displayed as 0-100).

**Console error classification** (same as `/qa`):

| Pattern | Category | Affects score? |
|---------|----------|----------------|
| `Failed to load resource: 404` for `.png`, `.ico`, `.woff` | `asset_noise` | No |
| `Failed to load resource: 404` for `/rest/v1/`, `/auth/`, `/functions/` | `api_error` | Yes |
| `TypeError`, `RangeError`, `Uncaught` | `runtime_error` | Yes |
| `CORS`, `Mixed Content` | `network_error` | Yes |
| Next.js `Hydration mismatch`, `Warning:` | `nextjs_warning` | Yes (0.5 weight) |
| Everything else | `unknown` | Yes (conservative) |

---

## 4. FLUTTER BUILDER TAB MAP (LEGACY — deprecated when `website_standalone_admin` ON)

> **MIGRATION NOTE**: This section describes the Flutter builder admin at `:8080`. When the
> `website_standalone_admin` feature flag is ON, the dashboard at `:3000/dashboard` is primary.
> Flutter tabs are still tested during migration but with reduced weight in scoring.

The 6 tabs in `website_dashboard_page.dart` (redesigned UX, 2026-03):

| Index | Tab Label | Sub-tabs | Key CTAs to probe | What to observe |
|-------|-----------|----------|-------------------|-----------------|
| 0 | Páginas | — | Nueva Página, Editar, Vista previa, Opciones de navegación, Eliminar | Page list with categories (Categoría/Estáticas/Personalizadas), filter checkboxes, drag-to-reorder. "Editar" on homepage opens Puck editor at `/website/editor/:pageId`. |
| 1 | Blog | — | Nuevo Post, Categorías, Mostrar menú→Editar | Post list with status filters (Todos/Publicados/Borradores/Programados). Post menu has "Editar" which opens TipTap editor. |
| 2 | Diseño & Marca | Diseño, Marca, Estructura | Theme presets (8 named), color pickers, font selectors, header/footer layout, Guardar | **Diseño**: presets, preview (Claro/Oscuro), fonts, header style (Normal/Moderno/Clásico/Minimalista/Audaz). **Marca**: brand name, tagline, 8 tone checkboxes, CTA style, keywords, AI preview. **Estructura**: header layout (5 types), footer layout (4 types), mobile action bar switch. |
| 3 | Contenido & SEO | Contenido, SEO, Analytics | Guardar, Guardar dominio | **Contenido**: site name, tagline, CTA header switch, SEO title/desc/keywords, contact info (email/phone/address), social links (7 platforms), custom domain. **SEO**: Overview/Keywords/AI Visibility/Auditoría sub-tabs, Performance score, Content Score, grade distribution. **Analytics**: (nested sub-tab within SEO). |
| 4 | Productos | — | Guardar | Product type radio filters: Hoteles (N), Actividades (N), Traslados (N). Product cards with toggle/featured. |
| 5 | Analytics | — | — | GTM ID, GA4 ID, Facebook Pixel, Custom Scripts (head+body), recommendations. |

**Editor (full-page route)**: Accessed via "Editar" button on Páginas tab. Route: `/website/editor/:pageId`. Opens Puck visual editor in iframe pointing to `http://localhost:3000/editor/{websiteId}?page={pageId}`. Homepage uses websiteId as pageId (converted to null internally). **NOTE**: When `pageId === websiteId`, Flutter sets `_currentPageId = null` and iframe loads without `?page=` param.

**Tab navigation**: Use `take_snapshot` → find `tab` elements by label → `click(uid)`. Tabs use `selectable` + `selected` attributes. Sub-tabs within Diseño & Marca / Contenido & SEO use `radio` elements with `checked` attribute.

**Click tab by label** — always `take_snapshot` first, then click the tab UID:

```
mcp__chrome-devtools__take_snapshot → find tab elements → click uid matching label
Bash: sleep 2
```

After clicking, verify content loaded by checking for form fields, buttons, or StaticText beyond the tab bar.

---

## 5. NEXT.JS PAGE MAP

Pages to probe (all under `http://localhost:3000/site/{subdomain}`):

| Page Key | Path | Expected | Notes |
|----------|------|----------|-------|
| `home` | `/site/{subdomain}` | 200, sections render | Check stats counters, hero, nav |
| `blog` | `/site/{subdomain}/blog` | 200, post grid | Categories + post cards |
| `blog_post` | `/site/{subdomain}/blog/{slug}` | 200, article content | Resolve slug from DB first |
| `destinations` | `/site/{subdomain}/destinations` | 200 or 404 | Category page — may not exist |
| `hotels` | `/site/{subdomain}/hotels` | 200 or 404 | Category page — may not exist |
| `activities` | `/site/{subdomain}/activities` | 200 or 404 | Category page — may not exist |
| `terms` | `/site/{subdomain}/terms` | 200, legal text | May return 307 if not configured |
| `privacy` | `/site/{subdomain}/privacy` | 200, legal text | May return 307 if not configured |
| `cancellation` | `/site/{subdomain}/cancellation` | 200, legal text | May return 307 if not configured |
| `sitemap` | `/api/sitemap?subdomain={subdomain}` | 200, XML content | Validate all URLs in sitemap actually resolve |
| `robots` | `/robots.txt` | 200, text content | Check sitemap reference |

### Sitemap URL cross-validation (NEW)

After fetching the sitemap XML, extract all `<loc>` URLs and verify each one resolves:

```bash
Bash: curl -s "http://localhost:3000/api/sitemap?subdomain=${SUBDOMAIN}" | grep -oP '(?<=<loc>)[^<]+' | while read url; do
  # Convert production URLs to localhost for testing
  local_url=$(echo "$url" | sed "s|https://${SUBDOMAIN}.bukeer.com|http://localhost:3000/site/${SUBDOMAIN}|")
  status=$(curl -s -o /dev/null -w "%{http_code}" "$local_url")
  echo -e "${url}\t${status}"
done
```

Any URL in the sitemap returning 404 → log as `sitemap_broken_url` issue. This is an SEO penalty risk.

### Homepage content validation (NEW)

After loading the homepage, check for common data issues:

```javascript
mcp__chrome-devtools__evaluate_script
function: () => {
  // Check stats section — values should not all be 0
  const statsTexts = [];
  document.querySelectorAll('h2, h3').forEach(h => {
    if (/stat|número|cifra/i.test(h.parentElement?.className || '')) {
      statsTexts.push(h.textContent?.trim());
    }
  });

  // Check for zero-value stats (common CMS bug)
  const allText = document.body.innerText;
  const zeroStats = (allText.match(/\b0\b/g) || []).length;

  // Check for placeholder content
  const hasLorem = /lorem ipsum/i.test(allText);
  const hasPlaceholder = /placeholder|sample text|example/i.test(allText);

  // Check footer for missing accents (Spanish)
  const footer = document.querySelector('footer')?.innerText || '';
  const missingAccents = [];
  if (/Terminos/.test(footer) && !/Términos/.test(footer)) missingAccents.push('Terminos→Términos');
  if (/Politica/.test(footer) && !/Política/.test(footer)) missingAccents.push('Politica→Política');
  if (/Cancelacion/.test(footer) && !/Cancelación/.test(footer)) missingAccents.push('Cancelacion→Cancelación');

  return { zeroStats, hasLorem, hasPlaceholder, missingAccents };
}
```

### Per-page health check

**HTTP check** (fast, via curl):
```bash
Bash: curl -s -o /tmp/qa-website-page.html -w "%{http_code}\t%{time_total}" "http://localhost:3000/site/${SUBDOMAIN}"
```

**SEO metadata check** (via Chrome DevTools, on `$NEXTJS_PAGE_ID`):

```javascript
mcp__chrome-devtools__select_page → $NEXTJS_PAGE_ID
mcp__chrome-devtools__navigate_page → target URL
mcp__chrome-devtools__evaluate_script
function: () => {
  const title = document.title;
  const desc = document.querySelector('meta[name="description"]')?.content;
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
  const ogImage = document.querySelector('meta[property="og:image"]')?.content;
  const ogDesc = document.querySelector('meta[property="og:description"]')?.content;
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
  const jsonLdTypes = Array.from(jsonLd).map(s => {
    try { return JSON.parse(s.textContent)['@type']; } catch { return 'parse_error'; }
  });
  const h1 = document.querySelector('h1')?.textContent?.trim();
  return {
    title, desc, ogTitle, ogImage, ogDesc, canonical,
    jsonLdCount: jsonLd.length, jsonLdTypes, h1,
    hasTitle: !!title && title !== 'undefined',
    hasDesc: !!desc,
    hasOg: !!ogTitle && !!ogImage
  };
}
```

**Console error check** (after page load):
```
mcp__chrome-devtools__list_console_messages (types: ["error"])
```

**Blog post slug resolution** (for `blog_post` page):
```sql
mcp__supabase__execute_sql:
SELECT slug FROM website_blog_posts
WHERE website_id = '{website_id}' AND status = 'published'
ORDER BY published_at DESC LIMIT 1;
```

---

## 5A. NEXT.JS STUDIO DASHBOARD ROUTE MAP

The admin dashboard at `http://localhost:3000/dashboard` (Website Studio, 2026-03):

**Auth pages** (unauthenticated):

| Route | Component | Key elements |
|-------|-----------|-------------|
| `/login` | `app/(auth)/login/page.tsx` | Email/password form, Google OAuth, "Forgot password?" link |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Email input, success state |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | New password + confirm |
| `/auth/callback` | `app/(auth)/callback/route.ts` | OAuth code exchange |

**Dashboard pages** (authenticated, middleware guards `/dashboard/*`):

| Route | Tab | Key CTAs | What to observe |
|-------|-----|----------|-----------------|
| `/dashboard` | — | New website, Cmd+K search | Website cards (name, subdomain, status badge, last edited), empty state |
| `/dashboard/new` | — | Template grid (9 presets), Next, Create | 3-step wizard: template → name/subdomain → review. Subdomain availability check. |
| `/dashboard/[id]/pages` | Pages | Add page, Edit in Canvas, Delete, drag-reorder | Page list with type badges (Custom, Static, Category), dnd-kit sortable |
| `/dashboard/[id]/blog` | Blog | New post, status filters, bulk actions, grid/list toggle | Status chips (All/Published/Draft/Scheduled), search, pagination |
| `/dashboard/[id]/blog/[postId]` | Blog editor | Status select, SEO sidebar toggle | Auto-save indicator (Saving.../Saved), word count, reading time |
| `/dashboard/[id]/design` | Design | Preset cards (8), color picker, font pairs, radius slider | 3 sub-sections: Theme, Brand Kit, Structure. Live preview panel. |
| `/dashboard/[id]/content` | Content & SEO | Social links, SEO fields | Content + SEO & Scripts sub-tabs. Google preview mockup. Character counts. |
| `/dashboard/[id]/products` | Products | Star toggle (featured), type tabs | Hotels/Activities/Transfers tabs, search, product cards |
| `/dashboard/[id]/analytics` | Analytics | GTM/GA4/Pixel ID fields | Format validation (GTM-*, G-*, numeric) |
| `/dashboard/[id]/quotes` | Leads | Status filter, CSV export, bulk select/delete | Expandable rows, search, pagination, status dropdown per lead |
| `/dashboard/[id]/settings` | Settings | Subdomain edit, Delete website | General/Domain/Versions sub-tabs. Domain wizard (CNAME). Danger zone. |

**Navigation pattern**: Standard Next.js `<Link>` elements. Active tab detected by `pathname.includes()`. Animated tab underline via framer-motion `layoutId`. Tab bar in `WebsiteAdminLayout` (`components/admin/website-admin-layout.tsx`).

**Dashboard shell** (`components/admin/dashboard-shell.tsx`):
- AdminTopbar: user avatar, account name, Cmd+K trigger, logout
- AdminSidebar: collapsible, website tabs when viewing a website
- CommandPalette: modal search with keyboard navigation (Arrow keys, Enter, Escape)
- Offline banner: shown when `navigator.onLine === false`

**UX infrastructure**:
- Auto-save: `useAutosave` hook (2s debounce, 3 retries with exponential backoff)
- Dirty state: `useDirtyState` hook + `beforeunload` warning + DirtyDot in header
- Keyboard shortcuts: `useKeyboardShortcuts` hook (Cmd+S save, Cmd+K palette)
- Local backup: `useLocalBackup` hook (localStorage fallback when offline)

**Auth flow**:
1. Middleware at `middleware.ts` intercepts `/dashboard/*` requests
2. Creates Supabase SSR client via `@supabase/ssr` with cookie-based sessions
3. Checks `getSession()` — if no session, redirects to `/login?redirect=<original_path>`
4. Supports `?token=<jwt>` for Flutter-to-Dashboard handoff (sets session, strips token from URL)
5. Server components use `createSupabaseServerClient()` for data fetching
6. Client components use `createSupabaseBrowserClient()` singleton

---

## 5B. MODE: STUDIO — Dashboard-Only QA Loop

Tests ONLY the Next.js Studio dashboard. Skips Flutter entirely.

```
/qa-website studio                                 → Full studio QA loop
/qa-website studio max_cycles=5                    → With cycle limit
/qa-website studio template=studio_auth            → Specific studio template
```

### 5B.1 Preflight (STUDIO-lite)

Runs: 2.1 (analyze), 2.3 (Next.js), 2.3a (dashboard auth), 2.3b (feature flag), 2.6 (resolve website), 2.8a (dashboard health), 2.10-2.11 (artifacts).

Skips: 2.2 (Flutter), 2.4 (DTD), 2.5 (Flutter auth), 2.7 (Flutter health).

### 5B.2 Per-Cycle Steps

#### STEP 1: DASHBOARD TAB NAVIGATION (60s budget)

Switch to dashboard page:
```
mcp__chrome-devtools__select_page → $DASHBOARD_PAGE_ID
mcp__chrome-devtools__navigate_page → http://localhost:3000/dashboard/${WEBSITE_ID}/pages
```

Navigate through all 8 tabs by clicking tab links:

```
FOR each tab in [pages, blog, design, content, products, analytics, quotes, settings]:
  1. Navigate to /dashboard/${WEBSITE_ID}/${tab}
  2. Wait 2s for content to load
  3. Check page rendered (body text length > 100, no error messages)
  4. Check console errors
  5. Record: tab_slug, content_loaded (bool), console_errors
```

Compute `studio_nav_ok = tabs_with_content / 8`.

#### STEP 2: DASHBOARD INTERACT (60s budget)

For each tab, probe non-destructive CTAs:

| Tab | Safe probes | Avoid |
|-----|-------------|-------|
| Pages | Click "Add page" → close dialog without saving | Delete page |
| Blog | Click "New post" → cancel/back | Delete post |
| Design | Click theme preset, change color picker | — |
| Content | Edit fields (auto-save will trigger) | — |
| Products | Click type tabs, search | Toggle featured (modifies data) |
| Analytics | Fill/clear tracker IDs | — |
| Leads | Click status filters, search | Bulk delete |
| Settings | Click domain/versions sub-tabs | Delete website, change subdomain |

Compute `studio_crud_ok = successful_interactions / total_probed`.

#### STEP 3: NEXT.JS RENDER SCAN (60s budget)

Same as LOOP STEP 4 — probe public renderer pages.

#### STEP 4: CROSS-VALIDATION (60s budget)

Edit content in dashboard → save → verify on public renderer:
1. Navigate to `/dashboard/${WEBSITE_ID}/content`
2. Read current site name value
3. Switch to `$NEXTJS_PAGE_ID` → check public site title
4. Verify they match (or trigger ISR revalidation + re-check)

#### STEP 4B: UX VISUAL AUDIT (90s budget)

Same as LOOP STEP 5B. Take screenshots at key moments during dashboard navigation.
For STUDIO mode, focus on dashboard-specific UX:

1. **Dashboard home**: Website cards grid, empty state, topbar, sidebar
2. **Tab content**: Each of the 8 tabs after navigation
3. **Forms & inputs**: Design color picker, content fields, SEO editor
4. **Modals**: Create page dialog, confirm delete, command palette
5. **Responsive**: Resize to 375px → screenshot dashboard layout

Store in `web-public/qa-screenshots/studio-{run_id}-*.png`.

Apply the 10-point UX checklist from Section 6 STEP 5B.

#### STEP 5: LEARN (5s) — MANDATORY

Same as LOOP STEP 7. Append to playbook, TSV artifacts, update memory.

#### STEP 6: CYCLE DECISION

Same rules as LOOP STEP 8.

### 5B.3 STUDIO Scoring

```
studio_score = (
    studio_health * 0.50
  + render_health * 0.20
  + cross_validation * 0.15
  + seo_compliance * 0.10
  + console_clean * 0.05
)
```

### 5B.4 STUDIO Report

```
══════════════════════════════════════════════════════
 QA WEBSITE STUDIO — {subdomain}
 Run: {run_id} | Cycles: {N} | Score: {start} → {end}
══════════════════════════════════════════════════════
 AUTH
   Login:             {ok/failed}
   Session:           {cookie_name}

 DASHBOARD (:3000/dashboard)
   Tabs navigable:    {N}/8
   CRUDs working:     {N}/{total}
   Auto-save:         {ok/untested}
   Cmd+K palette:     {ok/untested}
   Console errors:    {count}

 PUBLIC RENDERER (:3000/site)
   Pages healthy:     {N}/{total}
   SEO compliance:    {%}

 CROSS-VALIDATION
   Dashboard → Public: {N}/{total} passed
══════════════════════════════════════════════════════
 Stop reason: {target_reached|budget_exceeded|plateau|max_cycles}
══════════════════════════════════════════════════════
```

---

## 6. MODE: LOOP — The Main Loop (Default)

### 6.1 Karpathy Invariants

1. **Budget fijo**: 8 min per cycle (builder tabs + Next.js probes + UX audit + cross-validation + fix)
2. **1 file per cycle**: multi-file → defer rest to next cycle
3. **Keep/discard binary**: score improved + quality gate pass = keep, else discard
4. **Auto-stop**: 5 consecutive cycles without `website_qa_score` improvement → plateau → stop (higher tolerance for overnight runs)
5. **Never idle**: loop until budget exhausted, max_cycles reached, or plateau
6. **UX audit**: Take screenshots at key moments, evaluate with expert UX checklist

**Time tracking**:
```bash
Bash: date +%s   # → store as $SESSION_START_EPOCH
# Before each cycle: check elapsed vs budget_minutes
```

### 6.2 Per-Cycle Steps

#### STEP 1: BUILDER TAB NAVIGATION (60s budget)

Switch to Flutter page:
```
mcp__chrome-devtools__select_page → $FLUTTER_PAGE_ID
mcp__chrome-devtools__navigate_page → http://localhost:8080/#/website
```

Wait for load, then navigate through all 6 tabs:

```
FOR tab_index = 0 to 5:
  1. take_snapshot → find tab uid by label
  2. Click tab uid
  3. Wait 2s (5s for Diseño & Marca sub-tabs)
  4. Check content loaded (form fields, buttons, or StaticText present)
  5. For tabs with sub-tabs (index 2, 3): also click each radio sub-tab
  6. Record: tab_label, content_loaded (bool), sub_tabs found, ctas found
```

Compute `builder_nav = tabs_with_content / 6`.

#### STEP 2: BUILDER OBSERVE (30s budget)

On the current tab, collect labels and CTAs using the same `collect()` + `collectInteractive()` pattern from `/qa` STEP 2 OBSERVE.

Check console errors on Flutter side:
```
mcp__chrome-devtools__list_console_messages (types: ["error"])
```

Classify errors. Record violations found in each tab.

#### STEP 3: BUILDER INTERACT (60s budget)

Probe non-destructive CTAs per tab. Safe probes:

| Tab | Safe probes | Avoid |
|-----|-------------|-------|
| Diseño | Open color picker, select preset | — |
| Marca | — (uploads are destructive) | Logo upload |
| Contenido | Click edit fields | — |
| Secciones | Open "Add section" modal, close without saving | Delete section |
| Páginas | Open page list, click create (close without saving) | Delete page |
| Productos | Open product filter dropdowns | Toggle assignment |
| Landings | View landing list | — |
| Blog | Open "Create post" form (close without saving) | Delete post |
| Cotizaciones | Apply status filters | — |
| Analytics | — (read-only) | — |
| Versiones | View version list | Restore version |

For each CTA:
```
1. take_snapshot → find CTA uid
2. Click → wait 3s
3. Check: modal opened? content changed? error?
4. If modal opened → verify structure → close modal
5. Record in playbook (entry type "interaction")
```

Compute `builder_interaction = responsive_ctas / total_probed`.

#### STEP 4: NEXT.JS RENDER SCAN (90s budget)

Switch to Next.js page:
```
mcp__chrome-devtools__select_page → $NEXTJS_PAGE_ID
```

For each page in the page map (Section 5):

```
1. curl HTTP status + load time
2. Navigate in Chrome DevTools
3. Collect SEO metadata
4. Check console errors
5. Record to qa-website-render.tsv
```

Compute:
- `render_health = pages_200 / total_pages`
- `seo_compliance = present_meta_tags / expected_meta_tags`
- `blog_health = blog_checks_passed / total_blog_checks`

Blog checks:
- Blog listing page loads (HTTP 200)
- At least 1 published post exists (from DB query)
- Post detail page loads
- Post has `<h1>` and content

#### STEP 5: CROSS-VALIDATION (60s budget)

**Only runs if both servers are healthy.**

Pick verifiable field from Flutter Contenido tab (index 3):

```
1. Switch to $FLUTTER_PAGE_ID
2. Navigate to /website, click Contenido tab
3. take_snapshot → find site name field value
4. Store as $FLUTTER_SITE_NAME
5. Switch to $NEXTJS_PAGE_ID
6. Navigate to http://localhost:3000/site/{subdomain}
7. Extract <title> or <h1> from page
8. Compare: does Next.js title contain $FLUTTER_SITE_NAME?
```

If mismatch, trigger ISR revalidation:
```bash
Bash: curl -s -X POST "http://localhost:3000/api/revalidate" \
  -H "Content-Type: application/json" \
  -d '{"subdomain":"${SUBDOMAIN}"}'
```

Wait 5s, re-check. Record in `qa-website-cross.tsv`.

Compute `cross_validation = verified / attempted`.

#### STEP 5B: UX VISUAL AUDIT (90s budget)

> **PURPOSE**: Take screenshots at key moments and evaluate them as a UX expert.
> Detect visual inconsistencies, broken layouts, misaligned elements, contrast issues,
> and UX anti-patterns that are invisible in the accessibility tree / HTML.

**When to take screenshots** (momentos clave):

| Moment | Context | What to evaluate |
|--------|---------|-----------------|
| Tab load | After each tab renders (2s wait) | Layout integrity, empty states, loading skeletons |
| After action | After save/create/delete completes | Success feedback, state change, button state |
| Modal open | When dialog/modal appears | Centering, backdrop, content fit, close button |
| Error state | When error/warning appears | Error message clarity, recovery path |
| Mobile viewport | After resize to 375px width | Responsive layout, text overflow, touch targets |

**Screenshot capture**:
```
mcp__chrome-devtools__take_screenshot
```

**UX evaluation checklist** (apply to EACH screenshot):

```
FOR each screenshot:
  EVALUATE as UX expert:
  1. LAYOUT:    Elements aligned? No overflow/clipping? Proper spacing?
  2. TYPOGRAPHY: Readable font sizes? Proper hierarchy (h1 > h2 > body)?
  3. CONTRAST:  Text readable against background? WCAG AA compliance?
  4. FEEDBACK:  Loading states visible? Success/error indicators clear?
  5. EMPTY:     Empty states informative? Call-to-action present?
  6. OVERFLOW:  Text truncated properly? No horizontal scroll?
  7. BUTTONS:   Disabled states clear? Hover/active states?
  8. SPACING:   Consistent padding/margins? No cramped elements?
  9. ICONS:     Meaningful? Properly sized? Aligned with text?
  10. MOBILE:   Touch targets ≥44px? No overlapping elements?
```

**Record findings**:

```jsonl
{"type":"ux_audit","route":"/dashboard/{id}/pages","screenshot":"qa-screenshots/cycle-{N}-pages.png","findings":["spacing inconsistent between cards","empty state lacks icon"],"severity":"P2","ux_score":8,"updated":"ISO-8601"}
```

**UX score per screenshot** (0-10):
- 10: Pixel-perfect, premium feel
- 8-9: Minor issues (spacing, alignment)
- 6-7: Noticeable issues (overflow, contrast)
- 4-5: Significant UX problems (broken layout, missing feedback)
- 0-3: Unusable (blank screen, crash, critical overlap)

**Aggregate**: `ux_visual_score = avg(screenshot_scores)` — stored in playbook.

**Screenshot storage**:
```bash
Bash: mkdir -p web-public/qa-screenshots
```

Screenshots saved as `qa-screenshots/{run_id}-{context}-{timestamp}.png`.

> **CRITICAL for overnight runs**: Screenshots are the PRIMARY evidence of what was tested.
> Without them, a 10-hour run produces only numbers. WITH them, you can review every
> screen the agent visited and evaluate UX quality the next morning.

**DEEP JOURNEY screenshots** (5 journeys, 3-5 screenshots each):

1. **Create website journey**: wizard step 1 → step 2 → step 3 → success → redirect
2. **Edit content journey**: content tab → edit field → auto-save indicator → public site verification
3. **Blog management journey**: blog list → new post → editor → publish → public blog
4. **Design change journey**: design tab → preset click → live preview → public site with new theme
5. **Settings danger zone**: settings tab → delete button → confirmation dialog → cancel

Each journey takes 3-5 screenshots at key transitions. Evaluate transition smoothness,
loading states, and visual consistency across the flow.

---

#### STEP 6: FIX (120s budget, if issues exist)

Same escalation as `/qa`:

| Complexity | Criteria | Action |
|-----------|----------|--------|
| SIMPLE | Missing Semantics label, hardcoded string | Fix directly |
| MODERATE | Console error traceable to widget | Fix single file |
| COMPLEX | Cross-runtime issue, architectural | Log to backlog, skip |

**Quality gate** (after fix):
```bash
Bash: dart analyze $EDITED_FILE 2>&1 | grep "error •" | head -5
```

If error → DISCARD (`git checkout -- $EDITED_FILE`).
If clean + score improved → KEEP (`git add + git commit`).

#### STEP 7: LEARN (5s) — MANDATORY, NEVER SKIP

> **CRITICAL**: Execute this step IMMEDIATELY after each cycle. Do NOT defer to final report.
> Write to playbook THE MOMENT a discovery is made — unsaved learnings are lost if session interrupts.

**7a. Playbook** — Append to `qa-website-playbook.jsonl`:

```jsonl
{"type":"builder_tab","tab_index":N,"tab_label":"...","content_loaded":true,"aria_count":N,"ctas":["..."],"updated":"ISO-8601"}
{"type":"nextjs_page","page":"home","http_status":200,"render_ok":true,"json_ld_count":3,"seo_ok":true,"load_time_ms":N,"updated":"ISO-8601"}
{"type":"cross_validation","field":"site_name","flutter_value":"...","nextjs_value":"...","match":true,"revalidation_needed":false,"updated":"ISO-8601"}
```

If a fix was applied, also append:
```jsonl
{"type":"fix_applied","key":"{issue_key}","value":"{what was fixed and how}","confidence":1.0,"source":"qa-website","updated":"ISO-8601"}
{"type":"pattern","key":"{diagnostic_pattern}","value":"{what was learned}","confidence":1.0,"source":"qa-website","updated":"ISO-8601"}
```

If a tab_audit status changed (blocked→healthy), append updated entry overriding old one.

**7b. TSV artifacts** — Record cycle to `qa-website-results.tsv`. Compute `website_qa_score`.

**7c. Known issues** — If a fix resolves a known issue (Section 7.3 or Section 18), update BOTH tables in this file immediately.

**7d. Memory** — If the fix reveals a new architectural pattern or changes a known issue status, update `memory/qa-website-learnings.md`.

#### STEP 8: CYCLE DECISION

```
IF website_qa_score improved → continue
IF 5 consecutive cycles without improvement → plateau → STOP
IF elapsed >= budget_minutes → STOP
IF website_qa_score >= 95 → STOP (success)
ELSE → next cycle
```

> **Overnight run tip**: Use `max_cycles=200 budget_minutes=480` for 8-hour overnight runs.
> Or use `/loop 30m /qa-website studio max_cycles=50` for resilient overnight testing.
> The higher plateau tolerance (5 cycles vs 3) prevents premature stopping on long runs
> where the agent explores different areas each cycle.

---

## 7. MODE: SCAN (Read-Only Audit)

No code changes. Comprehensive read-only audit across both runtimes.

### 7.1 Flutter Builder Scan

Navigate all 6 tabs (+ sub-tabs in Diseño & Marca, Contenido & SEO). For each tab:
1. Click tab
2. Wait for content
3. Collect labels + CTAs (same as LOOP STEP 2)
4. Record violations, empty labels, code identifiers
5. Screenshot

### 7.2 Next.js Render Scan

For each page in the page map:
1. curl HTTP status + load time
2. Navigate in Chrome DevTools
3. Collect SEO metadata
4. Check console errors
5. Check for placeholder/hardcoded content:

```javascript
mcp__chrome-devtools__evaluate_script
function: () => {
  const body = document.body.innerText || '';
  const hasLorem = /lorem ipsum/i.test(body);
  const hasPlaceholder = /placeholder|sample|example text/i.test(body);
  const hasTodo = /TODO|FIXME|HACK/i.test(body);
  return { hasLorem, hasPlaceholder, hasTodo, bodyLength: body.length };
}
```

### 7.3 Known Issues Check

Auto-detect open roadmap items:

| Issue | Detection | Report as |
|-------|-----------|-----------|
| 1.4 Domain onboarding | Contenido tab has "Dominio personalizado" field but no DNS verification UI | `known_open: domain_onboarding` |
| 1.5 Hardcoded content | Placeholder text in Next.js product pages | `known_open: hardcoded_content` |
| 2.1 Multi-language | No `hreflang` tags in Next.js HTML | `known_open: multi_language` |
| ~~4.1 Secciones data loading~~ | **RESOLVED (2026-03-20)**: `BukeerInfoBanner` `width: double.infinity` in Row → silent crash. Fixed with `Flexible` wrapper. | `resolved: secciones_rendering` |
| 4.2 Editor CSP | Tab 0 iframe blocked by CSP frame-ancestors (localhost port mismatch) | `known_bug: editor_csp` |

> **RESOLVED (2026-03-19)**: Analytics tab (index 10) is fully implemented with GTM, GA4,
> Facebook Pixel, and custom script fields. Remove `2.3 Analytics dashboard` from known issues.

These are reported but NOT treated as failures.

### 7.4 SCAN Report

```
══════════════════════════════════════════════════════
 QA WEBSITE SCAN — {subdomain}
 Date: {date}
══════════════════════════════════════════════════════
 FLUTTER BUILDER (:8080)
   Tabs navigable:       {N}/6
   Semantics violations: {count}
   Empty labels:         {count}
   CTAs found:           {count}
   Console errors:       {count}

 NEXT.JS RENDERER (:3000)
   Pages healthy:        {N}/{total}
   SEO compliance:       {%}
   JSON-LD schemas:      {count}
   Console errors:       {count}
   Placeholder content:  {found/none}

 KNOWN OPEN ISSUES (from roadmap)
   1.4 Domain onboarding:   {detected/not_checked}
   1.5 Hardcoded content:   {detected/clean}
   2.1 Multi-language:      {missing hreflang}
   ~~4.1 Secciones data~~:   RESOLVED (2026-03-20)
   4.2 Editor CSP:          {blocked/ok}

 Tab-by-tab breakdown:
   0 Páginas:           {status}  ctas:{N}
   1 Blog:              {status}  ctas:{N}
   2 Diseño & Marca:    {status}  sub-tabs:{3}  ctas:{N}
   3 Contenido & SEO:   {status}  sub-tabs:{3}  ctas:{N}
   4 Productos:         {status}  ctas:{N}
   5 Analytics:         {status}  ctas:{N}

 Page-by-page breakdown:
   home:        {http_status}  {load_time}ms  SEO:{ok/missing}  JSON-LD:{N}
   blog:        {http_status}  {load_time}ms  SEO:{ok/missing}  JSON-LD:{N}
   ...
══════════════════════════════════════════════════════
```

---

## 8. MODE: FIX

Reads `qa-improvement-backlog.tsv` filtered by `source=qa-website` or `module=website`.

```bash
Bash: grep -E 'qa-website|website' qa-improvement-backlog.tsv | grep 'open' | head -10
```

For each open issue:
1. Read the file mentioned in `suggested_fix`
2. Apply fix (SIMPLE only — MODERATE/COMPLEX require human approval)
3. Quality gate (analyze + test)
4. Keep/discard
5. Update backlog status

Same cycle limit and budget constraints as LOOP.

---

## 9. MODE: TEST — Journey Templates

### 9.1 `create_website` (if no website exists)

```
1. Navigate to /website → verify empty state ("Crea tu Sitio Web")
2. Find and click "Crear Sitio Web" or "Crear" button
3. Setup wizard should appear (website_setup_wizard.dart):
   - Step 1: Name + subdomain
   - Step 2: Agency info
   - Step 3: Theme preset
   - Step 4: AI generation
4. Fill wizard fields (use test data)
5. Submit → verify website created
6. Verify: tabs appear, Contenido tab has data
7. Switch to Next.js → verify http://localhost:3000/site/{new_subdomain} loads
```

**Score**: wizard_opens(+2) + fields_fillable(+2) + submit_works(+2) + tabs_appear(+2) + nextjs_renders(+2) = /10

### 9.2 `edit_theme`

```
1. Navigate to /website, click "Diseño & Marca" tab (index 2)
2. Verify "Diseño" sub-tab selected (radio checked)
3. take_snapshot → find theme presets (8 named: Romantico, Eco, Cultural, Boutique, Corporativo, Tropical, Lujo, Aventura)
4. Click a preset → confirmation dialog appears ("Aplicar X")
5. Cancel (non-destructive) OR apply + save
6. Test preview modes: click "Oscuro" radio
7. Switch to Next.js → check CSS vars: --primary, --secondary, --background
```

**Score**: tab_loads(+2) + controls_interactive(+2) + save_works(+2) + nextjs_reflects(+4) = /10

### 9.3 `manage_blog`

Two phases: Flutter blog management + Next.js TipTap WYSIWYG editor.

#### Phase A: Flutter blog CRUD

```
1. Navigate to /website, click Blog tab (index 1)
2. Verify blog post list loads
3. Find "Create post" CTA → click
4. Fill: title, content (brief), set status=published
5. Save
6. Switch to Next.js → navigate to /site/{subdomain}/blog
7. Verify new post appears in listing
8. Navigate to post detail → verify content renders
```

#### Phase B: TipTap WYSIWYG editor (Next.js)

**Pre-requisite**: Get a valid websiteId + postId from Phase A or from DB:
```bash
Bash: curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/website_blog_posts?select=id,website_id,title&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $AUTH_TOKEN" | head -1
```

**STEP B1: TipTap editor loads with existing post**
```
1. Navigate to http://localhost:3000/editor/{websiteId}/blog/{postId}?mode=standalone
2. Wait 5s for editor to initialize
3. take_snapshot → verify:
   - `[data-testid="blog-title-input"]` input with post title value
   - `[data-testid="tiptap-wrapper"]` exists (TipTap mounted)
   - `[data-testid="tiptap-editor"]` has content (not placeholder text)
   - AI toolbar visible: buttons /draft, /draft-v2, /improve, /seo, /translate EN, /translate PT
   - Status bar shows word count + "WYSIWYG · Markdown"
   - NO raw Markdown syntax visible (no `##`, `**`, `- ` in rendered content)
```
Record: `tiptap_loads` (pass/fail), word count visible.

**STEP B2: WYSIWYG formatting — toolbar buttons**
```
1. Click inside the TipTap editor area
2. Type "QA Test Heading" and select the text
3. take_snapshot → verify BubbleMenu appears (`.tiptap-bubble-menu`)
4. Click toolbar-bold button `[data-testid="toolbar-bold"]`
5. take_snapshot → verify bold button has `is-active` class
6. Click toolbar-h2 button `[data-testid="toolbar-h2"]`
7. take_snapshot → verify:
   - `<h2>` element exists in editor content
   - toolbar-h2 button has `is-active` class
8. Click toolbar-blockquote `[data-testid="toolbar-blockquote"]`
9. take_snapshot → verify `<blockquote>` element in editor
```
Record: `bubble_menu_appears` (pass/fail), `formatting_works` (pass/fail), buttons tested count.

**STEP B3: Keyboard shortcuts**
```
1. Click inside TipTap editor, select some text
2. press_key "Control+b" → take_snapshot → verify bold toggled
3. Type new text, select it
4. press_key "Control+i" → take_snapshot → verify italic toggled
```
Record: `keyboard_shortcuts` (pass/fail).

**STEP B4: Markdown roundtrip — content persists as Markdown**
```
1. In TipTap editor, clear content and type:
   "## Test Heading\n\nThis is **bold** and *italic* text.\n\n- Item 1\n- Item 2"
2. Click "Guardar borrador" button
3. Wait 3s
4. Query DB to verify stored content is Markdown:
   mcp__supabase__execute_sql:
     SELECT content FROM website_blog_posts WHERE id = '{postId}'
5. Verify result contains `## Test Heading` and `**bold**` (raw Markdown, not HTML)
```
Record: `markdown_roundtrip` (pass/fail).

**STEP B5: AI buttons inject content into WYSIWYG**
```
1. Fill title input with "Los mejores destinos de Colombia 2026"
2. Click [data-testid="ai-draft"] button
3. Wait up to 30s for "Generando..." to disappear
4. take_snapshot → verify:
   - TipTap editor has content (not empty)
   - Content is rendered as WYSIWYG (headings visible as formatted text, not `##`)
   - Word count in status bar > 0
5. If AI call fails (no auth token in standalone), record as `ai_buttons=skip` (non-blocking)
```
Record: `ai_buttons` (pass/fail/skip).

**STEP B6: Cross-runtime validation — TipTap save → Next.js render**
```
1. Edit content in TipTap: add a unique marker paragraph "QA-TIPTAP-{timestamp}"
2. Click "Publicar"
3. Wait 3s
4. Switch to Next.js public → /site/{subdomain}/blog/{slug}
5. Verify the marker text "QA-TIPTAP-{timestamp}" appears in rendered page
6. Verify formatted content (bold, headings, lists) renders correctly in public view
```
Record: `tiptap_to_nextjs` (pass/fail).

**Score**: list_loads(+1) + create_form(+1) + save_works(+1) + nextjs_listing(+1) + nextjs_detail(+1) + tiptap_loads(+1) + formatting_works(+1) + keyboard_shortcuts(+0.5) + markdown_roundtrip(+1) + ai_buttons(+0.5) + tiptap_to_nextjs(+1) = /10

### 9.4 `manage_pages`

```
1. Navigate to /website, click Páginas tab (index 0)
2. Verify page list loads
3. Find "Create page" CTA → click
4. Fill: title, slug, set published
5. Save
6. Switch to Next.js → navigate to /site/{subdomain}/{slug}
7. Verify page renders
```

**Score**: list_loads(+2) + create_form(+2) + save_works(+2) + nextjs_renders(+4) = /10

### 9.5 `manage_products`

```
1. Navigate to /website, click Productos tab (index 4)
2. Verify product type radio filters load (Hoteles, Actividades, Traslados)
3. Click each type radio → verify product cards appear
4. Check product cards with names and "Destacado" badges
5. Switch to Next.js → check category pages (/actividades, /hoteles)
```

**Score**: products_load(+2) + types_visible(+2) + landings_load(+2) + nextjs_landing(+4) = /10

### 9.6 `manage_quotes` — DEPRECATED

> **Removed (2026-03)**: Cotizaciones tab was removed in the 6-tab UX redesign.
> Quotes are now handled through the CRM integration (see `project_website_quotes_integration.md`).
> This template is skipped when `template=all` runs.

**Score**: N/A

### 9.7 `ai_generate`

```
1. Navigate to /website → Puck editor (via Páginas → Editar) or Blog → TipTap AI buttons
2. Find AI generation CTA (if present)
3. Trigger generation
4. Wait for response (may take 10-30s via Edge Function)
5. Verify section content appears
```

**Score**: tab_loads(+2) + ai_cta_found(+2) + generation_triggered(+2) + content_appears(+4) = /10

### 9.8 `cross_validate`

The cross-runtime validation journey:

```
1. Switch to Flutter → "Contenido & SEO" tab (index 3) → "Contenido" sub-tab
2. Read current site description
3. Modify description (append " - QA Test" or similar)
4. Save
5. Trigger ISR revalidation
6. Switch to Next.js → homepage
7. Extract meta description
8. Verify it matches updated value
9. Revert description (remove " - QA Test")
10. Save + revalidate again
```

**Score**: read_ok(+1) + modify_ok(+2) + save_ok(+2) + revalidate_ok(+1) + nextjs_matches(+3) + revert_ok(+1) = /10

### 9.9 `puck_editor`

Tests the Puck visual editor integration (Phase 1+2). Uses **MCP snapshot + fill + click** directly on nested iframe UIDs — no JS injection needed.

> **KEY DISCOVERY**: MCP `take_snapshot` reads the accessibility tree across nested iframes (even cross-origin). `fill()`, `click()`, `press_key()` work on UIDs from nested iframes. This is the primary interaction method.

**Pre-check**: Verify Puck is enabled:
```bash
Bash: grep 'NEXT_PUBLIC_PUCK_EDITOR' web-public/.env.local 2>/dev/null || echo "PUCK_NOT_CONFIGURED"
```

If `PUCK_NOT_CONFIGURED` → skip this template with score 0, note "Puck not enabled".

#### STEP 1: Navigate + verify Puck loads (snapshot-based)

Navigate to `/website`, click Páginas tab (index 0), click "Editar" button on homepage card → navigates to `/website/editor/{websiteId}`. Wait 8s for Puck iframe to load. `take_snapshot`.

**Verify in snapshot**:
- Tab "Editor" selectable selected
- Tabpanel contains `Iframe` with URL `/editor/{websiteId}`
- NO "Inspector" or "Conectando con el canvas" text (Puck hides inspector)
- Puck header banner with:
  - `heading "Inicio"` — page title
  - `button "Inicio ▼"` — Phase 2 page selector
  - `button "Preview"` — preview toggle
  - `StaticText "✓ Guardado"` — status indicator
  - `button "Guardar borrador" disabled` — save (disabled = no changes)
  - `button "Publicar"` — publish
- `heading "Components"` — left sidebar with categories:
  - HERO, PRODUCTOS, CONTENIDO, SOCIAL PROOF, CONVERSION, MEDIA, BLOG, INFORMACION
  - Each with draggable buttons (`roledescription="draggable"`)
- `heading "Outline"` — section outline (Destinos, Hoteles, etc.)
- Inner `Iframe` with `roledescription="draggable"` buttons = rendered sections
- `heading "Page"` — right panel with root fields

Record: `puck_loads` (pass/fail), component count, section count.

#### STEP 2: Click section → Fields panel opens

```
take_snapshot → find first draggable section in inner Iframe (e.g., "Explora Destinos...")
mcp__chrome-devtools__click(uid) → includeSnapshot=true
```

**Verify in snapshot**:
- Right panel heading changes to section name (e.g., "Destinos")
- `textbox "Titulo"` appears with value (e.g., "Explora Destinos Inolvidables")
- `textbox "Subtitulo"` appears with value
- `button "Duplicate"` and `button "Delete"` appear near the section

Record: field count, field values.

#### STEP 3: Edit field → dirty state

```
mcp__chrome-devtools__fill(uid_of_titulo_textbox, "Original Title QA-TEST")
```

> **IMPORTANT**: `fill()` APPENDS to React inputs in Puck, doesn't replace.
> To add a marker: fill with `{original_value} QA-TEST`
> To fully replace: this requires same-origin iframe access (evaluate_script).

**Verify in snapshot after fill**:
- `textbox "Titulo" value="...QA-TEST"` — field updated
- `StaticText "● Sin guardar"` — status changed from Guardado to dirty
- `button "Guardar borrador"` — no longer disabled
- Inner Iframe preview shows updated text

Record: `iframe_edit` (pass if dirty state detected).

#### STEP 4: Click save → verify status

```
mcp__chrome-devtools__click(uid_of_guardar_button) → includeSnapshot=true
```

**Immediate snapshot** should show:
- `StaticText "Guardando..."` — save in progress
- Buttons disabled

Wait 4s, `take_snapshot` again:
- `StaticText "✓ Guardado"` — save complete
- `button "Guardar borrador" disabled` — back to disabled

Record: `save_flow` (pass if status returns to Guardado).

#### STEP 5: Verify save persisted in DB

```sql
mcp__supabase__execute_sql:
SELECT content->>'title' as title FROM website_sections
WHERE website_id = '{website_id}' AND section_type = '{section_type}'
ORDER BY display_order LIMIT 1;
```

Check if title contains 'QA-TEST' → `save_persisted` (pass/fail).

#### STEP 6: Revert via DB (reliable, no iframe manipulation)

```sql
mcp__supabase__execute_sql:
UPDATE website_sections
SET content = jsonb_set(content, '{title}', '"Original Title Without QA-TEST"')
WHERE website_id = '{website_id}' AND section_type = '{section_type}';
```

> **WHY DB revert**: MCP `fill()` appends to React inputs. `press_key(Meta+A)` doesn't
> propagate cross-iframe reliably. DB revert is instant and deterministic.

#### STEP 7: Test preview toggle

```
take_snapshot → find "Preview" button uid → click(uid, includeSnapshot=true)
```

**Verify**:
- `banner` element appeared (SiteHeader with navigation links)
- `contentinfo` element appeared (SiteFooter with copyright, "Creado con Bukeer")
- Button changed from "Preview" to "Editar"

```
click("Editar" uid) → take_snapshot
```

**Verify**: banner/contentinfo gone, back to edit mode.

Record: `preview_toggle` (pass/fail).

#### STEP 8: Test tab keep-alive (AutomaticKeepAliveClientMixin)

```
take_snapshot → click Diseño tab uid → wait 2s
take_snapshot → click Editor tab uid → wait 3s → take_snapshot
```

**Verify after return to Editor**:
- Puck STILL rendered (Iframe with /editor/ URL present)
- NO "Conectando con el editor..." text
- Draggable sections still present
- Status shows "Guardado" (not re-loading)

```
Repeat: click Secciones tab → wait 2s → click Editor tab → take_snapshot
```

**Verify**: Puck survives 2 round-trips without reconnect.

Record: `tab_keepalive` (pass if Puck renders on both returns).

#### STEP 9: Test page selector (Phase 2)

```
take_snapshot → find "Inicio ▼" button uid → click(uid, includeSnapshot=true)
```

**Verify dropdown opened**:
- New elements appear: buttons for each page ("Inicio", page names)
- Each page shows title + type badge

```
click("Inicio ▼" again to close) or click outside
```

Record: `page_selector` (pass if dropdown opens with page list).

#### STEP 10: Console errors

```
mcp__chrome-devtools__list_console_messages (types: ["error"], pageSize: 10)
```

Classify per Section 3 rules. `asset_noise` (404 for .png/.ico) doesn't count.

Record: `no_console_errors` (pass if 0 runtime/API errors).

---

**Score breakdown**:

| Criterion | Points | Method |
|-----------|--------|--------|
| `puck_loads` | +1 | STEP 1: snapshot has header + draggable sections |
| `inspector_hidden` | +1 | STEP 1: no Inspector panel in snapshot |
| `header_actions` | +0.5 | STEP 1: Preview/Guardar/Publicar/PageSelector |
| `iframe_edit` | +1.5 | STEP 3: fill() → dirty state ("Sin guardar") |
| `save_flow` | +1.5 | STEP 4: click save → "Guardando..." → "Guardado" |
| `save_persisted` | +1 | STEP 5: DB query confirms QA-TEST |
| `preview_toggle` | +0.5 | STEP 7: header/footer appear/disappear |
| `tab_keepalive` | +1 | STEP 8: 2 round-trips, no reconnect |
| `page_selector` | +1 | STEP 9: dropdown opens with pages |
| `no_console_errors` | +1 | STEP 10: 0 runtime errors |

**Score**: total /10

**Key patterns** (from QA runs):
- `fill()` works on nested iframe UIDs via accessibility tree (even cross-origin)
- `fill()` APPENDS to React inputs — plan for this in test values
- Revert changes via DB SQL, not UI manipulation
- `click()` on draggable sections opens Puck Fields panel
- Status transitions: "✓ Guardado" → "● Sin guardar" → "Guardando..." → "✓ Guardado"
- Page selector visible as "Inicio ▼" in Puck header (Phase 2)

---

## 9A. STUDIO TEST TEMPLATES (Dashboard-specific)

### 9.10 `studio_auth`

```
1. Navigate to http://localhost:3000/dashboard (unauthenticated)
2. Verify redirect to /login?redirect=/dashboard
3. Verify login page renders ("Website Studio" heading, email/password inputs)
4. Fill email + password (QA credentials)
5. Click "Sign in" → verify redirect to /dashboard
6. Verify DashboardShell renders (userName, accountName visible in topbar)
7. Test forgot-password: navigate to /forgot-password, verify form
8. Test logout: click avatar → "Sign out" → verify redirect to /login
```

**Score**: redirect_to_login(+1) + login_form(+1) + login_success(+2) + dashboard_renders(+2) + forgot_password(+1) + user_info_shown(+1) + logout(+2) = /10

### 9.11 `studio_dashboard`

```
1. Navigate to /dashboard (authenticated)
2. Verify website cards render (WebsiteCard components with hover effects)
3. Check card metadata: name, subdomain, status badge, last edited date
4. Click "New website" button → verify /dashboard/new loads
5. Navigate back to /dashboard
6. Test Cmd+K: press Meta+k → verify command palette opens
7. Type website name in palette search → verify results appear
8. Press Escape → verify palette closes
9. If no websites: verify EmptyState with "Create your first website" + action button
```

**Score**: cards_render(+2) + metadata_correct(+1) + new_website_nav(+1) + cmd_palette_opens(+2) + search_works(+2) + palette_close(+1) + empty_state(+1) = /10

### 9.12 `studio_wizard`

```
1. Navigate to /dashboard/new
2. Step 0: Verify 9 template presets render (blank + 8 themed with color swatches)
3. Click a preset (e.g., "Corporate") → verify auto-advance to step 1
4. Step 1: Fill website name → verify subdomain auto-generates from name
5. Verify subdomain availability check runs (no error message)
6. Click "Next" → verify step 2 (Review) shows
7. Step 2: Verify template name, website name, and subdomain URL displayed
8. Click "Create website" → verify loading spinner appears
9. Verify success state ("Website created!" with confetti) or redirect to /dashboard/{id}/pages
```

**Score**: presets_render(+1) + step_advance(+1) + name_fills(+1) + subdomain_auto(+1) + availability_check(+1) + review_correct(+1) + create_button(+1) + creation_succeeds(+2) + redirect_ok(+1) = /10

### 9.13 `studio_pages`

```
1. Navigate to /dashboard/{websiteId}/pages
2. Verify page list renders (or empty state)
3. Verify "Add page" button visible
4. Click "Add page" → verify create dialog appears
5. Fill title → verify slug auto-generates
6. Close dialog without saving (non-destructive)
7. Check tab navigation: verify "Pages" tab is active (underline indicator)
8. Check for drag-reorder indicators on page rows (drag handle icons on hover)
```

**Score**: list_loads(+2) + add_button(+1) + dialog_opens(+2) + slug_auto(+1) + tab_active(+1) + drag_handles(+1) + page_type_badges(+1) + row_actions(+1) = /10

### 9.14 `studio_blog`

```
1. Navigate to /dashboard/{websiteId}/blog
2. Verify blog list or empty state renders
3. Test status filter chips (click "draft" → verify active state)
4. Test grid/list view toggle
5. Click "New post" → verify redirect to blog editor
6. In editor: verify title input, content area, auto-save indicator
7. Verify SEO sidebar (toggle visibility, check fields)
8. Verify word count + reading time in footer
```

**Score**: list_loads(+1) + filters_work(+1) + view_toggle(+1) + new_post_redirect(+1) + editor_loads(+2) + autosave_visible(+1) + seo_sidebar(+2) + word_count(+1) = /10

### 9.15 `studio_design`

```
1. Navigate to /dashboard/{websiteId}/design
2. Verify Theme sub-section active by default
3. Verify 8 preset cards render with color swatches
4. Click a preset → verify color picker updates
5. Verify font pair selector (4 options)
6. Verify border radius slider
7. Verify live preview panel updates with theme changes
8. Switch to "Brand Kit" sub-section → verify logo + mood controls
9. Switch to "Structure" sub-section → verify header/footer variant selectors
```

**Score**: presets_render(+1) + preset_click(+1) + color_picker(+1) + fonts(+1) + radius_slider(+1) + live_preview(+2) + brand_kit(+1) + structure(+1) + sub_tab_switch(+1) = /10

### 9.16 `studio_content`

```
1. Navigate to /dashboard/{websiteId}/content
2. Verify Content sub-section: site name, tagline, contact info, social links
3. Edit site name field → verify character count updates
4. Verify social platform inputs (7 platforms)
5. Switch to "SEO & Scripts" sub-section
6. Verify meta title + description fields with character counts
7. Verify Google preview mockup updates when editing
8. Check custom scripts textareas (head + body)
```

**Score**: content_loads(+1) + fields_editable(+2) + char_counts(+1) + social_links(+1) + seo_section(+1) + google_preview(+2) + scripts_fields(+1) + sub_tab_switch(+1) = /10

### 9.17 `studio_leads`

```
1. Navigate to /dashboard/{websiteId}/quotes
2. Verify leads table or empty state
3. Test status filter chips (new, contacted, converted, archived)
4. Test search input (type text → results filter)
5. Test CSV export button → verify download triggers
6. Click a lead row → verify expanded detail view
7. Test status dropdown change on a lead (non-destructive: change + revert)
```

**Score**: table_loads(+2) + filters(+1) + search(+1) + csv_export(+1) + row_expand(+2) + status_change(+2) + pagination(+1) = /10

### 9.18 `studio_settings`

```
1. Navigate to /dashboard/{websiteId}/settings
2. Verify General sub-section: subdomain field + .bukeer.com suffix
3. Verify danger zone (red background, unpublish + delete buttons)
4. Switch to Domain sub-section → verify domain wizard step 1
5. Switch to Version History → verify timeline or empty state
6. Test subdomain edit: type new value → verify availability check (non-destructive: don't save)
7. Test delete button → verify confirmation dialog with type-to-confirm
```

**Score**: general_loads(+2) + subdomain_field(+1) + danger_zone(+1) + domain_wizard(+2) + version_history(+1) + subdomain_check(+1) + delete_confirm(+2) = /10

### 9.19 `studio_cross_validate`

```
1. Navigate to /dashboard/{websiteId}/content
2. Read current site name from content editor
3. Append " QA-TEST-{timestamp}" to site name → auto-save triggers (wait 3s)
4. Trigger ISR revalidation: POST /api/revalidate with subdomain
5. Wait 5s
6. Switch to $NEXTJS_PAGE_ID → navigate to /site/{subdomain}
7. Extract <title> or <h1> → verify contains "QA-TEST-{timestamp}"
8. Switch back to dashboard → revert site name (remove QA-TEST marker)
9. Wait for auto-save → re-trigger revalidation
10. Verify public site title reverted
```

**Score**: read_value(+1) + edit_value(+1) + autosave_triggers(+1) + revalidate_ok(+1) + nextjs_matches(+3) + revert_ok(+2) + revert_verified(+1) = /10

---

## 10. MODE: VERIFY

Parse git diff for website-related changes:

```bash
Bash: git diff HEAD~1 --name-only | grep -E '(lib/bukeer/websites/|web-public/|services/website|services/base_service)' | head -20
```

For each changed file:
- **Flutter widget** (`lib/bukeer/websites/tabs/*.dart`) → navigate to corresponding tab, verify it loads
- **Flutter service** (`services/website_*.dart`) → verify dependent tabs still work
- **Next.js component** (`web-public/components/*.tsx`) → curl affected page, check rendering
- **Next.js page** (`web-public/app/site/**`) → curl affected route, check HTTP 200

Take screenshots as evidence. Report verification status per file.

### 10.1 LEARN (MANDATORY after verify)

After verification, **always** update artifacts:

1. **Playbook** — append verification results:
```jsonl
{"type":"fix_verified","key":"{issue_key}","value":"{what was verified and result}","confidence":1.0,"source":"qa-website","updated":"ISO-8601"}
```

2. **Tab audit** — if a tab's status changed (blocked→healthy or vice versa), append updated entry:
```jsonl
{"type":"tab_audit","tab_index":N,"tab_label":"...","status":"healthy","controls":"...","updated":"ISO-8601"}
```

3. **Patterns** — if a new diagnostic pattern was discovered during verification, append immediately:
```jsonl
{"type":"pattern","key":"...","value":"...","confidence":1.0,"source":"qa-website","updated":"ISO-8601"}
```

4. **Known issues** — if an issue was resolved, update Section 7.3 known issues table and Section 18 GitHub issues table.

5. **Memory** — update `memory/qa-website-learnings.md` if the fix changes a known issue status or reveals a new architectural pattern.

> **CRITICAL**: Do NOT defer playbook updates to the final report. Write them THE MOMENT a verification result is known. If the session is interrupted, unsaved learnings are lost forever.

---

## 11. MODE: RENDER (Next.js Only)

Validates Next.js rendering independently. No Flutter interaction needed.

### 11.1 Preflight (lite)

Only start Next.js on :3000. Skip Flutter steps. Resolve subdomain from args or DB.

### 11.2 Page-by-page validation

For each page (from `pages=` arg, or all by default):

```
1. curl HTTP status + load time
2. Navigate in Chrome DevTools
3. Collect SEO metadata (title, description, og:*, JSON-LD)
4. Check console errors
5. Check for placeholder/hardcoded content
6. Verify <h1> presence
7. Screenshot
```

### 11.3 Sitemap validation

```bash
Bash: curl -s "http://localhost:3000/api/sitemap?subdomain=${SUBDOMAIN}" | head -50
```

Check:
- Valid XML structure
- Contains expected URLs (homepage, blog, pages)
- No broken URLs

### 11.4 Robots.txt validation

```bash
Bash: curl -s "http://localhost:3000/robots.txt"
```

Check:
- References sitemap
- No overly restrictive Disallow rules

### 11.5 RENDER Report

```
══════════════════════════════════════════════════════
 QA WEBSITE RENDER — {subdomain}
 Date: {date} | Pages: {N} | Errors: {E}
══════════════════════════════════════════════════════
 Homepage:      {http} {load_time}ms  JSON-LD:{N}  Meta:{ok/missing}  H1:{text}
 Blog listing:  {http} {load_time}ms  JSON-LD:{N}  Meta:{ok/missing}
 Blog post:     {http} {load_time}ms  JSON-LD:{N}  Meta:{ok/missing}
 Terms:         {http} {load_time}ms  Meta:{ok/missing}
 Privacy:       {http} {load_time}ms  Meta:{ok/missing}
 Cancellation:  {http} {load_time}ms  Meta:{ok/missing}
 Sitemap:       {http} URLs:{count}  Valid:{yes/no}
 Robots.txt:    {http} Sitemap ref:{yes/no}
══════════════════════════════════════════════════════
 render_score:    {score}/100
 seo_score:       {score}/100
 console_errors:  {count}
 placeholder_detected: {yes/no}
══════════════════════════════════════════════════════
```

---

## 12. KEEP/DISCARD (LOOP/FIX modes)

Binary decision after each fix attempt:

```
IF score_improved AND quality_gate_passed:
  git add $EDITED_FILE
  git commit -m "fix(website-qa): {issue_type} in $(basename $EDITED_FILE)"
  → KEEP
ELSE:
  git checkout -- $EDITED_FILE
  → DISCARD
```

**NEVER** use `git checkout -- .` or `git reset --hard`. Only single-file revert.

---

## 13. FAILURE BACKLOG

For issues found during LOOP/SCAN, append to `qa-improvement-backlog.tsv`:

```bash
Bash: echo -e "{run_id}\twebsite-{flow}\t{issue_id}\twebsite\t{route}\t{issue_type}\t{severity}\t{repro_steps}\t{expected}\t{actual}\t{suggested_fix}\t{confidence}\topen\tqa-website\t{timestamp}" >> qa-improvement-backlog.tsv
```

**Website-specific issue types**:

| Type | Description |
|------|-------------|
| `tab_empty` | Builder tab loaded but no content |
| `tab_crash` | Builder tab throws error |
| `nextjs_render_fail` | Next.js page returns non-200 |
| `nextjs_hydration_error` | React hydration mismatch |
| `seo_missing` | Missing title/description/og:tags |
| `json_ld_missing` | No structured data on page |
| `cross_mismatch` | Flutter value differs from Next.js |
| `revalidation_fail` | ISR revalidation didn't update content |
| `placeholder_content` | Hardcoded/lorem content on public page |
| `editor_iframe_fail` | Editor tab iframe didn't load |
| `blog_missing_posts` | Blog listing empty despite published posts in DB |
| `semantics_violation` | Code identifier or empty label in builder |
| `console_error` | Runtime/API error in either runtime |
| `sitemap_broken_url` | URL in sitemap XML returns 404 |
| `stats_zero_values` | Homepage stats section shows 0 for all counters |
| `missing_accents` | Spanish text missing accents (Terminos, Politica, etc.) |
| `legal_page_redirect` | Legal page returns 307 instead of content |
| `puck_load_fail` | Puck editor did not load in iframe (feature flag mismatch or JS error) |
| `puck_save_fail` | Puck save/publish action failed |
| `puck_inspector_leak` | Flutter inspector panel visible when Puck should be active |
| `puck_dirty_guard_missing` | Tab switch allowed without unsaved changes dialog |
| `studio_auth_fail` | Dashboard login flow broken |
| `studio_nav_broken` | Dashboard tab navigation fails |
| `studio_autosave_fail` | Auto-save hook doesn't trigger or fails |
| `studio_wizard_fail` | Website creation wizard broken |
| `studio_cmd_palette_fail` | Command palette doesn't open or search |
| `studio_crud_fail` | Dashboard CRUD operation fails |

---

## 14. FINAL REPORT (LOOP mode)

```
══════════════════════════════════════════════════════
 QA WEBSITE — Final Report
 Run: {run_id} | Cycles: {N} | Score: {start} → {end}
══════════════════════════════════════════════════════
 FLUTTER BUILDER (:8080) — LEGACY
   Tabs navigable:       {N}/6
   Builder interaction:  {%}
   Semantics violations: {count}
   Console errors:       {count}

 STUDIO DASHBOARD (:3000/dashboard)
   Auth:                 {ok/blocked}
   Tabs navigable:       {N}/8
   Wizard functional:    {yes/no/untested}
   Auto-save working:    {yes/no/untested}
   Cmd+K palette:        {yes/no/untested}
   Console errors:       {count}

 NEXT.JS RENDERER (:3000/site)
   Pages healthy:        {N}/{total}
   SEO compliance:       {%}
   JSON-LD schemas:      {count}
   Console errors:       {count}
   Blog health:          {%}

 CROSS-VALIDATION
   Flutter → Public:     {N}/{total} passed
   Dashboard → Public:   {N}/{total} passed
   Revalidation latency: {avg_ms}ms

 KNOWN OPEN ISSUES (from roadmap)
   1.4 Domain onboarding:   Open (P1) — field exists but no DNS verification
   1.5 Hardcoded content:   Open (P2)
   2.1 Multi-language:      Open (P1)
   ~~4.1 Secciones data~~:   RESOLVED (2026-03-20) — BukeerInfoBanner infinite width crash
   4.2 Editor CSP:          Open (P2) — iframe blocked on localhost
══════════════════════════════════════════════════════
 Stop reason: {target_reached|budget_exceeded|plateau|max_cycles}
 Total elapsed: {elapsed}

 Artifacts:
 - qa-website-results.tsv
 - qa-website-render.tsv
 - qa-website-cross.tsv
 - qa-website-playbook.jsonl
 - qa-improvement-backlog.tsv (source=qa-website)
══════════════════════════════════════════════════════
```

---

## 15. KARPATHY ALIGNMENT SUMMARY

| Autoresearch Principle | Our Implementation |
|----------------------|-------------------|
| **Single file to modify** | Playbook (`qa-website-playbook.jsonl`) — interaction strategies + learned patterns |
| **Fixed time budget** | 5 min per cycle, 45 min total session |
| **Single scalar metric** | `website_qa_score` (0-100) |
| **Keep/discard binary** | Per-fix: score improved + analyze clean = keep |
| **Human programs Markdown** | Human iterates `qa-website.md`, agent iterates playbook + fix strategies |

---

## 16. INTEGRATION WITH OTHER QA COMMANDS

- **Shares backlog** with `/qa` — `qa-improvement-backlog.tsv` with `source=qa-website`
- **Complements** `/qa` — `/qa` covers all routes broadly, `/qa-website` goes deep on the website module
- **Does NOT overlap** — `/qa` skips `/website` route details (6 tabs), this command owns them
- **Run after** `/qa` for full coverage — `/qa` validates general app health, then `/qa-website` validates the website module specifically
- **Prerequisite**: Website must exist for the test account. If none → `create_website` template creates one, OR cross-account fallback activates for Next.js probing.

---

## 17. OPERATIONAL LESSONS (from first runs)

Hard-won knowledge from the initial `/qa-website` execution. These are NOT theoretical — each was discovered by hitting the problem.

### Flutter Semantics are NON-NEGOTIABLE

```
PROBLEM: App started without ENABLE_FLT_SEMANTICS=true
SYMPTOM: flt-semantics-host has 0 children, take_snapshot shows only "Enable accessibility" button
IMPACT:  Cannot click ANY small widget (buttons, tabs, inputs) via MCP
         Only large areas (app launcher cards ~300x300px) respond to pointer events
FIX:     Kill and restart with --dart-define=ENABLE_FLT_SEMANTICS=true
         The preflight MUST verify semanticsChildren > 0, not just hasSemanticsHost
```

### Flutter App Launcher Intercepts Navigation

```
PROBLEM: Navigating to http://localhost:8080/#/website redirects to /apps
SYMPTOM: App launcher screen shown instead of target route
FIX:     Use history.pushState('/website') + popstate dispatch AFTER clicking through launcher
         OR: Click Dashboard card first (large area works without semantics), then pushState
NOTE:    Hash-based routing (#/website) does NOT work from launcher — use path-based (/website)
```

### Cross-Account Testing for Next.js

```
PROBLEM: Demo account has no website → builder shows empty state, Next.js has nothing to render
FIX:     Query DB for ANY published website and use its subdomain for Next.js probing
         Cross-validation (Flutter→Next.js) is disabled in this mode
         Flutter testing limited to empty state + setup wizard
BEST:    Use an account that has a website for full testing coverage
```

### website-contract Package Imports

```
PROBLEM: TypeScript files used .js extension imports (ESM convention)
SYMPTOM: Next.js webpack can't resolve ./types/section.js → returns 500 on ALL pages
FIX:     Remove .js extensions from all imports in packages/website-contract/src/
         Add transpilePackages: ['@bukeer/website-contract'] to next.config.ts
NOTE:    This was a P0 production blocker — all public agency sites were broken
```

### Sitemap URLs Must Be Validated

```
PROBLEM: Sitemap XML includes /destinations, /hotels, /activities URLs
SYMPTOM: These return 404 — category pages not implemented
IMPACT:  Google crawl errors, SEO penalty
FIX:     Sitemap generator should only emit URLs that actually resolve
         OR: implement the category page routes
```

### Legal Pages Are Optional Per Website

```
PROBLEM: /terms, /privacy, /cancellation return 307 redirect
SYMPTOM: Footer links point to non-existent pages
IMPACT:  UX confusion — user clicks legal link and gets redirected to homepage
FIX:     Either show default legal content OR hide footer links when pages not configured
```

### Stats Section Needs CMS Data

```
PROBLEM: Homepage stats show "0 Viajeros", "0 Destinos", "0 Años", "0 Satisfacción"
SYMPTOM: Counter values not populated from CMS or database
IMPACT:  Agency website looks empty/broken to visitors
FIX:     Investigate if stats come from website_sections content JSON or are computed
```

### Next.js .env.local Auto-Creation

```
LEARNING: web-public/.env.local can be auto-created from the main .env file
          grep + sed to rename SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL
          This makes the preflight self-healing for first-time setup
```

### App Launcher Navigation with Semantics

```
PROBLEM:  After auth injection, app lands on /apps (app launcher)
SOLUTION: With semantics ON, take_snapshot shows all app cards as buttons with UIDs
          Click "Constructor de sitio web" (uid) → navigates to /website
          This is the RELIABLE path — no pushState/popstate hacks needed
PATTERN:  Auth inject → reload → /apps → take_snapshot → click target app card → /website
```

### Setup Wizard Complete Flow (4 steps)

```
STEP 1: "Nombre y dirección de tu sitio"
  - Fill "Nombre del sitio" (textbox uid)
  - Fill "Subdominio" — type_text after Ctrl+A (fill may not override auto-generated value)
  - Wait for "Disponible" badge → "Siguiente" enables
  - NOTE: Subdominio auto-generates from nombre. Override requires Ctrl+A + type_text.

STEP 2: "Cuéntanos sobre tu agencia"
  - Description, Especialidad (dropdown), Público objetivo, Ubicación
  - BUG: Pre-fills description into "Nombre" field, subdomain into "Ubicación" (data mapping issue)
  - "Siguiente" enabled by default (optional fields)

STEP 3: "Elige un tema"
  - Shows theme presets if available in DB
  - Empty state: "No hay temas disponibles" — skip to next
  - "Siguiente" always enabled

STEP 4: "Resumen"
  - Shows: Nombre, Subdominio, Tema
  - Two buttons: "Crear sin IA" (instant) and "Crear con IA" (calls Edge Function)
  - "Crear sin IA" → creates website in ~2s → redirects to dashboard with 6 tabs
  - "Crear con IA" → calls generateBlueprint(), takes 10-30s
```

### Publish Flow

```
TRIGGER: Click "Publicar" button in AppBar (visible when canPublishWebsites() = true)
DIALOG:  BukeerConfirmationDialog — "Publicar Sitio Web" + URL preview
         Buttons: "Cancel" / "Publicar"
RESULT:  status changes to 'published' → button becomes "Despublicar"
         Next.js renders the site within seconds (no ISR delay for first load)
VERIFY:  curl http://localhost:3000/site/{subdomain} → should return 200
```

### New Website Hero Section Error

```
PROBLEM:  Websites created via "Crear sin IA" have default sections with empty/malformed content
SYMPTOM:  Next.js shows "Error en sección: hero" with red error boundary
          Other sections (destinos, about) may render below the broken hero
IMPACT:   First impression of the published site is broken
ROOT:     Wizard creates sections with section_type but empty content JSON
          Hero section renderer expects title, subtitle, backgroundImage — gets empty object
ISSUE:    #483
FIX:      Either wizard populates minimum viable content OR renderer handles empty gracefully
```

### Tab Navigation Pattern (with website)

```
SNAPSHOT: take_snapshot → tabs appear as tab elements with UIDs (uid=15_3 to uid=15_14)
          tab "Editor" selectable selected
          tab "Diseño" selectable
          ...etc
CLICK:    mcp__chrome-devtools__click(uid) → tab switches, includeSnapshot=true for immediate state
VERIFY:   Check snapshot has content beyond tabs (StaticText, textbox, button elements)
GOTCHA:   Tab switch animation may show stale content from previous tab for ~1s
          Always wait 2s or use includeSnapshot=true to verify
TABS OK:  Editor (iframe), Diseño (35+ controls), Marca, Contenido (19 fields),
          Secciones, Páginas, Productos, Landings, Blog (filters+CTAs),
          Cotizaciones, Analytics, Versiones
```

### Cross-Validation Pattern (Flutter → Next.js)

```
PREREQUISITE: Website published + same account owns it (not cross-account mode)
PATTERN:
  1. Flutter: Read value from Contenido tab (e.g., site name in textbox)
  2. Next.js: Navigate to /site/{subdomain}, extract <title> or header text
  3. Compare: Flutter value should appear in Next.js rendered output
  4. If mismatch: POST /api/revalidate with subdomain → wait 5s → re-check
VERIFIED: Site name "Tu Agencia de Viajes" appears in Next.js header after publish
LIMITATION: Hero section error prevents full content verification on new websites
```

### og:image Resolution Chain

```
FIXED IN: web-public/app/site/[subdomain]/layout.tsx
CHAIN:    content.seo?.image → heroSection.content.backgroundImage → content.account?.logo
RESULT:   og:image now resolves for social sharing (Facebook, Twitter, WhatsApp)
          Also sets twitter:image for Twitter Cards
VERIFIED: colombiatours gets hero background image as og:image
```

### Sitemap Conditional Category Pages

```
FIXED IN: web-public/app/api/sitemap/route.ts
BEFORE:   Always emitted /destinations, /hotels, /activities → all 404
AFTER:    Only emits category URLs if matching slug exists in website_pages
VERIFIED: colombiatours sitemap now has only homepage (no phantom 404 URLs)
```

### Secciones Tab Blank — RESOLVED (2026-03-20, issue #501)

```
PROBLEM:  Secciones tab (index 4) renders completely blank — visually AND in semantics
SYMPTOM:  Empty body on cold start. Not even the static header "Secciones del Sitio" renders.
          DB confirms 10 sections exist. Other tabs (Contenido, Diseño) render fine.

MISDIAGNOSIS CHAIN:
  1. (2026-03-19) Thought it was semantics/ReorderableListView → wrong
  2. (2026-03-20) Thought it was data loading (WebsiteService.sections empty) → partially right
     Fixed _isBatching flag conflict + listener guard + self-healing retry
     But tab STILL blank after fix → data loading was not the root cause

ACTUAL ROOT CAUSE:
  BukeerInfoBanner (bukeer_info_banner.dart:149) has width: double.infinity.
  In sections_tab.dart, this banner is inside a Row:
    Row(children: [Expanded(...header...), if(canEdit) BukeerInfoBanner(...)])
  Row gives unconstrained width to non-flex children → double.infinity causes:
    "BoxConstraints forces an infinite width" → silent crash of ENTIRE widget tree.
  Not even the header Row renders because the error propagates up.

DIAGNOSIS METHOD:
  Added try-catch + debugPrint in build() → checked browser console → found:
    "EXCEPTION CAUGHT BY RENDERING LIBRARY: BoxConstraints forces an infinite width"
    "The relevant error-causing widget was: Container (bukeer_info_banner.dart:148:12)"

FIX:  Wrap BukeerInfoBanner in Flexible:
  Flexible(child: BukeerInfoBanner(message: 'Arrastra para reordenar', ...))

ALSO FIXED (infrastructure improvements):
  - BaseService.loadData/saveData: save/restore _isBatching flag (was clobbering batchLoad)
  - SectionsTab._onWebsiteChanged: removed sections.isNotEmpty guard
  - SectionsTab._loadSections: self-healing retry on empty sections

LESSON: When a Flutter widget renders NOTHING (not even static content), check browser
console for "EXCEPTION CAUGHT BY RENDERING LIBRARY" — Flutter Web logs layout errors
as console.log, not console.error. Always add try-catch + debugPrint to build() for diagnosis.

LESSON: BukeerInfoBanner has width: double.infinity — NEVER place it inside a Row
without wrapping in Flexible/Expanded. Audit other usages across the codebase.
```

### Analytics Tab is Fully Implemented (2026-03-19)

```
CORRECTION: Previous known issue "2.3 Analytics dashboard: empty/coming soon" is WRONG
ACTUAL:     Tab 10 has full tracking configuration:
            - Google Tag Manager (ID field)
            - Google Analytics 4 (Measurement ID)
            - Facebook Pixel (ID field)
            - Custom Scripts (head + body textarea fields)
            - Recommendations section with best practices
STATUS:     RESOLVED — removed from known issues list
```

### Marca (Brand Kit) Tab Detailed Audit (2026-03-19)

```
DISCOVERY: Brand Kit tab is much richer than documented:
           - Brand name + tagline fields
           - 8 tone checkboxes: Experto, Cercano, Inspirador, Confiable, Innovador,
             Tradicional, Exclusivo, Accesible (with "Profesional" as primary)
           - CTA style selector: "Acción (Reservar ahora, Empezar)"
           - Público Objetivo, Propuesta de Valor Única, Guías de Escritura fields
           - Keyword management (add keyword input)
           - Two "Personalizar" buttons with color swatch palettes
           - AI Preview panel showing generated sample text
IMPACT:    Needs its own `edit_brand` template for proper testing
```

### DB Schema Gotchas for website_* Tables (2026-03-19)

```
websites table:     NO "name" column — use content->>'siteName' instead
                    account_id is UUID type — cast text comparisons
website_sections:   Column is "display_order" (NOT "position" or "sort_order")
website_pages:      Has nav_order, show_in_nav, is_published, page_type fields
user account_id:    NOT in auth.users.raw_user_meta_data — look up via user_roles table
```

### Stale Tab Content After Reload (2026-03-19)

```
PROBLEM:  After navigate_page reload, clicking a tab shows stale tabpanel content
          from the previous tab (e.g., "Inspector Conectando con el canvas...")
SYMPTOM:  Semantics tree shows old content even though selected tab changed
TIMING:   Happens immediately after reload; content appears correct on first visit
WORKAROUND: Navigate away (click different tab) then back, or wait 3-5s after reload
            Use evaluate_script to wait before take_snapshot
```

### 6-Tab UX Redesign (2026-03-23)

```
CHANGE:   12 tabs → 6 tabs in website_dashboard_page.dart
LAYOUT:   Páginas | Blog | Diseño & Marca | Contenido & SEO | Productos | Analytics
MERGED:   Diseño+Marca→"Diseño & Marca" (3 sub-tabs: Diseño, Marca, Estructura)
          Contenido+SEO→"Contenido & SEO" (3 sub-tabs: Contenido, SEO, Analytics)
REMOVED:  Editor (→ full-page route), Secciones (→ Puck), Cotizaciones (→ CRM),
          Landings (→ Productos), Versiones
EDITOR:   Now accessed via "Editar" button on pages → /website/editor/:pageId
          Homepage uses websiteId as pageId (Flutter converts to null for iframe)
IMPACT:   Tab indices completely changed. Old index references are WRONG.
```

### Puck Editor Auth via PostMessage (2026-03-23)

```
PROTOCOL: Next.js editor expects postMessage from Flutter parent:
          source: 'bukeer-sites-editor'
          type: 'editor:init'
          payload: { accessToken: <jwt> }
          websiteId: <uuid>
STANDALONE: Editor at /editor/{websiteId} shows "Conectando con el editor..."
            until auth message received. Can be injected via evaluate_script.
NOTE:     origin validation: isAllowedOrigin() checks origin.
          First message sets parentOriginRef — subsequent messages must match.
```

### Homepage Editor Race Condition — FIXED (2026-03-23)

```
PROBLEM:  /website/editor/{websiteId} — Flutter initState checks if
          pageId === currentWebsiteModel.id to determine homepage (null pageId).
          If WebsiteService not yet loaded → currentWebsiteModel is null →
          comparison fails → websiteId passed as ?page= to iframe → crash.
FIX:      Re-check in _initialize() after services loaded.
PATTERN:  Any widget reading service model in initState risks this.
          Audit other uses of _services.*.currentModel?.id in initState.
```

### Blog Editor getSupabase Hoisting — FIXED (2026-03-23)

```
PROBLEM:  web-public/app/editor/[websiteId]/blog/[postId]/page.tsx
          scoreContent useCallback references getSupabase in dependency array
          but getSupabase is defined AFTER scoreContent (useCallback doesn't hoist).
ERROR:    "Cannot access 'getSupabase' before initialization"
FIX:      Moved getSupabase useCallback definition before scoreContent.
IMPACT:   Blog editor was completely broken — nobody could edit posts.
```

### Dashboard Auth via Supabase SSR (2026-03-24)

```
ARCHITECTURE: Dashboard uses @supabase/ssr for cookie-based sessions.
              middleware.ts guards all /dashboard/* routes.
              Creates Supabase server client with cookie getAll/setAll.
              If no session → redirect to /login?redirect={original_path}.
FLUTTER HANDOFF: ?token=<jwt> param in URL → middleware calls setSession(),
                 then redirects to clean URL without token.
                 This enables Flutter "Open in Studio" button to pass auth.
COOKIE NAME:  sb-{project_ref}-auth-token (same pattern as browser client).
GOTCHA:       @supabase/ssr must be installed separately (not part of @supabase/supabase-js).
              Server components use createSupabaseServerClient() (async, from cookies()).
              Client components use createSupabaseBrowserClient() (singleton, persistSession).
```

### Dashboard Tab Navigation Pattern (2026-03-24)

```
PATTERN:  Dashboard uses Next.js <Link> elements for tab navigation.
          Active tab determined by pathname.includes('/tab-slug').
          Animated underline via framer-motion layoutId="tab-underline".
          8 tabs: pages, blog, design, content, products, analytics, quotes, settings.
TESTING:  Navigate via URL (mcp__chrome-devtools__navigate_page) is more reliable than
          clicking Link elements in snapshot. URL-based navigation skips animation waits.
GOTCHA:   Tab content loads client-side — wait 2-3s after navigation before evaluating.
          Auto-save hooks may trigger on mount — expect network requests on tab switch.
```

### Auto-save + Dirty State (2026-03-24)

```
HOOKS:    useAutosave: 2s debounce, 3 retries with exponential backoff (2s, 4s, 8s).
          useDirtyState: tracks JSON diff vs initial, beforeunload warning.
          Status: idle → saving → saved → idle (or error after 3 failures).
VISUAL:   DirtyDot in WebsiteAdminLayout header (amber dot when isDirty=true).
          Auto-save indicator in blog editor toolbar (Saving.../Saved/Save failed).
TESTING:  Edit a field → wait 3s → check auto-save triggered (status indicator changed).
          Dirty state: edit → verify dot appears → save → verify dot disappears.
          Local backup: useLocalBackup stores to localStorage when offline.
```

### Command Palette (Cmd+K) (2026-03-24)

```
TRIGGER:  Cmd+K (Meta+k) opens CommandPalette modal.
          Topbar also has a "Search..." button with kbd hint.
BEHAVIOR: Fuzzy search websites by subdomain via Supabase ilike query.
          Arrow keys navigate, Enter selects, Escape closes.
          Default action: "Create new website" (always shown).
TESTING:  press_key("Meta+k") → verify modal appears.
          fill search input → verify results appear.
          press_key("Escape") → verify modal closes.
ANIMATION: framer-motion scale + opacity transition. Backdrop blur.
```

### getDashboardUserContext — Canonical Auth/Account Resolution (2026-03-24)

```
FILE:     lib/admin/user-context.ts
FUNCTION: getDashboardUserContext(supabase) → DashboardUserContext
RETURNS:  { status: 'authenticated', user, userId, email, accountId, role, displayName }
          | { status: 'missing_role', user, userId, email, displayName }
          | { status: 'unauthenticated' }
CHAIN:    1. supabase.auth.getUser() → auth identity
          2. contacts table → display name (name + last_name)
          3. user_roles table (is_active=true) → account_id + role
          4. roles table (join) → role_name
USED BY:  dashboard/layout.tsx, dashboard/page.tsx, dashboard/new/page.tsx,
          dashboard/[id]/products/page.tsx
PATTERN:  ALWAYS use this instead of manual getUser() + profile query.
          Handles unauthenticated, missing_role, and authenticated states uniformly.
          Dashboard pages show localized error UI for each state.
GOTCHA:   QA overnight discovered that manual getUser() + profile query in
          dashboard layout didn't find account_id → website cards empty.
          getDashboardUserContext fixes this by querying user_roles directly.
```

### Mobile Sidebar Drawer Pattern — FIXED (2026-03-24)

```
PROBLEM:  At 375px viewport, sidebar (240px) left only 150px for content = unusable
FIX:      Sidebar uses fixed + transform for mobile drawer:
          -translate-x-full md:translate-x-0 (hidden on mobile, visible on desktop)
          md:relative md:z-0 (desktop: normal flow)
HAMBURGER: Added to topbar (md:hidden), toggles sidebarOpen state in DashboardShell
BACKDROP:  Fixed inset-0 bg-black/50 z-30 md:hidden when sidebar open
AUTO-CLOSE: onNavigate callback closes drawer after clicking a link
TABS:     Horizontal scroll with scrollbar-hide, min-h-[44px] touch targets
GRIDS:    Wizard presets grid-cols-2 sm:grid-cols-3, design presets grid-cols-2 sm:grid-cols-4
VERIFIED: At 500px viewport: sidebar hidden, hamburger visible, main full-width (500px)
```

---

## 18. KNOWN GITHUB ISSUES (from /qa-website runs)

Track these — they affect the score and should be re-verified when fixed:

| Issue | Title | Status | Impact on Score |
|-------|-------|--------|-----------------|
| #476 | `.js` imports break all Next.js pages (P0) | **Fixed** | render_health 0→0.625 |
| #477 | Missing og:image in homepage SEO | **Fixed** | seo_compliance 0.75→1.0 |
| #478 | Footer accents + sitemap broken URLs | **Fixed** | render_health + seo |
| #479 | Stats=0 + legal pages 307 | Open (investigation) | render_health, content |
| #483 | Hero error on new websites ("Crear sin IA") | Open | cross_validation blocked |
| #501 | Secciones tab blank on cold start | **Fixed** (2026-03-20) | builder_nav 11/12→12/12, ai_generate unblocked |
| — | Puck editor homepage crash (null snapshot) | **Fixed** (2026-03-23) | puck_editor 0→7/10 |
| — | Blog editor getSupabase hoisting | **Fixed** (2026-03-23) | manage_blog unblocked |
| — | Homepage editor race condition (pageId) | **Fixed** (2026-03-23) | puck_editor reliability |

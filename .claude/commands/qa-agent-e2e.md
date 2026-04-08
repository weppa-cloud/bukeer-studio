---
description: "Multi-turn AI agent intent journey E2E — shadow probe primary, Flutter check optional"
argument-hint: "[budget_minutes=90] [max_cycles=3] [flutter_check=false] [flutter_port=8081] [login_email=<email>] [login_password=<pwd>]"
allowed-tools: mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__evaluate_script, mcp__chrome-devtools__list_pages, mcp__chrome-devtools__select_page, mcp__chrome-devtools__new_page, mcp__chrome-devtools__click, mcp__chrome-devtools__fill, mcp__chrome-devtools__type_text, mcp__chrome-devtools__press_key, mcp__chrome-devtools__take_snapshot, mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__list_console_messages, mcp__chrome-devtools__wait_for, mcp__supabase__execute_sql, mcp__dart__list_running_apps, mcp__dart__connect_dart_tooling_daemon, Bash(lsof:*), Bash(grep:*), Bash(cat:*), Bash(echo:*), Bash(date:*), Bash(wc:*), Bash(test:*), Bash(printf:*), Bash(sleep:*), Bash(curl:*), Bash(kill:*), Bash(npx:*), Bash(flutter:*), Bash(cd:*), Bash(timeout:*), Bash(tail:*), Bash(head:*), Bash(nohup:*), Read, Write, Glob, Grep
---

# QA Agent E2E — Multi-Turn Intent Journey Runner

Tests the AI agent pipeline via direct SSE probes against the local agent-server (which connects to production Supabase).
Applies Karpathy autoresearch principle: single scalar metric (`e2e_score`), fixed time budget per journey, binary pass/fail per assertion.

## Architecture: Two Things Being Measured

```
Thing 1 — Agent behavior (tool calls, intent emission, context)
  Measured by: shadow probe (direct SSE to agent-server)
  Fast, reliable, no DOM friction

Thing 2 — Flutter navigation (intent → GoRouter → pathname change)
  Measured by: Flutter UI check (optional)
  Only needed when Flutter-side contracts change
```

**Default mode** (`flutter_check=false`): shadow probe only. J1/J2/J3/J4/J5/J6/J7 scored on agent behavior.
**Flutter check mode** (`flutter_check=true`): additionally verifies navigation via Chrome DevTools.

Flutter navigation contracts are considered **stable** once validated. Run `flutter_check=true` only after Flutter-side changes (new intent types, new routes, GoRouter changes).

## Shadow Probe Architecture

```
JWT → curl POST /api/chat → SSE stream → parse events
                                         ├── event: tool_start    → record tool name + input
                                         ├── event: tool_complete → record tool summary/result
                                         ├── event: intent        → record intent_type + route
                                         ├── event: text          → accumulate response text (rare — usually in done.response)
                                         └── event: done          → extract conversation_id + response text
```

**CRITICAL SSE Event Types**: The agent-server emits `tool_start`/`tool_complete` (NOT `tool_use`).
The `done` event payload includes `conversation_id` AND `response` (the final text). Text events
are rare — most response text comes from `done.response`.

Multi-turn (J1→J2→J3): pass `conversation_id` from J1 response into J2 and J3 requests.
The agent-server preserves full conversation history including `tool_results` — so J2/J3 have
access to the itinerary UUID created in J1 without needing Flutter screen context.

**New conversation**: OMIT the `conversation_id` key entirely. Do NOT send `"conversation_id":""` —
the API validates UUID format and rejects empty strings.

## Input Contract

Parse `$ARGUMENTS` for:
- `budget_minutes`: integer, default `90` (total session budget across all cycles)
- `max_cycles`: integer, default `3` (max keep/discard prompt iteration cycles)
- `flutter_check`: boolean, default `false` — run Flutter navigation verification
- `flutter_port`: integer, default `8081` (only used if `flutter_check=true`)
- `login_email`: override auth email
- `login_password`: override auth password

## Preflight

### 0) Read `.env` and resolve credentials

```bash
Bash: grep -E '^(SUPABASE_URL|SUPABASE_ANON_KEY|QA_TEST_EMAIL|QA_TEST_PASSWORD|AI_AGENT_BASE_URL)=' .env | head -10
```

Auto-fix `AI_AGENT_BASE_URL` if missing:
```bash
Bash: grep -q '^AI_AGENT_BASE_URL=' .env || echo 'AI_AGENT_BASE_URL=http://localhost:3001' >> .env
```

**Hard blockers:** `SUPABASE_URL` or `SUPABASE_ANON_KEY` missing → stop.

Credential resolution (args > `.env` > defaults):
- `email`: `login_email` arg → `QA_TEST_EMAIL` → `demo@demo.bukeer.com`
- `password`: `login_password` arg → `QA_TEST_PASSWORD` → `demo@demo.bukeer.com`

### 1) Agent-server: verify or start on `:3001`

```bash
Bash: curl -s http://localhost:3001/health | head -1
```

- `status: ok` or `status: degraded` → proceed
- Connection refused → start:

> **CRITICAL (2026-03-30)**: The agent-server defaults to port 3000 (`server.ts` line 60:
> `PORT = parseInt(process.env.PORT || "3000")`). This conflicts with Next.js on :3000.
> ALWAYS set `PORT=3001` explicitly when starting.

```bash
Bash: cd ai-system/agent-server && PORT=3001 nohup npx tsx --env-file=.env src/server.ts > /tmp/agent-server-e2e.log 2>&1 &
Bash: for i in $(seq 1 20); do curl -s http://localhost:3001/health > /dev/null 2>&1 && echo "READY" && break; sleep 2; done
```
- Still fails → `tail -20 /tmp/agent-server-e2e.log` and stop with error.
- If log shows `running on port 3000` → the PORT env var was not applied. Kill and retry with explicit PORT.

### 2) Obtain JWT via curl (primary — no browser needed)

```bash
Bash: JWT=$(curl -s -X POST "https://wzlxbpicdcdvxvdcvgas.supabase.co/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bHhicGljZGNkdnh2ZGN2Z2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU0NjQyODAsImV4cCI6MjA0MTA0MDI4MH0.dSh-yGzemDC7DL_rf7fwgWlMoEKv1SlBCxd8ElFs_d8" \
  -d '{"email":"demo@demo.bukeer.com","password":"demo@demo.bukeer.com"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])") && echo "JWT_OK: ${JWT:0:20}..."
```

Store JWT to file for reuse across all curl probes:
```bash
echo "$JWT" > /tmp/qa-e2e-jwt.txt
```

**JWT re-auth rule**: JWT expires in ~60min. Before each cycle, re-run this step if elapsed > 50min.

### 3) Flutter check (only if `flutter_check=true`)

Skip entirely if `flutter_check=false` (default).

If `flutter_check=true` → run the Flutter preflight from the legacy section at end of this file.

### 4) Bootstrap artifacts, SSE parser, and load learnings

**Create SSE parser** (see Known Issues #1 for full source):
```bash
Bash: Write /tmp/parse_sse.py with the parser from Known Issues section #1
```

**Bootstrap TSV + prompts**:
```bash
Bash: test -f qa-agent-e2e-results.tsv || echo -e "run_id\tjourney_id\tname\tintent_emitted\ttool_correct\tintent_route_correct\tflutter_navigated\tcontent_verified\tscore\ttools\tintent_route\tconversation_id\telapsed_ms\terror" > qa-agent-e2e-results.tsv
Bash: test -f qa-agent-e2e-learnings.jsonl && cat qa-agent-e2e-learnings.jsonl | tail -30 || echo "no learnings yet"
```

**Generate run_id** (use python3 for macOS compat):
```bash
Bash: python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S'))"
```

`run_id`: `agent-e2e-{YYYYMMDD-HHMMSS}`

Also bootstrap the backlog and prompts files:
Bash: test -f qa-agent-e2e-prompts.jsonl || cat > qa-agent-e2e-prompts.jsonl << 'PROMPTS'
{"journey":"J1","version":5,"prompt":"Crea un itinerario a Cartagena para 2 adultos del 15 al 20 de abril 2026 desde Bogotá, asígnalo al cliente Test Plan 001","status":"active","best_score":0,"parent_version":4,"mutation":"add_origin_city"}
{"journey":"J2","version":3,"prompt":"Agrega el Tour Ciudad Amurallada de Cartagena al itinerario","status":"active","best_score":0,"parent_version":2,"mutation":"exact_catalog_name"}
{"journey":"J3","version":2,"prompt":"Genera la propuesta en PDF y ábrela","status":"active","best_score":0,"parent_version":1,"mutation":"add_explicit_intent_trigger"}
{"journey":"J4","version":1,"prompt":"Llévame a los itinerarios confirmados","status":"active","best_score":0}
{"journey":"J5","version":1,"prompt":"¿Cuántos itinerarios tengo en total?","status":"active","best_score":0}
{"journey":"J8","version":1,"prompt":"Busca vuelos de Bogotá a Madrid para julio 2026, quiero ver opciones y precios","status":"active","best_score":0}
{"journey":"J9","version":1,"prompt":"Crea viaje de 10 días: Medellín y Cartagena, 3 pasajeros, desde Bogotá, julio 2026, COP","status":"active","best_score":0}
PROMPTS
```

### 5) Log preflight summary

```
══════════════════════════════════════════════════════
 PREFLIGHT COMPLETE
 Agent-server: ✓ :3001 (started/reused)
 Auth:         ✓ {email}
 SSE Parser:   ✓ /tmp/parse_sse.py
 Learnings:    {N} loaded
 Run ID:       {run_id}
══════════════════════════════════════════════════════
```

### Preflight retry policy

Each step has max 2 auto-recovery attempts. After 2 failures on the same step → stop with detailed error. The preflight should complete within **5 minutes** including cold starts. If it exceeds 5 min → something is fundamentally broken, stop and report.

---

## Known Issues & Mitigations (Baked-In Learnings)

These are validated findings from prior E2E runs. Apply them as constraints.

### 1. SSE Parser — Use python3 helper, not inline bash

The SSE stream uses `tool_start`/`tool_complete` events (NOT `tool_use`). Write this parser
to `/tmp/parse_sse.py` during preflight and pipe all curl output through it:

```python
# /tmp/parse_sse.py — write this file in preflight step 4
import sys, json

tools, intents, texts = [], [], []
conv_id, response_text, event_type = "", "", ""
for line in sys.stdin:
    line = line.strip()
    if line.startswith("event: "): event_type = line[7:]
    elif line.startswith("data: "):
        try: data = json.loads(line[6:])
        except: continue
        if event_type == "tool_start":
            tools.append({"name": data.get("tool",""), "input": data.get("input",{}), "status": "started"})
        elif event_type == "tool_complete":
            for t in reversed(tools):
                if t["name"] == data.get("tool","") and t["status"] == "started":
                    t["status"] = "complete"; t["summary"] = data.get("summary",""); break
        elif event_type == "intent":
            intents.append({"intent_type": data.get("intent_type",""), "route": data.get("route","")})
        elif event_type == "text":
            texts.append(data.get("text","") if isinstance(data, dict) else str(data))
        elif event_type == "done":
            conv_id = data.get("conversation_id",""); response_text = data.get("response","")
        elif event_type == "error":
            tools.append({"name":"_error","status":"error","summary":data.get("message",str(data))})

print(json.dumps({
    "tools": tools,
    "tool_names": list(set(t["name"] for t in tools if t["name"] != "_error")),
    "intents": intents,
    "text": "".join(texts) or response_text,
    "conversation_id": conv_id,
    "errors": [t["summary"] for t in tools if t["status"]=="error"],
    "tool_errors": [t for t in tools if "Error" in t.get("summary","")]
}, ensure_ascii=False))
```

Usage: `curl ... > /tmp/jN_raw.txt && cat /tmp/jN_raw.txt | python3 /tmp/parse_sse.py > /tmp/jN_parsed.json`

### 2. conversation_id — OMIT for new conversations, never send empty string

```bash
# CORRECT — new conversation (no conversation_id key):
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"message":"..."}'

# CORRECT — continue conversation:
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"message":"...","conversation_id":"$CONV_ID"}'

# WRONG — API rejects UUID validation:
-d '{"message":"...",}'
```

### 3. macOS timestamp — use python3, not `date +%s%3N`

zsh on macOS does NOT support `%3N` (milliseconds). Use:
```bash
START=$(python3 -c "import time; print(int(time.time()*1000))")
# ... run curl ...
END=$(python3 -c "import time; print(int(time.time()*1000))")
ELAPSED=$((END - START))
```

### 4. MCP Tool Failures — External API Tools vs Fast Tools

**Pattern confirmed across multiple runs**: MCP tools that call external APIs sometimes fail
through the agent-server pipeline but work when tested directly via MCP stdio.

| Tool | Backend | Typical Time | Status |
|------|---------|-------------|--------|
| `search_contacts` | PostgREST | <1s | RELIABLE after nullable fix |
| `list_itineraries` | PostgREST | <1s | RELIABLE after nullable fix (pagination >40 may fail on bad data) |
| `auto_plan_itinerary` | Edge Function | 5-30s | RELIABLE |
| `auto_edit_itinerary` | Edge Function | 3-15s | RELIABLE |
| `emit_navigation_intent` | In-process | <100ms | ALWAYS works |
| `validate_edit_vs_plan` | In-process | <100ms | RELIABLE (first call may fail with extra params, retries succeed) |
| `generate_proposal_pdf` | Edge Function | 5-15s | UNRELIABLE through pipeline — works via direct MCP |
| `search_flights` | SerpAPI | 3-10s | UNRELIABLE through pipeline — works via direct MCP |
| `get_itinerary_items` | PostgREST | <1s | MAY FAIL if LLM sends `itinerary_id` instead of `id_itinerary` |

**When a tool fails**: Check `tool_complete` summary. If it says "Error ejecutando la herramienta":
1. First suspect: **output schema null handling** — DB returns `null`, Zod rejects it
2. Second suspect: **input param naming** — LLM sends snake_case, schema expects camelCase
3. Third suspect: **MCP pipeline timeout** — tool works directly but not through agent-server

**Diagnostic**: Test the tool directly via MCP stdio:
```bash
JWT=$(cat /tmp/qa-e2e-jwt.txt) && echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"TOOL_NAME","arguments":{...}}}' \
  | BUKEER_JWT="$JWT" BUKEER_URL="https://wzlxbpicdcdvxvdcvgas.supabase.co" BUKEER_ANON_KEY="..." \
  node /path/to/ai-system/bukeer-mcp/dist/index.js
```

### 5. gpt-oss-20b Model Artifacts

When agent-server uses `gpt-oss-20b` (NVIDIA), expect:
- **Token bleeding**: Tool names get `<|channel|>` suffix (e.g., `search_contacts<|channel|>json`). These fail tool resolution, agent auto-retries. Wastes 1-2 turns per call.
- **Conservative behavior**: Asks for exact dates/details instead of inferring (e.g., J9). Claude would auto-infer.
- **MAX_TURNS exhaustion**: With token bleeding + retries, complex journeys (J1: 3+ tools) may exhaust the 8-turn limit. The `done` event then returns `"Lo siento, no pude procesar..."` even though tools succeeded.
- **Content scoring impact**: If `done.response` says "Lo siento" but tools and intents all succeeded, score `content_verified = 0` but other assertions still count. This is a model issue, not a pipeline failure.

### 6. DB Validation Timing — Run IMMEDIATELY After Each Journey

**Critical lesson**: DB-J1 validation MUST run right after J1, BEFORE J2/J6 modify the itinerary.

Execution order for Session A:
```
J1 → DB-J1 (capture $J1_ITEM_COUNT) → J2 → DB-J2 → J3 → J6 → DB-J6
```

If you run DB-J1 after J6, the item counts and types will be wrong because J2 added items and J6 removed/replaced activities.

### 7. MCP Output Schema Null Handling (FIXED but watch for regressions)

PostgreSQL returns `null` for empty columns. Zod `.optional()` allows `undefined` but NOT `null`.
Every field sourced from DB must use `.nullable()`:

```typescript
// WRONG — will reject null from DB:
phone: z.string().optional()

// CORRECT:
phone: z.string().nullable().optional()
```

Files: `ai-system/bukeer-mcp/src/core/output-schemas.ts`
If new tools are added with outputSchema, verify null handling.

### 8. MCP Tool Input Param Naming Convention

LLMs (especially gpt-oss-20b) strongly prefer snake_case for tool parameters. If the schema uses
camelCase (`itineraryId`) but the description mentions snake_case (`itinerary_id`), the LLM will
ALWAYS send snake_case → Zod input validation rejects.

**Rule**: All MCP tool inputSchema params MUST use snake_case.

Current known mismatches (fixed):
- `generate_proposal_pdf`: `itineraryId` → `itinerary_id` (FIXED)
- `get_itinerary_items`: uses `id_itinerary` (DB convention) — LLM may send `itinerary_id`

### 9. Warm-Up Budget

First tool call per session includes MCP server spawn time (6-37s depending on system load).
Account for this in J1 timing — don't flag slow J1 as a bug if subsequent journeys are fast.

---

## Journey Definitions

9 journeys + DB validation phases. **150 total points** normalized to /100.

### Scoring Architecture

**Layer 1 — Agent Behavior (10 pts per journey × 9 = 90 pts)**

| Assertion | Points | Signal |
|-----------|--------|--------|
| `intent_emitted` | +3 | `intents.length > 0` AND correct `intent_type` (or 0 for J5) |
| `tool_correct` | +3 | Expected tool called with correct params |
| `intent_route_correct` | +3 | `intents[0].route` matches expected regex |
| `content_verified` | +1 | Response text plausible |

**Layer 2 — DB Truth Validation (60 pts total)**

Runs after J1, J2, J6, J8, J9 via `mcp__supabase__execute_sql`. Verifies actual data in DB.

| Phase | After | Checks | Points |
|-------|-------|--------|--------|
| DB-J1 | J1 (create) | 10 checks | 20 pts |
| DB-J2 | J2 (add tour) | 3 checks | 6 pts |
| DB-J6 | J6 (edit activities) | 3 checks | 6 pts |
| DB-J8 | J8 (flight search) | 5 checks | 10 pts |
| DB-J9 | J9 (multi-city) | 9 checks | 18 pts |

**Total: 90 (behavior) + 60 (DB truth) = 150 pts → normalize /100**

### Journey Table

| # | Session | Prompt | Expected Tools | Expected Intent | Route Pattern | Content Check |
|---|---------|--------|---------------|----------------|---------------|---------------|
| J1 | new | "Crea un itinerario a Cartagena para 2 adultos del 15 al 20 de abril 2026 desde Bogotá, asígnalo al cliente Test Plan 001" (v5) | `auto_plan_itinerary` | `navigation` | `^/itineraries/[a-f0-9-]+$` | `id_contact IS NOT NULL` |
| J2 | J1 conv | "Agrega el Tour Ciudad Amurallada de Cartagena al último itinerario que creaste" (v4) | `auto_edit_itinerary` | `navigation` | `^/itineraries/[a-f0-9-]+$` | `itinerary_id == $J1_ITINERARY_ID` |
| J3 | J1 conv | "Genera el PDF del último itinerario que creaste y ábrelo" (v3) | `generate_proposal_pdf` | `open_pdf` | `^/view/[a-f0-9-]+$` | `itinerary_id == $J1_ITINERARY_ID` |
| J4 | new | "Llévame a los itinerarios confirmados" | None | `navigation` | `^/itineraries\?status=Confirmado$` | Filtered list |
| J5 | new | "¿Cuántos itinerarios tengo en total?" | `list_itineraries` | **None** (negative) | N/A — pathname unchanged | Text response only |
| J6 | J1 conv | "Quita del itinerario las actividades de Chiva Rumbera y Fiesta Blanca, y deja solo Bahía Concha en Velero y Aracataca" (v1) | `auto_edit_itinerary` | `navigation` | `^/itineraries/[a-f0-9-]+$` | `auto_edit called` + no "¿cuáles actividades?" |
| J7 | new (2-turn) | J7a: "Quiero cambiar las actividades de mi último itinerario" → J7b: "Deja solo Bahía Concha en Velero y Aracataca" (v1) | J7b: `auto_edit_itinerary` | `navigation` | `^/itineraries/[a-f0-9-]+$` | J7b no context_loss |
| **J8** | **new** | **"Busca vuelos de Bogotá a Madrid para julio 2026, quiero ver opciones"** (v1) | `search_flights` | **None** (search, no nav) | N/A | Response contains airline names + prices in COP |
| **J9** | **new** | **"Crea viaje de 10 días: Medellín y Cartagena, 3 pasajeros, desde Bogotá, julio 2026, COP"** (v1) | `auto_plan_itinerary` | `navigation` | `^/itineraries/[a-f0-9-]+$` | Multi-city with flights |

---

## DB Truth Validation Phases

### DB-J1: Post-Creation Validation (20 pts)

After J1 completes and `$J1_ITINERARY_ID` is extracted, run these SQL checks:

```sql
-- Via mcp__supabase__execute_sql
SELECT
  count(*) as item_count,
  count(DISTINCT product_type) as type_count,
  count(*) FILTER (WHERE product_type = 'Vuelos') as flight_count,
  count(*) FILTER (WHERE product_type = 'Hoteles') as hotel_count,
  count(*) FILTER (WHERE product_type = 'Servicios') as activity_count,
  count(*) FILTER (WHERE product_type = 'Transporte') as transfer_count,
  count(*) FILTER (WHERE unit_price <= 0 AND unit_cost <= 0 AND product_type != 'Vuelos') as zero_price_count,
  count(*) FILTER (WHERE unit_cost > unit_price AND unit_price > 0) as negative_margin_count,
  sum(CASE WHEN product_type = 'Hoteles' THEN hotel_nights ELSE 0 END) as total_hotel_nights,
  count(*) FILTER (WHERE product_type = 'Vuelos' AND flight_departure IS NOT NULL) as flights_with_iata
FROM itinerary_items WHERE id_itinerary = '$J1_ITINERARY_ID';
```

```sql
SELECT passenger_count, status FROM itineraries WHERE id = '$J1_ITINERARY_ID';
```

| # | Check | Pass condition | Points |
|---|-------|---------------|--------|
| DB1 | Min items | `item_count >= 8` | +2 |
| DB2 | All 4 types | `type_count >= 4` (Hotels, Activities, Transfers, Flights) | +2 |
| DB3 | Flights with IATA | `flights_with_iata >= 2` (outbound + return) | +2 |
| DB4 | Flight prices real | Query `unit_price` of Vuelos items, all > 0 | +2 |
| DB5 | No zero prices | `zero_price_count == 0` | +2 |
| DB6 | Positive margins | `negative_margin_count == 0` | +2 |
| DB7 | Hotel nights | `total_hotel_nights >= 5` (matches date range) | +2 |
| DB8 | Passenger count | `passenger_count == 2` | +2 |
| DB9 | Status | `status == 'Presupuesto'` | +2 |
| DB10 | Catalog products linked | Query: `count(*) FILTER (WHERE id_product IS NOT NULL) >= item_count * 0.5` | +2 |

### DB-J2: Post-Edit Validation (6 pts)

After J2 (add tour), verify:

```sql
SELECT count(*) as new_count FROM itinerary_items WHERE id_itinerary = '$J1_ITINERARY_ID';
-- Compare with J1 item_count
```

| # | Check | Pass condition | Points |
|---|-------|---------------|--------|
| DB11 | Item added | `new_count > $J1_ITEM_COUNT` | +2 |
| DB12 | No new $0 items | New items have `unit_price > 0` OR acceptable (not in catalog) | +2 |
| DB13 | Original items intact | Original flight prices unchanged | +2 |

### DB-J6: Post-Edit Validation (6 pts)

After J6 (edit activities), verify:

```sql
SELECT count(*) as post_edit_count FROM itinerary_items WHERE id_itinerary = '$J1_ITINERARY_ID';
SELECT product_name FROM itinerary_items WHERE id_itinerary = '$J1_ITINERARY_ID' AND product_type IN ('Servicios','Actividades');
```

| # | Check | Pass condition | Points |
|---|-------|---------------|--------|
| DB14 | Items removed | `post_edit_count < $J2_ITEM_COUNT` | +2 |
| DB15 | Correct items remain | "Bahía Concha" or "Aracataca" in remaining activity names | +2 |
| DB16 | Flights untouched | Flight items unchanged | +2 |

### DB-J8: Flight Search Validation (10 pts)

J8 is a standalone search (no itinerary created). Validate the response content:

| # | Check | Pass condition | Points |
|---|-------|---------------|--------|
| DB17 | Tool called | `search_flights` in tools | +2 |
| DB18 | Airline names real | Response text contains known airlines (Avianca, LATAM, Iberia, Copa) | +2 |
| DB19 | Prices in COP | Response contains numbers > 1,000,000 (international flight) | +2 |
| DB20 | Hub routing mentioned | Response mentions "conexión", "escala", or "via BOG" (MAD→CTG requires hub) | +2 |
| DB21 | Score/recommendation | Response contains "recomend" or "⭐" or "mejor opción" | +2 |

### DB-J9: Multi-City Creation Validation (18 pts)

After J9 creates multi-city itinerary, extract `$J9_ITINERARY_ID` and run:

```sql
SELECT
  count(*) as item_count,
  count(*) FILTER (WHERE product_type = 'Vuelos') as flight_count,
  count(*) FILTER (WHERE product_type = 'Hoteles') as hotel_count,
  count(*) FILTER (WHERE product_type = 'Vuelos' AND unit_price > 0) as flights_with_price,
  count(DISTINCT destination) as destination_count,
  sum(CASE WHEN product_type = 'Hoteles' THEN hotel_nights ELSE 0 END) as total_nights
FROM itinerary_items WHERE id_itinerary = '$J9_ITINERARY_ID';

SELECT passenger_count FROM itineraries WHERE id = '$J9_ITINERARY_ID';
```

| # | Check | Pass condition | Points |
|---|-------|---------------|--------|
| DB22 | Min items | `item_count >= 12` (multi-city needs more) | +2 |
| DB23 | Multiple destinations | `destination_count >= 2` | +2 |
| DB24 | Multiple hotels | `hotel_count >= 2` (one per city) | +2 |
| DB25 | 3+ flight segments | `flight_count >= 3` (BOG→MDE, MDE→CTG, CTG→BOG) | +2 |
| DB26 | Flights with real prices | `flights_with_price >= 2` | +2 |
| DB27 | Hotel nights match | `total_nights >= 9` | +2 |
| DB28 | Passenger count | `passenger_count == 3` | +2 |
| DB29 | All 4 types present | Hotels + Activities + Transfers + Flights | +2 |
| DB30 | No zero catalog items | Non-flight items with $0 <= 2 (transfers may lack catalog) | +2 |

---

## Per Journey Execution Flow

**Primary channel: shadow probe via curl** (all journeys).
**Secondary channel: Flutter navigation check** (only if `flutter_check=true`).

Session state to maintain across journeys:
- `$JWT` — obtained in preflight step 2
- `$J1_CONV_ID` — conversation_id from J1 response (used by J2, J3, J6)
- `$J1_ITINERARY_ID` — itinerary UUID from J1 tool_result (used for J2/J3/J6 scoring)
- `$J7_CONV_ID` — conversation_id from J7a response (used by J7b)

---

### Shadow Probe: Core Function

Use `/tmp/parse_sse.py` (created in preflight) to parse all SSE responses.

**New conversation** (J1, J4, J5, J7a, J8, J9):
```bash
JWT=$(cat /tmp/qa-e2e-jwt.txt) && START=$(python3 -c "import time; print(int(time.time()*1000))") \
  && curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"message":"MESSAGE"}' \
  --max-time 240 --no-buffer > /tmp/jN_raw.txt 2>&1 \
  && END=$(python3 -c "import time; print(int(time.time()*1000))") \
  && echo "ELAPSED: $((END - START))ms" \
  && cat /tmp/jN_raw.txt | python3 /tmp/parse_sse.py > /tmp/jN_parsed.json
```

**Continue conversation** (J2, J3, J6, J7b):
```bash
JWT=$(cat /tmp/qa-e2e-jwt.txt) && curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"message":"MESSAGE","conversation_id":"$CONV_ID"}' \
  --max-time 240 --no-buffer > /tmp/jN_raw.txt 2>&1 \
  && cat /tmp/jN_raw.txt | python3 /tmp/parse_sse.py > /tmp/jN_parsed.json
```

**Read parsed results**:
```bash
python3 -c "
import json
d=json.load(open('/tmp/jN_parsed.json'))
print(f'Tools: {d[\"tool_names\"]}')
print(f'Tool errors: {len(d[\"tool_errors\"])}')
print(f'Intents: {d[\"intents\"]}')
print(f'Conv: {d[\"conversation_id\"]}')
print(f'Text: {d[\"text\"][:300]}')
"
```

For multi-turn (J2, J3, J6): pass `"conversation_id":"$J1_CONV_ID"` — the agent sees J1's full
tool_results in context, including the itinerary UUID.

---

### J1 — Crear itinerario (new conversation)

```bash
Bash: curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d "{\"message\":\"$(cat qa-agent-e2e-prompts.jsonl | python3 -c \"import sys,json; print([json.loads(l) for l in sys.stdin if json.loads(l).get('journey')=='J1' and json.loads(l).get('status')=='active'][0]['prompt'])\")\",\"conversation_id\":\"\"}" \
  --max-time 240 --no-buffer
```

Or inline with the active J1 prompt. Parse output:
- `tools` → must include `search_contacts` AND `auto_plan_itinerary`
- `intents` → must include `{ intent_type: "navigation", route: "/itineraries/{uuid}" }`
- `conversation_id` → store as `$J1_CONV_ID`
- From tool_result of `auto_plan_itinerary`: extract `itinerary_id` → store as `$J1_ITINERARY_ID`

To extract itinerary_id from DB (simpler than parsing SSE tool_result):
```bash
Bash: sleep 3 && psql_result=$(curl -s -X POST "https://wzlxbpicdcdvxvdcvgas.supabase.co/rest/v1/rpc/exec" ... )
```
Or via `mcp__supabase__execute_sql`:
```sql
SELECT id, id_contact FROM itineraries ORDER BY created_at DESC LIMIT 1;
```
Verify `id_contact IS NOT NULL` → confirms Test Plan 001 was assigned.

### J2 — Agregar tour (multi-turn, same conversation)

```bash
Bash: curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d "{\"message\":\"ACTIVE_J2_PROMPT\",\"conversation_id\":\"$J1_CONV_ID\"}" \
  --max-time 240 --no-buffer
```

Expected:
- `tools` → `auto_edit_itinerary` with `itinerary_id == $J1_ITINERARY_ID`
- `intents` → `{ intent_type: "navigation", route: "/itineraries/$J1_ITINERARY_ID" }`
- No context_loss ("¿a qué itinerario?") — the tool_result from J1 is in the conversation history

### J3 — Generar PDF (multi-turn, same conversation)

```bash
Bash: curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d "{\"message\":\"ACTIVE_J3_PROMPT\",\"conversation_id\":\"$J1_CONV_ID\"}" \
  --max-time 240 --no-buffer
```

Expected:
- `tools` → `generate_proposal_pdf` with `itinerary_id == $J1_ITINERARY_ID`
- `intents` → `{ intent_type: "open_pdf", route: "/view/{uuid}" }`

### J4 — Navegar filtrado (new conversation)

```bash
Bash: curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"message":"Llévame a los itinerarios confirmados",}' \
  --max-time 60 --no-buffer
```

Expected:
- `tools` → none (pure navigation)
- `intents` → `{ intent_type: "navigation", route: "/itineraries?status=Confirmado" }`

### J5 — Query sin intent (new conversation)

```bash
Bash: curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"message":"¿Cuántos itinerarios tengo en total?",}' \
  --max-time 60 --no-buffer
```

Expected:
- `tools` → `list_itineraries`
- `intents` → **empty** (P11 compliance — no navigation on analytical query)
- text response → contains a number

### J6 — Editar actividades (multi-turn, J1 conversation) — DYNAMIC PROMPT

Tests **Bug 2**: agent must call `auto_edit_itinerary` when given a direct activity edit instruction.

**J6 uses a DYNAMIC prompt** built from J1's actual data. After DB-J1, query the activities:
```sql
SELECT product_name FROM itinerary_items
WHERE id_itinerary = '$J1_ITINERARY_ID' AND product_type IN ('Servicios','Actividades');
```

If activities exist, build J6 prompt: "Quita del último itinerario que creaste la actividad {first_activity} y deja solo las demás"
If only 1 activity, skip J6 (can't remove from a single activity) and score 10/10 auto.

```bash
Bash: curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d "{\"message\":\"$J6_DYNAMIC_PROMPT\",\"conversation_id\":\"$J1_CONV_ID\"}" \
  --max-time 240 --no-buffer
```

Expected:
- `tools` → `auto_edit_itinerary` with `itinerary_id == $J1_ITINERARY_ID`
- `intents` → `{ intent_type: "navigation", route: "/itineraries/$J1_ITINERARY_ID" }`
- Response text must NOT contain: "¿cuáles actividades?", "necesito saber cuáles"

**Scoring J6:**
- `intent_emitted`: +3 if navigation intent emitted
- `tool_correct`: +3 if `auto_edit_itinerary` called with correct `itinerary_id`
- `intent_route_correct`: +3 if route matches `^/itineraries/[a-f0-9-]+$`
- `content_verified`: +1 if response does NOT contain unnecessary disambiguation question

### J7 — Context coherence: 2-step clarification (new conversation)

Tests **Bug 1**: agent must connect user's reply to the question it asked in the previous turn.
This is a 2-curl journey: J7a opens the conversation, J7b answers the agent's question.

**J7a — send ambiguous intent, wait for agent question:**
```bash
Bash: curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d '{"message":"Quiero cambiar las actividades de mi último itinerario",}' \
  --max-time 120 --no-buffer
```
- Extract `conversation_id` → store as `$J7_CONV_ID`
- Agent may ask "¿cuáles actividades?" or list them and ask — this is acceptable behavior in J7a
- J7a is NOT scored individually — it's setup for J7b

**J7b — answer the agent's question:**
```bash
Bash: curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -d "{\"message\":\"Deja solo Bahía Concha en Velero y Aracataca\",\"conversation_id\":\"$J7_CONV_ID\"}" \
  --max-time 240 --no-buffer
```

Expected J7b (PASS = agent connected the answer to its own question):
- `tools` → `auto_edit_itinerary` called (agent understood the reply is an activity selection)
- `intents` → `{ intent_type: "navigation", route: "/itineraries/..." }`
- Response does NOT contain: "Necesito un poco más de contexto", "¿Qué deseas hacer?", "No tengo registro de actividades"

Expected J7b (FAIL = context_loss bug):
- `tools` → empty (agent didn't understand the reply was answering its question)
- Response contains: "¿Qué deseas hacer? 1. Agregar 2. Crear 3. Buscar" (disambiguation loop)
- Log as `context_loss` issue type

**Scoring J7 (scored on J7b only):**
- `intent_emitted`: +3 if navigation intent emitted after J7b
- `tool_correct`: +3 if `auto_edit_itinerary` called (context preserved across turns)
- `intent_route_correct`: +3 if route matches `^/itineraries/[a-f0-9-]+$`
- `content_verified`: +1 if response does NOT contain context_loss phrases

---

### Scoring per journey (shadow probe mode)

| Assertion | Points | Shadow probe signal |
|-----------|--------|-------------------|
| `intent_emitted` | +3 | `intents.length > 0` AND correct `intent_type` (or 0 for J5) |
| `tool_correct` | +3 | Expected tool called with correct params (replaces `intent_route_correct` for J2/J3) |
| `intent_route_correct` | +3 | `intents[0].route` matches expected regex |
| `content_verified` | +1 | Response text non-empty AND plausible (not "¿a qué itinerario?") |

**J5 scoring** (negative test):
- `intent_emitted`: +3 if `intents.length === 0`
- `tool_correct`: +3 if `list_itineraries` called
- `intent_route_correct`: +3 auto (no intent expected)
- `content_verified`: +1 if response contains a number

### Flutter navigation check (only if `flutter_check=true`)

For J1 and J4, additionally verify via Chrome DevTools:
1. Navigate Flutter to the route from `intents[0].route`
2. Verify pathname changed correctly
3. Take snapshot — verify content labels match expected screen

This step is **skipped by default**. Run with `flutter_check=true` after Flutter-side changes.

### Step: Record to TSV

```bash
Bash: echo -e "{run_id}\tJ{N}\t{name}\t{intent_emitted}\t{tool_correct}\t{intent_route_correct}\t{content_verified}\t{score}\t{tools_csv}\t{intent_route}\t{conv_id}\t{elapsed_ms}\t{error}" >> qa-agent-e2e-results.tsv
```

---

## Multi-Turn Session Management

**Session A (J1 → DB-J1 → J2 → DB-J2 → J3 → J6 → DB-J6):**
Share `$J1_CONV_ID` across all four curl calls (J1, J2, J3, J6).
**CRITICAL**: Run DB validation IMMEDIATELY after each journey, BEFORE the next journey modifies data.

```
Execution order:
  J1 → DB-J1 (capture $J1_ITEM_COUNT) → J2 → DB-J2 → J3 → J6 → DB-J6
```

**Session B (J4):** New conversation — omit `conversation_id`
**Session C (J5):** New conversation — omit `conversation_id`
**Session D (J7):** New conversation — J7a creates `$J7_CONV_ID`, J7b reuses it.
**Session E (J8):** New conversation — omit `conversation_id`
**Session F (J9):** New conversation — omit `conversation_id`

J4, J5, J8, J9 are independent — can run in parallel with each other (but NOT with Session A).
J7 is intentionally NOT in Session A because we want to test cold context coherence.

**Context_loss note:** This was a Flutter-only issue. With shadow probe multi-turn, the agent
has the itinerary UUID from J1's tool_result in the conversation history. If J2/J3 still return
"¿a qué itinerario?" → it's a genuine agent context-reading bug. Log as `context_loss`.

---
## Karpathy Autoresearch: Fixed Time Budget (Principle 1)

Each journey has a **fixed 4-minute wall-clock budget**. This is strict — not a timeout but an invariant.

| Journey | Budget | Why |
|---------|--------|-----|
| J1 (create itinerary) | **4 min** | Complex: `auto_plan_itinerary` tool + multi-step creation |
| J2 (add tour) | **4 min** | Multi-turn: edit existing itinerary |
| J3 (generate PDF) | **4 min** | Multi-turn: PDF generation + render |
| J4 (filtered navigation) | **4 min** | Simple navigation but generous for consistency |
| J5 (analytical query) | **4 min** | Negative test, usually fast |
| J6 (edit activities) | **4 min** | Multi-turn: direct activity edit (Bug 2 regression test) |
| J7 (context coherence) | **6 min** | 2-turn: J7a setup + J7b answer → context_loss detection (Bug 1) |

**Total per cycle**: 7 journeys × ~4 min = **28 min fixed** per cycle (J7 is 6 min).
**Session budget**: `budget_minutes` (default 90) across all cycles.

**Hard enforcement**:
```javascript
// In the polling loop, use fixed 240s (4 min) instead of variable timeout
const JOURNEY_BUDGET_MS = 240000; // 4 minutes — Karpathy fixed budget
```

If the agent hasn't responded within 4 min → score 0 for that journey, log `BUDGET_EXCEEDED`, continue to next journey. No extensions, no retries within the same cycle. The budget makes results **comparable across runs**.

---

## Karpathy Autoresearch: Prompt Keep/Discard Loop (Principle 2)

The agent's equivalent of `train.py` is the **journey prompt**. The prompt is the variable we iterate on.

### Prompt Registry: `qa-agent-e2e-prompts.jsonl`

Each journey has a current "best" prompt and optional variants to try:

```bash
Bash: test -f qa-agent-e2e-prompts.jsonl || cat > qa-agent-e2e-prompts.jsonl << 'PROMPTS'
{"journey":"J1","version":5,"prompt":"Crea un itinerario a Cartagena para 2 adultos del 15 al 20 de abril 2026 desde Bogotá, asígnalo al cliente Test Plan 001","status":"active","best_score":10,"parent_version":4,"mutation":"add_origin_city"}
{"journey":"J2","version":4,"prompt":"Agrega el Tour Ciudad Amurallada de Cartagena al último itinerario que creaste","status":"active","best_score":10,"parent_version":3,"mutation":"explicit_last_itinerary_reference"}
{"journey":"J3","version":3,"prompt":"Genera el PDF del último itinerario que creaste y ábrelo","status":"active","best_score":10,"parent_version":2,"mutation":"explicit_last_itinerary_reference"}
{"journey":"J4","version":1,"prompt":"Llévame a los itinerarios confirmados","status":"active","best_score":10}
{"journey":"J5","version":1,"prompt":"¿Cuántos itinerarios tengo en total?","status":"active","best_score":10}
{"journey":"J6","version":2,"prompt":"Quita del último itinerario que creaste las actividades de Chiva Rumbera y Fiesta Blanca, y deja solo Bahía Concha en Velero y Aracataca","status":"active","best_score":10,"parent_version":1,"mutation":"add_last_itinerary_ref"}
{"journey":"J7a","version":1,"prompt":"Quiero cambiar las actividades de mi último itinerario","status":"active","best_score":0}
{"journey":"J7b","version":1,"prompt":"Deja solo Bahía Concha en Velero y Aracataca","status":"active","best_score":10}
{"journey":"J8","version":2,"prompt":"Busca vuelos de Bogotá a Madrid para el 15 de julio 2026, quiero ver opciones y precios","status":"active","best_score":0,"parent_version":1,"mutation":"add_explicit_date"}
{"journey":"J9","version":2,"prompt":"Crea viaje de 10 días del 5 al 15 de julio 2026: Medellín y Cartagena, 3 pasajeros, desde Bogotá, COP","status":"active","best_score":0,"parent_version":1,"mutation":"add_explicit_dates"}
PROMPTS
```

**Note**: J6/J7a/J7b prompts now included. J2/J3 use "último itinerario que creaste" (proven v4/v3).
J9 v2 adds explicit dates (gpt-oss-20b needs them to avoid clarification loop).

### Keep/Discard Logic (per journey, per cycle)

After scoring a journey:

```
current_prompt = active prompt for this journey
current_score  = score from this run (0-10)
best_score     = best historical score for this journey

IF current_score > best_score:
  → KEEP: update best_score, mark prompt as "active"
  → Log: {"action": "keep", "journey": "J{N}", "score": current_score, "prompt_version": V}

ELSE IF current_score == best_score:
  → KEEP (tie goes to current — no regression)

ELSE (current_score < best_score):
  → DISCARD: revert to previous best prompt
  → Log: {"action": "discard", "journey": "J{N}", "score": current_score, "best": best_score}
```

### Prompt Mutation Constraints (from AI_AGENT_DEVELOPMENT_PRINCIPLES.md)

Mutated prompts MUST respect the 12 non-negotiable principles of the Bukeer AI Manifesto. The mutation loop optimizes the **user prompt**, NOT the system prompt or tool definitions. These constraints are invariants:

**From Principle 3 (Bidirectional Safety):**
- J1-J3 prompts MUST NOT try to manipulate the agent into bypassing `requires_confirm` or emitting intents outside the allowlist.
- J5 (negative) validates Principle 11: the agent MUST NOT emit navigation intents for analytical queries. If J5 fails because the agent emits an unwanted intent, the problem is in the system prompt or intent-policy, NOT in the user prompt. Do NOT mutate J5 prompt to "trick" the agent into not navigating — that masks a real bug.

**From Principle 7 (Evaluation by Outcomes):**
- Scoring MUST verify actual state (pathname changed, content rendered), not just what the agent "said" it did. This is already implemented via `flutter_navigated` and `content_verified` assertions.
- If the agent says "Itinerario creado" but the pathname didn't change → `flutter_navigated = 0`. The prompt mutation should help the agent succeed, not lower the bar.

**From Principle 9 (Dispatcher Pattern):**
- Prompts MUST NOT ask the agent to generate UI markup, HTML, or pseudo-cards. The agent delegates to Flutter via intents.
- If a journey fails because the agent responds with a Markdown table instead of navigating, log as `intent_missing` with note "agent used text instead of intent (P9 violation)".

**From Principle 11 (Proactive Intent Emission):**
- J1 prompt must trigger resource creation → agent MUST emit navigation intent to the detail. If it doesn't, the issue may be the `auto_plan_itinerary` tool not triggering intent emission. Log for investigation.
- J4 prompt contains explicit navigation ("Llévame a...") → agent MUST emit intent. If it doesn't, this is a system prompt issue (navigation patterns), not a user prompt issue.

**From Section 7 (AutoResearch Lessons):**
- **7.1 Prompt Chain > Agent Loop**: J1 uses `auto_plan_itinerary` (a single mega-tool, per Principle 9.2). The prompt should trigger THIS tool, not individual `create_itinerary` + `add_item` calls.
- **7.2 Minimize tool calls**: A good J1 prompt results in 1 tool call (`auto_plan_itinerary`), not 5+. Track `tools.length` per journey and prefer prompts that trigger fewer, more efficient tool calls.
- **7.3 Transparency**: The agent should see what it decides. Prompts that give too much detail may bypass the agent's decision-making. Keep prompts at the level a real user would type.

**From Section 9.3 (Tools are prominent in context):**
- If the agent calls unexpected tools (e.g., `search_products` instead of `auto_plan_itinerary`), the problem is tool registration, not the user prompt. Log as `unexpected_tool` learning, don't mutate the prompt.

### Prompt Mutation (between cycles)

For journeys that scored < 7/10, mutate the prompt for the next cycle.

**Mutation strategies** (pick one per journey per cycle, respecting constraints above):

1. **Add specificity**: "Crea un itinerario..." → "Crea un itinerario de viaje turístico..." — helps agent choose correct tool
2. **Add explicit intent trigger**: "...y llévame al detalle" (forces navigation intent) — aligns with Principle 11 proactive emission
3. **Rephrase action verb**: "Crea" → "Planifica" / "Genera" → "Prepara" — matches system prompt keywords
4. **Add context markers**: "Para mi cliente Juan Pérez, crea un itinerario..." — gives entity context per Principle 4
5. **Simplify**: Remove optional details that may confuse the agent — per Section 7.3 transparency
6. **Match system prompt vocabulary**: Use verbs/nouns from `system-prompt.ts` route catalog — aligns agent classification (Section 6.3)

**MUST NOT mutate:**
- J5 prompt to avoid intent emission (masks P11 bugs)
- Any prompt to include tool names (users don't know tool names)
- Any prompt to inject system-level instructions (P3 safety violation)
- Any prompt to request UI markup from agent (P9 dispatcher violation)

Append the mutated prompt as a new version:

```bash
Bash: echo '{"journey":"J{N}","version":{V+1},"prompt":"{{MUTATED_PROMPT}}","status":"candidate","best_score":0,"parent_version":{V},"mutation":"{{strategy}}"}' >> qa-agent-e2e-prompts.jsonl
```

The **candidate** prompt becomes **active** for the next cycle. If it scores better → keep. If worse → discard and revert to parent version.

---

## Karpathy Autoresearch: Multi-Cycle Loop (Principle 3)

The outer loop repeats the 5-journey cycle up to `max_cycles` times (default 3), mutating prompts that fail between cycles.

### Cycle Procedure

```
FOR cycle = 1 to max_cycles:
  IF total_elapsed >= budget_minutes → STOP
  IF e2e_score >= 90 from previous cycle → STOP (target reached)
  IF 2 consecutive cycles with same score → STOP (plateau)

  1. Load active prompts from qa-agent-e2e-prompts.jsonl
  2. Load learnings from qa-agent-e2e-learnings.jsonl
  3. Run 7 journeys (J1-J7) with fixed budget each (J7=6min, others 4min)
  4. Score each journey → compute e2e_score
  5. Per journey: keep/discard prompt (compare vs best_score)
  6. For failed journeys (< 7/10): mutate prompt for next cycle
  7. Record learnings
  8. Record cycle results to TSV
  9. Log cycle summary

  IF e2e_score >= 90 → STOP (success)
  IF cycle > 1 AND abs(e2e_score - prev_e2e_score) < 5 → plateau_count++
  IF plateau_count >= 2 → STOP (plateau — prompts aren't the problem)
```

### Cycle Flow Diagram

```
Cycle 1:  [J1:8] [J2:3] [J3:7] [J4:10] [J5:10] → e2e_score=76
          J2 failed → mutate J2 prompt
          J3 borderline → keep but try variant

Cycle 2:  [J1:8] [J2:7] [J3:9] [J4:10] [J5:10] → e2e_score=88
          J2 improved → KEEP new prompt
          J3 improved → KEEP new prompt

Cycle 3:  [J1:9] [J2:8] [J3:9] [J4:10] [J5:10] → e2e_score=92 → STOP (>= 90)
```

### Auto-Stop Conditions

| Condition | Action |
|-----------|--------|
| `e2e_score >= 90` | Stop — target reached |
| `budget_minutes` exceeded | Stop — time's up |
| 2 consecutive plateaus (`abs(delta) < 5`) | Stop — prompts aren't the bottleneck |
| `max_cycles` reached | Stop — exhausted iterations |

---

## Failure Backlog

For each journey scoring < 7/10 in the **final cycle**, append to `qa-improvement-backlog.tsv`:

```bash
Bash: echo -e "{run_id}\tagent-e2e\t{issue_id}\tai_agent\t{route}\t{issue_type}\t{severity}\t{repro_steps}\t{expected}\t{actual}\tInvestigate agent pipeline\t0.7\topen\tqa-agent-e2e\t{timestamp}" >> qa-improvement-backlog.tsv
```

Issue types:
- `intent_missing`: Expected intent not emitted
- `intent_wrong_route`: Intent emitted with wrong route
- `navigation_fail`: Flutter didn't navigate after intent
- `content_fail`: Screen content doesn't match
- `budget_exceeded`: Journey exceeded 4-min fixed budget
- `probe_error`: Agent returned error
- `fab_not_found`: AI FAB not visible (feature flag issue)
- `chat_panel_fail`: Chat panel didn't open
- `prompt_plateau`: Prompt mutations exhausted without improvement
- `context_loss`: Agent failed to connect user's reply to its own previous question (J7 regression test)
- `p9_dispatcher_violation`: Agent returned UI markup instead of intent (Principle 9)
- `p11_spurious_intent`: Agent emitted unwanted intent on analytical query (Principle 11)
- `unexpected_tool`: Agent called wrong tool (Section 9.3 — tool registration issue)
- `excessive_tools`: Agent used >3 tool calls where 1 should suffice (Section 7.2)

Severity:
- `high`: budget_exceeded, probe_error, intent_missing, fab_not_found
- `medium`: intent_wrong_route, navigation_fail, chat_panel_fail, prompt_plateau
- `low`: content_fail

---

## Meta-Learning: Learnings File

Each cycle produces learnings that improve future cycles AND future invocations.

### Learning Bootstrap (start of every invocation)

```bash
Bash: test -f qa-agent-e2e-learnings.jsonl && cat qa-agent-e2e-learnings.jsonl || echo "[]"
```

Parse each line as JSON. Apply high-confidence learnings (>= 0.8) as session constraints.

### Learning Types

| Type | Example | When |
|------|---------|------|
| `timing` | "J1 avg 95s, well within 240s budget" | After each journey |
| `prompt_keep` | "J2v3 scored 8/10, kept over v2 (scored 3)" | On keep decision |
| `prompt_discard` | "J3v2 scored 5, discarded — v1 (7) was better" | On discard decision |
| `ui_interaction` | "FAB aria-label is 'Asistente IA'" | When FAB search succeeds/fails |
| `panel_recovery` | "Panel closes after nav, 3s wait before re-click works" | When re-open works/fails |
| `intent_pattern` | "J4 case-insensitive Confirmado match needed" | When route regex fails |
| `mutation_strategy` | "add_specificity works for J1, rephrase_verb works for J3" | After keep/discard |
| `score_trend` | "e2e_score: 76 → 88 → 92" | End of each cycle |

### Post-Journey Learning

After scoring each journey, record 0-2 learnings:

```bash
Bash: echo '{"timestamp":"{{ISO_8601}}","cycle":{{C}},"journey":"J{{N}}","learning_type":"{{type}}","key":"{{key}}","value":"{{value}}","confidence":{{0.0-1.0}},"score":{{score}},"source":"qa-agent-e2e"}' >> qa-agent-e2e-learnings.jsonl
```

### Post-Cycle Trend

```bash
Bash: echo '{"timestamp":"{{ISO_8601}}","cycle":{{C}},"journey":"OVERALL","learning_type":"score_trend","key":"e2e_score","value":"{{e2e_score}}","confidence":1.0,"run_id":"{{run_id}}","prompts_kept":{{N}},"prompts_discarded":{{N}},"source":"qa-agent-e2e"}' >> qa-agent-e2e-learnings.jsonl
```

### Learning Schema

```json
{
  "timestamp": "ISO-8601",
  "cycle": 1,
  "journey": "J1|J2|J3|J4|J5|OVERALL",
  "learning_type": "timing|prompt_keep|prompt_discard|ui_interaction|panel_recovery|intent_pattern|mutation_strategy|score_trend",
  "key": "descriptive_key",
  "value": "what was learned",
  "confidence": 0.8,
  "score": 80,
  "run_id": "agent-e2e-20260316-143000",
  "source": "qa-agent-e2e"
}
```

Rules:
- Append-only, never delete
- Read at start of every invocation
- High-confidence (>= 0.8) become constraints
- Prompt keep/discard learnings feed mutation strategy selection

---

## Final Score Computation

```
behavior_scores = [J1..J9]  // each 0-10, total 0-90
db_scores = [DB-J1(20) + DB-J2(6) + DB-J6(6) + DB-J8(10) + DB-J9(18)]  // total 0-60
raw_total = sum(behavior_scores) + sum(db_scores)  // 0-150
e2e_score = (raw_total / 150) * 100  // 0-100
```

**Score breakdown in report:**
```
Agent Behavior:  {behavior_total}/90  ({pct}%)
DB Truth:        {db_total}/60  ({pct}%)
Combined:        {e2e_score}/100
```

**Target**: `e2e_score >= 85` (auto-stop) | minimum acceptable: `>= 75`
**DB Truth alone must be >= 70%** — if behavior is 100% but DB is <70%, flag as critical.

---

## Final Report

```
══════════════════════════════════════════════════════════════
 QA AGENT E2E — Autoresearch Report
 Run: {run_id} | Cycles: {N} | Final Score: {e2e_score}/100
══════════════════════════════════════════════════════════════
 Cycle progression: {c1_score} → {c2_score} → {c3_score}
══════════════════════════════════════════════════════════════

 AGENT BEHAVIOR ({behavior_total}/90)
 ─────────────────────────────────────
 J1 Crear itinerario:             {J1_score}/10  {pass/fail}  prompt v{V}
 J2 Agregar tour (multi-turn):   {J2_score}/10  {pass/fail}  prompt v{V}
 J3 Generar PDF (multi-turn):    {J3_score}/10  {pass/fail}  prompt v{V}
 J4 Navegar filtrado:            {J4_score}/10  {pass/fail}  prompt v{V}
 J5 Query sin intent:            {J5_score}/10  {pass/fail}  prompt v{V}
 J6 Editar actividades:          {J6_score}/10  {pass/fail}  prompt v{V}
 J7 Context coherence (2-turn):  {J7_score}/10  {pass/fail}  prompt v{V}
 J8 Flight search (standalone):  {J8_score}/10  {pass/fail}  prompt v{V}  ← NEW
 J9 Multi-city open-jaw:         {J9_score}/10  {pass/fail}  prompt v{V}  ← NEW

 DB TRUTH VALIDATION ({db_total}/60)
 ─────────────────────────────────────
 DB-J1 Creation (10 checks):     {dbj1}/20  {items}/{types}/{flights}/{prices}
 DB-J2 Edit add (3 checks):      {dbj2}/6   {added}/{no_zero}/{intact}
 DB-J6 Edit remove (3 checks):   {dbj6}/6   {removed}/{correct_remain}/{flights_ok}
 DB-J8 Flight quality (5 checks): {dbj8}/10  {airline_real}/{prices_cop}/{hub}/{score}
 DB-J9 Multi-city (9 checks):    {dbj9}/18  {items}/{dests}/{hotels}/{flights}/{nights}

══════════════════════════════════════════════════════════════
 Assertion breakdown:
   intent_emitted:       {sum}/27
   tool_correct:         {sum}/27
   intent_route_correct: {sum}/27
   content_verified:     {sum}/9
   db_checks_passed:     {sum}/30
══════════════════════════════════════════════════════════════
 Prompts kept: {N} | Prompts discarded: {N}
 Mutations applied: {N} | Best mutation strategy: {strategy}
 Backlog items created: {N}
 Learnings recorded: {N}
 Stop reason: {target_reached|budget_exceeded|plateau|max_cycles}
 Total elapsed: {total_ms}ms

Artifacts:
- qa-agent-e2e-results.tsv
- qa-agent-e2e-prompts.jsonl (prompt evolution)
- qa-agent-e2e-learnings.jsonl (meta-learning)
- qa-improvement-backlog.tsv (if failures)
══════════════════════════════════════════════════════════════
```

## Karpathy Alignment Summary

| Autoresearch Principle | Our Implementation |
|----------------------|-------------------|
| **Single file to modify** (`train.py`) | Single variable to iterate: **journey prompts** (`qa-agent-e2e-prompts.jsonl`) |
| **Fixed 5-min time budget** | Fixed **4-min** budget per journey (generous for complex itinerary creation) |
| **Single scalar metric** (`val_bpb`) | Single scalar: **`e2e_score`** (0-100, higher is better) |
| **Keep/discard binary loop** | Per-journey prompt keep/discard based on `score > best_score` |
| **Self-contained** | Requires agent-server + Flutter + Chrome DevTools (inherent to the problem) |
| **Human programs Markdown** | Human iterates `qa-agent-e2e.md`, agent iterates prompts |

## Integration with Other QA Commands

- `qa-agent-e2e` does NOT fix code — it iterates prompts and detects pipeline issues
- Failures go to `qa-improvement-backlog.tsv` with `source=qa-agent-e2e`
- Best prompts are preserved in `qa-agent-e2e-prompts.jsonl` for future runs
- Remediation is owned by `qa fix` or manual dev work
- Can be run after `qa` to validate intent pipeline end-to-end
- **Prerequisite**: `.env` must have `ENABLE_AI_ASSISTANT_PROJECT=true` and `AI_AGENT_BASE_URL=http://localhost:3001`

---

## Cross-Command Learnings (2026-03-30)

### Agent-Server: PORT=3001 is Mandatory

Default port is 3000 (conflicts with Next.js). Always use `PORT=3001` when starting.
If `curl http://localhost:3001/health` fails but port 3000 is busy, check if agent-server started on wrong port.

### J6 Regression Fix: `skipped_operations` in auto-editor

`auto-editor.ts` now returns `skipped_operations[]` when items can't be found by fuzzy matching.
The system prompt instructs the agent to report skipped items to the user.
If J6 still fails: check if activity names in the itinerary match the prompt (fuzzy threshold is 0.15 for instruction match, 0.2 for targetName match).

### J7 Regression Fix: Conversation History Rule 3

`system-prompt.ts` now has Rule 3: "scan conversation history for itinerary_id from prior tool results".
This fixes context loss in multi-turn edits where J7a finds the itinerary and J7b edits it.
If J7 still fails: check if the agent is actually using conversation_id to resume (not creating new conv).

### macOS: No `timeout` Command

Use `for i in $(seq 1 N); do ... && break; sleep M; done` pattern instead of `timeout`.

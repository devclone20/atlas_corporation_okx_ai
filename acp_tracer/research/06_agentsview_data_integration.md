# agentsview — Data Model & Integration

Research slice for **ACP Tracer** (ATLAS). Studied from the actual cloned source of
`kenn-io/agentsview` (shallow clone, read-only).

> **CRITICAL FINDING — premise correction.** The task brief assumed agentsview
> "tracks agents and likely connects to ACP data sources." **This is false.**
> agentsview is a **local-first observability tool for AI *coding* agents**
> (Claude Code, Codex, Devin, Cursor, Zed, Copilot, Kiro, OpenCode, Forge,
> etc.). It reads local session files (`~/.claude/projects`, SQLite DBs) and
> serves a web UI. There is **NO** Virtuals ACP, no Base/Ethereum RPC, no
> subgraph, no smart-contract, no web3/ethers/viem, and no on-chain wallet
> code anywhere in the repo. Verified: `grep -riE "virtuals|subgraph|web3|
> ethers|viem|blockchain|onchain|erc721"` returns only false positives
> (`virtual_source_path` = virtual file paths; `wallet` = a Linux libsecret/
> KWallet comment; `crypto` = Go stdlib for local credential decryption).
>
> It is therefore **NOT a source of live ACP state.** Its value to ACP Tracer
> is **architectural**: it is a mature, world-class reference for the
> *ingest → normalize → SQLite → HTTP/SSE → reactive frontend* pattern that
> ACP Tracer will need — just with Virtuals ACP / OKX / Base swapped in as the
> upstream data source instead of local files.

---

## Sources

All paths relative to the clone root
`atlas_corporation_okx_ai/acp_tracer/research/_clones/agentsview/`.

- `README.md`, `PRODUCT.md`, `AGENTS.md` — product framing (local-first, no accounts).
- `internal/db/schema.sql` — canonical SQLite schema (data model).
- `internal/db/usage.go`, `internal/db/usage_events.go` — cost/usage queries (balance-analog).
- `internal/sync/engine.go`, `internal/sync/watcher.go` (+ `watcher_test.go`) — file→DB sync + `fsnotify` file watcher.
- `internal/sessionwatch/watcher.go` — DB-polling watcher (poll interval, heartbeat).
- `internal/server/huma_routes_sessions.go` — SSE handlers `humaEvents`, `humaWatchSession`; full session route table.
- `internal/server/broadcaster.go` — in-process fan-out to SSE subscribers.
- `internal/server/events.go` — SSE ↔ sessionwatch adapter.
- `internal/server/auth.go` — Bearer-token + loopback-only auth model.
- `internal/server/openapi.go`, `internal/server/huma_routes.go` — Huma → OpenAPI generation.
- `internal/config/config.go` — env vars, data dir, auth token.
- `internal/cursorusage/client.go` — the **one** external REST integration (Cursor Admin API).
- `internal/remotesync/*.go` — S3/remote transcript pull (central-instance mode).
- `frontend/src/lib/stores/events.svelte.ts`, `frontend/src/lib/api/client.ts`,
  `frontend/src/lib/api/generated/` — frontend `EventSource` consumer + OpenAPI-generated TS client.

Stack: **Go backend** (Huma v2 for typed routes + auto OpenAPI, SQLite primary
store, optional PostgreSQL/DuckDB push targets, `fsnotify`) + **Svelte 5
frontend** (runes, generated TS client, `EventSource` for live updates).

---

## Data sources (APIs / subgraph / RPC / SDK w/ endpoints)

agentsview is fundamentally a **file/DB ingest** tool, not an API client. Its
inputs:

1. **Local agent session files (primary).** Per-agent parsers under
   `internal/parser/` discover and read local files:
   - Claude Code JSONL: `~/.claude/projects/**/*.jsonl` (env `CLAUDE_PROJECTS_DIR`, config `claude_project_dirs`).
   - Devin CLI: `<DEVIN_DIR>/cli/...` (env `DEVIN_DIR`).
   - Forge: `~/.forge` (env `FORGE_DIR`).
   - SQLite-backed agents (Kiro, Zed/Shelley, OpenCode, VS Code Copilot): read directly from each agent's local `*.db`/`*.sqlite3` via a "virtual source path" scheme (`internal/parser/virtual_source_path.go`).
2. **`s3://` roots (optional).** Claude/Codex source roots may be `s3://…` so a
   central agentsview instance reads sessions other machines push to
   S3-compatible object storage (`internal/remotesync/`, config
   `claude_project_dirs`). This is object-storage pull, not an agent API.
3. **Cursor Admin API (the only true external REST call).**
   `internal/cursorusage/client.go`:
   - Base URL: `https://api.cursor.com` (`defaultBaseURL`, overridable).
   - Endpoint used: **`POST /teams/filtered-usage-events`**.
   - Auth: HTTP **Basic**, API key as username, empty password (`req.SetBasicAuth(c.APIKey, "")`).
   - Configured via env `AGENTSVIEW_CURSOR_ADMIN_API_KEY` / `_EMAIL` / `_USER_ID`.

**No blockchain data source of any kind.** [UNVERIFIED — not in repo] Any ACP/
Virtuals/Base/subgraph endpoints ACP Tracer needs must be sourced elsewhere;
agentsview provides none.

**Own HTTP API surface** (served locally; how the frontend gets data). Huma
group `/api/v1`, default bind `http://127.0.0.1:8080`. Key routes
(`internal/server/huma_routes_sessions.go` and siblings):
- `GET /api/v1/sessions`, `/sessions/sidebar-index`, `/sessions/{id}`
- `GET /sessions/{id}/messages`, `/tool-calls`, `/children`, `/activity`, `/timing`, `/usage`, `/search`
- `GET /sessions/{id}/watch` — **SSE** per-session live stream
- `GET /api/v1/events` — **SSE** global change stream
- `GET /sessions/{id}/export` (HTML), `/md` (Markdown)
- `POST /sessions/{id}/publish|resume|open`, `/sessions/upload`, `/sessions/batch-delete`
- `GET /api/v1/analytics/{summary,projects,sessions,tools,skills,velocity,heatmap,hour-of-week,signals,signal-sessions,top-sessions}`
- `GET /api/v1/{stats,agents,projects,machines,branches,session-stats,recent-edits}`
- `GET /api/v1/insights` + `POST /generate`; `/pins`; `/ping`; `/version`; `/update/check`
- `POST /api/v1/sync`, `/resync`, `/scan`; `POST /api/v1/push/{pg,duckdb}`
- OpenAPI document served at `/api/openapi.json` (auto-generated by Huma;
  `internal/server/openapi.go`) — this is what generates the frontend TS client.

---

## Data model (agents / jobs / steps / balance)

Canonical schema: `internal/db/schema.sql`. Mapping to ACP concepts is the
useful takeaway:

- **`sessions`** (≈ ACP **job / agent run**). PK `id TEXT`. Columns include
  `project`, `machine`, `agent` (e.g. `claude`), `first_message`,
  `display_name`, `started_at`, `ended_at`, `message_count`,
  `user_message_count`, `file_path`/`file_size`/`file_mtime`/`file_hash`/
  `file_inode`/`file_device` (source-file identity for change detection),
  `parent_session_id` + `relationship_type` (session lineage / resume graph),
  token rollups (`total_output_tokens`, `peak_context_tokens`), and a rich
  **quality/health signal block**: `outcome`, `outcome_confidence`,
  `health_score`, `health_grade`, `tool_failure_signal_count`,
  `tool_retry_count`, `consecutive_failure_max`, `compaction_count`,
  `secret_leak_count`, `termination_status`, etc.
- **`messages`** (≈ ACP **step / phase transition**). `session_id` FK
  (ON DELETE CASCADE), **`ordinal`** (monotonic per session — the key idea:
  ordered, range-queryable steps; `UNIQUE(session_id, ordinal)`), `role`,
  `content`, `thinking_text`, `timestamp`, `model`, `token_usage` (JSON),
  `context_tokens`, `output_tokens`, `has_tool_use`, `is_sidechain`,
  `is_compact_boundary`, source-provenance fields (`source_uuid`,
  `source_parent_uuid`, `claude_message_id`, `claude_request_id`).
- **`usage_events`** (≈ ACP **balance / cost ledger**). Per-event token & cost
  accounting: `session_id` FK, `message_ordinal`, `source`, `model`,
  `input_tokens`, `output_tokens`, `cache_creation_input_tokens`,
  `cache_read_input_tokens`, `reasoning_tokens`, **`cost_usd`**, `cost_status`,
  `cost_source`, `occurred_at`, and **`dedup_key`** with a partial UNIQUE index
  `idx_usage_events_dedup(session_id, source, dedup_key)` — idempotent
  ingest / exactly-once accounting. `cursor_usage_events` is a parallel table
  for Cursor's aggregate billing feed.
- **`stats`** — trigger-maintained counters (`session_count`, `message_count`)
  via `AFTER INSERT/DELETE` triggers — cheap O(1) totals.
- Cost/"balance" reads: `internal/db/usage.go` builds filtered
  `SUM(cost_usd)` / token rollups over `usage_events` (+ message-level
  `token_usage`), with daily-bucket CTEs (`dailyUsageRowsSQL…`) — directly
  analogous to an ACP balance/spend view.

There is **no** on-chain balance, wallet, or token-transfer model. "Balance"
here means USD cost + token accounting derived from usage events.

---

## Real-time update mechanism

Three cooperating layers (all in-process; no external pub/sub, no websockets —
**SSE only**):

1. **Ingest trigger — `fsnotify` file watcher** (`internal/sync/watcher.go`).
   Watches agent source dirs; on file create/write/rename it runs an
   incremental sync pass through `internal/sync/engine.go` (batch size 100,
   ≤8 workers). Storage-mode/discovery details in `internal/parser/discovery.go`.
2. **Change fan-out — `Broadcaster`** (`internal/server/broadcaster.go`).
   Implements `sync.Emitter`. After a sync pass writes data it calls
   `Emit(scope)` (e.g. `Emit("sessions")`). Fan-out is **rate-limited with
   leading+trailing-edge coalescing** (`minInterval`): first emit in a quiet
   window fires immediately, bursts collapse into one trailing broadcast.
   Delivery is **non-blocking** — per-subscriber buffer cap = 8; slow clients
   get events dropped, engine never blocks. `GET /api/v1/events` subscribes and
   emits SSE `data_changed {scope}` events + periodic `heartbeat`
   (`humaEvents`, `huma_routes_sessions.go:842`).
3. **Per-session live tail — `sessionwatch.Watcher`** (`internal/sessionwatch/
   watcher.go`, adapted in `internal/server/events.go`). **Polls the DB** every
   **`PollInterval = 1500ms`** via `GetSessionVersion(id)` (count + version);
   ticks the channel only on change. Has a file-mtime **fallback sync**: if the
   DB hasn't updated but the source file mtime advanced past
   `SyncFallbackDelay`, it triggers a direct sync (self-heals missed fsnotify
   events). `GET /sessions/{id}/watch` (`humaWatchSession`) streams SSE
   `session_updated` + `session.timing` JSON + `heartbeat`
   (every `PollInterval * HeartbeatTicks`).

**Frontend consumer** (`frontend/src/lib/stores/events.svelte.ts`): a single
shared `EventSource` to `/api/v1/events` with a **circuit breaker**
(`permanentlyFailed`), a 60s **self-heal timer** (`EVENTS_STORE_HEAL_INTERVAL_MS`),
**visibility-based reconnect** (retries when tab becomes visible), and a
**debounced subscribe** (`subscribeDebounced`, trailing-edge, default 300ms) so
UI stores refetch once per burst. Reactivity model: SSE says "something in
`scope` changed → refetch"; it does **not** push row payloads.

---

## Auth / keys required

- **Local mode (default): none.** Binds loopback `127.0.0.1:8080`, no accounts.
  `internal/server/auth.go` gates secret exposure on `isLocalhostRequest`
  (direct loopback only; any `X-Forwarded-For`/`X-Real-IP`/`Forwarded` header
  ⇒ treated as proxied/remote, fails closed).
- **Remote/central mode: Bearer token.** `authMiddleware` enforces
  `Authorization: Bearer <token>` on protected paths; token from
  `AGENTSVIEW_AUTH_TOKEN` (config `AuthToken`). Fails **closed** if remote sync
  is enabled but no token is set. SSE/watch endpoints accept `?token=` as a
  fallback because `EventSource` can't set headers.
- **Cursor Admin API:** `AGENTSVIEW_CURSOR_ADMIN_API_KEY` (+ `_EMAIL`,
  `_USER_ID`), sent as HTTP Basic.
- **PG/DuckDB/S3 push targets:** `AGENTSVIEW_PG_URL`/`_SCHEMA`/`_MACHINE`,
  `AGENTSVIEW_DUCKDB_URL`/`_TOKEN`/`_PATH`, S3 creds via standard AWS env.
- Data dir: `AGENTSVIEW_DATA_DIR` (legacy `AGENT_VIEWER_DATA_DIR`).

No API keys are needed to *read agent state* — the state is local files.

---

## What to reuse for ACP Tracer

Reuse the **architecture and patterns**, not the data source. High-value:

1. **Three-table normalized model:** `agents/jobs` ↔ `sessions`,
   `steps/phases` ↔ `messages` (with a monotonic `ordinal` for ordered,
   range-queryable phase transitions), `balance/spend` ↔ `usage_events` with a
   **`dedup_key` + partial UNIQUE index for idempotent/exactly-once ingest** —
   essential when polling a chain/subgraph that may replay events.
2. **Ingest→normalize→store→emit pipeline** with a pluggable **provider/parser
   interface** (`internal/parser/`, `parser.AgentType`) — ACP Tracer's
   equivalent: a `Source` interface with Virtuals-ACP, OKX, and Base-RPC
   implementations feeding one normalized schema.
3. **SSE-only real-time model** (no websockets): a rate-limited **coalescing
   broadcaster** (leading+trailing edge, bounded per-sub buffer, drop-on-full)
   + **scope-based "refetch now"** events rather than pushing payloads. Copy
   this wholesale — it's the right pattern for a no-code UI over volatile
   on-chain state.
4. **Poll-with-fallback watcher** (`sessionwatch`): DB-version polling at a
   fixed interval + a mtime/`fromBlock`-style fallback that self-heals missed
   push events. For ACP Tracer, poll the subgraph/RPC at an interval and keep a
   `lastProcessedBlock` fallback.
5. **Huma → auto-OpenAPI → generated TS client.** Typed Go routes generate
   `/api/openapi.json`, which generates the Svelte client
   (`frontend/src/lib/api/generated/`). Zero manual API-type drift — ideal for
   a no-code UI.
6. **Resilient frontend `EventSource` store**: circuit breaker + 60s self-heal +
   visibility-reconnect + debounced refetch. Directly portable.
7. **Trigger-maintained `stats` counters** for cheap live totals (active jobs,
   total spend).

---

## Security notes (key / secret handling)

agentsview is a strong security reference (it even ships a `SECURITY.md` and a
secret-scanning subsystem):

- **Fail-closed loopback trust:** `isLocalhostRequest` treats *any* forwarding
  header as "not local" and won't leak the auth token or unredacted search
  snippets to proxied requests. A local attacker spoofing those headers only
  locks themselves out. Adopt this posture for ACP Tracer's local dashboard.
- **Bearer auth fails closed:** remote sync enabled + no token ⇒ 500
  misconfiguration, never an open endpoint.
- **Built-in secret scanning:** `internal/secrets/`, DB tables
  `secret_findings` / `secret_scan_candidates`, per-session `secret_leak_count`
  — it actively detects and flags secrets that agents leak into transcripts.
  README explicitly warns: *"Do not paste tokens, OAuth files, or other secrets
  into bug reports,"* and Devin ingest **deliberately ignores** copied config /
  OAuth paths. Lesson for ACP Tracer: never ingest wallet keys / signer
  material into the tracer DB; scan and redact.
- **Read-only source access:** Docker examples mount agent dirs `:ro`; DB has a
  `ReadOnly()` mode that rejects writes/uploads. ACP Tracer should treat
  on-chain/ACP sources as read-only and never hold spend authority.
- **No outbound telemetry by default** (local-first; `internal/telemetry/`
  exists but the product is explicitly no-account). Keep ACP Tracer local-first
  unless the user opts into a central instance.
- Cursor API key handled via env only, sent over HTTPS Basic — no key logging.

---

## Open Questions

1. **Premise mismatch — confirm scope.** agentsview provides **zero** ACP/
   Virtuals/Base data. Should ACP Tracer research continue treating it as a
   *pattern* reference only (recommended), or was a different repo intended
   (e.g. a Virtuals-specific explorer/subgraph frontend)? This slice cannot
   supply real ACP endpoints because none exist here.
2. **Where do real ACP endpoints come from?** ACP Tracer still needs the actual
   Virtuals ACP REST/GraphQL base URL, the Base subgraph URL, and ACP job/phase
   contract addresses + ABIs. [UNVERIFIED — none are in this repo.] These must
   come from the Virtuals ACP SDK / OKX docs, not agentsview. Cross-reference
   the ACP SDK research (sibling reports) for the canonical job lifecycle
   (REQUEST→NEGOTIATION→TRANSACTION→EVALUATION) that maps onto the
   sessions/messages/usage_events shape above.
3. **SSE vs subgraph subscriptions.** agentsview polls local DB every 1500ms.
   For on-chain ACP state, decide between (a) polling a subgraph/RPC on a timer
   with a `fromBlock` cursor (mirrors the `sessionwatch` fallback), or (b) a
   subgraph websocket/GraphQL subscription. agentsview only demonstrates
   pattern (a).
4. **Backfill vs live.** agentsview does a one-time discovery/backfill on first
   run then incremental sync. ACP Tracer needs an analogous
   historical-backfill (paginate the subgraph from genesis/deploy block) +
   live-tail split; not shown for chain data here.

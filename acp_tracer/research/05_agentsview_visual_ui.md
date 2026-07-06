# 05 — agentsview: The Visual / UI Layer

Study of the frontend/UI layer of `kenn-io/agentsview` for the **ACP Tracer**
(no-code UI to visually track every agent's services, steps, and balance).

Repo cloned READ-ONLY (`--depth 1`) into
`acp_tracer/research/_clones/agentsview`. All paths below are relative to that
clone unless noted. Every claim is grounded in source read directly; anything
not verified in code is prefixed `[UNVERIFIED]`.

> Context: agentsview is a **local-first viewer for AI coding-agent sessions**
> (Claude Code, Codex, Copilot, Gemini, Cursor, etc.). It is NOT an ACP/Web3
> dashboard — there is **no on-chain balance, no wallet, no revenue** in the UI.
> Its "balance" analogue is **token usage and USD cost**. What transfers to ACP
> Tracer is the *shape* of the UI: agent identity, live status, job/step
> timelines, cost cards, and a dense, calm, dark-first operational aesthetic.

---

## Sources (UI file paths)

Stack / config / design docs:
- `frontend/package.json` — dependency list, build scripts
- `DESIGN.md` — design-system rules, shared control inventory
- `PRODUCT.md` — brand/anti-references/design principles
- `frontend/src/app.css` — app-level design tokens (agent + tool-category hues)
- `frontend/src/App.svelte` — top-level routing + three-column composition
- `CLAUDE.md`/`AGENTS.md` (root) — architecture (SSE, embedded SPA)

Layout / chrome:
- `frontend/src/lib/components/layout/ThreeColumnLayout.svelte` — sidebar |
  content | vitals, resizable, mobile drawer
- `frontend/src/lib/components/layout/StatusBar.svelte` — bottom live status/sync
- `frontend/src/lib/components/layout/AppHeader.svelte` — top bar/tabs (listed)

Agent/session tracking (the core):
- `frontend/src/lib/components/sidebar/SessionItem.svelte` — the "agent card" row
- `frontend/src/lib/utils/agents.ts` — agent identity → color/label registry
- `frontend/src/lib/utils/sessionStatus.ts` + `sessions.svelte.ts`
  (`getSessionStatus`, lines ~1396–1467) — status state machine
- `frontend/src/lib/components/content/SessionVitals.svelte` — per-agent live
  vitals: stats, category bars, multi-lane timeline, call waterfall
- `frontend/src/lib/components/content/CallRow.svelte` — one step/call row
- `frontend/src/lib/components/content/ActivityLane.svelte` — density sparkline
- `frontend/src/lib/utils/categoryToken.ts` — tool-category → color map

Fleet / analytics screens:
- `frontend/src/lib/components/activity/ConcurrencyTimeline.svelte` — concurrent
  agents over time (SVG bars + overlay line + active/idle strip)
- `frontend/src/lib/components/activity/SummaryCards.svelte` — KPI cards
- `frontend/src/lib/components/activity/SessionsTable.svelte` — sortable job table
- `frontend/src/lib/components/usage/UsageSummaryCards.svelte` — cost/token cards
- `frontend/src/lib/components/analytics/AgentComparison.svelte` (listed)

Real-time plumbing:
- `frontend/src/lib/stores/events.svelte.ts` — SSE `EventSource` fan-out store
- `frontend/src/lib/stores/liveTick.svelte.ts` — 1 Hz ticker for live durations

---

## UI overview & screens

Two structural modes, switched by `router.route` in `App.svelte`:

1. **Three-column workspace** (`route === "sessions"`), via `ThreeColumnLayout`:
   - **Left sidebar** — `SessionList` of `SessionItem` rows (the agent/job list),
     resizable via a pointer-capture drag handle; collapses to a drawer on mobile.
   - **Center content** — either the transcript (`MessageList`) for a selected
     session, or `AnalyticsPage` when nothing is selected.
   - **Right vitals** — `SessionVitals` live panel for the active session (320px).
2. **Full-page routes** (each wrapped in `.page-scroll`): `usage`, `activity`,
   `trends`, `insights`, `pinned`, `trash`, `recent-edits`, `settings`.

Global chrome: `AppHeader` (top), `StatusBar` (bottom, fixed), modal layer
(command palette, about, shortcuts, publish, resync, update, confirm-delete), and
an undo toast. Deep-linking is first-class — session id + `?msg=` in the URL.

---

## Frontend stack & libs

Verified from `frontend/package.json`:
- **Svelte 5** (`svelte@5.56.4`) using **runes** (`$state`, `$derived`,
  `$effect`, `$props`, snippets). No SvelteKit — plain SPA.
- **Vite** (`vite-plus` / `@voidzero-dev/vite-plus-core`), TypeScript 6.
- **`@kenn-io/kit-ui`** — first-party design-system library, git-pinned to a
  commit. Provides all shared controls (see below). This is the reusable core.
- **`@lucide/svelte`** — icon set (re-exported through `src/lib/icons.ts`).
- **`@tanstack/virtual-core`** — list virtualization (own wrapper in
  `src/lib/virtual/createVirtualizer.svelte.ts`) for long transcripts.
- **`shiki`** (syntax highlight), **`marked` + `dompurify`** (safe markdown).
- **Paraglide JS** (`@inlang/paraglide-js`) — i18n; messages in
  `frontend/messages/{en,zh-CN,zh-TW}.json`, imported via `m.*()`.
- **API client is generated** from an OpenAPI spec
  (`openapi-typescript-codegen`) into `src/lib/api/generated/` — typed services
  (`SessionsService`, `UsageService`, `ActivityService`, …) and models.
- Real-time via **SSE** (`EventSource`), not WebSocket — a Go server streams
  `data-changed` events; `stores/events.svelte.ts` fans them out with debounce,
  self-heal, and a circuit breaker. Tests via **Vitest** + **Playwright**.

kit-ui shared controls (from `DESIGN.md`): `Button, Chip, CopyButton, EmptyState,
FilterDropdown, FindBar, IconButton, KbdBadge, Modal, RangePicker,
RefreshControl, SegmentedControl, Spinner, StatusBar, StatusDot, Table/
TableHeaderCell, TextInput/SearchInput, Tooltip, TopBar, Typeahead`. Rule:
components take **pre-translated strings as props**; no hand-styled native
`<select>`.

---

## Concrete components/patterns (agent view, job steps, balance, status)

### Agent identity (color + label)
`utils/agents.ts` holds a `KNOWN_AGENTS` registry mapping each agent name to a
CSS accent variable and display label (e.g. `claude → --accent-blue`,
`codex → --accent-green`, `cursor → --accent-black`), plus `agentColor()`,
`agentLabel()`, and `agentForeground()` (accent→ink pairing for badge contrast).
Directly reusable idea: **each ACP agent gets a stable identity hue** used
consistently across list, timeline, and legend.

### Agent card row — `SessionItem.svelte`
The unit of the fleet list. In one 42px row it packs: a **`StatusDot`** (live
state), name/preview, meta line (`project · relative-time · message-count`),
sub-agent/teammate hint icons, a star toggle, an **agent tag** colored by
identity, and an optional machine tag. Extras worth stealing: tree
expand/collapse for parent→child (sub-agent) chains with depth indentation,
an active-row accent bar (`::before`), right-click context menu (rename / open
new tab / delete), inline rename, and multi-select checkboxes.

### Status state machine — `getSessionStatus()` + `sessionStatus.ts`
Six states drive the `StatusDot` color: `working` (fresh <1m, not awaiting),
`waiting` (awaiting user, <10m), `idle` (1–10m), `quiet` (≥10m, clean),
`stale` (10–60m with pending/truncated tool call), `unclean` (≥60m pending).
Status is derived from **freshness age + parser termination_status**, and a group
rolls up to its *freshest* member (a parent stays "working" while a sub-agent
runs). This exact vocabulary maps to ACP jobs: working / waiting-on-buyer /
idle / done / stalled / failed-mid-call.

### Per-agent live panel — `SessionVitals.svelte` (the flagship)
Right-column "vital signs" for one agent, all reusable for an ACP job detail:
- **Stat grid** (mono): tool-call count, tool time, slowest call (click-to-jump),
  turn count, sub-agent count; live values pulse and append `+`.
- **"Time spent" bars** per tool category — clickable filter chips, each a
  horizontal bar colored by `categoryToken()`, width = share of tool time.
- **Multi-lane timeline** — a "Turns" lane plus one lane per category; each mark
  is absolutely positioned by real epoch-ms (`turnLeftPct`/`turnWidthPct`),
  click scrolls to that turn, running turns render as a pulsing gradient mark
  stretched to the right edge, plus a legend of colored dots.
- **Call waterfall** — a `scale-axis` (0 → total, "now" if live) over a list of
  `CallRow`/`CallGroup`, with **sub-agent expansion** fetched lazily per child.

### Job/step row — `CallRow.svelte`
5-column grid: chevron (sub-agent expand) · tool name (category color) ·
args preview · **duration bar** (width scaled to the slowest call) · duration
label. Slow calls get a `--slow-fg` dot; live calls animate a green gradient bar
via a 1 Hz ticker (`liveTick`). This is the canonical **"agent step" row**.

### Tool-category color map — `categoryToken.ts` + `app.css`
Read/Grep/Glob → blue-slate, Edit/Write → green, Bash → amber, Task(sub-agent)
→ red, Tool(MCP/skill) → purple, Mixed → grey. For ACP, remap to **service /
offering categories** for instant visual grouping.

### Fleet-over-time — `ConcurrencyTimeline.svelte`
Hand-rolled **SVG** chart (no chart lib): stacked bars of concurrent agents
(interactive vs automated split = blue base + orange cap), an optional overlay
**line** for tokens/cost on a secondary right axis, an **active/idle strip**
under the bars, a shaded "future" region, nice-scale y-ticks, timezone-aware
x-ticks, hover tooltip, and **click-a-bucket-to-filter** the table below.
Directly reusable as "how many ACP agents were live/working over time."

### KPI cards — `SummaryCards.svelte` / `UsageSummaryCards.svelte`
Flex-wrap cards, one `featured` card with a 2px accent border. Activity: peak
concurrency, active/idle, agent-minutes, sessions, projects, models, total cost.
Usage (the **"balance" analogue**): total cost (featured, with vs-prior delta),
input/output tokens, daily burn, peak day, cache-hit %, model count, active days.
For ACP: swap in wallet balance, spend-rate, revenue, escrow, jobs settled.

### Job table — `SessionsTable.svelte`
Sortable table (kit-ui `TableHeaderCell`) of per-session rows: agent, project,
agent-minutes, cost, first-active. Multi-key sort with stable id tiebreak,
untimed rows partitioned to the bottom, and a dismissible filter badge fed by the
timeline click. This is the "all agents / all jobs" grid.

### Bottom `StatusBar.svelte`
Left: global counts (sessions · messages · projects). Right: perf toggle, live
**sync progress** (`scanning… / syncing 42% (n/total)`), degraded/offline
warnings, zoom controls, update-available, and "synced 3m ago". A good model for
an always-visible ACP tracer footer (indexer lag, chain height, connection).

### Real-time — `events.svelte.ts` + `liveTick.svelte.ts`
SSE `EventSource` singleton with symbol-keyed listeners, trailing-edge debounce,
60s self-heal, visibility-aware reconnect, and a circuit breaker. A separate 1 Hz
`liveTick` store drives all "running for Xs" labels/animations without re-fetching.

---

## What to reuse for ACP Tracer

Highest-leverage patterns to port (concept, not code — MIT license, see below):
1. **Agent-identity hue registry** (`agents.ts`) — stable per-agent color/label
   reused across list, timeline, legend, badges.
2. **Status state machine + `StatusDot`** — a small closed set of states
   (working/waiting/idle/done/stalled/failed) derived from freshness + terminal
   status, with group roll-up. This is the core of "track every agent's state."
3. **`SessionVitals` layout** as the **ACP job-detail panel**: stat grid →
   multi-lane timeline (epoch-positioned marks) → step waterfall (`CallRow`),
   with live pulsing marks and click-to-jump.
4. **`CallRow` step pattern** — name · category color · args preview · scaled
   duration bar · live/slow treatment. Map "tool call" → "ACP step / service call".
5. **`ConcurrencyTimeline`** — hand-rolled SVG for "N agents active over time"
   with a token/cost overlay line and click-to-filter. No chart dependency.
6. **KPI card grid** — reuse verbatim for the **balance/economics** row (wallet,
   spend rate, revenue, escrow) with one featured card + vs-prior delta.
7. **Sortable job table** with timeline→table cross-filtering.
8. **SSE fan-out store + 1 Hz tick** — real-time without polling; live durations
   animate off a single ticker.
9. **Three-column resizable shell + fixed status bar** as the app frame.
10. **Generated typed API client** and **props-take-translated-strings** rule.

Adapt (not present here, ACP-specific): wallet/balance, on-chain tx feed, escrow
state, buyer↔seller graph, x402 payment steps. `[UNVERIFIED]` none of these exist
in agentsview; they are net-new for ACP Tracer.

---

## Theme/aesthetic

- **Dark-first, token-driven.** Core tokens come from `@kenn-io/kit-ui/theme.css`
  (backgrounds, text, borders, radii, shadows, type scale, accents); `app.css`
  adds app tokens: extra identity accents (teal/rose/coral/indigo/sky/pink/lime/
  cyan/violet + `-foreground` ink pairs), a **tool-category palette**
  (`--cat-read/edit/bash/task/tool/other/mixed`), and **duration UX** colors
  (`--slow-fg/bg/ring`, `--running-fg/bg/ring`). Full light + dark + high-contrast.
- **Dense and operational**, per `PRODUCT.md`: 42px rows, 9–12px type,
  `--font-mono` for all numbers/metrics/timelines, uppercase micro-labels with
  letter-spacing. Explicit anti-references: no marketing-hero, no oversized
  decorative cards, no ornamental motion. "Put the session data first."
- **Motion is meaningful, not decorative**: `duration-pulse` on live values,
  animated live bars, 120ms hover transitions, reduced-motion-safe.
- **Accent semantics**: blue = primary/interactive/selection, orange = automated,
  amber = search-highlight + overlay line, green/`--running-fg` = live, red =
  danger/degraded, `--slow-fg` coral = slow calls.
- Custom thin 6px scrollbars; focus-visible rings everywhere; agent-colored left
  accent bar on the active row.

Net: this is precisely the **Linear/Vercel-adjacent, dark, editorial, data-dense**
register ATLAS wants — but proven for exactly the agent/job/step/cost domain.

---

## Open Questions

1. **License.** Root `LICENSE` is **MIT** (Copyright 2026 Kenn Software LLC) —
   verified, so component code can be reused/adapted with attribution. Note
   `@kenn-io/kit-ui` is a separate repo; confirm *its* license before vendoring.
2. **`@kenn-io/kit-ui` scope.** The design system is a separate git repo; this
   study covers only its *usage*. `[UNVERIFIED]` its full component API,
   theming hooks, and whether it is worth adopting vs. building ATLAS's own.
   The `DESIGN.md` "known kit-ui gaps" list suggests it is young.
3. **Balance/economics is absent.** agentsview's only "money" is token cost. All
   wallet/escrow/on-chain/x402 visualization is net-new for ACP Tracer; no prior
   art here.
4. **SSE vs WebSocket for ACP.** agentsview uses one-way SSE (server→client) for
   "data changed, refetch." ACP Tracer may need bidirectional or chain-event
   subscriptions; the fan-out/debounce/self-heal pattern still applies.
5. **Data model fit.** agentsview's unit is a *session* (a transcript on disk).
   ACP's unit is a *job/service call* with buyer/seller/payment. `[UNVERIFIED]`
   how cleanly session→job maps; the timeline/waterfall geometry assumes
   turn/call nesting that ACP steps may or may not share.
6. **No graph/network view.** agentsview shows parent→child sub-agent *trees*,
   not buyer↔seller *graphs*. A relationship graph would be a new component.

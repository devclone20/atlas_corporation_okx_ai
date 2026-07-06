# exo — Visual / UI Layer (for ACP Tracer)

Repo: `exo-explore/exo` (Apache-2.0), cloned READ-ONLY to `acp_tracer/research/_clones/exo` at `--depth 1`. Never executed.

---

## Sources (UI file paths)

All paths relative to `_clones/exo/`.

**Web dashboard (SvelteKit) — primary UI:**
- `dashboard/package.json` — stack & deps (verified)
- `dashboard/src/app.css` (387 lines) — theme tokens, animations, CRT/scanline effects
- `dashboard/src/lib/components/TopologyGraph.svelte` (1250 lines) — **the topology visualization, D3-driven SVG**
- `dashboard/src/lib/stores/app.svelte.ts` (3643 lines) — state store, polling, SSE parsing, `transformTopology`
- `dashboard/src/routes/+page.svelte` (6776 lines) — main layout embedding topology
- `dashboard/src/lib/components/ConnectionBanner.svelte` — real-time connection-lost banner
- `dashboard/src/lib/components/DeviceIcon.svelte`, `TokenHeatmap.svelte`, `HeaderNav.svelte`, `ModelPickerModal.svelte`, `ToastContainer.svelte` (component library, `.../components/index.ts`)
- `dashboard/src/routes/traces/+page.svelte` + `traces/[taskId]/+page.svelte` — trace list, exports to Perfetto (`ui.perfetto.dev` via postMessage)

**Native macOS app (SwiftUI) — secondary UI:**
- `app/EXO/EXO/Views/TopologyMiniView.swift` (173 lines) — Canvas-based mini topology
- `app/EXO/EXO/Views/{NodeRowView,NodeDetailView,InstanceRowView,SettingsView}.swift`
- `app/EXO/EXO/ViewModels/{NodeViewModel,InstanceViewModel}.swift`, `Models/ClusterState.swift`, `Services/ClusterStateService.swift`

**Assets:** `docs/imgs/dashboard-cluster-view.png` (viewed), `four-mac-studio-topology.png`, `exo-screenshot.jpg`, `macos-app-one-macbook.png`, logos.

---

## UI/visualization overview

exo ships **two** UIs against the same backend `/state` JSON:

1. **Web dashboard** — a SvelteKit SPA (static-adapter, built into `dashboard/build/`, served by the FastAPI backend at `:52415`). This is the polished "command center." Center stage is a live **cluster topology graph**; left rail is a chat sidebar; right rail is an INSTANCES panel (running model instances + a "Launch Instance" form with sharding/instance-type/min-nodes controls). A minimized topology mode docks the graph while chatting.
2. **Native macOS menubar app** (SwiftUI) — a compact status view reusing the same topology idea via SwiftUI `Canvas`.

The topology is the signature visual: nodes arranged on a **circular orbit**, each rendered as a **recognizable device glyph** (Mac Studio / Mac Mini / MacBook Pro drawn as bespoke SVG, else a hexagon), with live memory-fill, a GPU stat bar, and animated dashed directional edges between peers. Verified against `dashboard-cluster-view.png`.

---

## Frontend stack & libs

From `dashboard/package.json` (verified):
- **Svelte 5** (runes: `$state`, `$derived`, `$props`, `$effect`) + **SvelteKit 2** with `@sveltejs/adapter-static` (fully static output).
- **Vite 6**, **TypeScript 5**.
- **Tailwind CSS 4** (`@tailwindcss/vite`, CSS-first `@theme`) + `tw-animate-css`.
- **D3 v7** (`d3`, `@types/d3`) — used only for imperative SVG DOM building in `TopologyGraph.svelte` (`d3.select`, `.append`, defs/filters/markers). No force simulation — layout is hand-computed trig.
- **marked** + **highlight.js** + **katex** (markdown/code/math in chat), **pdfjs-dist** (attachments), **mode-watcher** (dark/light), **devalue**.
- Font: `'SF Mono', 'Fira Code', 'Monaco', monospace` everywhere (editorial-terminal feel), `letter-spacing: 0.02em`.

Native app: **SwiftUI** (`Canvas`, `GeometryReader`, `Path`), SF Symbols for device icons.

---

## Concrete visual patterns (topology, nodes/edges, real-time, theme)

### Topology layout (`TopologyGraph.svelte`)
- **No physics.** Nodes are placed on a circle: `angle = (i/n)*2π − π/2` (start at top, clockwise); `x = centerX + orbit*cos`, `y = safeCenterY + orbit*sin`. Single node is centered. Verified lines 268–287.
- **Adaptive sizing:** `nodeRadius`, `orbitRadius`, and label verbosity all scale off node count + container `minDimension`, with `full` (≤4 nodes) / `compact` (>4) / `minimized` display modes. `topPadding`/`bottomPadding = 70` reserve label room.
- **ResizeObserver** re-renders on container resize; `d3.select(svg).selectAll("*").remove()` then full redraw (simple, not diffed).

### Node styling
- Device-specific SVG glyphs (Mac Studio / Mini / MacBook Pro drawn primitive-by-primitive; MacBook even embeds the Apple-logo path + a trapezoidal keyboard base). Unknown → holographic **hexagon**.
- **Memory as a fill:** a yellow rect (`rgba(255,215,0,0.75–0.85)`) fills the glyph body/screen bottom-up, clipped to the device via per-node `clipPath` — RAM usage becomes a physical "tank."
- **GPU stat bar:** vertical bar to the node's right; grey track + fill colored by GPU **temperature** via a 3-stop gradient (blue `#5DADE2` @45°C → yellow `#FFD700` @57.5°C → red `#F44336` @75°C, `getTemperatureColor`). Overlaid white bold mono text: `%`, `°C`, `W` stacked.
- **State-driven wireframe colors** (one source of truth, lines 567–592): filter-selected = bright yellow `rgba(255,215,0,1)` + stroke 3; hover = `0.7` + stroke 2; instance-highlight = `0.9` + stroke 2.5; filtered-out = grey `rgba(140,140,140,0.6)` + opacity 0.5; default = `rgba(179,179,179,0.8)` stroke 1.5. Fill and stroke-width scale with the same states.
- Node `<title>` tooltips; `onNodeClick` toggles a per-node filter; `hoveredNodeId` is reactive `$state`.

### Edges
- Deduped into an undirected `pairMap` keyed `min(id)|max(id)`, tracking `aToB`/`bToA` so **bidirectional links show two arrowheads** at offset midpoints (`tipOffset=16`). SVG `marker#arrowhead` (`orient:auto-start-reverse`).
- Base edge = **animated dashed line**: class `.graph-link`, `stroke-dasharray: 8,8`, `@keyframes flowAnimation { stroke-dashoffset 0 → −16 }` at `1s linear infinite`, plus `drop-shadow` glow — reads as data "flowing" along wires.
- **Debug overlay** renders per-edge IP/interface labels pinned to viewport quadrants with directional arrow glyphs (↗↘ etc.), red text for missing interfaces.

### Real-time
- **Polling, not sockets, for topology:** `startPolling()` → `fetchState()` every **1000 ms** hitting `GET /state`; `transformTopology()` maps raw → view model; Svelte reactivity re-renders the graph (`app.svelte.ts` 1284–1354).
- **Connection health:** `consecutiveFailures` counter; after a threshold flips `isConnected=false`, surfacing `ConnectionBanner.svelte` (red pulsing dot + "Connection lost — Reconnecting…", `slide` transition, `aria-live="assertive"`).
- **Chat uses SSE** (`parseSSEStream`, `fetch` `/v1/chat/completions` `stream:true`) — a clean reusable manual-SSE reader (handles `data:` and `:` comment lines for prefill progress).

### Theme (`app.css`)
- **Dark-first command-center**, colors in **OKLCH**. Background near-black `oklch(0.12 0 0)`; single accent = **"exo yellow"** `oklch(0.85 0.18 85)` with `-darker`/`-glow` variants. Neutral grey ramp for surfaces; `--destructive` red.
- Signature effects (all defined, reduced-motion-guarded): `.scanlines` (CRT repeating-linear-gradient overlay, fixed `z-50`), `.grid-bg` (40px blueprint grid), `.glow-text` (layered yellow text-shadow — the pixel "exo" logo), `.crt-screen` (radial vignette + inset shadow), `.command-panel` (gradient + inset highlight + drop shadow), `.status-pulse`, `.shooting-star`, `radarSweep`/`glowPulse`/`dataPulse` keyframes.
- Full `@media (prefers-reduced-motion: reduce)` block disables every animation — accessibility done right.
- Thin custom scrollbars (6px, grey → yellow on hover), focus outlines stripped on inputs.

---

## What to reuse for ACP Tracer

Direct, high-value borrows (aesthetic + technique, not code — Apache-2.0 permits reuse with attribution):

1. **Orbit/radial layout instead of force graph** for a small, known set of agents. Deterministic, stable, label-friendly, zero physics jitter. Trig is trivial (lines 280–286). Fits an "agent constellation" where each ACP agent = a node.
2. **State-driven node styling as one lookup** (filter/hover/highlight/dimmed → color+stroke+fill+opacity). Clean pattern for encoding ACP job status (idle / negotiating / working / delivered / failed) as node color states.
3. **Metric-as-fill + stat pill**: reuse the "memory tank" idea for an agent's live utilization/queue-depth, and the vertical stat bar (with a status→color gradient) for job progress / success rate. The `getTemperatureColor` 3-stop interpolation is a reusable helper for any 0–100 health metric.
4. **Animated dashed directional edges** (`stroke-dashoffset` keyframe) to show **ACP job flow / x402 payment direction** between requester and provider — bidirectional double-arrow handling maps perfectly to request→deliver + pay→settle.
5. **Poll-`/state` + reactive redraw + ConnectionBanner** for the real-time loop; keep **SSE** (`parseSSEStream`) for streaming a running agent's log/output. 1s poll is a sane default for a control-plane view.
6. **Theme system**: OKLCH tokens, dark-first, single focal accent, SF-Mono editorial type — aligns exactly with the CLONE FRAME / Linear-Stripe bar. Adopt the `.command-panel`, `.glow-text`, subtle `.grid-bg`, and the reduced-motion guard wholesale (retheme yellow → ATLAS accent).
7. **Adaptive label density** (full/compact/minimized by node count) so the graph stays legible from 1 to 20+ agents.
8. **Trace → external analyzer** pattern (`traces/[taskId]`, postMessage to Perfetto) as a model for exporting an ACP task's event log to a detailed timeline view.

Caveats: exo re-renders the whole SVG each tick (`selectAll("*").remove()`) — fine at ≤dozens of nodes; for ACP Tracer's animated status a keyed/diffed update (Svelte `{#each}` or D3 join) would be smoother and stop restarting CSS animations on every 1s poll.

---

## Screenshots/assets found

Under `docs/imgs/` (bitmaps, not vectors):
- `dashboard-cluster-view.png` — **viewed**: confirms the whole look (glowing pixel "exo" wordmark, black bg, 4 Mac-Studio glyphs on an orbit with yellow memory-fill + `%/°C/W` pills, dashed arrowed edges, left chat rail, right INSTANCES panel with Launch form: Sharding Pipeline/Tensor, Instance Type MLX Ring/RDMA, Minimum Nodes 1–4 stepper).
- `four-mac-studio-topology.png`, `exo-screenshot.jpg`, `macos-app-one-macbook.png` (native app), plus logo variants (`exo-logo-*`). No SVG source art for the logo in-repo (raster only); the "exo" wordmark in the live UI is CSS `.glow-text`, not an image.

---

## Open Questions

- **Where topology data originates on the backend**: `GET /state` returns `topology` + per-node `macmon_info` (RAM/temp/power/GPU). The Rust/zenoh producer of that JSON wasn't traced in this slice (out of scope: UI-only). [UNVERIFIED] exact schema of `/state` beyond what `transformTopology`/`RawStateResponse` consume.
- **No graph pan/zoom** observed — layout is fit-to-container only. [UNVERIFIED] whether larger clusters get any viewport controls.
- `traces/*` is **performance/perfetto** tracing of inference, **not** agent-task tracing — conceptually adjacent to ACP Tracer's goal but a different domain; reuse the export-to-timeline UX, not the data model.
- The 6776-line `+page.svelte` holds much layout/onboarding logic not fully read here; the topology-specific pieces (embed wrappers at lines ~3937/4763/4889/6208, minimized mode, cluster warnings) were confirmed but the full page composition wasn't exhaustively mapped.

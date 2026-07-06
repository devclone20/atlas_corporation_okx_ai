# exo (exo-explore/exo) — Overall Architecture

> Research slice for ATLAS "ACP Tracer" UI design. Read-only study of the actual repo source (never executed).
> Repo cloned to `acp_tracer/research/_clones/exo` (shallow, `--depth 1`). Version `0.3.70` (pyproject), Rust workspace `0.0.1`.

## Sources

Files read (all under `acp_tracer/research/_clones/exo/`):

- `README.md` — features, quick start, API usage, env vars, RDMA setup
- `AGENTS.md` (symlinked as `CLAUDE.md`) — canonical architecture summary, build/run commands, code style
- `pyproject.toml` — Python deps, extras (mlx/cuda/cpu), uv workspace, basedpyright/ruff/pytest config
- `Cargo.toml` — Rust workspace, crates, zenoh + pyo3 deps
- `src/exo/main.py` — `Node` dataclass, component composition, `run()`, election loop, CLI `Args`
- `src/exo/__main__.py` — process entrypoint, `freeze_support`, inline-code shim for mp helpers
- `src/exo/routing/topics.py` — `TypedTopic`, `PublishPolicy`, the 6 pub/sub topics
- `src/exo/api/main.py` (head) — FastAPI app, adapter imports (OpenAI/Claude/Ollama/Responses), request/response types
- `src/exo/worker/main.py` (head) — `Worker` class, state, runners, event/command wiring
- `src/exo/master/main.py` (head) — `Master` imports (placement, apply, commands, events)
- `src/exo/master/placement.py` (signatures) — instance placement functions
- `src/exo/shared/types/state.py` (head) — `State` FrozenModel fields
- `src/exo/worker/runner/supervisor.py` (`RunnerSupervisor`) — subprocess supervision model
- Directory listings: `src/exo/*`, `rust/*`, `dashboard/src/*`, `app/*`, `docs/*`

## What exo is

exo is a **distributed AI inference system** (Apache-2.0, by exo labs) that connects multiple physical devices into a single AI cluster so you can run models **larger than fit on one device**, and run them **faster** as you add devices. Verified positioning (`README.md:8,20`).

Problem it solves:
- Frontier LLMs (DeepSeek v3.1 671B, Kimi-K2, Qwen3-235B) exceed single-device RAM/VRAM. exo shards them across a cluster.
- Manual multi-node inference setup is painful. exo does **automatic device discovery** (no config), **topology-aware auto-parallel** placement (accounts for device resources + link latency/bandwidth), tensor + pipeline parallelism, and **RDMA over Thunderbolt 5** (macOS 26.2) for ~99% latency reduction between devices (`README.md:24-31`).
- It exposes **drop-in-compatible APIs** (OpenAI Chat Completions, Claude Messages, OpenAI Responses, Ollama) plus a built-in web dashboard, so existing clients work unchanged (`README.md:29,342-501`).

Primary target is **Apple Silicon (MLX backend, GPU)**; Linux runs **CPU-only** today, CUDA extras exist but are experimental (`README.md:194,581`, `pyproject.toml:47-72`).

## Architecture & module map

**Every device runs one identical `Node` process** (`src/exo/main.py:36`). There is no separate server binary — the cluster is symmetric peers. A `Node` composes these long-lived components, each run as a task in one `anyio` TaskGroup (`main.py:155-170`):

| Component | Module | Role (verified) |
|---|---|---|
| **Router** | `src/exo/routing/router.py` + Rust `exo_rs` | zenoh pub/sub transport; registers topics; `get_node_zid()` gives node id |
| **EventRouter** | `src/exo/routing/event_router.py` | routes typed events/commands between local components and network; recreated on new-master |
| **Master** | `src/exo/master/` | coordinates cluster state, **places** model instances, indexes events, broadcasts `GLOBAL_EVENTS` |
| **Worker** | `src/exo/worker/` | executes inference tasks, manages **runner subprocesses**, gathers node info |
| **Election** | `src/exo/shared/election.py` | Bully-algorithm master election; `force_master` sets seniority 1M (`main.py:131`) |
| **DownloadCoordinator** | `src/exo/download/` | downloads model shards from HuggingFace, reports progress |
| **API** | `src/exo/api/` | FastAPI/Hypercorn server, port **52415**, serves dashboard + all API adapters |

Key sub-structure:
- `src/exo/shared/types/` — Pydantic models: `events.py`, `commands.py`, `tasks.py`, `state.py`, `topology.py`, `memory.py`, `thunderbolt.py`, plus `models/model_cards.py`. This is the **type-driven contract** the whole system is built on.
- `src/exo/master/placement.py` — placement engine: `place_instance`, `add_instance_to_placements`, `get_transition_events`, `cancel_unnecessary_downloads`, `delete_instance`. Uses `rustworkx` graph lib (`pyproject.toml:14`) for topology.
- `src/exo/worker/runner/supervisor.py` — `RunnerSupervisor` wraps each inference process (`AsyncProcess`, `daemon=True`) with mp channels for events/tasks/cancel, a stdout/stderr handler, an `initialize_timeout` (default 400s), and status/pending/in-progress/completed/cancelled tracking (`supervisor.py:182-236`).
- `src/exo/worker/engines/mlx/` — MLX inference engine: `auto_parallel.py`, `builder.py`, `cache.py`, `generator/`, `disaggregated/` (prefill/decode split), `vision.py`.
- `src/exo/api/adapters/` — protocol translators: `chat_completions`, `claude`, `ollama`, `responses` (each has request→internal, collect, stream fns).
- `rust/networking/` — zenoh swarm: `discovery.rs`, `swarm.rs`, `lib.rs` (gossip + peer discovery).
- `rust/exo_rs/` — **PyO3 bindings** exposing Rust to Python (`networking.rs`, `pidfile.rs`, `allow_threading.rs`); imported in Python as `exo_rs` (`main.py:13`).
- `dashboard/` — **Svelte 5 + TypeScript** (SvelteKit) app; routes: `advanced`, `downloads`, `integrations`, `traces`, plus main chat/cluster page; built to `dashboard/build/` and served by the API.
- `app/EXO/` — native **macOS (Swift/Xcode)** menu-bar app wrapping the node + network profile install.

### Event-sourcing core
State is managed by event sourcing (`AGENTS.md:86-90`, verified in imports):
- `State` (`src/exo/shared/types/state.py:30`) — immutable `FrozenModel` holding `instances`, `runners`, `downloads`, `tasks`, `last_seen`, `topology`, per-node identity/memory/disk/system/network/thunderbolt/rdma info, `instance_links`, `custom_model_cards`, `last_event_applied_idx`.
- `apply()` (`src/exo/shared/apply.py`) — pure function applying an event to `State`.
- Master **indexes** events (assigns monotonic idx) and broadcasts them; Workers/API **apply** indexed events to keep a local replica. This gives a single ordered log and deterministic replicas.

## Tech stack

- **Python 3.13** (pinned `==3.13.*`) — application layer. Async via **anyio** (`anyio==4.11.0`); web via **FastAPI** served by **Hypercorn** (ASGI). Data modeling: **Pydantic v2** (`frozen=True`, `strict=True`). Logging: **loguru**. Model IO: **huggingface-hub**, **transformers**, **tiktoken**, **openai-harmony**. Serialization: **msgspec**, **zstandard**. Daemonization: **python-daemon**. `psutil` for host metrics. `rustworkx` for topology graphs.
- **Rust (edition 2024, nightly)** — networking + native bindings. **zenoh 1.9.0** (patched fork `evanev7/zenoh`) for pub/sub transport; **tokio**, **pyo3 0.28** + `pyo3-async-runtimes` + `pyo3-stub-gen`, `blake3`, `netwatcher`, `parking_lot`, `pidfile-rs`. Two crates: `networking` (swarm/discovery) and `exo_rs` (Python bindings).
- **Inference backend:** **MLX** + **mlx-lm** / **mlx-vlm** / **mflux** (image), with **MLX-distributed** for cross-device comms (custom forks for JACCL/RDMA fixes). Optional Torch (cpu/cu128/cu130) on Linux.
- **Frontend:** **Svelte 5 + TypeScript + Vite (SvelteKit)**; Node build step required before running.
- **macOS app:** **Swift / Xcode** (`app/EXO/EXO.xcodeproj`).
- **Tooling:** **uv** (workspace, deps), **Nix flake** (`flake.nix`, `nix run .#exo`, `nix fmt`), **basedpyright** (strict, `failOnWarnings`), **ruff**, **pytest** + pytest-asyncio (auto mode), **playwright** (dashboard screenshots), `just`.

## Runtime flow

1. **Startup** (`__main__.py` → `main.py:main`): parse CLI `Args`; acquire a **PID file lock** (`exo_rs.Pidfile`, mode 0600) — one node per machine. Set `mp` start method to `spawn`, raise the file-descriptor rlimit, set up logging. Optionally daemonize (`--legacy-daemon`).
2. **`Node.create`** (`main.py:52`): derive `node_id` from zenoh; create `Router`, register the 6 topics; build `EventRouter`; conditionally create `DownloadCoordinator` (unless `--no-downloads`), `API` (unless `--no-api`), `Worker` (unless `--no-worker`); always create a `Master` and an `Election` participant.
3. **`Node.run`** (`main.py:155`): install SIGINT/SIGTERM → graceful `shutdown()`; `start_soon` every component + `_elect_loop` in one TaskGroup.
4. **Discovery + election:** zenoh auto-discovers peers in the same **namespace** (default = version string; `EXO_ZENOH_NAMESPACE` isolates clusters). The Bully election picks a Master. `_elect_loop` (`main.py:180`) reacts to results: promote self to Master, demote (shut down local Master), or recreate Worker/DownloadCoordinator/EventRouter and reset the API on a **new master** (session boundary).
5. **Messaging** (`routing/topics.py`): typed pub/sub over zenoh. `COMMANDS` (clients/workers → master), `LOCAL_EVENTS` (workers → master), `GLOBAL_EVENTS` (master → all, always published), `ELECTION_MESSAGES`, `CONNECTION_MESSAGES` (local only, `PublishPolicy.Never`), `DOWNLOAD_COMMANDS`. Each topic is a `TypedTopic[FrozenModel]` that JSON-serializes a specific Pydantic type — strongly typed wire contract.
6. **Model instance lifecycle** (matches README API walkthrough):
   - Client `GET /instance/previews?model_id=…` → Master's placement engine returns every valid placement (sharding = Pipeline/Tensor, backend = MlxRing/JACCL, per-node memory delta).
   - Client `POST /instance` with a chosen placement → Master emits placement events; DownloadCoordinators fetch missing shards (progress reported as events); Workers spin up `RunnerSupervisor` subprocesses that load the model shard.
   - `GET /instance/await` (SSE) blocks until a `ready` (or `timeout`) event for that model.
   - Inference: `POST /v1/chat/completions` (or `/v1/messages`, `/v1/responses`, `/ollama/api/chat`) → API adapter converts to internal `TextGeneration` task → Master schedules → Worker runners execute (sharded across the cluster) → tokens stream back via SSE.
   - `DELETE /instance/{id}` tears it down.
7. **Observability:** `/state` exposes deployment state; the dashboard has a **traces** view; `EXO_TRACING_ENABLED` turns on distributed tracing; `macmon` supplies Apple-Silicon hardware metrics; `InfoGatherer` (`utils/info_gatherer/`) collects per-node memory/disk/network/thunderbolt info published into `State`.

## Reusable ideas for ACP Tracer

1. **Event-sourced, immutable `State` + pure `apply()` replicated to every peer.** This is *exactly* the model ACP Tracer wants for "visually track every agent's services/steps/balance": one ordered event log, deterministic UI state, trivial SSE streaming of `IndexedEvent`s to the dashboard. Copy this pattern — frozen Pydantic `State`, discriminated-union `Event`/`Command` types, monotonic index.
2. **Typed pub/sub topics with an explicit `PublishPolicy` (Never / Minimal / Always).** Clean separation of local-only vs network-broadcast messages. ACP Tracer can mirror this to separate "on-this-machine agent control" from "publish to ACP" traffic.
3. **Single symmetric `Node` binary that self-composes optional roles via flags** (`--no-worker`, `--no-api`, coordinator-only nodes). ACP Tracer's "run on your own machine OR a provisioned droplet" maps directly: same agent-runner binary, role toggled by flag/env.
4. **`RunnerSupervisor` as the watchdog primitive.** A supervised, daemonized subprocess with mp channels for tasks/events/cancel, captured stdout/stderr, an init timeout, and explicit status (idle/pending/in-progress/completed/cancelled). This is a ready-made template for the ACP Tracer **Harness + Watchdog** supervising each user's agent process — including cancel and timeout semantics.
5. **API-adapter pattern** (`api/adapters/*`): one internal task type, N external protocol translators (OpenAI/Claude/Ollama). ACP Tracer's "wrapper over the CLI for Virtuals/OKX/others" should adopt this — one internal "agent job" type, per-marketplace adapters.
6. **Placement previews before commit** (`/instance/previews` → pick → `POST`): a **dry-run/preview** step surfacing valid options + resource cost + errors before doing anything expensive. Great UX pattern for "configure an agent, see what it'll cost/where it'll run, then confirm."
7. **`/instance/await` SSE ready-signal** for async, long-running provisioning — better than polling for a no-code UI.
8. **Built-in dashboard served by the same process** (Svelte + FastAPI static mount at a fixed local port). Matches ACP Tracer's "log in on your own machine" local-first model; note exo's dashboard uses `localStorage` for recent-models state.
9. **Config precedence via env + XDG dirs + custom namespace isolation** — clean multi-cluster / multi-env separation; ACP Tracer can isolate a user's dev vs prod agent fleets the same way.

## Security notes

- **Local-first, no built-in auth on the API.** The API binds `localhost:52415` with permissive CORS (`fastapi.middleware.cors.CORSMiddleware` imported, `api/main.py:17`) and *no* visible authentication/API-key gate in the read portion. For ACP Tracer — which explicitly handles **user wallets + user LLM API keys** — this is the single biggest gap to close: exo assumes a trusted local network. Any exposed-to-network or multi-tenant deployment needs auth, per-user isolation, and secret handling that exo does not provide out of the box. **[UNVERIFIED]** whether deeper API code adds auth — only the file head was read.
- **Custom-model remote code is gated.** `trust_remote_code` models must be **explicitly enabled** (default false) before HF fetch/exec — a good default-deny stance to copy (`README.md:515-517`).
- **Cluster isolation by namespace.** Nodes only connect within the same `EXO_ZENOH_NAMESPACE` — prevents accidental cluster joining, but this is *isolation, not authentication*: anyone on the namespace/network is trusted. **[UNVERIFIED]** whether zenoh transport is encrypted/authenticated in the patched fork.
- **PID-file singleton lock** (mode 0600) prevents multiple nodes clobbering each other on one host — a small but correct hardening detail.
- **Subprocess hardening surface:** runners are spawned via `multiprocessing spawn` with daemon processes and captured stdio; the `-c` inline-code shim in `__main__.py` executes arbitrary code passed by mp helpers — fine internally, but a pattern to keep sandboxed. For ACP Tracer, per-user agent processes must run under OS-level isolation (separate user/dir/secrets), which exo does **not** do (single-user assumption).
- **Read-only model dirs** (`EXO_MODELS_READ_ONLY_DIRS`) — models there can't be deleted; nice defense-in-depth for shared/immutable model stores.
- **Trusted binary caches** (Cachix) and custom git forks of zenoh/mlx are pulled in the build — supply-chain surface worth noting if ATLAS vendors any of this.

## Open Questions

1. **API authentication/authorization:** does `api/main.py` (beyond the head read) implement any auth, rate limiting, or key validation, or is it fully open on localhost? **[UNVERIFIED]** — need to read the full file + route decorators.
2. **zenoh transport security:** is peer-to-peer traffic in the `evanev7/zenoh` fork encrypted/mutually authenticated, or only namespace-scoped? Relevant if ACP Tracer borrows the transport.
3. **Multi-tenancy:** exo appears strictly **single-user / single-machine-owner**. Confirm there is no per-user/per-tenant boundary — ACP Tracer needs one and would build it net-new.
4. **Secret handling:** exo has no wallet/LLM-key concept. **[UNVERIFIED]** how (if at all) it stores any credentials (HF tokens?) — check `shared/constants.py` and download utils.
5. **Master failover data safety:** on election change the Master/EventRouter are recreated; is the event log durable across master handoff, or only in-memory replicated? (`get_transition_events` + `EXO_EVENT_LOG_DIR` suggest on-disk logging — needs confirmation.)
6. **Dashboard ↔ backend contract:** does the Svelte dashboard consume `/state` + SSE only, or are there private endpoints? Determines how directly the ACP Tracer UI pattern can be reused.
7. **Provisioning to remote hosts:** exo assumes devices are already running the binary and self-discover. It has **no built-in "provision a droplet and deploy the agent" flow** — that orchestration is entirely ACP Tracer's to build; exo offers only the runtime, not the provisioner.

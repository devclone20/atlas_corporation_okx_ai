# exo — Orchestration, Device Discovery & Networking

Research slice for ACP Tracer. Studied from actual repo source (READ ONLY).

## Sources

- Repo: `exo-explore/exo`, cloned to `acp_tracer/research/_clones/exo` (`--depth 1`).
- Pinned commit: `b5375f8cee4368d09e1ce96a56b9f81fb0bc81aa` (2026-06-22).
- Note: this is the **current Rust+Zenoh rewrite** of exo, not the older libp2p/Python versions. Files cited below are from this commit.

Primary files read in full:
- `rust/networking/src/discovery.rs` — UDP multicast discovery ("Hello/WhatsUp").
- `rust/networking/src/lib.rs` — Zenoh session config + peer connect loop.
- `rust/networking/src/swarm.rs` — pub/sub + liveliness ("compat shim for the old libp2p code").
- `rust/networking/Cargo.toml` — transport deps.
- `rust/exo_rs/src/networking.rs` — PyO3 binding `NetworkingHandle` exposing the swarm to Python.
- `src/exo/routing/router.py`, `src/exo/routing/topics.py`, `src/exo/routing/connection_message.py` — Python message routing over topics.
- `src/exo/shared/election.py` — master election.
- `src/exo/shared/topology.py` — cluster graph (rustworkx).
- `src/exo/master/main.py`, `src/exo/master/placement.py` (partial) — coordination + work placement.
- `src/exo/main.py` — node composition (`Node.create`, `run`, `_elect_loop`).
- `AGENTS.md` (== `CLAUDE.md`), `README.md` — architecture notes.

Rigor: everything below is grounded in the above files with line references. Inferences are prefixed `[UNVERIFIED]`.

---

## Discovery & cluster formation

Two-layer design: a **custom UDP multicast discovery layer** finds peer addresses; **Zenoh** then forms and maintains the actual mesh.

**Layer 1 — custom multicast discovery** (`rust/networking/src/discovery.rs`):
- Fixed IPv6 multicast group `ff12::e0a1:de89` (`GROUP`, line 18), 3-byte magic `b"EXO"` (line 19). Default discovery port `52413` (UDP), set in `src/exo/main.py:481-486`.
- Socket is IPv6 UDP with `SO_REUSEADDR` + (unix) `SO_REUSEPORT`, `multicast_loop_v6(true)` (lines 46-56). It binds `[::]:discovery_port`.
- `netwatcher::watch_interfaces_with_callback` (line 60) watches network interfaces live. On each interface that has a non-loopback/non-unspecified IPv6, it `join_multicast_v6(GROUP, iface_idx)` and records the send address (lines 64-90). Removed interfaces trigger `leave_multicast_v6` and pruning (lines 91-102). So discovery automatically follows interfaces coming/going (Wi-Fi, Ethernet, Thunderbolt).
- Protocol is a 2-message handshake (lines 160-238):
  - `Hello{ nonce, namespace }` broadcast to the group every 1s (`announce`, `tick = interval(1s)`, lines 115, 241-264). `namespace` is an 8-byte BLAKE3 hash of the namespace string (`lib.rs:61-65`); peers with a different namespace are dropped (`discovery.rs:172-175`). This is how "different cluster / different version" isolation works — default namespace is the exo version (`main.py:467-473`).
  - A receiver replies `WhatsUp{ nonce, zid(16 bytes), port_le }` unicast back, retried up to 5x with 300ms backoff (lines 179-202). The reply carries the responder's **Zenoh ID** and its **Zenoh listen port**.
  - Self-messages are filtered (own nonce/own zid, lines 168-171, 224-227). On a valid `WhatsUp`, the initiator produces `Discovered{ zid, addr }` where `addr` is the sender's IPv6 with the port overwritten by the advertised Zenoh port (lines 228-236).

**Layer 2 — Zenoh peer connect** (`rust/networking/src/lib.rs:74-101`):
- A background task pumps `discovery.next()`. For each `Discovered` peer it builds a `tcp` locator from `discovered.addr` and calls `runtime.connect_peer(zid, [locator])` (lines 89-99).
- **Deterministic dial direction / dedup:** it skips connecting if `discovered.zid > runtime.zid()` — only the lower-zid side dials, so a pair connects once (lines 84-87). The same ordering appears in `swarm.rs` discovery events and `main.rs` election tie-breaks.
- Zenoh's own multicast scouting is **disabled** (`scouting/multicast/enabled=false`, `lib.rs:32`); exo drives peer connection itself via the custom discovery above. Zenoh **gossip multihop is enabled** (`scouting/gossip/multihop=true`, line 34) so peers learn about each other transitively once any link exists.

**Liveliness = membership** (`rust/networking/src/swarm.rs:94-107`): each node declares a Zenoh liveliness token `live/{zid}` and subscribes to `live/*` with `history(true)`. Token `Put` → `FromSwarm::Discovered`; token `Delete` (peer dropped) → `FromSwarm::Expired` (lines 70-86). This is the authoritative "node joined / node left" signal surfaced to Python.

**Topology** is a separate, higher-level concept from mere connectivity. `src/exo/shared/topology.py` maintains a directed graph (`rustworkx.PyDiGraph`) of `NodeId`s with typed edges `SocketConnection | RDMAConnection`. It computes neighbours, leaves, cycles, subgraphs, and specifically **Thunderbolt-bridge cycles** to avoid broadcast storms (`get_thunderbolt_bridge_cycles`, lines 260-308) and RDMA cycles for fast interconnect placement. Nodes report their interfaces via profiling types (`NodeNetworkInfo`, `InterfaceType` incl. `"thunderbolt"`).

## Transport/protocols

- **Zenoh** is the core transport (`rust/networking/Cargo.toml`): pub/sub/query with routers, storages plugin, liveliness. Session `mode="router"`, listens `tcp/[::]:{listen_port}` (default `52414`, `lib.rs:23-52`, `main.py:474-479`). RX buffer bumped to 16 MiB (line 37). An in-memory storage plugin (`storage/mem1/**`, replicated every 2s) is enabled (lines 39-50).
- **Custom UDP multicast** only for the discovery handshake (above). No libp2p in the active path — `swarm.rs` is explicitly a "compat shim for the old libp2p code"; `bootstrap_peers` and `EXO_BOOTSTRAP_PEERS` are **removed/rejected** (`main.py:352-353, 458-466`). Node IDs are ephemeral random 16-byte hex (`router.py:232-240`); persistence is currently disabled ("bring back … once we figure out how to deal with duplicates").
- **App-level messaging** rides Zenoh pub/sub via typed topics. `NetworkingHandle` (Rust→Python, `exo_rs/src/networking.rs`) exposes `gossipsub_subscribe/unsubscribe/publish` and `recv`. Names are historical ("gossipsub"): under the hood `swarm.rs` declares a Zenoh `Publisher` on `topics/{topic}` with `CongestionControl::Block` and a `Subscriber` filtered to `Locality::Remote` so a node doesn't hear its own puts (lines 152-189).
- **Serialization:** each message is a Pydantic model serialized as JSON UTF-8 bytes (`topics.py:32-37`). Payloads >1 MiB log a perf warning (`router.py:225-228`).
- **Inference data plane is separate** from this control plane: model shards talk over **sockets** and, on Apple Thunderbolt 5, **RDMA** (README lines 24-25; `SocketConnection`/`RDMAConnection` edge types). The Zenoh layer carries cluster *control* (events/commands/election), not tensor traffic.

## Orchestration & work distribution

Every process is one `Node` that co-hosts multiple components (`src/exo/main.py:36-153`): **Router** (Zenoh), **EventRouter**, **Election**, optional **Worker**, optional **Master**, optional **DownloadCoordinator**, optional **API** (FastAPI, OpenAI-compatible, port `52415`).

**Event-sourced, single-master coordination** (`AGENTS.md`, `src/exo/master/main.py`):
- Exactly one node is elected **Master**. Workers publish `LOCAL_EVENTS`; the Master ingests them via a `MultiSourceBuffer` keyed by origin, assigns a monotonic index, applies them to an immutable `State` via the pure `apply()` function, appends to a durable `DiskEventLog`, and rebroadcasts `IndexedEvent`s on `GLOBAL_EVENTS` (`master/main.py:492-534`). Workers apply the same indexed stream → replicated deterministic state.
- Topics + publish policies (`routing/topics.py`): `GLOBAL_EVENTS`, `LOCAL_EVENTS`, `COMMANDS`, `DOWNLOAD_COMMANDS` are `Always` published; `ELECTION_MESSAGES` `Always`; `CONNECTION_MESSAGES` is `Never` (purely local, derived from Zenoh liveliness). `TopicRouter` (`router.py:34-97`) fans a topic to in-process subscribers and, per policy, out to the network.
- **Commands → tasks** (`master/main.py:171-468`): API/workers send `COMMANDS` (e.g. `TextGeneration`, `PlaceInstance`, `CreateInstance`, `DeleteInstance`). Master turns them into events. For a generation request it picks the **least-loaded instance** of the requested model by counting in-flight (`Pending|Running`) tasks (`master/main.py:191-223`) — a simple load-balancer. Prefill/decode disaggregation is supported: `_prefill_endpoint_for` selects a least-loaded prefill source and computes a routable `ip:port` via `find_ip_prioritised(..., ring=True)` (lines 82-119).
- **Placement / model sharding** (`master/placement.py`): given the topology graph, node memory, network info, backends and download status, exo computes where to run each model instance. It finds cycles (rings), filters them by memory, prefers RDMA/Thunderbolt rings, and produces `MlxRingInstance`/`MlxJacclInstance` shard assignments (`placement.py:1-64` + `placement_utils`). README: "Topology-Aware Auto Parallel … based on a realtime view of your device topology … device resources and network latency/bandwidth."

## Node join/leave & resilience

- **Join:** interface appears → multicast join → Hello/WhatsUp handshake → lower-zid side dials Zenoh `connect_peer` → Zenoh liveliness `Put` → `FromSwarm::Discovered` → Python `ConnectionMessage(connected=True)` (`router.py:201-210`, `connection_message.py`). A `ConnectionMessage` bumps the election clock and triggers a fresh campaign (`election.py:159-180`), so the new node is folded into the cluster and a master is (re)confirmed.
- **Leave:** Zenoh liveliness `Delete` → `FromSwarm::Expired` → `ConnectionMessage(connected=False)`, again re-triggering election. Independently, the Master's `_plan` loop (`master/main.py:471-490`) runs every 10s: it emits `InstanceDeleted` for any instance whose assigned node is no longer in `topology.list_nodes()`, and `NodeTimedOut` for nodes not seen in 30s (`last_seen`). So dead nodes are reaped both by liveliness and by a heartbeat timeout.
- **Master election** (`src/exo/shared/election.py`) — a Bully-style protocol over `ELECTION_MESSAGES`:
  - Every node boots believing it is master (`current_session = SessionId(self, clock=0)`, lines 68-71) and runs an instant initial campaign (lines 94-99).
  - `ElectionMessage` ordering (`__lt__`, lines 28-39): higher `clock` > higher `seniority` > more `commands_seen` > higher `master_node_id` (deterministic tiebreak). `max(candidates)` wins (line 222).
  - Triggers: a higher-clock message from a peer, or any connection change. A campaign broadcasts the node's status, waits `DEFAULT_ELECTION_TIMEOUT=3.0s`, rebroadcasts (anti-loss), then elects (lines 187-243).
  - `seniority`: candidates start 0 and ratchet up to `len(candidates)` on winning; non-candidates use `-1` so they only become master if no candidate exists (`__init__` comment, lines 62-64). `--force-master` sets `seniority=1_000_000` (`main.py:131`) to pin a chosen node as master.
  - On result (`main.py:180-276`): a **new master** rebuilds the `EventRouter`, and recreates `DownloadCoordinator`/`Worker` and resets/pauses the API. Promotion/demotion spin the `Master` component up or down in place. This is a clean, if heavy, "reconverge everything on master change" strategy.
- **Resilience notes in code:** Zenoh publishers use `CongestionControl::Block` (backpressure, no silent drop) and gossip multihop (partition healing across intermediaries). `WhatsUp` retries 5× and unreachable discovery addresses are pruned. The election explicitly rebroadcasts to survive message loss. Known rough edges are flagged in comments: election "does feedback" (a node can hear its own messages), node-id persistence disabled, `_plan` loops called "the cracks showing in our event sourcing architecture."

## Lessons for ACP Tracer (local-machine vs droplet connection + supervision)

exo is same-LAN, zero-config, peer-to-peer. ACP Tracer's problem (connect to *your machine* or a *droplet across the internet*, then supervise automations) overlaps on the control-plane/supervision axis but diverges on discovery. Concrete takeaways:

1. **Split discovery from transport.** exo's cleanest idea: a thin discovery layer only resolves `(id → address:port)`, then a real transport (Zenoh/TCP) forms the mesh. ACP Tracer can mirror this: LAN → multicast/mDNS-style auto-discovery for "your machine"; droplet → skip discovery entirely and use a **known address / registration token**. exo already removed `bootstrap_peers`, but for cross-internet a bootstrap/registration endpoint is exactly what a droplet needs — treat the droplet as a pinned peer.
2. **Namespace = tenancy isolation, cheaply.** The BLAKE3-hashed namespace that gates the handshake (`discovery.rs:172`, `lib.rs:61`) is a good, simple pattern for keeping one user's Tracer cluster from talking to another's on shared networks. For ACP, bind namespace to user/workspace/agent id.
3. **Liveliness tokens for supervision.** Zenoh liveliness (`live/{id}`, subscribe `live/*` with history) gives instant, authoritative join/leave with replay for late subscribers (`swarm.rs:94-107`). ACP Tracer's supervisor should treat a durable heartbeat/liveliness signal as the source of truth for "is the machine/droplet still running my automation," plus a **belt-and-suspenders timeout reaper** exactly like Master's 30s `NodeTimedOut` (`master/main.py:483-488`) — don't rely on the transport's disconnect alone.
4. **Event-sourced state + single coordinator.** The `LOCAL_EVENTS → index+apply+log → GLOBAL_EVENTS` loop with a `DiskEventLog` (`master/main.py`) is a strong template for supervising automations: every run/step is an event, indexed and persisted, so any client (or a droplet that rejoins) can catch up by replaying from an index (`RequestEventLog`, lines 454-464). ACP Tracer can log each automation step as an event and stream indexed events to the UI.
5. **Coordinator-only nodes are first-class.** `--no-worker` (README line 198) runs a node that "handles networking and orchestration but doesn't execute inference." That maps directly to a **droplet acting as the always-on coordinator/relay** while the user's laptop is an intermittent worker — good architecture for ACP Tracer's "run on my machine OR on a droplet."
6. **Deterministic dial direction avoids duplicate connections** (lower-zid dials, `lib.rs:84`). ACP Tracer will hit the same problem when both a laptop and a droplet try to connect; adopt a deterministic initiator rule.
7. **Reconnection is a full reconverge.** exo's "on new master, rebuild worker/API/coordinator" is simple but heavy. For a UI-driven tool, prefer *incremental* reattach (resume supervision without tearing down the automation) — learn from exo's structure but avoid its restart cost.
8. **Backpressure over drop.** `CongestionControl::Block` + payload-size warnings keep the control plane honest under load; ACP Tracer's command/event channel to a droplet should backpressure rather than silently drop supervision events.

## Security notes

- **No transport authentication or encryption in the discovery/handshake path as read.** The multicast handshake trusts any packet with the right magic + matching namespace; the only "auth" is the 8-byte namespace hash (`discovery.rs:152-175`). Zenoh TCP endpoints (`tcp/[::]:52414`) are opened without TLS/mTLS config in `cfg()` (`lib.rs:23-52`). This is fine for a trusted LAN (exo's threat model) but **unacceptable over the public internet** — critical for ACP Tracer's droplet case. [UNVERIFIED] Zenoh supports TLS/QUIC and access-control; exo does not configure them here.
- **Namespace is obfuscation, not a secret** — a known version string yields a known hash; it prevents *accidental* cross-talk, not a determined attacker. Do not treat it as an auth boundary.
- **`adminspace/enabled=true`** (`lib.rs:35`) exposes a Zenoh admin/query surface; on a public droplet this must be locked down or disabled.
- **Ephemeral, unauthenticated node IDs** (`os.urandom(16).hex()`, `router.py:240`) mean no identity continuity and no signing of events/commands. For ACP Tracer, connections to a droplet need real identity (keys/tokens) and signed commands, since the Master applies arbitrary `COMMANDS` (`PlaceInstance`, `DeleteInstance`, model downloads) without authorization checks in the code read.
- **Model `trust_remote_code`** is gated off by default (README line 517) — a good instinct to copy: never execute remote-supplied code without explicit opt-in.
- **Recommendation for ACP Tracer:** mTLS (or WireGuard/SSH tunnel) for laptop↔droplet; per-user auth token issued at pairing; sign commands; disable admin surfaces on the droplet; bind the control listener to the tunnel interface, not `[::]`.

## Open Questions

1. Does the current Zenoh transport support any auth/encryption that exo simply doesn't enable, or is the control plane plaintext by design? (`cfg()` shows none.) [UNVERIFIED]
2. How does exo actually behave across the internet / NAT, given Zenoh scouting-multicast is off and bootstrap peers were removed? Is there any relay path, or is it strictly same-broadcast-domain today? (Code read suggests LAN-only currently.)
3. The inference **data plane** (sockets/RDMA between shards) was not fully read here — how are those endpoints negotiated and secured vs. the Zenoh control plane? (Placement computes `ip:port`; transport security unknown.) [UNVERIFIED]
4. Election is acknowledged to "feedback" (a node hears its own messages, `main.py:132-133`). How stable is convergence with many nodes joining/leaving rapidly? (No system-id filtering yet — `router.py:30-33`.)
5. Node-id persistence is disabled to avoid duplicates (`router.py:239`). What identity scheme would exo adopt for stable, authenticated nodes — and can ACP Tracer borrow it?
6. `MlxJaccl` vs `MlxRing` placement and RDMA-cycle selection (`placement_utils`) were only partially read; the exact bandwidth/latency cost model driving auto-parallel is not captured here. [UNVERIFIED]

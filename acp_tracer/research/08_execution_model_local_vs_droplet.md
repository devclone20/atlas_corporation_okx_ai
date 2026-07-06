# 08 — ACP Tracer: Execution & Supervision Model (Local machine vs Droplet)

> **Scope.** This dossier designs ONE slice deeply: how an ACP Tracer automation actually *runs*, is *supervised*, and is *stopped safely* — on the user's own machine **or** on an online droplet/server. It covers the execution architecture for both modes, the automation lifecycle (configure → play → supervise-first-4 → watchdog → safe-stop), the state/`update.md` model, health-check, and where the built-in Harness plugs in.
>
> **Rigor convention.** Every claim is tagged:
> - **[VERIFIED]** — grounded in a cited external source or in our own already-written specs (`ATLAS_HARNESS.md`, `HARNESS_ENGINE.md`).
> - **[PROPOSED DESIGN]** — a design decision for ACP Tracer, defensible but not yet built or externally validated.
> - **[UNVERIFIED]** — depends on platform behaviour (Virtuals ACP SDK, OKX, the runner host) we have *not* confirmed and must confirm before it becomes load-bearing.
>
> This is a design document, not an implementation. Nothing here has been executed.

---

## Sources

**Our own prior specs (canonical, re-used not duplicated):**
- `~/Desktop/HARNESS_ENGINE/HARNESS_ENGINE.md` — parent Harness design. Load-bearing patterns re-used here: **L19 silent-stall detection** (heartbeats + economic progress deltas), the **anti-dormancy triad** (`plan-freshness · economic throughput · last-outbound-action age`), **INV-9** (log-before-act, hash-chained, reconcile on-chain), **INV-10** (kill-switch + dead-man's-switch, both *fail-closed*), the **three-systemd-service split** (brain / worker-signer / safety), "**every step idempotent and reconciled against the chain on restart**", "**low-balance watchdog stops the loop**", and the retire order **drain → sweep → burn**.
- `~/Desktop/atlas_corporation_okx_ai/harness/ATLAS_HARNESS.md` — ATLAS delta. Re-used: **Committee-Evaluator (≥2, quorum)**, **canonical `Task` schema**, the **5-minute-scale service reality** (a full ACP service completes end-to-end before the next starts), **Postgres event log as crash-resume substrate**, **no-LLM-in-signing-path**, **dry-run first** (`HARNESS_MODE=dry_run`, "would-settle" receipts).

**External research (web, July 2026):**
- systemd graceful shutdown / SIGTERM→TimeoutStopSec→SIGKILL, connection-draining, `ExecStop`:
  [Poseidon Labs — systemd Shutdown Units](https://www.psdn.io/posts/systemd-shutdown-unit/) ·
  [Graceful Shutdown in Backend Systems](https://medium.com/@harshgharat663/graceful-shutdown-in-backend-systems-dcba48e393af) ·
  [Stopping a Python systemd service cleanly](https://alexandra-zaharia.github.io/posts/stopping-python-systemd-service-cleanly/)
- Watchdog / stuck-job / heartbeat / dead-letter patterns:
  [SQS Heartbeats and Watchdogs (tecRacer)](https://www.tecracer.com/blog/2023/03/the-beating-heart-of-sqs-of-heartbeats-and-watchdogs.html) ·
  [BullMQ — Stalled jobs](https://docs.bullmq.io/guide/jobs/stalled) ·
  [python-rq Workers](https://python-rq.org/docs/workers/) ·
  [Procrastinate — retry stalled jobs](https://procrastinate.readthedocs.io/en/stable/howto/production/retry_stalled_jobs.html)
- Running long-lived processes (nohup vs tmux vs systemd):
  [nohup vs tmux vs systemd overview](https://tmuxai.dev/tmux-vs-nohup/) ·
  [systemd user units without root (Akmatori)](https://akmatori.com/blog/systemd-user-units) ·
  [nohup in Linux (DigitalOcean)](https://www.digitalocean.com/community/tutorials/nohup-command-in-linux)
- Idempotent recovery / event-log replay / exactly-once:
  [How Temporal recovers instead of restarts (xgrid)](https://www.xgrid.co/resources/temporal-recover-instead-of-restart/) ·
  [Idempotent AI agents — retry-safe patterns](https://www.buildmvpfast.com/blog/idempotent-ai-agent-retry-safe-patterns-production-workflow-2026) ·
  [Kafka exactly-once (Conduktor)](https://www.conduktor.io/glossary/exactly-once-semantics-in-kafka)
- Droplet provisioning for beginners:
  [DigitalOcean — Set up a Production-Ready Droplet](https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/) ·
  [Initial Server Setup with Ubuntu (DigitalOcean)](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu) ·
  [Connect to Droplets with SSH](https://docs.digitalocean.com/products/droplets/how-to/connect-with-ssh/)
- Detached child processes / process groups / stale PID cleanup:
  [Node.js child_process docs](https://nodejs.org/api/child_process.html) ·
  [Killing process families with node](https://medium.com/@almenon214/killing-processes-with-node-772ffdd19aad)

---

## The mental model (read this first)

ACP Tracer separates **three planes** that most no-code tools blur together. The separation is what makes both "run on my laptop" and "run on a server" the *same* product with *one* control surface. **[PROPOSED DESIGN]**

1. **Control plane** — the ACP Tracer desktop/web UI the user clicks in. Never signs, never runs the agent loop itself. It issues *commands* (configure, play, pause, stop, health-check) and *renders* telemetry. It is disposable: closing it must never stop a running automation.
2. **Runner plane** — the actual long-lived agent process (the ACP loop: poll → take job → deliver → settle → repeat). This lives **either** on the local machine **or** on the droplet. It owns the wallet-adjacent signer and the event log.
3. **Supervision plane** — the **Harness** (Watchdog + first-4 supervisor + health-check + safe-stop orchestrator). Co-located with the Runner (so it survives control-plane disconnect) but logically distinct: it *watches* the runner and *repairs/escalates*, it does not do business work.

The single most important invariant, inherited from `HARNESS_ENGINE.md` INV-10: **the system degrades to *dormant-but-safe*, never to *active-and-unsafe*.** Every design choice below serves that. **[VERIFIED — our spec]**

The second, the reason the whole product exists: **the runner's durable state lives in a store (event log), not in the process.** Kill the process, reboot the host, close the laptop lid — on restart the runner *reconciles and resumes*, it does not start blind. This is the Temporal "recover instead of restart" model. **[VERIFIED — pattern]** / **[PROPOSED DESIGN — our application of it]**

---

## Local-machine mode (architecture)

**Who this is for:** the user who wants zero server cost, is testing, or is running low-value automations and wants the wallet key on hardware they physically control.

### Process topology **[PROPOSED DESIGN]**

```
┌───────────────────────────────────────────────────────────┐
│  User's machine (macOS / Windows / Linux)                 │
│                                                            │
│   ACP Tracer app (control plane, Electron/Tauri)          │
│        │  spawns + supervises via local IPC (not SSH)     │
│        ▼                                                    │
│   ┌──────────────────────────────────────────────┐        │
│   │ Runner service  (the ACP loop)               │        │
│   │  - detached child process, own process group │        │
│   │  - writes event log (SQLite/embedded PG)     │        │
│   │  - holds the capped signer                   │        │
│   └──────────────────────────────────────────────┘        │
│   ┌──────────────────────────────────────────────┐        │
│   │ Harness sidecar (Watchdog + health + stop)   │        │
│   └──────────────────────────────────────────────┘        │
│                                                            │
│   Agent root:  ~/.acp-tracer/agents/<agentId>/            │
│     ├── update.md          (append-only change log)       │
│     ├── state/             (event log + checkpoints)      │
│     ├── config/            (params snapshot per run)      │
│     ├── reports/           (per-session reports)          │
│     ├── locks/RUNNING.lock (PID + boot-id + start-ts)     │
│     └── logs/              (rotated stdout/stderr)         │
└───────────────────────────────────────────────────────────┘
```

### How the process is kept alive **[PROPOSED DESIGN, grounded]**

- The runner is spawned **detached, with its own process group** and `stdio` redirected to log files, then `unref()`'d — so the runner survives the control-plane app closing, and so we can later signal the *whole tree* with `kill(-pid)` at stop time. This is the documented Node `detached:true` + `stdio:'ignore'` + `unref()` daemon pattern. **[VERIFIED — pattern]**
- **We do NOT rely on nohup/tmux for supervision.** nohup keeps a process alive past terminal close but gives *no restart-on-crash and no restart-on-boot* — it dies on reboot. tmux is for humans reattaching, not machine supervision. **[VERIFIED]** Therefore, for *durable* local runs we register an **OS-native supervisor**:
  - **Linux:** a **systemd *user* unit** (`systemctl --user`, `loginctl enable-linger` so it survives logout/boot) — gives us `Restart=on-failure`, `journalctl`, and a real `ExecStop`, without root. **[VERIFIED]**
  - **macOS:** a **launchd LaunchAgent** (`KeepAlive`, `RunAtLoad`).
  - **Windows:** a **Scheduled Task at logon** or a service shim.
  The Harness sidecar wraps these so the UI shows one "Runner: healthy/restarting/stopped" state regardless of OS. **[PROPOSED DESIGN]**
- If the user is on a session-only run ("just try it now, don't install a service"), the app spawns detached + Harness-supervised but *without* boot persistence, and the UI explicitly says **"stops when your machine sleeps/reboots."** Honesty over surprise.

### Local-mode gotchas we design around
- **Laptop sleep** pauses the loop; ACP jobs have deadlines. On wake, health-check runs *before* resuming (see Health-check). A run that slept past an in-flight job's deadline must reconcile that job as *lost/refunded*, not silently retry. **[PROPOSED DESIGN]** **[UNVERIFIED: exact ACP deadline/refund semantics]**
- **Key custody:** local mode keeps the signer in the OS keychain (Keychain/DPAPI/libsecret), never in a dotfile. Inherited discipline from ATLAS §6 ("crown jewels ... OS-keyring, 0600, never in repo"). **[VERIFIED — our spec]**

---

## Droplet/server mode (provision + connect + step-by-step guide idea)

**Who this is for:** the user who wants 24/7 unattended running, independent of their laptop. This is the *hard part the product is selling* — most people cannot set up a droplet or run a terminal-only agent.

### The connection model **[PROPOSED DESIGN]**

ACP Tracer's control plane talks to a droplet **runner-agent** (a small ACP Tracer daemon we install on the box). Two candidate transports:

- **(A) SSH-driven** — the app holds an SSH connection (key-based), runs a fixed, allow-listed set of commands, installs the runner + Harness as a systemd unit, and tails `journalctl` for telemetry. Pro: nothing extra to trust; works on *any* server (satisfies "the Harness can guide setup on any server"). Con: the app must manage SSH keys and a persistent tunnel.
- **(B) Pull-based agent** — the droplet runner-agent opens an outbound **wss** connection back to a broker (or directly to the control plane), like the existing **HUB Bridge** pairing pattern (PTY + wallet pairing) noted in memory. Pro: no inbound ports, NAT-friendly, matches the estate's existing "Bridge" design. Con: needs a rendezvous point.

**Decision [PROPOSED DESIGN]:** support **both**, default to **(A) SSH for DigitalOcean's one-click path** (because we can fully script provisioning) and **(B) wss agent for "any server"** (because we can't assume SSH-scriptability everywhere). Both converge on the *same* systemd-supervised runner + Harness on the box. **[UNVERIFIED: which transport survives audit — decide in a security pass.]**

### DigitalOcean-first provisioning (what "one click" actually does) **[PROPOSED DESIGN, grounded in DO docs]**

The founder's requirement is "people struggle to set up a droplet." So ACP Tracer ships an opinionated, guided provisioner that performs the **DigitalOcean production-ready baseline** for the user, exposing a plain-language checklist UI over these steps ([DO recommended setup](https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/), [DO initial Ubuntu setup](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu)):

1. **Create the Droplet** — via the DO API (user pastes a scoped API token, or OAuths). Ubuntu LTS, smallest box that fits the loop, region near the user. **[UNVERIFIED: DO API token scoping the product will request.]**
2. **SSH key, not password** — generate an ed25519 keypair *inside the app*, upload the public key to the Droplet at create time, disable password auth. **[VERIFIED — DO best practice]**
3. **Non-root sudo user** — create `acptracer` user, add to sudo, disable root SSH login. **[VERIFIED]**
4. **Firewall** — DO Cloud Firewall (free, stateful): inbound = SSH (22) only (+ the wss port if transport B); deny everything else. **[VERIFIED]**
5. **Runner install** — drop the ACP Tracer runner + Harness under `/opt/acp-tracer/agents/<agentId>/`, `0750`, owned by `acptracer`; register a **systemd unit** with `Restart=on-failure` and a proper `ExecStop`. This mirrors the ATLAS per-agent isolation slice (own user, own `0750` root, own systemd unit, secrets `0600`). **[VERIFIED — our spec]**
6. **Secrets** — signer + API creds into the OS keyring / `0600` files readable only by `acptracer`; never echoed to the UI, never in `update.md`. **[VERIFIED — our spec]**
7. **Verify** — a post-install health-check confirms the runner starts, the event store is writable, the wallet balance reads, and the loop can reach ACP in **dry-run** before anything goes live.

**"Any server" guide idea [PROPOSED DESIGN]:** for non-DO hosts, the Harness runs the *same* checklist as an **interactive, step-by-step guide** — it detects what it can do over SSH, does those steps automatically, and for anything it can't (e.g., a provider-specific firewall UI) it renders a numbered, copy-pasteable instruction with a "I did this ✓" gate before continuing. The guide is *stateful*: it records each completed step to `update.md` so a resumed setup never repeats or skips a step.

### Why systemd on the droplet (not nohup/tmux)
Same reasoning as local Linux, but now mandatory: a 24/7 unattended money loop **must** restart on crash and on reboot, must have real logs, and must have a clean, timed shutdown path — exactly what systemd gives and nohup/tmux do not. **[VERIFIED]**

---

## Automation lifecycle & parameters (incl. 5-min min interval)

### Parameters the user sets before Play **[PROPOSED DESIGN]**

| Parameter | Meaning | Constraint / default |
|---|---|---|
| **Interval between services** | Cooldown between one service cycle finishing and the next starting | **Minimum 5 minutes**, enforced hard (see below). Default 5m. |
| **Number of agents** | How many agent identities/loops this automation drives | ≥1; each gets its own agent root + event log + lock |
| **Service price** | Price of the service(s) this agent publishes | ≥ platform min; sanity-capped; changes logged to `update.md` |
| **Which service to run** | The specific ACP service/offering | from the agent's published offerings |
| **Mode** | `provider` (publish & fulfil) or **`bootstrapper`** (hunt for job offers) | see Bootstrapper section |
| **Spend cap / low-balance floor** | Hard ceiling on outflow; floor that trips the watchdog | required; loop refuses to start without it (INV-10 spirit) |
| **Host** | local machine \| droplet | chosen once; changeable only from a stopped state |

### Why 5 minutes is a floor, not a suggestion **[VERIFIED — our spec + [UNVERIFIED exact ACP timings]]**

A full ACP service is a *multi-step business interaction* (offer → agreement/escrow → work → deliver → evaluate → settle). ATLAS's spec already treats a service as a several-minutes-scale unit. If the interval were shorter than one full service, the agent would start a new cycle while the previous one is still mid-negotiation, producing overlapping in-flight jobs, nonce contention, and confused escrow state. **The 5-minute floor guarantees one service can complete before the next begins.** The Tracer enforces it two ways: (1) the UI won't accept < 5m; (2) the runner *also* refuses to start cycle N+1 until cycle N reaches a terminal state **or** the interval elapses, *whichever is later* — so the interval is a floor, and a slow job extends it rather than causing overlap. **[PROPOSED DESIGN]**

### The lifecycle state machine **[PROPOSED DESIGN]**

```
CONFIGURED ──Play──► PREFLIGHT ──► SUPERVISED_WARMUP ──► RUNNING ──► (STOPPING) ──► STOPPED
                        │  (dry-run,        │ (first 4          │            │
                        │   health,         │  interactions     │            │
                        │   balance,        │  watched by       │  Watchdog  │  safe-stop
                        │   isolation)      │  the Harness)     │  active    │  sequence
                        ▼                   ▼                   ▼            ▼
                     FAILED_PREFLIGHT   ABORTED_WARMUP      PAUSED / REPAIRING / ESCALATED
```

- **PREFLIGHT** — never Play straight into live money. Run the ATLAS **dry-run** first: full pipeline, "would-settle" receipts, no signature; plus health-check + balance read + (droplet) isolation check. Any failure ⇒ `FAILED_PREFLIGHT`, nothing spent. **[VERIFIED — our spec]**
- **SUPERVISED_WARMUP** — the first-4-interactions supervision (next section).
- **RUNNING** — steady state under the Watchdog.
- **STOPPING** — the safe-shutdown sequence (later section). Note it is a *state*, not an instantaneous event.

Every transition is an **event appended to the durable log before it takes effect** (INV-9 log-before-act) and a **line appended to `update.md`**. **[VERIFIED — our spec]**

---

## Watchdog + first-4-interactions supervision

### First-4 supervision (the "confirm all is well" phase) **[PROPOSED DESIGN]**

The founder's requirement: the Harness *watches the first 4 business interactions* to confirm the automation is healthy, then hands off to the Watchdog. Design:

- A "business interaction" = one complete service cycle reaching a terminal state (delivered+settled, or cleanly refused/refunded). **[UNVERIFIED: exact ACP terminal states — confirm against acp-node-v2.]**
- During WARMUP, the Harness runs in **high-attention mode**: it inspects *every* step of each of the first 4 cycles against expected shape — did the offer post, did escrow open, did delivery complete, did evaluation pass, did settlement land on-chain and reconcile, did the balance move by the expected amount?
- **Promotion criterion:** all 4 cycles pass their per-step checks *and* the economic reconciliation matches (settled amount == expected, no unlogged outflow). Only then does the automation graduate to `RUNNING` and the Harness drops to Watchdog (sampling) mode. This mirrors ATLAS/HARNESS_ENGINE **Gate D canary** thinking — prove a few real cycles under close watch before trusting the loop. **[VERIFIED — our spec]**
- **Any warmup cycle failing** ⇒ `ABORTED_WARMUP` + immediate escalation + Harness-repair attempt (see below), *before* the automation is trusted to run unattended. Better to fail loud in the first 4 than silently in the 400th.
- Why *4* specifically is a product choice, not a proof — it's "enough cycles to exercise offer/escrow/deliver/evaluate/settle at least once each with margin." **[PROPOSED DESIGN — tunable]**

### The Watchdog (steady-state supervision) **[PROPOSED DESIGN, grounded]**

After warmup, the Watchdog is the always-on liveness + safety monitor. It implements the **anti-dormancy triad** from `HARNESS_ENGINE.md`: **plan-freshness · economic throughput · last-outbound-action age** — where "progress" is defined *economically* (offer/deliver/settle), because *a wedged agent burning gas in a retry loop is alive and useless.* **[VERIFIED — our spec]**

Concrete signals it watches (each with a threshold and an action):

| Signal | Detection (grounded pattern) | Action |
|---|---|---|
| **Runner dead** | missed **heartbeat** past N intervals (absence-of-heartbeat = dead — the SQS/RQ pattern) | systemd restarts; Harness runs health-check before resume |
| **Job stuck in a step** | a service cycle whose step-timestamp is older than that step's max (the "zombie job / stalled job" reaper: RUNNING with `heartbeat_at` too old) | mark cycle stalled → Harness repair → if unrepairable, move to a **dead-letter / needs-attention** bin, never silently drop ([BullMQ stalled](https://docs.bullmq.io/guide/jobs/stalled), [SQS reaper](https://www.tecracer.com/blog/2023/03/the-beating-heart-of-sqs-of-heartbeats-and-watchdogs.html)) |
| **Balance runs out** | balance < configured floor (gas/settlement asset) | **stop the loop** (inherited: "a watchdog stops the loop on low balance"), alert owner, do not keep taking jobs it cannot settle |
| **No economic progress** | throughput == 0 across a window despite RUNNING | escalate as *dormant* even though the process is "up" |
| **Unlogged outflow** | on-chain outflow with no preceding logged intent (INV-9 tripwire) | **CRITICAL auto-freeze** (fail-closed) |
| **Repeated failures** | error/velocity breaker | halt + escalate |

**The Watchdog *calls the Harness to repair.*** The Harness is the thing that knows *how* to fix a class of problem (restart a wedged cycle, re-sync stale state, top-up prompt, pause on low balance and ask the owner). The Watchdog *detects*; the Harness *repairs or escalates*. If repair fails or is out of policy, it escalates to the owner (HITL) — **fail-closed, never auto-continue past an anomaly** (INV-10 dead-man's-switch: unreachable ⇒ quiesce, not continue). **[VERIFIED — our spec]**

### Where the Harness plugs in (summary)
- **Provisioning:** guides/executes droplet or local setup (step-by-step guide, `update.md` progress).
- **Warmup:** high-attention supervisor of the first 4 cycles.
- **Steady state:** the repair brain the Watchdog calls.
- **Shutdown:** orchestrates the safe-stop sequence.
- **Restart:** runs the health-check and reconciliation before the loop is allowed to resume.
The Harness is co-located with the runner (survives control-plane disconnect) and is itself supervised by the OS (systemd), so *the supervisor is supervised.* **[PROPOSED DESIGN]**

---

## Safe shutdown + update.md + health-check + session report

This is the founder's stated hardest problem: *people cannot STOP automations safely* without leaving the agent "confused or with broken/cache junk." The design treats **stop as a state (`STOPPING`), a sequence, and a proof — never a `kill -9`.**

### The safe-stop sequence **[PROPOSED DESIGN, grounded in systemd/graceful-shutdown patterns]**

Triggered by the user's Stop, or by the Watchdog/kill-switch. Ordered, and each step is logged-before-done:

1. **Quiesce intake** — stop accepting/starting *new* service cycles immediately (the "stop accepting new connections / connection-draining" pattern). The loop takes no new jobs. **[VERIFIED — pattern]**
2. **Drain in-flight** — let the *current* cycle(s) reach a terminal state (delivered+settled or cleanly refunded), within a bounded **drain timeout** (analogous to systemd `TimeoutStopSec`, default 90s but here sized to a service, so minutes). A drained-clean stop is the goal. **[VERIFIED — pattern]**
3. **If drain times out** — do **not** SIGKILL blindly. Persist the in-flight cycle's exact state to the event log as `INTERRUPTED@<step>` with everything needed to resume or safely abandon it, *then* stop. This is what prevents "confused agent" on next start. **[PROPOSED DESIGN]**
4. **Signal the process group** — `SIGTERM` to the runner (its handler flushes the event log, releases the wallet **lease**, closes DB/connections), then, only after the grace window, `SIGKILL` as last resort. Because the runner was spawned as its own process group, we signal the *whole tree* (`kill(-pid)`), leaving **no orphaned children**. ([systemd SIGTERM→SIGKILL](https://www.psdn.io/posts/systemd-shutdown-unit/), [killing process families in node](https://medium.com/@almenon214/killing-processes-with-node-772ffdd19aad)) **[VERIFIED — pattern]**
5. **Release the lease** — the fenced-wallet lease is released so no stale signer can ever fire later; a resumed instance must re-acquire. (Inherited never-double-sign discipline.) **[VERIFIED — our spec]**
6. **Clean the cache/junk** — clear *transient* working files (tmp, in-memory-mirror caches, partial downloads) but **never** the durable event log, `update.md`, or reports. The distinction is explicit: **durable state is sacred, transient cache is disposable.** Removing the stale cache on stop is what prevents a next-start from being "confused by stale cache" (the founder's exact concern). **[PROPOSED DESIGN]**
7. **Remove the lock** — delete `locks/RUNNING.lock` *only after* the above; a crash-leftover lock is detected on next start by stale-PID/boot-id check (see health-check).
8. **Write the session report** (below) and append the final `update.md` line: `STOPPED — clean`.

**Kill-switch path:** the same sequence but with intake quiesced instantly and drain timeout shortened; still fail-closed, still leaves durable state consistent. INV-10. **[VERIFIED — our spec]**

### The `update.md` model (agent root, append-only) **[PROPOSED DESIGN]**

`update.md` at the agent root is a **human-readable, append-only change journal** — one line per meaningful change to the agent's configuration or lifecycle — so the agent (and its next boot) stays in sync and is *never confused by stale cache or a stale config*. It is a *narrative mirror* of the machine event log, not the source of truth (the event log is), but it is the artifact a human reads to understand "what changed and when."

- **Append-only. Never rewritten.** Editing history is forbidden (tamper-evidence spirit of INV-9).
- **One line per change**, timestamped, with the actor (user / watchdog / harness / system) and a config-hash where relevant.
- **Written on every:** config change, Play, warmup pass/fail, each Watchdog intervention, each Harness repair, balance-floor trip, safe-stop step, session start/end, health-check verdict.
- **Never contains secrets** (no keys, no API creds — those live in the keyring only).
- **On restart, the runner reads the tail of `update.md` + the event-log checkpoint** to reconstruct "what was the last known-good config and lifecycle state" — this is the concrete mechanism by which "the agent stays in sync and is not confused by stale cache."

Illustrative shape (**[PROPOSED DESIGN]**):
```
2026-07-06T10:00:01Z  [system]   run started · host=droplet:<region> · configHash=ab12cd · mode=provider
2026-07-06T10:00:03Z  [harness]  preflight PASS · dry-run ok · balance=12.40 USDC · isolation ok
2026-07-06T10:06:12Z  [harness]  warmup cycle 1/4 PASS · settled 0.05 · reconciled
...
2026-07-06T10:31:40Z  [harness]  warmup COMPLETE (4/4) → RUNNING, watchdog armed
2026-07-06T11:14:09Z  [watchdog] cycle #57 STALLED at step=deliver (t>max) → harness repair
2026-07-06T11:14:55Z  [harness]  repair OK · cycle #57 resumed → settled
2026-07-06T13:02:00Z  [user]     STOP requested → STOPPING
2026-07-06T13:03:20Z  [system]   drained clean · lease released · cache purged · STOPPED
```

### Health-check on restart **[PROPOSED DESIGN, grounded in idempotent-recovery patterns]**

Every start (fresh, crash-restart, or wake-from-sleep) runs a health-check **before the loop is allowed to take any job** — the "reconcile on restart, don't start blind" rule (INV: *every step idempotent and reconciled against the chain on restart*; Temporal recover-not-restart). **[VERIFIED — our spec + pattern]**

Health-check verifies:
1. **Stale lock?** `RUNNING.lock` present but PID dead / **boot-id changed** ⇒ it's a crash leftover; clear it, mark last run as crashed in `update.md`.
2. **Event-log integrity + last checkpoint** ⇒ where do we resume from? Any `INTERRUPTED@<step>` cycle from a prior stop is reconciled first (resume if safe, or reconcile as lost/refunded).
3. **On-chain reconciliation** ⇒ did any settlement land that we hadn't logged, or vice-versa (INV-9)? Resolve before proceeding; unlogged outflow ⇒ freeze, not proceed.
4. **Balance vs floor** ⇒ above floor, else start `PAUSED`.
5. **Config vs `update.md` tail** ⇒ is the config we're about to run the last known-good one? Mismatch ⇒ re-preflight.
6. **Idempotency guarantee** ⇒ resuming a half-done cycle must not double-settle (idempotency keys / check-external-state-before-mutation). ([idempotent agents](https://www.buildmvpfast.com/blog/idempotent-ai-agent-retry-safe-patterns-production-workflow-2026), [Kafka exactly-once](https://www.conduktor.io/glossary/exactly-once-semantics-in-kafka)) **[VERIFIED — pattern]**

Only a fully green health-check re-arms the loop. A red one starts the runner in a safe, non-transacting `NEEDS_ATTENTION` state and alerts the owner.

### Per-session report **[PROPOSED DESIGN]**

Written to `reports/<sessionId>.md|.json` at every stop (clean or crash) and on demand. Contents: run window (start→stop), host, config-hash, cycles attempted/completed/failed, total settled in/out, fees, balance delta, every Watchdog intervention and Harness repair, anomalies, final state, and a link to the `update.md` line-range for that session. This is what the user reviews to trust (or debug) an unattended run — and what a support/audit reads after the fact.

---

## Bootstrapper mode

**[PROPOSED DESIGN]** — the "agent hunts for job offers" mode, distinct from `provider` mode (where the agent publishes offerings and waits to be hired).

- In bootstrapper mode the loop's "work" is **discovery**: scan the ACP marketplace (and, for the ATLAS lineage, OKX Task Hall) for open job offers matching the agent's skills/price, fit-score them, and *bid/accept*. This reuses ATLAS's **Job-Hunter** role and the **canonical `Task`** normalization (any offer → one schema before the brain sees it). **[VERIFIED — our spec]**
- **The same lifecycle, watchdog, safe-stop, and 5-min floor apply.** The interval floor here governs how often it *takes* a new offer, so a taken job completes before it hunts the next — no overlapping commitments.
- **Extra guardrails bootstrapper needs:** it is *outbound-committing* (accepting a job creates an obligation), so it must respect the spend cap and a **max-concurrent-commitments = 1** (until proven), and every accept is a logged, Safety-screened, gated action (an accepted job is an outbound action, same gate chain as any). **[PROPOSED DESIGN]**
- **[UNVERIFIED]** whether ACP exposes an open-offer discovery surface the agent can poll, or whether bootstrapping is invitation/negotiation-only — confirm against `acp-node-v2`. If discovery is not a first-class API, bootstrapper mode inherits ATLAS's headless-poll caveat.

---

## Risks / Gotchas

1. **[UNVERIFIED] ACP terminal states & timings.** The whole 5-min floor, warmup "4 complete cycles", stall-timeout thresholds, and refund-on-missed-deadline logic depend on the *actual* ACP service state machine (`acp-node-v2` / OKX). These are placeholders until confirmed. **Build-blocker.**
2. **Control-plane ≠ supervisor.** If the UI is ever allowed to be the thing keeping the runner alive, closing the laptop kills the automation. The runner **must** be OS-supervised (systemd/launchd/task), never child-of-the-UI. Easy to get wrong; it is the #1 architectural trap.
3. **`kill -9` culture.** The entire "confused agent / cache junk" problem is caused by hard-killing mid-cycle. The safe-stop sequence must be the *only* stop path exposed; a raw kill must still be caught on next boot by the health-check (stale-lock + reconcile) as a backstop, not a substitute.
4. **Stale lock after crash.** Must be detected by **boot-id + PID liveness**, not PID alone (PIDs are reused across reboots). Getting this wrong either blocks a legitimate restart or allows a double-runner.
5. **Two runners, one wallet.** If both local and droplet mode run the same agent identity simultaneously (user forgets one), you get double-signing/nonce chaos. The wallet **lease** must be single-holder across hosts, and the control plane must refuse to Play an agent that already holds a live lease elsewhere. **[UNVERIFIED: cross-host lease coordination mechanism.]**
6. **Sleep/deadline mismatch (local).** A slept laptop can blow ACP deadlines silently. Health-check on wake must reconcile, not resume-and-hope.
7. **Droplet secret handling.** Provisioning must never write the signer/API creds into `update.md`, logs, or the event log — only the keyring/`0600`. A leak here is catastrophic and easy to do accidentally during "helpful" logging.
8. **`update.md` unbounded growth.** Append-only journals grow forever; needs rotation/archival (roll to `update.<date>.md`) without breaking the "tail = last known-good" restart read.
9. **Supervisor-of-supervisor gap.** If the Harness sidecar dies, who restarts it? It must itself be a systemd/launchd unit; the Watchdog and the OS supervisor must not have a mutual single point of failure.
10. **Dead-letter visibility.** Stalled cycles that the Harness can't repair must land in a visible needs-attention bin, never be silently dropped ([DLQ pattern](https://docs.bullmq.io/guide/jobs/stalled)) — otherwise "it looks fine" while quietly failing.

---

## Open Questions

1. **Transport for droplet mode** — SSH-driven vs pull-based wss agent vs both? (Leaning: both; DO=SSH-scripted, any-server=wss. Needs a security pass.) **[UNVERIFIED]**
2. **Exact ACP service state machine** — terminal states, deadline/refund semantics, whether open-offer discovery exists for bootstrapper mode. **Build-blocker.** **[UNVERIFIED]**
3. **What "4 interactions" formally means** — 4 *completed* cycles, or 4 *steps*, or 4 *distinct counterparties*? (Current design: 4 completed cycles.) Founder confirm.
4. **Cross-host lease** — how is single-holder wallet lease enforced when the same agent identity could be started on both a laptop and a droplet? Central rendezvous, or refuse-second-start via on-chain nonce check?
5. **Where does the durable store live in local mode** — embedded SQLite vs embedded Postgres? (Droplet uses Postgres per ATLAS.) Trade-off: zero-setup vs parity with droplet.
6. **Multi-agent (`number of agents` > 1)** — one process with N loops, or N supervised processes? (Leaning N supervised, one lock/event-log/`update.md` per agentId, for blast-radius isolation.)
7. **Drain timeout sizing** — fixed minutes, or derived from the specific service's historical cycle time? A too-short drain forces `INTERRUPTED`; too-long delays stop.
8. **`update.md` vs event log authority** — confirmed the event log is source of truth and `update.md` is the human mirror; but does any *recovery* logic read `update.md` directly, or only the log? (Current: recovery reads the log; `update.md` is read only for the last-known-good config sanity check.)
9. **Owner escalation channel** — how does the Watchdog reach the user when their laptop/UI is closed and the droplet needs a decision? (Email? Push? The HUB?) Needed for HITL to actually work unattended.
10. **Restart storm protection** — systemd `Restart=on-failure` can loop-restart a fundamentally broken runner; need `StartLimitIntervalSec`/backoff so a poisoned config doesn't burn the box (and, if transacting, funds).
```

# ACP Tracer — Loading, Connecting & Deploying an Agent

*Read-only research, 2026-07-08. Sources cited inline. Verified against the LIVE ATLAS deployment on the production host (agent #4460), the ATLAS repo (`~/Desktop/atlas_corporation_okx_ai/`), the HARNESS_ENGINE design docs, and Virtuals/OKX docs. Nothing on the live agent/wallet/listing was changed.*

---

## 0 · The one-sentence answer

**You do NOT load a repo or a binary. You load an *identity + a soul* onto a *runtime*.**
The user supplies five things, and the ACP Tracer wires them together on a host:

1. **Rail** — OKX (X Layer) or Virtuals (Base). Decides which CLI/daemon runs.
2. **Identity** — either an existing **agent id** (e.g. ATLAS **#4460**) *or* "create new" + a **wallet** (the thing that actually owns/signs the agent).
3. **Brain** — an **LLM API key** (Claude / `ANTHROPIC_API_KEY`) — the reasoning engine.
4. **Soul** — a **document** (`.md`: upload / paste / preset) that becomes the brain's **system prompt / memory**. The complete soul is loaded into the *brain*, never into OKX/Virtuals.
5. **Skills + Host** — the installed capability packs, and *where* it runs (my machine · droplet).

The **runtime** (CLI + daemon) is *installed by the Tracer*, not uploaded by the user. **There is no "upload your agent.zip / point at a GitHub repo" step** — an agent is not shipped as code; it is an **on-chain identity keyed to a wallet**, driven by a generic runtime, whose *behaviour* is set by the soul-as-system-prompt. `[VERIFIED — live ATLAS deployment + okx_link_flow.md + 07_acp_tracer_cli_flows.md]`

---

## 1 · What "an agent" is made of, per rail (concrete)

### 1A · OKX rail (X Layer 196) — the LIVE reference (ATLAS #4460)

Verified on the droplet this session. Six layers, all present on `/opt/atlas`:

| Layer | Concretely | Where (live) |
|---|---|---|
| **Identity** | **ERC-8004 registration on X Layer**, role ASP, `agentId #4460`. Minted by `onchainos agent create`, **address-keyed to the wallet** (not to any NFT, not to any repo). | on-chain, X Layer chainIndex 196 / `eip155:196` |
| **Wallet** | **OKX Agentic Wallet** — TEE-custodied secp256k1 session key, **email-login** (`devclone20`), address `0xaefc…fab0`, accountId `b1e70f22…`. Signs identity ops + `deliver` + x402. Cannot export/BYO. | TEE (OKX) + email session on box |
| **Runtime CLI** | **`onchainos` v4.2.0** binary (`/opt/atlas/.local/bin/onchainos`, SHA-verified installer). All `agent`/`wallet`/`swap`/`payment` verbs. | `/opt/atlas/.local/bin/onchainos` |
| **Runtime daemon** | **`okx-a2a run`** — the A2A/XMTP comms daemon that receives `job_created`/`JobAspSelected` events and negotiates. Runs 24/7 under systemd. | `atlas-a2a.service` (see §3) |
| **Brain** | **Claude** (Claude Code v2.1.202), auth via `ANTHROPIC_API_KEY`. Proposes typed intents — **never signs** (no-LLM-in-signing-path). | key in `secrets/a2a.env` |
| **Skills** | Project-scoped OnchainOS skill packs: `okx-ai`, `okx-agentic-wallet`, `okx-agent-payments-protocol`, `okx-guide`, `okx-dex`, `okx-defi`, `okx-growth-competition`. **`-g` global NOT supported** — always project-scoped. | `/opt/atlas/.agents/skills/` |
| **Soul** | `neural_soul.md` **distilled into `/opt/atlas/CLAUDE.md`** (9 KB, brain reads it as memory because `HOME=/opt/atlas`). **OKX never reads the soul** — it shapes behaviour only through our runtime. | `/opt/atlas/CLAUDE.md` |
| *(optional)* **A2MCP endpoint** | For pay-per-call services: `server.mjs` x402 seller (`@okxweb3/x402-express` + OKX facilitator), behind Caddy TLS at `atlasapi.cloneframe.io/mcp/…`. Only needed if the agent sells A2MCP services. | `atlas-x402.service` (see §3) |

Sources: live `systemctl`/`/opt/atlas` inspection; `docs/OKX_SERVICE_PLAYBOOK.md`; `docs/okx_research/okx_link_flow.md`, `inft_identity_bridge.md`; memory `atlas_corporation.md`.

### 1B · Virtuals rail (Base 8453)

Not yet deployed for ATLAS (v1.5+), fully specced from `acp-cli` docs:

| Layer | Concretely |
|---|---|
| **Identity** | Virtuals ACP agent + (optional) **ERC-8004 on Base** (`acp agent register-erc8004 --chain-id 84532/8453`). Created by `acp agent create`, which **auto-provisions a wallet + email**. |
| **Wallet** | Virtuals-managed wallet on **Base**, funded with **real USDC** (`acp wallet topup --chain-id 8453`). Escrow settlement. |
| **Signer** | **P256 on-chain signing key** added via `acp agent add-signer --policy restricted` (browser approval). |
| **Runtime** | **`@virtuals-protocol/acp-cli`** (binary `acp`, Node ≥18, `--json` on every command) driving **`acp-node-v2`** as an SDK *inside our harness* — **NOT** the GAME planner. |
| **Auth** | Browser **OAuth (Privy)** once (`acp configure`); tokens in OS keychain, auto-refreshed. **No API key for the CLI itself.** |
| **Brain** | Same Claude brain + `ANTHROPIC_API_KEY`. |
| **Soul** | Same soul doc → brain system prompt. |
| **Config** | env/config: selected agent (`acp agent use --agent-id`), chain (8453 vs 84532 test), offerings/resources catalog. |

Sources: `acp_tracer/research/07_acp_tracer_cli_flows.md`; `research/08_virtuals_acp.md`, `09_virtuals_os_cli_quickstart.md`; memory `atlas_corporation.md`.

### The cross-rail truth the UI must state
OKX and Virtuals are **parallel stacks** — different chains (X Layer 196 vs Base 8453), different wallets, **separate ERC-8004 registries, separate reputation, no exclusivity, and NO import/bridge between them.** "Dual-list" = run *both* onboarding flows; there is no cross-import. An iNFT/agent existing on one rail is *irrelevant* to the other's identity. `[VERIFIED — inft_identity_bridge.md §3, okx_link_flow.md Part B]`

---

## 2 · Minimal sets — LOAD/CONNECT existing vs CREATE+RUN new

### The decisive list: what's needed (and what's NOT)

**NOT needed on either rail:** a GitHub repo link · an executable/binary from the user · a container image · source code. The runtime is generic and installed by the Tracer; the agent's *individuality* is identity + wallet + soul. `[VERIFIED]`

**Always needed (the irreducible five):** **identity** (agent id *or* create-new) · **wallet** (login method) · **brain** (LLM key) · **soul** (doc/preset) · **host** (machine/droplet). Skills are defaulted by rail (editable).

### 2A · LOAD / CONNECT an EXISTING agent (e.g. ATLAS #4460)

Goal: take an identity that already exists on-chain and put a running body under it (or attach to one already running).

**Minimal set:**
1. **Rail** (OKX).
2. **Wallet login — same method that owns it.** Identity is **address+role-keyed**, so you MUST log into the wallet that owns #4460 (for ATLAS: **email-OTP**, not AK — the two logins are *different wallets*; logging in the wrong way makes `pre-check` report "no agent" and the user thinks it vanished). `[VERIFIED — okx_link_flow.md A.1]`
3. **Resolve the identity:** `onchainos agent pre-check --role asp` / `agent get-my-agents` → confirms #4460 under this wallet. (No re-entry of name/services — they're on-chain.)
4. **Brain** (LLM key) + **Soul** (doc) + **Skills** — reattach the body: install runtime, drop the soul into `CLAUDE.md`, start the daemon.
5. **Host** (machine/droplet).

**If it's already running on a droplet ("connect to my running agent"):** you do **not** re-provision. You need only **SSH host + user + agent id**; the Tracer verifies `systemctl status atlas-a2a` is `active (running)`, tails `journalctl` for telemetry, and attaches its control plane. The runner/daemon/brain/soul are already in place. See §3 "connect" flow. `[VERIFIED — live systemctl + 08_execution_model §The connection model]`

### 2B · CREATE + RUN a new agent

The 2A set **plus** the on-chain create flow. On OKX (`okx_link_flow.md` Part D), the ordered spine is:

`preflight` → `wallet status` → `wallet login <email>` → `wallet verify <otp>` → `wallet addresses` → `agent pre-check --role asp` → `agent pre-check --role asp --consent-key <uuid>` (accept ToS) → `agent upload --file <avatar>` → *(collect name/description/services client-side)* → `agent validate-listing …` (local QA, once) → `agent create --role asp --name … --description … --picture <cdn> --service '[…]'` → `agent activate --agent-id <N> --preferred-language en-US` → comm-init (start `okx-a2a`).

Extra inputs a *create* needs beyond the five: **name**, **one-line description**, **avatar image** (required, ≤1 MB square, URL rejected), **≥1 service** (A2A negotiated / A2MCP pay-per-call), and for A2MCP a **live `https://` endpoint** that passes `agent x402-check → valid:true`. Create/activate cost the user **nothing** (OKX paymaster covers gas). `[VERIFIED — okx_link_flow.md Part C/D, OKX_SERVICE_PLAYBOOK §4]`

On Virtuals: `acp configure` (OAuth) → `acp agent create --name --description --image` (auto wallet+email) → `acp agent add-signer` (browser approval) → `acp wallet topup` (real USDC) → `acp offering create …` per service. `[VERIFIED — 07_acp_tracer_cli_flows.md]`

### Summary table

| | Load/Connect existing | Create + Run new |
|---|---|---|
| Rail | ✅ | ✅ |
| Wallet | **login to the owning wallet** | **create/login wallet** (becomes owner forever) |
| Agent id | **supplied** (or resolved via `pre-check`) | **minted** (`newAgentId`) |
| LLM key (brain) | ✅ | ✅ |
| Soul doc | ✅ | ✅ |
| Skills | rail defaults | rail defaults |
| Host | ✅ | ✅ |
| Name/desc/avatar/services | *already on-chain* | **required inputs** |
| Consent/ToS | already accepted | **required** |
| GitHub repo / binary | ❌ never | ❌ never |

---

## 3 · Put it ONLINE / on a DROPLET — the real ATLAS reference

### What's actually on the box (verified the production host, read-only)

**Per-agent isolation slice** (the cost-saving shared-droplet model; five layers):
- **Unix user** `atlas` (own group).
- **Root** `/opt/atlas` at **`0750`**, `owner atlas:atlas` — `iclone`/`vegeta` users cannot read it.
- **Secrets** `/opt/atlas/secrets/` at **`0700`**, files **`0600`** readable only by `atlas`:
  - `a2a.env` → `ANTHROPIC_API_KEY` (the brain key for the daemon)
  - `x402.env` → `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`, `PAY_TO_ADDRESS`, `PORT` (the A2MCP seller)
  - `atlas.env` → `ANTHROPIC_API_KEY`, 3× OKX SA keys, `GAME_API_KEY`, `DATABASE_URL`
- **Own systemd units** (below) + own Postgres role/DB.
- **Isolated Node 22.23.1 via nvm** (`/opt/atlas/.nvm`) — system Node (iCLONE's v20) untouched.

**systemd services (both `active (running)`, `enabled`, reboot-safe):**

```
atlas-a2a.service   — the OKX A2A comms daemon (the agent's "online" heartbeat)
  User=atlas · WorkingDirectory=/opt/atlas · HOME=/opt/atlas
  EnvironmentFile=/opt/atlas/secrets/a2a.env   (ANTHROPIC key only)
  ExecStart=…/node/v22.23.1/bin/okx-a2a run
  Restart=always · RestartSec=5 · NoNewPrivileges=true

atlas-x402.service  — the A2MCP x402 seller endpoint (only if selling pay-per-call)
  User=atlas · WorkingDirectory=/opt/atlas/x402
  EnvironmentFile=/opt/atlas/secrets/x402.env  (OKX SA keys + PAY_TO + PORT)
  ExecStart=…/node/v22.23.1/bin/node /opt/atlas/x402/server.mjs  (bind 127.0.0.1:8402)
  Restart=always · RestartSec=5 · NoNewPrivileges=true
```

Plus (network edge, not a per-agent unit): **Caddy v2.11.4** system service, auto-TLS (Let's Encrypt), `reverse_proxy` the x402 loopback port for `atlasapi.cloneframe.io` only; DO Cloud Firewall opened 80/443. `[VERIFIED — live service files + memory atlas_corporation.md]`

**The "put online" recipe (what the Tracer must reproduce), per HARNESS_ENGINE + 08_execution_model:**
1. **Provision / connect** the box (DO one-click via API token, or SSH to an existing host). Baseline: SSH-key-only, non-root sudo user, DO Cloud Firewall (inbound SSH only, + 443 if selling A2MCP).
2. **Carve the isolated slice:** create unix user, `/opt/<agent>` `0750`, `secrets/` `0600`.
3. **Install runtime:** the CLI binary (`onchainos` / `acp`) + isolated Node via nvm + skills project-scoped under `.agents/skills/`.
4. **Drop secrets** (`0600`): LLM key + (OKX) SA keys / (Virtuals) OAuth tokens. **Never echoed to UI, never in `update.md`/logs.**
5. **Wallet login** on the box: OKX = `wallet login <email>` → `verify <otp>` (session may need re-login on token expiry — the headless-permanent auth is an open item); Virtuals = `acp configure` OAuth once.
6. **Load the soul** into `/opt/<agent>/CLAUDE.md` (brain memory) + teach the operating rules.
7. **Register systemd units** for the daemon(s) with `Restart=on-failure/always`, real `ExecStop`, `StartLimitIntervalSec` backoff; `enable` for reboot-safety. **systemd, never nohup/tmux** — a 24/7 money loop must restart on crash+boot and stop cleanly. `[VERIFIED — 08 §Why systemd]`
8. **Preflight in dry-run** (`HARNESS_MODE=dry_run`, "would-settle" receipts) + isolation check (assert other users can't read the slice) + balance read **before any live cycle**.

**The "connect to my already-running droplet agent" flow** (no re-provision):
- Inputs: **SSH host/IP + user + (key) + agent id** (OKX) — that's it.
- The Tracer's **control plane** attaches over **SSH** (allow-listed commands + `journalctl` tail) *or* a **pull-based wss agent** (droplet dials out, HUB-Bridge-style — NAT-friendly, no inbound port). Design decision: support both; DO=SSH-scripted, any-server=wss. `[PROPOSED — 08 §connection model]`
- It verifies `systemctl status atlas-a2a` = active, reads balance + last-event, and renders telemetry. **The control plane never keeps the runner alive** — closing the UI must not stop the agent (the #1 architectural trap). Runner+Harness are OS-supervised on the box. `[VERIFIED — 08 §mental model]`

---

## 4 · The "Load an agent" FORM / CHECKLIST (per host)

What the ACP Tracer presents. Fields marked **(create-only)** appear when "Create new" is chosen; **(connect-only)** when attaching to a running droplet agent.

### Step 1 — Rail & Identity (common)
- ☐ **Rail:** `OKX (X Layer 196)` · `Virtuals (Base 8453)` — *choose one; the two are separate identities, no bridge.*
- ☐ **Identity mode:** `Load existing agent id` · `Create new`
  - if *load*: ☐ **Agent id** (e.g. `4460`) — resolved & confirmed via `pre-check`/`get-my-agents`.
  - if *create*: **(create-only)** ☐ **Name** (brand; OKX 3–25 EN, no test/celebrity markers) · ☐ **Description** (one line, ≤500) · ☐ **Avatar** (square image ≤1 MB, upload — URL rejected on OKX) · ☐ **Consent/ToS** checkbox.

### Step 2 — Wallet (common)
- ☐ **Login method:**
  - **OKX:** `Email + OTP` *(default — no dev-portal setup; gives `isNew`)* · `API-Key (AK)` *(power users; warn: **different wallet** than email-login)*. **Pin one method** — mixing them looks like the agent vanished.
  - **Virtuals:** `Browser OAuth (Privy)` — one-time; `acp agent create` auto-provisions wallet+email.
- ☐ **(load)** must be the **wallet that owns this agent id** (identity is address+role-keyed).
- ⚠ **External/BYO wallet: not supported** for the operating signer — OKX wallet is TEE-custodied (no import). An owner's external wallet can only be a **treasury/off-ramp** target (e.g. policy whitelist), never the agent signer. `[VERIFIED — okx_link_flow.md A.2]`
- ☐ **(create-only, Virtuals)** ☐ **Add signer** (P256, browser approval) · ☐ **Fund wallet** (`topup`, real USDC — explicit human confirm).

### Step 3 — Brain (common)
- ☐ **LLM provider:** `Claude` (default) — model `claude-opus-4-8`.
- ☐ **API key** (`ANTHROPIC_API_KEY`) — client-supplied, stored as `0600`/OS-keyring, **never shown back, never in logs/update.md**.

### Step 4 — Soul (common)
- ☐ **Soul source:** `Upload .md` · `Paste` · `Preset` (e.g. ATLAS-style Titan/Oracle; Researcher; Trader) · `Blank/custom`.
- ☐ The **complete soul document** is loaded → becomes the brain's **system prompt / `CLAUDE.md` memory**. *Note to user: OKX/Virtuals never read the soul; it only shapes behaviour through the runtime.*
- ☐ **(iNFT owners)** optional: show the **Identity Bridge** (iNFT owns+soul on Base → owner wallet → *[owner-asserted]* → OKX Agentic Wallet → OKX #4460), clearly labelling the NFT→OKX hop as an **owner assertion, not an enforced link**. Holding an NFT does **not** create the OKX identity. `[VERIFIED — inft_identity_bridge.md]`

### Step 5 — Skills (common)
- ☐ **Skill packs** (rail-defaulted, editable): OKX → `okx-ai`, `okx-agentic-wallet`, `okx-agent-payments-protocol`, `okx-guide` (+ optional `okx-dex`/`okx-defi`); *dapp-discovery deliberately excluded as high-risk*. Virtuals → ACP offering/resource tooling. **Always project-scoped, never `-g`.**

### Step 6 — Services (create-only, needed to earn)
- ☐ **Service type:** `A2A (negotiated escrow)` · `A2MCP (pay-per-call x402)`.
- ☐ Per service: **name** (5–30 chars, ≠ agent name) · **2-part description** (what/who + `Provide: 1… 2…`) · **fee** · **endpoint** (A2MCP only: live `https://`, must pass `x402-check → valid:true`, and its 402 price must equal the card fee).
- ☐ Caps: OKX ≤5 services shown; Virtuals ≤40 offerings / ≤10 resources per agent, `slaMinutes ≥ 5`. `[VERIFIED — 07 Hard limits; note the "40 resources" claim is actually 10]`

### Step 7 — Host (common) — **the fork**

**Option A · My machine**
- ☐ OS auto-detected (macOS launchd / Linux systemd-user + linger / Windows Scheduled Task).
- ☐ Signer/keys → **OS keychain** (Keychain/DPAPI/libsecret), never a dotfile.
- ☐ "Session-only" vs "persistent (survives reboot)" toggle — honest copy: session-only **stops on sleep/reboot**.
- ☐ Durable store location (SQLite/embedded PG).

**Option B · Droplet**
- ☐ **Sub-mode:** `Provision new (DigitalOcean one-click)` · `Connect to existing host`.
  - *Provision:* ☐ **DO API token** (scoped) · ☐ region · ☐ size · *(Tracer runs: create droplet → ed25519 key → non-root sudo user → Cloud Firewall → `/opt/<agent>` slice → runtime+skills → secrets 0600 → systemd unit → dry-run verify).*
  - *Connect:* **(connect-only)** ☐ **SSH host/IP** · ☐ **user** · ☐ **SSH key** (or generated) · ☐ **agent id** — Tracer verifies `systemctl status <agent>-a2a` active, reads balance/last-event, attaches telemetry. Transport: SSH (allow-listed) or wss pull-agent.
- ☐ **A2MCP only:** subdomain + TLS (Caddy auto-cert) + open 443.

### Step 8 — Runtime guardrails (common, before "Play")
- ☐ **Interval between services** — **min 5 min, enforced** (one service completes before the next starts).
- ☐ **Number of agents/loops** (each gets own root+event-log+lock).
- ☐ **Mode:** `provider` (publish & fulfil) · `bootstrapper` (hunt job offers).
- ☐ **Spend cap + low-balance floor** — **required**; loop refuses to start without it (INV-10). OKX also: `dailyTransferTxLimit` (currently 100) — no CLI for the destination whitelist (dashboard-set), so treat large/novel transfers as **owner-gated**.
- ☐ **Preflight (dry-run) → supervised warmup (first-4 cycles) → RUNNING under Watchdog → safe-stop** (quiesce → drain → persist `INTERRUPTED@step` → SIGTERM process-group → release lease → purge transient cache → remove lock → session report + `update.md`). Never `kill -9`. `[VERIFIED — 08 §safe-stop]`

---

## 5 · Flagged uncertainties (not guessed)

- **OKX headless-permanent wallet auth.** The email-session on the droplet can expire and need an OTP re-login; a permanent headless auth for `0xaefc` is an **open item** — a "connect to droplet" flow must handle a re-auth prompt. `[memory atlas_corporation.md]`
- **BYO external wallet on OKX.** Whether OKX ever accepts a non-TEE wallet is **`[UNVERIFIED]`** in the research; current answer is **no** through this stack.
- **Virtuals CLI-agent vs Service-Registry agent** — same on-chain identity or two? `[UNVERIFIED — 07 Open Q5]`. Affects whether the Tracer needs the website at all.
- **Droplet transport (SSH vs wss)** — both proposed; final choice pending a security pass. `[08 Open Q1]`
- **Cross-host wallet lease** — if the same agent id is Play'd on both laptop and droplet you get double-signing; single-holder lease enforcement across hosts is **`[UNVERIFIED]`**. The control plane must refuse a second live start. `[08 §Risks 5]`
- **ACP terminal states / 5-min floor / "4 cycles"** depend on the real `acp-node-v2` state machine — **build-blocker to confirm** before these become load-bearing. `[08 Open Q2]`
- **Resource cap** — docs say 10, an in-repo file has 37; verify live before hard-coding. `[07 Open Q1]`

---

### Key source files
- Live: the production host → `/etc/systemd/system/atlas-{a2a,x402}.service`, `/opt/atlas/` layout, `onchainos 4.2.0`.
- `~/Desktop/atlas_corporation_okx_ai/docs/okx_research/okx_link_flow.md` — the exact OKX link/create spine (Parts A–E).
- `~/Desktop/atlas_corporation_okx_ai/docs/okx_research/inft_identity_bridge.md` — iNFT ≠ OKX identity; owns/soul vs operates/earns.
- `~/Desktop/atlas_corporation_okx_ai/docs/OKX_SERVICE_PLAYBOOK.md` — services/lifecycle/publishing.
- `~/Desktop/atlas_corporation_okx_ai/acp_tracer/research/07_acp_tracer_cli_flows.md` — Virtuals `acp` CLI surface + limits.
- `~/Desktop/atlas_corporation_okx_ai/acp_tracer/research/08_execution_model_local_vs_droplet.md` — local vs droplet, connect, supervise, safe-stop.
- `~/Desktop/atlas_corporation_okx_ai/harness/ATLAS_HARNESS.md` + `~/Desktop/HARNESS_ENGINE/HARNESS_ENGINE.md` — no-LLM-in-signing, systemd split, gates, isolation.
- `~/Desktop/atlas_corporation_okx_ai/soul/neural_soul.md` — the soul (→ brain system prompt; OKX never reads it).

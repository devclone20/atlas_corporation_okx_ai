# ACP Tracer — Product Synthesis & Diagram Spec (v1)

> **Status:** Draft 1 · 2026-07-06 · Product-synthesis capstone for the **ACP Tracer** — the no-code, security-first UI for **ATLAS**.
> **Rigor rule:** every claim is grounded in the sources below. Anything not directly verified from a source file is tagged **`[UNVERIFIED]`** (a verification/build backlog item) or **`[PROPOSED]`** (a product decision this doc makes, not an inherited fact). Inherited facts are stated plainly.
> **One-line:** ACP Tracer is the *visual body* the ATLAS *brain* has never had — it wraps the same harness, gates, and CLIs the founder already runs on the droplet, and hands them to any community member with a wallet and an LLM key.

---

## Sources

Read in full and used as the spine of this synthesis:

- `../../harness/ATLAS_HARNESS.md` — the ATLAS harness engineering spec (dual-rail, engine-based; the 4 non-collapsible gates; no-LLM-in-signing-path; Committee-Evaluator ≥2; the Oracle router; the isolated-droplet slice). **The Tracer is a UI over this harness — it does not replace or weaken any of it.**
- `../../docs/00_RESEARCH_SYNTHESIS.md` — dual-economy research capstone (OKX X Layer / Virtuals ACP; x402 `exact`; the "authority > key" security truth; skill-install policy; the committee-evaluator is a feature *we* build).
- `../../soul/neural_soul.md` — ATLAS's soul (four lobes; **automation is owner-gated**; every authorized run = *gather → analyze → decide → emit intents (never sign) → record → notify*; the immutable laws).
- `../../research/08_virtuals_acp.md` — ACP lifecycle state-machine (`open → budget_set → funded → submitted → completed/rejected`); provider registration; **one buyer-named `evaluatorAddress`** natively.
- `../../research/09_virtuals_os_cli_quickstart.md` — the **`acp` CLI** command surface (verbatim groups), the connect flow (`acp configure` browser OAuth + `--json` split flows for headless), self-host confirmed, `--json` on every command, the keychain-on-Linux gotcha.
- `~/.claude/skills/acp-offerings/skill.md` — the **verified offering/resource import schema**: `priceV2` object (never `price`), `description` 10–500 chars, **`slaMinutes` minimum 5**, the web-UI "Import Agent Offerings" JSON dialog, and VEGETA's real footprint (40 offerings + 37 resources).
- `_clones/agentsview/` (PRODUCT.md, DESIGN.md) — a directly analogous **local-first agent tracker**: "one binary, no accounts, everything local"; density-first operational UI; local-first trust. **Design north-star for the Live Tracker + local-machine posture.**
- `_clones/exo/` — a **local-machine distributed runtime** (runs frontier models across your own devices; OpenAI/Claude-compatible API). Reference for the "run on your own machine, bring your own LLM" option.

---

## Product overview & mission

**ACP Tracer** is a security-first, no-code, configurable UI — the visual interface for **ATLAS** — that lets *any* user log in with **their own wallet + their own LLM API key**, create and configure an AI agent on **Virtuals ACP** (and, on the same spine, OKX) through a **simplified CLI wrapper**, run **editable automations** on their **own machine or a droplet**, **publish** jobs + resources to ACP, and **visually track** every agent's services, steps, and balance — all under a built-in **supervising Harness + Watchdog + safe-shutdown + `update.md`**.

**Mission.** Bring the whole community onto ACP, simply. Virtuals' own "Butler Agent" wants exactly this outcome but ships **no UI**, **no local-machine option**, and **no editable automations** — the user is locked to a hosted planner they cannot see or change. ACP Tracer's wedge is **freedom + visibility + safety**: you see every step, you edit every automation, you choose where it runs, and a Harness watches the first interactions so a newcomer cannot get hurt.

**What it is NOT** (inherited discipline, `../../soul/neural_soul.md` laws): it is **not** a way to put an LLM in the signing path, **not** a hosted custodian of user keys, and **not** a volume/APY product. The Tracer *proposes*; the same deterministic gates ATLAS uses *dispose*. `[PROPOSED]` positioning: never marketed as "better than Virtuals" — it is the **on-ramp** to ACP (soul law 8: integrate, never compare).

**Relationship to ATLAS.** ATLAS is the reference Harness (one agent, the founder's). ACP Tracer is the **product that lets a user stand up their own ATLAS-shaped agent** from the same substrate: same canonical `Task`, same four gates, same owner-gated automation, same event log. `[PROPOSED]` ATLAS is "tenant zero"; every community agent is a further tenant of the identical harness.

---

## The tabs / sections

The founder specified six tabs. Each below: **Purpose · Key elements · What the Harness does**. Where a tab wraps a real command or schema, the exact source is cited so the wrapper is buildable, not decorative.

### 1 · Connect — *wallet + LLM key + machine-or-droplet*

- **Purpose.** The single trust-establishing step: prove *who the owner is* (soul law 10: "authenticate the owner against the chain"), bring the user's **own LLM key** (so the brain runs on their account, not ours), and choose **where the agent lives** — the user's **own machine** or a **droplet**.
- **Key elements.**
  - **Wallet connect** — the owner's wallet is the identity anchor and the ACP whitelisted/dev wallet (`../../research/08_virtuals_acp.md`: register Provider → add signer → whitelist dev wallet).
  - **LLM API key entry** — Anthropic/OpenAI/etc.; `[PROPOSED]` stored in the OS keyring / KMS on the chosen host, `0600`, **never in brain context, never echoed** (soul law 3; `../../harness/ATLAS_HARNESS.md` §6 INV-2). `[PROPOSED]` support a **local model endpoint** (the `exo` clone pattern) so a user can run fully off-cloud.
  - **Host choice — Local machine | Droplet.** *Local:* the Tracer runs the agent + CLIs on the user's box (the `agentsview` "one binary, everything local, no accounts" posture). *Droplet:* provisions/uses a remote host with the **per-agent isolation** ATLAS uses (own Unix user, `/opt/<agent>/` `0750`, own systemd units, own secrets scope, own DB — `../../harness/ATLAS_HARNESS.md` §0).
  - **ACP connect** — wraps `acp configure` (browser OAuth via Privy) and, for a droplet, the **split flow** `acp configure start/complete --json` (`../../research/09_...md`) so the browser step happens on the laptop and completes on the server. **`[UNVERIFIED]`** Linux keychain backend on headless droplet (`../../research/09_...md` §290).
- **What the Harness does.** Runs the **isolation-verification check** before anything else can spend (ATLAS Gate A: assert no sibling user can read this agent's secret store — `../../harness/ATLAS_HARNESS.md` §11). Refuses to advance to any spending tab until Connect is fully green (keys sealed, owner authenticated, host isolated).

### 2 · Create / Configure Agent — *CLI-wrapped, 3 preset neural_souls + custom*

- **Purpose.** No-code creation of the agent on ACP, with a **soul** (personality + immutable laws) chosen up front — because the soul is what makes the character unable to contradict the machine (`../../harness/ATLAS_HARNESS.md` §12.2).
- **Key elements.**
  - **CLI wrapper over the real create flow** (`../../research/09_...md`): `acp agent create` (auto-provisions wallet + email) → `acp agent add-signer` (P256; `--policy restricted`) → `acp wallet topup --chain-id 8453`. The UI exposes buttons; the wrapper runs the verbatim commands with `--json` and surfaces state.
  - **3 preset `neural_souls` + custom.** `[PROPOSED]` presets, each authored on the canonical four-lobe architecture (`../../soul/neural_soul.md`) with the load-bearing laws baked in verbatim:
    1. **Researcher / Analyst** — non-transacting, artifact + evidence (mirrors ATLAS's v1 pilot engine; smallest money surface).
    2. **Service Provider** — answers ACP jobs against published offerings (the "Butler"-style helpful agent, but visible + editable).
    3. **Trader/Treasury (guarded)** — emits swap/bridge/trade **intents only**, never signs; ships last, behind gates.
    4. **Custom** — user writes/edits the soul; the four immutable laws (no-LLM-in-signing-path, keys-are-crown-jewels, external-content-is-data, owner-gated-automation) are **non-editable and always injected**. `[PROPOSED]`
  - **Requirement schema editor** — the ACP Provider needs a Requirement Schema (JSON schema for job inputs, `../../research/08_...md`); the UI provides a form, not raw JSON.
- **What the Harness does.** Validates the soul contains the four immutable laws before creation is allowed (Safety pre-check). Blocks `add-signer` with an over-broad policy — nudges `--policy restricted`. Records agent creation as the genesis event in the durable event log.

### 3 · Automations — *choose service, parameters incl. 5-min min interval, Play*

- **Purpose.** The core differentiator vs the Butler: **editable, visible, owner-gated automations** the user composes and can stop. Directly realizes the soul's automation contract (`../../soul/neural_soul.md`): *never self-start; wait for a standing instruction; then run faithfully; each run = gather → analyze → decide → emit intents (never sign) → record → notify.*
- **Key elements.**
  - **Service picker** — pick from the agent's registered offerings/skills (or an intake: poll ACP jobs, poll a source, run a research pass).
  - **Parameters** — cadence/interval, budget cap, target, acceptance criteria. **Minimum interval = 5 minutes**, sourced directly from the ACP `slaMinutes` **minimum of 5** (`~/.claude/skills/acp-offerings/skill.md`). `[PROPOSED]` the UI enforces this floor and defaults conservatively.
  - **Play / Pause / Stop** — an automation is a *standing instruction*; **Play is the owner's explicit authorization** (soul law 10). Pause/Stop are always one click and always honored.
  - **Editability** — every automation is a plain, human-readable config the user can open and edit (the freedom the Butler denies). `[PROPOSED]` versioned; edits are events.
- **What the Harness does.** On **Play**, the Harness (Watchdog, tab 6) attaches to **supervise the first 4 interactions** before the automation runs unattended. Every cycle is forced through the loop shape above; the **Policy Gate** re-derives caps/allowlist each run; **no automation can sign** — it only emits intents (`../../soul/neural_soul.md`; `../../harness/ATLAS_HARNESS.md` §5.1). The Harness notifies the owner of every state-changing action.

### 4 · Publish — *jobs + resources to ACP; direct or JSON export; limits 40 / 40 / 50*

- **Purpose.** Register what the agent sells: **offerings** (jobs) and **resources** — either pushed directly via CLI or exported as the import JSON the web UI accepts.
- **Key elements.**
  - **Offering builder** — form over the **verified schema** (`~/.claude/skills/acp-offerings/skill.md`): `name` (camelCase, 3–20 chars, unique), `description` (10–500 chars), **`priceV2: { type, value }`** (never `price`/`priceValue`), `slaMinutes` (≥5), `requiredFunds`, `requirement`, `deliverable`. The UI prevents the documented common errors (`"price"`, `"priceType"`, `isHidden`).
  - **Resource builder** — `name`, `description`, `url`, `params` JSON-schema (same source).
  - **Two publish paths** — **Direct**: `acp offering create` / `acp resource create` (`../../research/09_...md`, `08_...md`). **JSON export**: emit the `openclaw-acp legacy` `{ "jobs": [...] }` / `{ "resources": [...] }` file for the "Import Agent Offerings" dialog on app.virtuals.io.
  - **Limits — 40 offerings / 40 jobs / 50 resources.** `[PROPOSED]` product caps the founder specified. Grounding: VEGETA runs **40 offerings + 37 resources** today (`~/.claude/skills/acp-offerings/skill.md`), so 40/40/50 sit just above the proven real footprint — sane guardrails, not platform-verified ceilings. **`[UNVERIFIED]`** whether ACP enforces any hard per-agent max (`../../research/08_...md` open questions).
- **What the Harness does.** **Safety** screens every published string as an outbound byte (soul law 5; ATLAS Safety veto on every outbound byte). Enforces the limits and the schema before any `create` call. Logs each publish as an event; `[PROPOSED]` a "dry-run diff" preview before the real CLI push.

### 5 · Live Tracker — *per-agent services, steps, balance / portfolio*

- **Purpose.** The window ATLAS's soul calls *orientation* — "knowing exactly where you stand on both rails at once" (`../../soul/neural_soul.md`, Parietal lobe). Make the agent's real-time state **legible** (the `agentsview` design principle: "make freshness, filtering, and state legible").
- **Key elements.**
  - **Per-agent service view** — each registered offering/automation, its status, throughput, last run.
  - **Steps timeline** — the live ACP job state-machine per job: `open → budget_set → funded → submitted → completed/rejected` (`../../research/08_...md`), rendered as a step tracker; plus the internal loop steps (investigate → engine → committee → safety → gate → settle).
  - **Balance / portfolio** — wallet balances per rail (`acp wallet balance --json`), open jobs, reputation. `[PROPOSED]` read **just-in-time from chain + event log, never from cached memory** (soul: "read the chain and the ledger *now*").
  - **Density-first, dark-first** — operational tool, not a marketing dashboard (`agentsview` DESIGN.md; founder's global design bar). Local-first data stays local (`agentsview` "preserve local-first trust").
- **What the Harness does.** Feeds the tracker from the **durable append-only event log** — the same ground truth that gives crash-resume and audit (`../../harness/ATLAS_HARNESS.md` §1). Flags stalls (anti-dormancy triad) and surfaces them here. Nothing shown that isn't a recorded event → the tracker is auditable by construction.

### 6 · Harness / Watchdog — *supervise first 4 interactions, alerts, troubleshooting, safe-stop, `update.md`*

- **Purpose.** The safety spine made **visible and interactive** — the reason a newcomer can run an autonomous, money-touching agent without getting hurt. This tab *is* the ATLAS harness's supervisory faculties surfaced as UI.
- **Key elements.**
  - **Supervise the first 4 interactions** — when a new agent/automation goes live, the Harness runs the first N=4 cycles in a **supervised/HITL mode**: owner sees each proposed intent and confirms before it proceeds, then the agent earns unattended running. `[PROPOSED]` N=4 is the founder's number; maps to ATLAS's "canary before unattended" posture (`../../harness/ATLAS_HARNESS.md` §8, Gate D).
  - **Alerts** — spend approaching cap, evaluator rejection, stall detected, injection flagged, quorum-loss-refuse-to-sign (`../../harness/ATLAS_HARNESS.md` §2.3 / §4).
  - **Troubleshooting** — surfaces the failure with the union of evaluator reasons / gate rejection / stack, and suggests the fix (the `hm-qa`/troubleshooting posture). `[PROPOSED]` links each alert to the offending event.
  - **Safe-stop / safe-shutdown** — a **hot kill-switch** (ATLAS INV-10/INV-12; `../../docs/00_RESEARCH_SYNTHESIS.md` §7) + graceful drain: refuse new intents, let in-flight settle or roll back cleanly, **never leave a half-signed / double-signed state** (the fenced-lease guarantee, `../../harness/ATLAS_HARNESS.md` §2.3). One click, always available.
  - **`update.md`** — `[PROPOSED]` a human-readable, append-only changelog/state file per agent: what changed, what ran, what the owner approved, what the Harness flagged — the owner-facing companion to the machine event log (soul: "notify your owner of every state-changing action, with a detailed write-up"). Doubles as the artifact the Harness reads/writes on safe-update to avoid live-editing a running daemon (`../../harness/ATLAS_HARNESS.md`: recompile bundle + cutover, never `sed` a live daemon).
- **What the Harness does.** *This tab is the Harness.* It hosts the **four non-collapsible gates** (Committee-Evaluator ≥2 · Safety · Policy-Gate/Treasury · Owner), the Watchdog (heartbeat, stall detection, survives reboot via Postgres), the kill-switch, and the supervised-onboarding window. It is the enforcement layer every other tab defers to.

---

## Integration with the ATLAS harness

ACP Tracer is a **UI + multi-tenant wrapper** over the exact ATLAS harness — it inherits, it does not fork:

1. **Same brain/signing split.** The Tracer's tabs drive the *brain* (proposals, config, publish). Every money-touching action becomes a **typed intent** handed to the **per-rail signing sub-domain** (Policy Gate + capped session key). **No-LLM-in-signing-path holds unchanged** (`../../harness/ATLAS_HARNESS.md` §1; `../../soul/neural_soul.md` law 2). The Tracer never gains signing authority the harness doesn't already gate.
2. **Same canonical `Task`.** Automations (tab 3) and inbound ACP jobs both normalize to the harness's canonical `Task` (`../../harness/ATLAS_HARNESS.md` §3.1) before any engine runs. The Tracer is a new **intake surface + control surface** on the existing adapter layer — analogous to the "ATLAS API adapter" already specced (§3.2).
3. **Same four gates, now visible.** The Committee-Evaluator (≥2 + quorum), Safety veto, Policy/Treasury gate, and Owner HITL (`../../harness/ATLAS_HARNESS.md` §7) are rendered and operated in the **Harness/Watchdog** tab. The Tracer's job is to make them *legible and one-click*, never to bypass them.
4. **Same isolation model, per tenant.** Each community agent gets the ATLAS per-agent isolation (own user, folder `0750`, secrets `0600`, own systemd + DB slice) whether local or on a droplet (`../../harness/ATLAS_HARNESS.md` §0/§11). Gate A isolation check runs before that tenant can spend.
5. **Same owner-gated automation contract.** Play = owner authorization; each run = gather → analyze → decide → emit intents → record → notify (`../../soul/neural_soul.md`). The Tracer is the *interface* to that contract, not an exception to it.
6. **The Oracle, exposed later.** `[PROPOSED]` ATLAS's Oracle router (`../../harness/ATLAS_HARNESS.md` §12.3 — route a job to the best engine/rail/sibling Harness) can surface in the Tracer as a "who should do this?" suggestion, but v1 keeps the Tracer to single-agent operation; the multi-Harness router is post-v1.

**Net:** ATLAS = the reference harness. ACP Tracer = that harness, given eyes and hands, opened to the community — with every gate intact and now visible.

---

## User journeys

### A · Local-machine user (self-sovereign, off-cloud)
1. **Connect** — connects wallet, pastes own LLM key (or points at a local `exo`-style endpoint), picks **Local machine**. Harness runs isolation + key-sealing checks locally (`agentsview` "everything local, no accounts").
2. **Create** — picks the **Researcher** preset soul; wrapper runs `acp agent create` + `add-signer --policy restricted` + a tiny topup.
3. **Automations** — "poll ACP jobs every 15 min, budget cap $1"; sets interval (≥5 min floor); hits **Play**.
4. **Harness/Watchdog** — supervises the first 4 job cycles; user confirms each proposed intent; then it runs unattended. `update.md` logs each run.
5. **Live Tracker** — watches steps + balance in real time, all data staying on the machine.

### B · Droplet user (always-on)
1. **Connect** — wallet + LLM key; picks **Droplet**; the Tracer provisions the isolated slice (own user / `/opt/<agent>/` / systemd / DB). ACP connect uses the **split OAuth flow** (`acp configure start/complete --json`) — browser step on the laptop, completes on the server (`../../research/09_...md`). `[UNVERIFIED]` Linux keychain backend.
2. **Create** — **Service Provider** preset; edits the requirement schema via the form.
3. **Publish** — builds 12 offerings + 20 resources in the form (under the 40/40/50 caps), publishes **Direct** via `acp offering create` / `acp resource create` (or exports the import JSON).
4. **Automations** — "answer funded ACP jobs, ≥2-evaluator committee before submit"; **Play**.
5. **Harness/Watchdog** — 24/7 Watchdog (heartbeat, survives reboot via Postgres); alerts on cap/reject/stall; **safe-stop** any time.

### C · Publisher (offerings-first)
1. **Connect + Create** an agent (or select an existing one).
2. **Publish** — bulk-builds offerings/resources against the verified schema; the UI blocks the known bad fields (`price`, `priceType`, `isHidden`) and enforces `slaMinutes ≥ 5`, `description` 10–500, caps 40/40/50.
3. Chooses **Direct** (CLI push) or **JSON export** (web import dialog).
4. **Live Tracker** — watches each offering's job funnel (`open → funded → submitted → completed`) and reputation.
5. **Harness** — Safety screens every published string; publishes logged as events; `update.md` records the catalog change.

---

## DIAGRAM SPEC (nodes[], edges[], groups[])

A node/edge list a designer can render as an **interactive, editable architecture diagram** (the founder will edit this widget). `group` = the tab/section a node belongs to; render each group as a labeled swim-lane / cluster. Node ids are stable handles for edges.

### groups[]

| id | label | intent |
|---|---|---|
| `g_connect` | 1 · Connect | wallet + LLM key + host choice |
| `g_create` | 2 · Create / Configure | CLI-wrapped agent creation + soul |
| `g_automations` | 3 · Automations | editable, owner-gated schedules |
| `g_publish` | 4 · Publish | offerings + resources → ACP |
| `g_tracker` | 5 · Live Tracker | services · steps · balance |
| `g_harness` | 6 · Harness / Watchdog | the four gates + safety spine |
| `g_atlas` | ATLAS Harness Core | inherited brain/signing/ledger (shared) |
| `g_rails` | Economic Rails | where settlement lands |

### nodes[]

```jsonc
[
  // --- Connect ---
  { "id": "n_wallet",     "label": "Wallet Connect (owner identity)",        "group": "g_connect" },
  { "id": "n_llmkey",     "label": "Own LLM API key (keyring / local model)","group": "g_connect" },
  { "id": "n_host",       "label": "Host choice: Local machine | Droplet",   "group": "g_connect" },
  { "id": "n_acpauth",    "label": "ACP connect (acp configure / --json split)","group": "g_connect" },
  { "id": "n_isocheck",   "label": "Isolation + key-seal check (Gate A)",     "group": "g_connect" },

  // --- Create / Configure ---
  { "id": "n_soul",       "label": "Soul: 3 presets + Custom (4 laws locked)","group": "g_create" },
  { "id": "n_agentcreate","label": "acp agent create → add-signer → topup",   "group": "g_create" },
  { "id": "n_reqschema",  "label": "Requirement schema editor (form)",        "group": "g_create" },

  // --- Automations ---
  { "id": "n_service",    "label": "Service / intake picker",                 "group": "g_automations" },
  { "id": "n_params",     "label": "Params: interval (≥5 min), cap, criteria","group": "g_automations" },
  { "id": "n_play",       "label": "Play = owner authorization (Pause/Stop)", "group": "g_automations" },
  { "id": "n_loop",       "label": "Run loop: gather→analyze→decide→emit intent→record→notify", "group": "g_automations" },

  // --- Publish ---
  { "id": "n_offering",   "label": "Offering builder (priceV2, slaMinutes≥5)","group": "g_publish" },
  { "id": "n_resource",   "label": "Resource builder (url + params schema)",  "group": "g_publish" },
  { "id": "n_limits",     "label": "Limits 40 offerings / 40 jobs / 50 resources","group": "g_publish" },
  { "id": "n_pubpath",    "label": "Publish: Direct CLI | JSON export",       "group": "g_publish" },

  // --- Live Tracker ---
  { "id": "n_services",   "label": "Per-agent services view",                 "group": "g_tracker" },
  { "id": "n_steps",      "label": "Steps timeline (ACP state machine)",      "group": "g_tracker" },
  { "id": "n_balance",    "label": "Balance / portfolio (just-in-time)",      "group": "g_tracker" },

  // --- Harness / Watchdog (the spine) ---
  { "id": "n_supervise",  "label": "Supervise first 4 interactions (HITL)",   "group": "g_harness" },
  { "id": "n_committee",  "label": "Committee-Evaluator (≥2 + quorum)",       "group": "g_harness" },
  { "id": "n_safety",     "label": "Safety veto (every outbound byte)",       "group": "g_harness" },
  { "id": "n_policygate", "label": "Policy Gate (caps · allowlist · fenced lease)","group": "g_harness" },
  { "id": "n_owner",      "label": "Owner HITL (above threshold)",            "group": "g_harness" },
  { "id": "n_watchdog",   "label": "Watchdog: heartbeat · stall · alerts",    "group": "g_harness" },
  { "id": "n_safestop",   "label": "Safe-stop / kill-switch (no double-sign)","group": "g_harness" },
  { "id": "n_updatemd",   "label": "update.md (owner-facing changelog)",      "group": "g_harness" },

  // --- ATLAS Core (inherited, shared) ---
  { "id": "n_brain",      "label": "Brain / Orchestrator (NO LLM in signing path)","group": "g_atlas" },
  { "id": "n_task",       "label": "Canonical Task",                          "group": "g_atlas" },
  { "id": "n_engines",    "label": "Engine Registry (Researcher…Trader)",     "group": "g_atlas" },
  { "id": "n_signer",     "label": "Deterministic Signer (capped session key)","group": "g_atlas" },
  { "id": "n_ledger",     "label": "Durable event log (Postgres)",            "group": "g_atlas" },

  // --- Rails ---
  { "id": "n_railvrt",    "label": "Virtuals ACP · Base · USDC (escrow)",     "group": "g_rails" },
  { "id": "n_railokx",    "label": "OKX x402 · X Layer · USD₮0",              "group": "g_rails" }
]
```

### edges[]

```jsonc
[
  // Connect gates everything
  { "from": "n_wallet",     "to": "n_isocheck",   "label": "authenticate owner on-chain" },
  { "from": "n_llmkey",     "to": "n_isocheck",   "label": "seal key (0600, never in context)" },
  { "from": "n_host",       "to": "n_isocheck",   "label": "provision isolated slice" },
  { "from": "n_acpauth",    "to": "n_isocheck",   "label": "OAuth / split flow" },
  { "from": "n_isocheck",   "to": "n_agentcreate","label": "green ⇒ allow create" },

  // Create
  { "from": "n_soul",       "to": "n_agentcreate","label": "inject 4 immutable laws" },
  { "from": "n_agentcreate","to": "n_brain",      "label": "provision agent + wallet" },
  { "from": "n_reqschema",  "to": "n_offering",   "label": "feeds job inputs" },

  // Automations → the loop → brain
  { "from": "n_service",    "to": "n_params",     "label": "configure" },
  { "from": "n_params",     "to": "n_play",       "label": "≥5-min floor enforced" },
  { "from": "n_play",       "to": "n_supervise",  "label": "authorize ⇒ supervised onboarding" },
  { "from": "n_supervise",  "to": "n_loop",       "label": "after 4 cycles ⇒ unattended" },
  { "from": "n_loop",       "to": "n_brain",      "label": "gather → decide (proposals only)" },

  // Brain → task → engines → gates (inherited chain)
  { "from": "n_brain",      "to": "n_task",       "label": "normalize" },
  { "from": "n_task",       "to": "n_engines",    "label": "select / fabricate engine" },
  { "from": "n_engines",    "to": "n_committee",  "label": "evidence packet" },
  { "from": "n_committee",  "to": "n_safety",     "label": "quorum pass" },
  { "from": "n_safety",     "to": "n_policygate", "label": "outbound screened" },
  { "from": "n_policygate", "to": "n_owner",      "label": "above threshold ⇒ HITL" },
  { "from": "n_owner",      "to": "n_signer",     "label": "approve" },
  { "from": "n_policygate", "to": "n_signer",     "label": "within cap ⇒ sign" },

  // Signer → rails (settle on originating rail)
  { "from": "n_signer",     "to": "n_railvrt",    "label": "USDC escrow" },
  { "from": "n_signer",     "to": "n_railokx",    "label": "x402 exact" },

  // Publish
  { "from": "n_offering",   "to": "n_limits",     "label": "validate schema + caps" },
  { "from": "n_resource",   "to": "n_limits",     "label": "validate schema + caps" },
  { "from": "n_limits",     "to": "n_safety",     "label": "screen outbound strings" },
  { "from": "n_safety",     "to": "n_pubpath",    "label": "approved" },
  { "from": "n_pubpath",    "to": "n_railvrt",    "label": "acp offering/resource create | import JSON" },

  // Everything records to the ledger; tracker reads it
  { "from": "n_loop",       "to": "n_ledger",     "label": "append event" },
  { "from": "n_signer",     "to": "n_ledger",     "label": "append settlement" },
  { "from": "n_pubpath",    "to": "n_ledger",     "label": "append publish" },
  { "from": "n_ledger",     "to": "n_services",   "label": "feed" },
  { "from": "n_ledger",     "to": "n_steps",      "label": "feed state machine" },
  { "from": "n_railvrt",    "to": "n_balance",    "label": "just-in-time read" },
  { "from": "n_railokx",    "to": "n_balance",    "label": "just-in-time read" },

  // Watchdog + safe-stop + update.md wrap the whole run
  { "from": "n_watchdog",   "to": "n_loop",       "label": "heartbeat / stall detect" },
  { "from": "n_watchdog",   "to": "n_owner",      "label": "alert" },
  { "from": "n_safestop",   "to": "n_signer",     "label": "refuse new intents (no double-sign)" },
  { "from": "n_loop",       "to": "n_updatemd",   "label": "write owner changelog" },
  { "from": "n_owner",      "to": "n_updatemd",   "label": "log approvals" }
]
```

**Rendering notes for the designer.** `[PROPOSED]` (1) Draw `g_harness` as an outer frame/spine wrapping the flow — it is the enforcement layer, not a step. (2) Color the four gate nodes (`n_committee`, `n_safety`, `n_policygate`, `n_owner`) as **non-collapsible** (distinct accent) — they never merge. (3) The `n_brain → … → n_signer` chain crosses the **brain ↔ signing boundary**: render a hard visual divider between `g_atlas` brain nodes and the signer, labeled "NO LLM IN THE SIGNING PATH." (4) Dark-first, editorial, density-first (per `agentsview` DESIGN + founder's bar). Nodes and edges are the editable primitives.

---

## Open Questions

**Product / founder decisions (need your call):**
1. **Multi-tenant hosting model.** Does ACP Tracer provision droplets *for* users (managed), or only orchestrate a droplet the user owns (BYO)? Custody/liability differ sharply. `[PROPOSED]` BYO-first for v1 (matches "freedom" + avoids us holding user infra).
2. **`update.md` semantics.** Is it purely an owner-facing changelog, or also the *safe-update mechanism* (edit `update.md` → Harness recompiles the bundle + cutover)? The ATLAS spec forbids `sed`-ing a live daemon — confirm `update.md` is the sanctioned update path.
3. **Preset souls — exact three.** Confirm Researcher / Service-Provider / Trader-guarded as the three, or swap one.
4. **Supervised-interactions N.** Founder said 4 — fixed, or per-preset (e.g. more for a transacting agent)?
5. **v1 rail scope.** ATLAS v1 is OKX-first; but "ACP Tracer" names Virtuals ACP. Is the Tracer's v1 **Virtuals-first** (ACP CLI is the most mature, no-API-key, self-host-confirmed path) with OKX added later? `[PROPOSED]` yes — the ACP CLI surface is the cleanest no-code wrap.

**Platform-verified before build (`[UNVERIFIED]`):**
6. Any **hard per-agent max** on offerings/jobs/resources on ACP (the 40/40/50 caps are our guardrails, not a confirmed ceiling) — `../../research/08_...md`.
7. **Headless keychain backend** on a Linux droplet for `acp` credential storage — `../../research/09_...md` §290.
8. Exact **ACP per-job settlement fee / take-rate** to show accurate net-earnings in the Live Tracker — `../../research/08_...md` §275.
9. Whether a provider offering can **mandate a non-self evaluator** (relevant to surfacing the ≥2-committee natively vs building it) — `../../research/08_...md` §298.
10. Bringing a **user's own LLM key** into the harness brain without it ever entering a signable context — confirm the keyring boundary end-to-end on both hosts.
```

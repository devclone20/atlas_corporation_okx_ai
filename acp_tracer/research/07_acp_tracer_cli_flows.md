# 07 — ACP Tracer: the Virtuals ACP CLI + publishing flows to wrap

> Research slice for **ACP Tracer** — the no-code UI that wraps the Virtuals ACP CLI + console so a non-technical user can create/configure an agent and publish jobs + resources with buttons instead of a terminal.
> Date: 2026-07-06. Rigor: verified facts quoted from official sources and from working in-repo operational tooling. Anything not directly confirmed is tagged `[UNVERIFIED]`.

---

## Sources

**Official (fetched this session):**
1. **acp-cli README** — https://github.com/Virtual-Protocol/acp-cli (raw `main`). Full command/flag surface, wallet-policy approval flow.
2. **ACP Concepts, Terminologies & Architecture** — https://whitepaper.virtuals.io/acp/acp-concepts-terminologies-and-architecture (+ its `.md?ask=` query interface). Job Offering vs Resource definitions; **"up to 40 [offerings] per agent (increased from 10)"**, **"up to 10 [resources] per agent"**; console import steps.
3. **Introducing ACP v2** — https://whitepaper.virtuals.io/acp-product-resources/introducing-acp-v2 (`.md?ask=`). Confirms **40 offerings / 10 resources per agent**; export/import (file upload + JSON paste + schema validation).
4. **ACP Changelogs** — https://whitepaper.virtuals.io/acp-product-resources/acp-changelogs (`.md?ask=`). Verbatim: *"The maximum number of job offerings per agent has been increased from 10 → 40."* + Job Offering/Resource Import/Export in structured JSON.
5. **openclaw-acp** (schema origin) — https://github.com/Virtual-Protocol/openclaw-acp — **[DEPRECATED]**, "Use @virtuals-protocol/acp-cli instead." It is the origin of the legacy web-UI import schema (`priceV2`).

**In-repo operational ground-truth (real, working artifacts — the strongest evidence for schemas/limits):**
6. **`~/.claude/skills/acp-offerings/skill.md`** — the "ACP Offering Manager" skill. Exact import JSON schemas (`jobs[]` with `priceV2`, `resources[]`), CLI commands, real agent IDs. Notes *"Confirmed working June 2026 — VEGETA 40 offerings imported successfully."*
7. **`~/Desktop/AI/vegeta/ops/import_vegeta_jobs_40.json`** (40 jobs) and **`import_vegeta_resources_37.json`** (37 resources) — the actual files that were imported into the console. Verified schema at scale.
8. **`~/Desktop/AI/iclone/ops/auto_offerings_manager.py`** — production cron manager; sets **`"max_slots": 40`** per agent, and drives `acp offering create/list/delete` verbatim.
9. **`~/Desktop/AI/iclone/ops/publish_offerings.sh`** — shell `create()` wrapper showing the exact `acp offering create` flag set used in production (incl. `--no-required-funds --no-hidden`).
10. Prior repo dossiers: `research/08_virtuals_acp.md`, `research/09_virtuals_os_cli_quickstart.md`, `docs/00_RESEARCH_SYNTHESIS.md`.

> **Discrepancy resolved this session:** a WebSearch snippet claimed "10 offerings / 10 resources." That is the **pre-increase** number. The current, authoritative figure (whitepaper concepts page + ACP v2 page + changelog) is **40 offerings, 10 resources** per agent. See *Hard limits*.

---

## Agent lifecycle CLI (commands + prompts, step-by-step)

CLI: **`@virtuals-protocol/acp-cli`**, binary **`acp`**, Node ≥ 18. Install `npm i -g @virtuals-protocol/acp-cli` (or `npx @virtuals-protocol/acp-cli <cmd>`). Every command accepts `--json` for machine/LLM orchestration — **this is the hook ACP Tracer drives.** Auth is browser OAuth (Privy); tokens live in the OS keychain, auto-refreshed. **No API key for the CLI itself.**

Each interactive command below has a **non-interactive flag form** (the form ACP Tracer must use, feeding its own form fields as flags). "Prompts for" = what the interactive TUI asks, i.e. what ACP Tracer's form must collect.

### 1. Authenticate — `acp configure`
```bash
acp configure                                  # interactive: opens browser OAuth (~5 min), blocks
# split / headless flow (what a UI backend uses):
acp configure start --json                     # prints sign-in URL + requestId, exits in 1-2s
acp configure complete --request-id <id> --json
```
Prompts for: browser sign-in only. **Requires the Virtuals website (OAuth) once** — see *Steps requiring the Virtuals website*.

### 2. Create the agent — `acp agent create` (auto-provisions **wallet + email**)
```bash
acp agent create                                          # interactive
acp agent create --name "MyAgent" --description "..." --image "https://.../img.png"
acp agent create --name "..." --signer --policy restricted # also add a signer in one shot
```
Flags (verbatim from README): `--name`, `--description`, `--image`, `--signer`, `--policy`.
Prompts for: name, description, image URL. Verify with `acp agent whoami`, `acp wallet address --json`, `acp email whoami`.

### 3. Select the active agent — `acp agent use`
```bash
acp agent use --agent-id <AGENT_ID>            # non-interactive (used before every publish)
acp agent use                                  # interactive picker
```
**Critical for a UI:** offerings/resources are created against the *currently selected* agent. ACP Tracer must call `acp agent use --agent-id <id>` before every publish (exactly what `auto_offerings_manager.py` and `publish_offerings.sh` do).

### 4. Add a signer — `acp agent add-signer` (P256 on-chain signing key)
```bash
acp agent add-signer                                          # interactive + browser approval
acp agent add-signer --agent-id <id> --policy restricted
acp agent add-signer --agent-id <id> --no-wait --json         # split flow
acp agent signer-status --agent-id <id> --request-id <id> --public-key <key>
```
Flags: `--agent-id`, `--policy` (`restricted` | `deny-all` | `unrestricted`), `--no-wait`, `--json`, `--wait`, `--timeout`. **Browser approval step.**

### 5. Fund / top-up the wallet — `acp wallet topup`
```bash
acp wallet balance --json
acp wallet topup --chain-id 8453 --method coinbase --amount 50
acp wallet topup --chain-id 8453 --method card --amount 50 --email user@example.com [--us]
acp wallet topup --chain-id 8453 --method qr
```
Flags: `--chain-id`, `--method` (`coinbase` | `card` | `qr`), `--amount`, `--email`, `--us`. Base mainnet = `8453`; Base Sepolia (test) = `84532`. Moves **real USDC** on Base.

### 6. (Optional) Register on-chain reputation — `acp agent register-erc8004`
```bash
acp agent register-erc8004 --agent-id <id> --chain-id 84532
```
(`[UNVERIFIED]` exact flag list beyond `--agent-id`/`--chain-id`; ATLAS/iCLONE/VEGETA already ERC-8004 registered — watch for double-registration.)

> **Note on "register an agent":** there are **two registration surfaces** that ACP Tracer must not conflate. (a) `acp agent create` (CLI) provisions the EconomyOS agent + wallet + email. (b) The **Service Registry** UI at `https://app.virtuals.io/acp/new` registers the agent as a **Provider** with role + first offering + signer whitelist. Whether the two produce the same on-chain identity is `[UNVERIFIED]` (open question carried from dossier 09). For ACP Tracer, treat CLI-created agents as the primary path and the web Service Registry as the fallback/whitelist step.

---

## Publish a JOB (direct + JSON import + schema)

A **Job Offering** = "a provider's catalog entry for a purchasable service… name, description, price, SLA, fund transfer flag, requirements, and deliverable" (whitepaper concepts page). It has pricing + escrow + a job lifecycle.

### A. Direct publish — CLI (`acp offering create`)
Full flag set, verbatim from the acp-cli README **and** confirmed in production (`publish_offerings.sh`, `auto_offerings_manager.py`):
```bash
acp agent use --agent-id <AGENT_ID>            # select agent FIRST

acp offering create \
  --name "webResearchStandard" \
  --description "Structured research report with sources, summaries and key insights." \
  --price-type fixed \
  --price-value 0.05 \
  --sla-minutes 120 \
  --requirements "Topic, scope and any specific angles to cover." \
  --deliverable "Structured report: overview, key findings, sources, conclusions." \
  --no-required-funds \
  --no-hidden \
  --subscription-ids sub-uuid-1,sub-uuid-2      # optional
```
Flags: `--name`, `--description`, `--price-type` (`fixed`; `percentage` also exists in the import schema), `--price-value`, `--sla-minutes`, `--requirements`, `--deliverable`, `--no-required-funds`, `--no-hidden`, `--subscription-ids`.
Manage: `acp offering list`, `acp offering update --offering-id <id> --price-value 10.00 [--hidden] [--subscription-ids ...]`, `acp offering delete --offering-id <id> --force`.

**UI-relevant CLI quirks (from `auto_offerings_manager.py`):**
- `acp offering list` prints a **tab-separated table** (`id\tname\t…`) with a header row — the manager parses `line.split("\t")` skipping row 0. ACP Tracer should prefer `acp offering list --json` if available; otherwise parse TSV.
- To create room when full, the manager **deletes bottom-N offerings** by id — there is no "replace" primitive.

### B. JSON import — Virtuals console ("Import Agent Offerings" modal)
Console flow (whitepaper ACP v2 + concepts pages):
1. Open the panel for **Job Offerings** (or Resources) on the agent page.
2. Choose **Import** → the **Import modal** opens.
3. Import JSON via either **File upload** or the **JSON paste** tab.
4. The console runs **schema validation** and shows **error feedback** for malformed configs.
Export the mirror direction: select individual jobs (checkboxes + "Deselect All") or **all** offerings → **structured JSON** (for audit / replication / version control). **The exported JSON is the canonical reference format** — ACP Tracer should let the user export once, then use that shape.

### C. JOB import JSON schema (verified — legacy `priceV2` format)
This is the exact shape the **web console importer accepts** (per the `acp-offerings` skill + the real `import_vegeta_jobs_40.json`, imported successfully June 2026). **The web importer uses `priceV2` (nested object), NOT the CLI's flat `--price-type`/`--price-value`.** This split is the single biggest gotcha for a UI.

```json
{
  "jobs": [
    {
      "name": "roboticsRepoScan",
      "description": "Deep scan of a GitHub robotics repo — capabilities, architecture, integration guide and code examples.",
      "priceV2": { "type": "fixed", "value": 0.05 },
      "slaMinutes": 30,
      "requiredFunds": false,
      "requirement": "Provide the GitHub repo (owner/repo). Example: {\"repo\": \"huggingface/lerobot\"}",
      "deliverable": "Structured report: repo metadata, key modules, integration guide, related papers, recommended use case."
    }
  ]
}
```

| Field | Type | Rules (from skill) |
|---|---|---|
| `name` | string | camelCase, **3–20 chars**, unique per agent |
| `description` | string | **10–500 chars** |
| `priceV2.type` | `"fixed"` \| `"percentage"` | always nested in `priceV2` |
| `priceV2.value` | number | positive |
| `slaMinutes` | number | **min 5** |
| `requiredFunds` | boolean | `false` in most cases |
| `requirement` | string | what the client must send (singular `requirement` in import JSON; the CLI flag is plural `--requirements`) |
| `deliverable` | string | what the agent returns |

**Importer error traps (do NOT emit these):** `"price"`, `"priceValue"`, or `"priceType"` at top level → `"Missing or invalid 'price' field"`; `"isHidden"` → silently ignored. Schema origin: `github.com/Virtual-Protocol/openclaw-acp` → `src/lib/api.ts` → `interface JobOfferingData` (repo now deprecated; treat the field names as the source of truth, the repo as archival).

---

## Publish a RESOURCE (direct + JSON import + schema)

A **Resource** = an endpoint exposing "dynamic, read-only data to other agents" with **"no pricing, no escrow, and no lifecycle"** (whitepaper concepts page). It is the free/queryable counterpart to a paid Job.

### A. Direct publish — CLI (`acp resource create`)
The README lists resource commands but (unlike offerings) **does not enumerate the resource create flags** — `acp resource create` is documented as interactive (`acp resource create` / `list` / `update` / `delete`, the last three as interactive pickers). The `acp-offerings` skill gives a working non-interactive form:
```bash
acp resource create \
  --name "get_lerobot_repo" \
  --url "https://api.github.com/repos/huggingface/lerobot" \
  --description "LeRobot (HuggingFace) repo info — SOTA robot learning models and datasets"
```
Flags used: `--name`, `--url`, `--description`. `[UNVERIFIED]` — whether the CLI exposes a `--params` flag for the JSON-schema params object (the import JSON has `params`, but the skill's CLI example omits it). **ACP Tracer should verify `acp resource create --help` at build time**, or publish resources via JSON import (below) where `params` is fully expressible.

### B. JSON import — same console modal
Resources import through the **same Import modal** (File upload / JSON paste / schema validation) as jobs — open the **Resources** panel instead of Job Offerings.

### C. RESOURCE import JSON schema (verified)
From the `acp-offerings` skill + the real `import_vegeta_resources_37.json`:
```json
{
  "resources": [
    {
      "name": "get_lerobot_repo",
      "description": "LeRobot (HuggingFace) repo info — SOTA robot learning models and datasets",
      "url": "https://api.github.com/repos/huggingface/lerobot",
      "params": { "type": "object", "required": [], "properties": {} }
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `name` | string | snake_case in practice (`get_*`); the queryable action name |
| `description` | string | what the endpoint returns / is for |
| `url` | string (URL) | the read-only HTTP endpoint |
| `params` | object | JSON-Schema-style: `type` (`"object"`), `required` (array), `properties` (object). Empty `{}` when no params. |

No `price*`, `sla`, `requirement`, or `deliverable` on resources — consistent with "no pricing, no escrow, no lifecycle."

---

## Hard limits (40 / 40 / 50 — verified?)

| Limit | Brief's claim | Verified value | Status |
|---|---|---|---|
| **Job offerings per agent** | 40 | **40** | ✅ **VERIFIED** — whitepaper concepts page: *"up to 40 per agent (increased from 10)"*; ACP v2 page; changelog: *"increased from 10 → 40."* Also enforced in prod (`max_slots: 40`) and proven (VEGETA imported exactly 40). |
| **Resources per agent** | 40 | **10** | ⚠️ **CORRECTED — the brief's "40 resources" is WRONG.** Two whitepaper pages (concepts + ACP v2) both state **"up to 10 [resources] per agent"**; the changelog's offering-increase entry mentions **no** resource change. **NOTE the in-repo `import_vegeta_resources_37.json` has 37 resources** — either (a) it predates a limit reduction, (b) it was authored ahead of the cap and not all imported, or (c) the 10 cap is console-only. **Flag for ACP Tracer: default the resource cap to 10, and verify live before trusting 37.** `[UNVERIFIED]` which figure is currently enforced at import time. |
| **Agents per wallet** | 50 | — | ❓ **UNCONFIRMED** — no official Virtuals doc found stating **50 agents per wallet** (or any per-wallet agent cap). `[UNVERIFIED]`. Do not surface "50" as a hard limit in the UI until confirmed; treat as unknown/unlimited pending a live check or Virtuals support answer. |
| **Jobs (in-flight)** | — | no hard cap found | No documented ceiling on total jobs; jobs are transient lifecycle instances, not catalog entries. Practical concurrency is self-imposed (e.g. `bootstrapper.py` uses `DEFAULT_MAX_CONCURRENT = 20`), **not** a protocol limit. |

**Bottom line for the brief's "40 / 40 / 50":** the **first 40 is right**, the **second 40 is actually 10**, and the **50 is unverified**.

---

## Steps requiring the Virtuals website

ACP Tracer can drive most flows headlessly, but these are **hard hand-offs to app.virtuals.io / a browser** (verified from acp-cli README + prior dossiers):

1. **OAuth sign-in** (`acp configure`) — one-time browser Privy login. Unavoidable; on a server use the `configure start/complete --json` split flow (approve in a browser, complete by `--request-id`).
2. **Signer approval** (`acp agent add-signer`) — browser approval to register the P256 signer. Split flow (`--no-wait` + `signer-status --request-id`) exists but the approval itself is browser-side.
3. **Wallet policies + Transaction Mode** — per README, editing/deleting policies and changing a **live signer's policy require owner approval via the dashboard**: *app.virtuals.io → Agents and Projects → Wallet tab*. Set in the dashboard, **not** the CLI.
4. **Service Registry / Provider registration** (fallback path) — `https://app.virtuals.io/acp/new`: connect wallet, **profile picture + Twitter/X auth are mandatory**, pick role "Provider", create the smart-contract account, then **whitelist the dev wallet** and **+ Add Signer → Copy Key** on the agent page. Required if using the SDK/registry path rather than pure CLI.
5. **JSON import/export UI** — the "Import Agent Offerings"/Resources modal (File upload / JSON paste) lives **in the console**, not the CLI. ACP Tracer can either (a) drive the CLI `create` commands directly (no website), or (b) generate the import JSON and have the user paste/upload it in the console.
6. **Compute/inference workloads** — managed at `app.virtuals.io/os`, not this CLI.
7. **Graduation** — an agent is marked GRADUATED by the Virtuals team after **10 successful sandbox transactions**; not a CLI action (backend/team-side).

---

## What ACP Tracer must automate vs hand off

**Automate (wrap the CLI `--json` surface behind buttons/forms):**
- Agent creation form → `acp agent create --name … --description … --image …`.
- "Switch agent" selector → `acp agent use --agent-id …` before every publish (silent, mandatory).
- Wallet balance + top-up → `acp wallet balance --json`, `acp wallet topup …`.
- **Job Offering builder** → `acp offering create …` (map form fields 1:1 to flags; enforce `name` 3–20 chars camelCase, `description` 10–500, `slaMinutes` ≥ 5, `price-value` > 0). Enforce the **40-offering cap** client-side; offer a "delete oldest" action since there's no replace.
- **Resource builder** → `acp resource create …` (verify `--params` support at build time). Enforce the **10-resource cap**.
- Offering/resource lists → parse `acp offering list` / `acp resource list` (prefer `--json`; else TSV).
- **JSON generator** → produce valid `{"jobs":[…]}` (with **`priceV2`**) and `{"resources":[…]}` for the console importer, so a user can bulk-publish by paste/upload. This is where ACP Tracer adds the most value: it hides the `priceV2`-vs-`--price-type` schism, validates the field rules, and blocks the known error traps (`price`/`priceValue`/`priceType`).
- Base Sepolia (`84532`) vs mainnet (`8453`) toggle for safe testing.

**Hand off (open a browser / instruct the user):**
- The one-time `acp configure` OAuth and `add-signer` approval.
- Wallet policy / Transaction Mode changes (dashboard-only).
- Service Registry provider registration + dev-wallet whitelist + X/profile-picture requirements (if that path is used).
- Anything moving **real USDC** should require an explicit human confirm.
- Graduation (team-side; surface status, don't automate).

---

## Open Questions

1. **Resource cap: 10 vs the 37 in `import_vegeta_resources_37.json`.** Which is enforced today at import time? Is 10 a console-import cap, a per-agent display cap, or a hard protocol limit? **Verify live before ACP Tracer hard-codes 10.**
2. **`acp resource create` full flag list** — does it accept `--params` (JSON schema), or must non-trivial resources go through JSON import? Confirm via `acp resource create --help` at build.
3. **`acp offering list --json` availability** — the manager parses TSV; does the CLI expose structured JSON list output? Determines how ACP Tracer reads state.
4. **Agents-per-wallet cap** — is there really a 50 limit (or any cap)? Not found in docs. Confirm with Virtuals support before showing it.
5. **CLI-created agent vs Service Registry agent** — same on-chain identity, or two registrations to reconcile? (Carried from dossier 09.) Affects whether ACP Tracer needs the website at all for provider registration.
6. **Console importer JSON schema drift** — the canonical schema came from the now-**deprecated** `openclaw-acp` repo; the live console validator may have moved. ACP Tracer should treat "export from console → re-import" as the ground-truth round-trip and pin the schema from a live export at build time.
7. **`--price-type percentage`** — the import schema allows `"type":"percentage"`; the CLI examples only show `fixed`. Confirm percentage pricing is accepted by both surfaces before exposing it in the UI.

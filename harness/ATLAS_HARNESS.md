# ATLAS Harness — Engineering Spec (dual-rail, engine-based)

> **Parent spec:** `~/Desktop/HARNESS_ENGINE/HARNESS_ENGINE.md` — the canonical Forge/Harness design. **This document is the ATLAS-specific *delta*.** Everything in the parent (runtime architecture, the 22 Laws, the 5-layer safety, the 14 invariants, the 4 test gates, fleet ops, the fenced-wallet lease, build-by-subtraction) is **inherited unchanged unless a section below overrides it.** We do not duplicate it — we specialize it.
>
> **Status:** Fase 2 draft 1 · 2026-07-05 · v1 target **17 Jul 2026** (aggressive, OKX-first).
> **Rigor:** items that depend on unverified platform behavior are tagged `[UNVERIFIED]` and are build-blockers until confirmed (see §11 and `docs/00_RESEARCH_SYNTHESIS.md`).

---

## 0. What ATLAS is

**ATLAS CORP** is the **first Harness manufactured on the HARNESS_ENGINE design**, hand-assembled for v1 (the Forge pipeline itself is deferred — we prove one Harness before we build the machine that stamps them). It is an iNFT (NFT on OpenSea + AI agent) running 24/7 on the **shared production droplet** under **strict per-agent isolation** (own Unix user `atlas`, own `/opt/atlas/` root at `0750`, own systemd units, own secrets scope, own Postgres role/DB — so a compromise of iCLONE/VEGETA cannot reach ATLAS's keys or wallet), orchestrating a crew — the "Atlas Corporation."

Two things make ATLAS a *delta* on the parent Harness, not a straight instance:

1. **Dual-rail.** The parent runs one rail (Virtuals ACP on Base). ATLAS runs **two** economic rails — **OKX X Layer OS** (`okx.ai`) *and* **Virtuals ACP** — behind a rail-agnostic loop.
2. **Engine-based delivery.** The parent has one `Delivery` role. ATLAS generalizes it into a **registry of Engines** (Researcher, Hacker, Cybersecurity, Swap, Bridge, Trader) — the "Atlas Corporation" investigates any task, selects or **fabricates** an engine, and delivers.

Everything else — the money boundary, the gates, the anti-dormancy thesis, the invariants — is the parent's, held exactly.

---

## 1. Inheritance ledger — what ATLAS takes unchanged

| From HARNESS_ENGINE | ATLAS stance |
|---|---|
| Brain/signing domain split; **stateless brain over a durable Postgres event log** (§4.2) | **Unchanged.** The event log is ground truth, audit trail, and crash-resume substrate. |
| **No LLM in the signing path** (§4.2 invariant) | **Unchanged — load-bearing.** The brain proposes typed intents; a deterministic worker + Policy Gate + capped signer dispose. |
| The 22 Laws L1–L22 (§3) | **Unchanged.** Re-read per rail where an economic read differs (L7, L12 apply to *both* chains). |
| 5-layer safety architecture (§6.2) | **Unchanged**, extended to two rails' payloads (§6 below). |
| 14 non-negotiable invariants (§6.3) | **Unchanged**, with OKX-specific enforcement points added (§6). |
| 4 safety test gates A–D (§6.4) | **Unchanged**, canary runs on the **OKX** rail for v1 (§8). |
| Fenced-wallet lease / never-double-sign (§8) | **Unchanged and now critical** — two nonce spaces (X Layer + Base) make it non-optional (§2.3). |
| Build-by-subtraction; Minimum Provable Harness (§9) | **Unchanged.** ATLAS v1 = the minimum provable *dual-rail-ready* Harness, OKX-only. |
| Hard rules (§11): no Virtuals comparison, no APY claims, no wash-trading, dark-first editorial | **Unchanged.** |

**The one structural inheritance to state plainly:** the brain is a *permanently-compromised, adversarial component*. ATLAS is safe not because its brain is trustworthy, but because the brain is *physically incapable* of moving money on **either** rail.

---

## 2. Delta 1 — Dual-rail

### 2.1 The two rails

| | **OKX rail** (v1) | **Virtuals rail** (v1.5+) |
|---|---|---|
| Chain | X Layer — `eip155:196` (OP Stack L2, OKB gas, zero-gas for agent pay) | Base — `8453` |
| Settlement asset | **USD₮0** `0x779Ded0…713736` (6 dec, EIP-3009) | USDC |
| Payment protocol | **APP** over **x402** (`exact` mode for v1) + MPP `[deferred]` | ACP escrow (Proof-of-Agreement) |
| Wallet / signer | OKX **Agentic Wallet** (TEE session-key) + our capped signer `[TEE-signer SDK stub — resolve §6]` | ERC-6551 TBA + registered P256 signer (parent §5.3) |
| Intake | `okx.ai/tasks` Task Hall — **no public API**, headless poll + Payment SDK | `acp-node-v2` `onNewTask` / `onEvaluate` |
| Provider modes | **A2MCP** (pay-per-call) + **A2A** (negotiated) | Provider (+ Client) |
| Delivery-arbitration | **We gate it** — OKX escrow is prepaid metering, "release-on-delivery" is roadmap | ACP escrow releases on evaluation pass |
| Reputation | Pools across A2MCP + A2A (one Agentic-Wallet identity) | ERC-8004 credential per completed job |

### 2.2 Two signing sub-domains, one brain

The parent's single `SIGNING DOMAIN` becomes **two isolated signing sub-domains**, one per rail — each with its **own** capped, expiring session key, its **own** Policy Gate instance, and its **own** fenced wallet lease. **No key, no signer, and no lease is ever shared across rails.** The brain (one Orchestrator) emits a **rail-tagged typed intent**; the router hands it to the correct sub-domain. A jailbroken brain still cannot sign on either rail.

### 2.3 Never double-sign — now across two nonce spaces

The parent's hardest problem (§8) is amplified: X Layer and Base are **independent nonce spaces**. Mitigation is unchanged in shape, doubled in instance: **one fenced lease per wallet**, lease-holder-only signing, stale-fence rejection, on-chain nonce as backstop; **quorum loss ⇒ refuse-to-sign + HITL, never two active signers.** A cross-rail action (e.g., a Bridge engine moving value X Layer→Base) is the highest-risk primitive and is **out of v1 scope** (§8) precisely because it touches both nonce spaces at once.

---

## 3. Delta 2 — Intake Adapter layer + canonical `Task`

The parent loop (`Converse → Co-plan → Execute → Trade → Grow → re-plan`) runs **unchanged behind a thin adapter layer**. Adapters are the *only* rail-aware code above the signing sub-domains; everything downstream is rail-agnostic.

### 3.1 Canonical `Task`

Every source normalizes into one schema before the Orchestrator sees it:

```jsonc
{
  "task_id": "atlas:okx:<hash>",        // namespaced by source
  "source": "okx" | "virtuals" | "api",
  "mode": "a2mcp" | "a2a" | "acp" | "direct",
  "title": "...",
  "brief": "...",                        // sanitized: DATA, never instructions (L0)
  "acceptance_criteria": ["..."],        // drives the Committee-Evaluator
  "budget": { "asset": "USDT0", "amount": "0.08", "chain": "eip155:196" },
  "deadline": "2026-07-10T00:00:00Z",
  "counterparty": { "id": "...", "reputation": null },  // read-only pre-screen
  "delivery_format": "...",
  "raw": { /* source-specific, quarantined */ }
}
```

### 3.2 The three adapters

- **OKX adapter** — polls `okx.ai/tasks` via a **headless browser** (the board is JS-rendered and 403s plain fetchers; **no public REST API exists** — `[UNVERIFIED: MCP/API surface]`). Fit-scores, pre-screens counterparty reputation (read-only). Settlement + pay-per-call go through the **OKX Payment SDK** (`@okxweb3/app-x402-*`). Handles both **A2MCP** (standardized, pay-per-call) and **A2A** (negotiated scope/price).
- **Virtuals adapter** — wraps `acp-node-v2` `onNewTask`; drives the job-state machine as a **plain SDK inside our loop** (never GAME's planner). `[v1.5+]`
- **ATLAS API adapter** — an authenticated inbound endpoint so anyone can request work through ATLAS directly (the user's "responde a qualquer trabalho solicitado através do api dele"). Rate-limited, schema-validated, same canonical `Task` output.

**Adapter law:** an adapter is **read + normalize + settle-call only**. It has **no** signing authority — it emits intents to the rail's signing sub-domain like every other role. Adapters carry the parent's `tools:` allowlist discipline (e.g., `okx.read`, `okx.settle_intent` — never `okx.sign`).

---

## 4. Delta 3 — The Committee-Evaluator (≥2 + quorum)

**Neither rail provides ≥2 evaluators natively** (OKX uses a staked evaluator *network* only for disputes; Virtuals ACP names **one** `evaluatorAddress` per job). Your explicit requirement — *"pelo menos 2 agentes avaliam antes da entrega"* — is therefore a **feature ATLAS builds**, and it is the core quality differentiator.

The parent's single non-collapsible `Evaluator` gate (§4.5 gate 1) is upgraded:

- On `Ready for Evaluation`, the Orchestrator fans out the evidence packet to **N ≥ 2 independent evaluator sub-agents** — **different models and/or different prompts, no shared context, no visibility of each other's verdicts** (independence is the mechanism; a shared context would collapse them into one judge).
- Each returns a typed verdict: `score ∈ [0,1]` + `pass/fail` + cited reasons against `acceptance_criteria`.
- **Quorum rule (configurable, default strict):** deliver **only** if *all* evaluators pass **and** min score ≥ threshold. Any fail ⇒ `Rejected — return to Engine` with the union of reasons. A tie/uncertainty ⇒ escalate to Owner (HITL), never auto-pass (fail-closed, parent L14).
- Only after quorum: **Safety veto → Policy Gate → sign-off/settle**. The committee sits *inside* the parent's gate chain, not beside it.

**Rail mapping.** OKX A2A / ATLAS-API: the committee **is** the delivery-arbitration gate (OKX has none live). Virtuals: the committee is **our internal** pre-`submit()` gate; the buyer's single external evaluator is separate and downstream. This means ATLAS never ships work its own crew hasn't double-verified — regardless of what the rail requires.

---

## 5. Delta 4 — Engines (generalized Delivery)

The parent's one `Delivery` role becomes an **Engine Registry**. An *engine* is a Delivery module with its own bounded sub-crew, carrying the exact parent contract shape (frontmatter `tools:` allowlist + deontic Own/MustNot/MustDo/ExitState body). The Orchestrator matches a canonical `Task` → an engine (or **composes** several), and may **fabricate** a new engine (scaffold a new module under the same contract) when no existing one fits — this is the "investiga qualquer tipo de trabalho e fabrica engines" capability.

### 5.1 The two engine classes (the money boundary, restated)

- **Non-transacting engines** — produce an artifact + evidence packet, **touch no funds, hold no key**. `tools:` exclude every signing/treasury primitive. **These ship first.**
  - **Researcher** ← **v1 pilot** (smallest money surface; the whole v1 proof rides on it).
  - **Hacker** — pre-publication sterilization / OWASP hardening / secret-hunting (mirrors your `hacker` agent). Also our internal pre-push reviewer (§10).
  - **Cybersecurity** — audits, threat models, config review.
- **Transacting engines** — emit a **typed intent** only (`{swap|bridge|trade}`), **never sign**. The rail's Policy Gate + deterministic signer decide and execute. Personas/decision policy defined later in each engine's soul.
  - **Swap Token** · **Token Bridge** · **Trader / Druckenmiller** (persona authored in its own `neural_soul.md`, last, against a proven substrate).
  - **Wrap the connected `chaingpt` MCP** for on-chain primitives: `dex_1inch_quote`/`dex_build_swap_tx`, `bridge_quote`/`bridge_build_deposit_tx`, `agent_wallet_policy`, `x402_*`, `risk_token`/`risk_honeypot`. These produce *unsigned* txs/quotes → fed as intents into the Policy Gate. **chaingpt never signs for us** — its output is a proposal, subject to the same gate as any brain output.

### 5.2 Engine contract skeleton

```yaml
---
name: researcher
class: non-transacting            # non-transacting | transacting
model: opus
tools: [web.search, web.fetch, fs.read, fs.write_workspace]   # NO signing, NO funds
emits: deliverable + evidence_packet
---
# OWNS: the deliverable for a research/analysis Task + its evidence packet.
# MUST NOT: settle funds · accept its own work · post · alter the plan · call any *.sign.
# MUST DO: produce artifact meeting acceptance_criteria; attach sources; self-check; hand to Committee-Evaluator.
# EXIT STATE: Ready for Evaluation
```

Transacting engines swap the body for `emits: typed_intent` and add `tools: [chaingpt.*_quote, chaingpt.*_build_tx]` (build/quote only — **never** `*.submit`/`*.sign`).

---

## 6. Delta 5 — OKX rail specifics (safety-critical)

Overrides/additions to parent §5–§6 for the OKX rail:

- **Payment = x402 `exact`** (gasless EIP-3009) for v1. **Avoid MPP sessions**: their vouchers need an **EOA signer**, and ATLAS's smart-contract (ERC-6551/4337) wallet can't sign vouchers directly; `exact`/`upto` support smart-wallet verification. `[If we ever need MPP: add an EOA authorizedSigner delegate — design then, not now.]`
- **OKX "escrow" ≠ arbitration.** It's prepaid-deposit metering; **ATLAS gates delivery itself** (the Committee-Evaluator, §4). Never treat an OKX deposit as a delivery guarantee.
- **The SA API secret/passphrase are crown jewels.** `OKX_API_KEY`/`OKX_SECRET_KEY`/`OKX_PASSPHRASE` + Facilitator HMAC creds live in **KMS/OS-keyring, `0600`, never in brain context, never in the repo** (INV-2). Rotation + hot kill-switch (INV-10, INV-12).
- **TEE-signer reality.** The OKX Payment-SDK TEE signer is a **Phase-2 stub that errors today** `[UNVERIFIED: GA date]`. v1 signs via our own capped/expiring session key inside the OKX signing sub-domain, exactly as the parent's L3/§6.2 prescribes — the TEE wallet's protection is *custody of the master key*, not our per-tx signer. Blast radius = the Policy Gate cap regardless.
- **Skill install policy (from the security vet, `research/04`).** Install `okx/onchainos-skills` **project-scoped to ATLAS, NOT `-g` global**; put **policy gates in front of every fund-moving skill**; **verify the `Confirming → --force` human gate is not auto-satisfied under `--yes`** in the autonomous loop; pin/verify the `onchainos` Rust binary + `okx-pilot` proxy out-of-band; watch `okx-dapp-discovery` (runtime plugin installs). This *is* an INV-5 (closed tool belt) + INV-7 (pinned supply chain) enforcement.
- **Authority > key (the OKX truth).** The TEE stops key extraction but not stolen droplet credentials or prompt-injection that makes ATLAS *choose* to pay. Defenses: **treasury separation** (an operating wallet ATLAS can spend from, a treasury it *cannot* drain), conservative manual ceilings, the outflow tripwire (parent §6.2 L4/L5), hot kill-switch.

---

## 7. Delta 6 — Roster adaptation

Reuse the parent's 8 contracts (§4.3). ATLAS changes exactly three things and adds one:

| Change | From (parent) | To (ATLAS) |
|---|---|---|
| **Evaluator** | one independent Evaluator | **Committee-Evaluator** (≥2 independent, quorum) — §4 |
| **Delivery** | one Delivery role | **Engine-Dispatcher** + the Engine Registry (§5) |
| **Treasury** | one 6551 signer | **Rail-Treasury × 2** (OKX sub-domain + Virtuals sub-domain), never shared (§2.2) |
| **+ Intake-Adapter** | — | new read-only role per source (OKX / Virtuals / API), §3 |

Unchanged: **Orchestrator** (single planner, non-collapsible SPOF, mitigated by warm standby + plan_hash), **Job-Hunter**, **Research**, **Content/Social** (the sandboxed public voice — reuse the `@icloneframe` pattern), **Ops**, **Safety** (non-collapsible veto on every outbound byte, both rails), **Owner/HITL** (signed-token authority above threshold). The four non-collapsible gates — **Committee-Evaluator · Safety · Rail-Treasury · Owner** — never collapse on either rail.

---

## 8. The Minimum Provable ATLAS (v1) — OKX-first, aggressive

The thesis to prove is narrow and identical in spirit to the parent's: *a supervised, unattended, dual-rail-**ready** loop keeps ATLAS discovering and delivering real OKX work without stalling, ships nothing its own ≥2-evaluator committee hasn't passed, and cannot lose more than a hard-capped amount.*

**In scope (v1):**
1. **One rail:** OKX only. (Virtuals adapter is v1.5.)
2. **One engine:** **Researcher** (non-transacting → the money surface is *only* the pay-per-call receipt, never a signed value transfer out).
3. **The economic quartet + committee:** Orchestrator + Engine-Dispatcher(Researcher) + **Committee-Evaluator (≥2)** + Rail-Treasury(OKX) + Safety veto.
4. **The loop:** headless poll `okx.ai/tasks` → canonical `Task` → Orchestrator → Researcher → evidence packet → **≥2 evaluators quorum** → Safety → Policy Gate → deliver + settle via **x402 `exact`** → append event log → re-plan.
5. **Dry-run first** (`HARNESS_MODE=dry_run`, signer returns "would-settle" receipts, no funds) and pass the audit-trail + red-team gates **before one cent is live**.
6. **Then exactly one real sub-cent x402 job**, wallet capped so total drain is a coffee.
7. **Supervised daemon:** systemd, heartbeat, survives droplet reboot (Postgres state), **detects and escalates its own stall** (anti-dormancy triad).

**Out of scope (v1, refused gold-plating):** the Virtuals rail · transacting engines (Swap/Bridge/Trader) · cross-rail bridging · MPC/threshold signing (mitigated by the tiny cap — **hard gate before any non-trivial balance**) · the Forge pipeline/fleet sync · agent tokenization.

**Definition of proven (adapts parent §9):**
- ✅ ≥1 real OKX task discovered, delivered, and **settled** unattended;
- ✅ the full economic trail signed + replayable from Postgres;
- ✅ a forced kill mid-loop recovers with **no double-settle**;
- ✅ an injected malicious task brief is **refused by Safety** (zero signed movement, zero secret in egress);
- ✅ the Committee-Evaluator **rejects** a deliberately substandard deliverable (≥2-evaluator quorum works);
- ✅ a forced stall is **detected and escalated** within SLA.

If those hold, the thesis holds. If any fails, it's a demo, not a proof.

---

## 9. Repo & code structure (scaffold target)

```
atlas_corporation_okx_ai/
├── README.md                  # public, diagrams, MIT (after Hacker review)
├── LICENSE                    # MIT
├── .gitignore                 # security-first from commit 1 (env, keys, wallets)
├── docs/
│   └── 00_RESEARCH_SYNTHESIS.md
├── research/                  # 01–10 dossiers + _clones/ (gitignored)
├── harness/
│   └── ATLAS_HARNESS.md        # this file
├── soul/
│   └── neural_soul.md          # Fase 3 — → NFT metadata
├── src/                        # Fase 2 code (scaffolded next, after spec sign-off)
│   ├── brain/                  # Claude Agent SDK — Orchestrator + crew (NO keys)
│   ├── adapters/               # okx/ virtuals/ api/  (read + normalize + settle-call)
│   ├── engines/                # researcher/ hacker/ cybersecurity/ swap/ bridge/ trader/
│   ├── evaluator/              # committee fan-out + quorum
│   ├── signing/                # per-rail sub-domains: policy-gate/ signer/ lease/
│   ├── ledger/                 # Postgres event log + reconciliation
│   ├── safety/                 # L0 input firewall · L1 hooks · L2 policy engine · tripwire
│   └── runtime/                # systemd units · health · heartbeat · kill-switch
├── policy/
│   ├── owner-config.json       # caps, allowlists, kill-switch (PROTECTED)
│   └── engines.registry.json
└── ops/                        # droplet provisioning, hardening, KMS
```

**Stack (opinionated, parent §2.2):** Claude Agent SDK for the brain; **TypeScript/Node** for the OKX Payment SDK (`@okxweb3/app-x402-*`) and `acp-node-v2`; **Postgres** event log; **systemd** on the dedicated droplet; OKX skills **project-scoped**; `chaingpt` MCP for transacting-engine primitives (build/quote only). **Never an LLM in the signing path.**

---

## 10. The 12-day plan (→ 17 Jul 2026)

| Days | Milestone |
|---|---|
| **D1–2** (now) | Spec sign-off; scaffold `src/` tree; carve ATLAS's **isolated slice on the shared production droplet** (`atlas` Unix user + `/opt/atlas/` `0750` + own systemd units + own secrets scope + own Postgres role/DB; **verify iCLONE/VEGETA cannot read ATLAS secrets**); OKX Agentic Wallet created (email+OTP) + scoped skill install + Payment-SDK spike (x402 `exact` "would-settle" in dry-run). |
| **D3–5** | Brain (Orchestrator + Researcher engine) over the event log; OKX intake adapter (headless poll → canonical `Task`); Committee-Evaluator (≥2 + quorum). Full loop **in dry-run**, no funds. |
| **D6–7** | Safety L0–L2 + hooks + outflow tripwire; Policy Gate (caps/allowlist/schema); **Gate A–C** (static assertions, policy property tests, red-team corpus) green. |
| **D8** | **Gate D canary:** one real **sub-cent** x402 job on X Layer, capped key, chaos + kill-switch + stall drills. |
| **D9** | **Hacker engine review** of the whole repo (secrets, git history, headers, deps) → fixes. |
| **D10** | Public GitHub `atlas_corporation_okx_ai` (MIT) with README + diagrams; list ATLAS as **ASP** on `okx.ai` (A2MCP + A2A). |
| **D11** | Fase 3 `neural_soul.md` → you mint ATLAS CORP iNFT, wire `metadata.ai_soul`, give me `tokenId` + OpenSea link. |
| **D12** | Buffer / harden / dry-run the Virtuals adapter on Base Sepolia `84532` (v1.5 seed). |

> This is aggressive but the surface is deliberately tiny: **one rail, one non-transacting engine, capped downside.** Everything risky (transacting engines, Virtuals, bridging, MPC) is explicitly *after* the proof.

---

## 11. Build-blocking open items (from research)

Carried from `docs/00_RESEARCH_SYNTHESIS.md` §8 — must be resolved with your OKX/Virtuals access before the dependent step:

- **OKX:** is there *any* task-discovery API/MCP (else headless-browser is mandatory)? · marketplace take-rate / Broker fee · escrow + dispute **GA date** · exact settlement asset per x402 call · does OKX accept our BYO wallet vs mandating its TEE wallet · Payment-SDK **TEE-signer GA** · the `Confirming`-gate behavior under `--yes`.
- **Virtuals `[v1.5]`:** exact per-job take-rate · V2-vs-V3 graduation · headless OAuth (`--json`) on the droplet · Linux keychain backend.
- **Needs your action:** OKX account + SA API key/passphrase (KYC for a settlement-enabled key `[UNVERIFIED]`); droplet = **shared production droplet, per-agent isolation** (confirmed — reuse box, `atlas` user/folder/secrets/DB isolated); confirm the sub-cent canon budget for the v1 real job.

### Note on the shared-box tradeoff
Reusing the shared production droplet (cost decision) is safe **only** with the five isolation layers above (Unix user · `/opt/atlas/` `0750` · systemd units · secrets `0600` readable by `atlas` only · separate Postgres role/DB). The box is already hardened (root off, rotated). **Before the v1 real x402 job, an isolation-verification check runs in Gate A**: assert `iclone`/`vegeta` users cannot read `/opt/atlas/` or ATLAS's secret store. If that check fails, the real job does not run.

---

## 12. Crew binding & the ATLAS Oracle

### 12.1 The crew is the parent's materialized crew
ATLAS does not invent a roster — it **binds the parent Blueprint crew**
(`~/Desktop/HARNESS_ENGINE/blueprint/crew/`), where each role is the fusion of a proven CLONE
FRAME / HigherMind agent, keeping the role name (`../../HARNESS_ENGINE/blueprint/CREW.md`):

| ATLAS role | Blueprint crew (inherited mind) | ATLAS delta |
|---|---|---|
| Orchestrator | `orchestrator.md` (**Rider** + iCLONE conductor) | + the Oracle routing faculty (§12.3) |
| Job-Hunter | `job-hunter.md` (**Vegeta**) | fans over **both** intakes (OKX Task Hall + ACP) |
| Research | `research.md` (**Doctor** + **Architect** + `opensource-harvest`) | prices per rail; harvests engine implementations |
| Delivery | `delivery.md` (**Engineer** + **Designer** + **Ingestor**) | **generalized into the Engine Registry** (§5) |
| Evaluator | `evaluator.md` (**Akita** + **QA** + **Validator**) | **upgraded to the Committee-Evaluator** (≥2, quorum, §4) |
| Treasury | `treasury.md` (**iCLONE swap/bridge motor**) | **× 2 rail sub-domains** (OKX + Virtuals), never shared (§2.2) |
| Content | `content.md` (**iCLONE public voice** + Designer) | lists ATLAS as an ASP on `okx.ai` + provider on ACP |
| Ops | `ops.md` (droplet + **Ingestor**) | isolated `atlas` slice on the shared production droplet (§0) |
| Safety | `safety.md` (**Hacker**) | screens **both** rails' payloads; the `Hacker` engine reuses it (§5) |

The engines map to the same minds: **Researcher** engine ← Research/Doctor + `opensource-harvest`;
**Hacker** + **Cybersecurity** engines ← Safety/Hacker + Validator; **Swap** + **Bridge** engines ←
Treasury's swap/bridge motor (chaingpt build/quote → intents); **Trader** engine ← the Macro
(Druckenmiller) + Systematic (Seykota) modes from the neural-soul architecture, authored last.

### 12.2 The soul
ATLAS's identity is sealed in `../soul/neural_soul.md`, written on the canonical four-lobe
architecture. The soul and this harness are two views of one agent: the soul is *who ATLAS is*
(and the runtime distillation that becomes `metadata.ai_soul` on the iNFT); this spec is *how the
crew and gates run it safely on two rails.* The soul encodes the load-bearing invariants verbatim
(no-LLM-in-signing-path, owner-gated automation, the four gates, dual-rail hands) so the character
can never contradict the machine.

### 12.3 The Oracle — ATLAS as cross-Harness router
ATLAS is **more than a coordinator**: it is the CLONE FRAME economy's **Oracle** — given a job, it
knows which Harness should do it. This is a first-class faculty, soul-encoded (Occipital — "see the
whole multiverse of Harnesses as one map") and harness-realized as a **routing policy** on the
canonical `Task`:

```
route(Task) →   ENGINE      (in-house: Researcher | Hacker | Cybersecurity | Swap | Bridge | Trader,
                             or a fabricated one)                              ← default
            |   RAIL         (OKX vs Virtuals — chosen by the economics of THIS task:
                             settlement asset, gas, fee, deadline, counterparty reputation)
            |   SIBLING      (hand off to another Harness — iCLONE | VEGETA | GOKU | any minted
                             after them — when that agent's soul/skill is the better hand)
```

The routing decision is made by the Orchestrator with Oracle vision, is **logged as an event**
(auditable), and is **subject to the same gates** — a route to a sibling Harness or a cross-rail
action is an outbound action Safety screens and (above threshold) the Owner approves. The Oracle
never routes to move volume or to manipulate a market; it routes to place real work in the hand
that delivers it best. As more Harnesses are minted, ATLAS's map grows — the router is the one
role whose value **compounds with the size of the fleet.**

---

*ATLAS is the parent Harness, made real, on two rails, delivering through engines — with a ≥2-evaluator committee we build because neither market gives it to us, a crew that is the parent's real agents fused into their roles, and an Oracle that knows, across the whole multiverse of Harnesses, which one a job belongs to. Prove it on one rail, one engine, capped downside. Hold the parent's standard like it is load-bearing, because it is.*

# ATLAS CORP — Dual-Listing Viability + Harness/Orchestrator Architecture

> **Report 10 — Synthesis & Architecture.** Two parts. Part A: can one agent identity operate on BOTH OKX X Layer OS (OnchainOS / okx.ai) AND Virtuals Protocol at once? Part B: the concrete ATLAS harness/orchestrator architecture, reusing the existing `HARNESS_ENGINE` design and reconciling OKX + Virtuals intake into one loop.
>
> **Rigor convention.** Part A states only verified facts (each backed by a fetched URL). Anything inferred is prefixed `[UNVERIFIED]`. Part B labels every element as **[REUSED — HARNESS_ENGINE]** or **[NEW — proposed for ATLAS]**. Platform behavior is never invented.
>
> Date: 2026-07-05. Author standard: world-class, security from commit 1, no-LLM-in-signing-path.

---

## Sources fetched (URLs + local files read)

**Local files read (canonical, reused):**
- `~/Desktop/HARNESS_ENGINE/HARNESS_ENGINE.md` — the ~9k-word master spec (the Forge/Harness design).
- `~/Desktop/HARNESS_ENGINE/README.md` — index of the 10 research dossiers + hard rules.
- `~/Desktop/HARNESS_ENGINE/research/05-orchestration-roster.md` — the economic roster + operating-loop DAG (read in full for role contracts).
- `~/.claude/cloneframe_context_claude.md` — CLONE FRAME canonical context (iNFT anatomy, `neural_soul.md` architecture reference, ACP agents iCLONE and VEGETA, ERC trust stack, Base/Irys/Virtuals rails).

**Web sources fetched / searched (Part A — OKX):**
- OKX — Agent Payments Protocol (APP): https://www.okx.com/en-us/learn/agent-payments-protocol
- OKX — OKX AI marketplace: https://www.okx.com/en-us/learn/okx-ai
- OKX — Agentic Wallet overview (docs): https://web3.okx.com/onchainos/dev-docs/home/agentic-wallet-overview
- OKX — Agentic Wallet learn page: https://www.okx.com/en-us/learn/agentic-wallet
- OKX — OnchainOS AI toolkit for developers: https://www.okx.com/en-us/learn/onchainos-our-ai-toolkit-for-developers
- OKX — `okx/onchainos-skills` (GitHub, MIT): https://github.com/okx/onchainos-skills
- OKX — API Agreement (ToS): https://www.okx.com/en-us/help/okx-api-agreement
- OKX — Developer Portal docs: https://web3.okx.com/onchainos/dev-docs/home/developer-portal
- CoinDesk — "OKX jumps into AI agent race with new OnchainOS toolkit" (2026-03-03): https://www.coindesk.com/tech/2026/03/03/okx-jumps-into-ai-agent-race-with-new-onchainos-toolkit
- BanklessTimes — OKX AI agents earn/build reputation (2026-06-30): https://www.banklesstimes.com/articles/2026/06/30/okx-ai-lets-agents-earn-and-build-on-chain-reputation/

**Web sources (Part A — Virtuals):**
- Virtuals Whitepaper — ACP concepts, terminologies & architecture: https://whitepaper.virtuals.io/acp/acp-concepts-terminologies-and-architecture
- Virtuals Whitepaper — ACP v2: https://whitepaper.virtuals.io/acp-product-resources/introducing-acp-v2
- Privy Docs — Agentic wallets: https://docs.privy.io/recipes/agent-integrations/agentic-wallets
- Virtuals — `Virtual-Protocol/acp-cli` (GitHub): https://github.com/Virtual-Protocol/acp-cli

**Web sources (Part B — modern patterns):**
- LangGraph supervisor vs swarm tradeoffs (Focused/DEV): https://focused.io/lab/multi-agent-orchestration-in-langgraph-supervisor-vs-swarm-tradeoffs-and-architecture
- Databricks — Multi-agent supervisor architecture at scale: https://www.databricks.com/blog/multi-agent-supervisor-architecture-orchestrating-enterprise-ai-scale
- DAG orchestration for multi-agent AI (Bhattacharya, Medium): https://santanub.medium.com/directed-acyclic-graphs-the-backbone-of-modern-multi-agent-ai-d9a0fe842780
- Multi-Agent-as-Judge (arXiv 2507.21028): https://arxiv.org/abs/2507.21028
- "AI Agents in Cryptoland: Practical Attacks and No Silver Bullet" (eprint 2025/526): https://eprint.iacr.org/2025/526.pdf
- BlockEden — "Why AI Agents Shouldn't Hold Private Keys" (Coinbase agentic wallet): https://blockeden.xyz/blog/2026/04/11/coinbase-agentic-wallet-ai-agent-private-key-security/
- Cobo — Agentic Wallet / enforceable autonomy policy engine: https://www.cobo.com/post/ai-agent-wallet-complete-guide
- Doppler — DigitalOcean secrets management: https://docs.doppler.com/docs/digitalocean
- DigitalOcean — multi-agent AI system with Docker Agent: https://www.digitalocean.com/community/tutorials/how-to-build-multi-agent-ai-system-docker-agent-digitalocean

---

## PART A: Dual-listing viability (findings + conflict analysis)

**Verdict up front: NO hard conflict. One ATLAS agent identity CAN operate on both OKX OnchainOS/okx.ai and Virtuals ACP simultaneously.** The two platforms are architecturally parallel, not mutually exclusive. Below, the four dimensions the mandate asked for, each backed by a verified source.

### A.1 — Wallet / identity conflict — NONE (they are separate stacks on separate chains)

The two platforms do not share, and do not contend for, the same wallet or key. Each brings its own smart-wallet + delegated-signer model:

| Dimension | **OKX OnchainOS / okx.ai** | **Virtuals ACP** |
|---|---|---|
| Wallet type | **OKX Agentic Wallet.** "Self-custodial, TEE-secured, session keys for autonomous signing. 20+ chains." Key is generated/stored/signed *inside a TEE*: "No one can touch the private key, not even OKX." (okx.com/learn/agentic-wallet, agentic-wallet-overview docs) | **Smart Wallet / EOA-based non-custodial.** "Private keys stored in OS keychain (CLI) or managed by Privy (SDK)." Signer is delegated: "the agent's on-chain identity (wallet address) is separated from the key that signs transactions." (whitepaper.virtuals.io/acp) |
| Identity anchor | "Every agent on OKX AI operates under a single onchain identity, managed through the OKX Agentic Wallet." Created from "an email address." (okx.com/learn/okx-ai) | "The Agent Wallet is the on-chain anchor for every agent on the EconomyOS network" + Agent Card + Agent Email + optional Token; plus **ERC-8004 agentId** (per local context: iCLONE and VEGETA are already registered). |
| Settlement chain | **X Layer** (OKX's own zero-gas L2). "Zero gas. Sub-cent viable at scale." APP is "designed to work across every chain." (okx.com/learn/agent-payments-protocol) | **Base (8453)**, USDC escrow. "receive USDC from completed ACP jobs." (whitepaper.virtuals.io) |
| Payment rail | **x402** pay-per-call + escrow (escrow "coming soon"): "Quote, escrow, meter, settle, dispute." (APP page; CoinDesk 2026-03-03) | **ACP job/escrow lifecycle** (= ERC-8183): REQUEST → NEGOTIATION → escrow lock → TRANSACTION → EVALUATION → release. (local context §5.1) |
| Access method | **API keys** (`OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE`) via the OKX Developer Portal; skills exposed as a **native MCP server** (`okx/onchainos-skills`, MIT). Chains include "XLayer, Solana, Ethereum, Base, BSC, Arbitrum, Polygon." | **`acp-cli` / `@virtuals-protocol/acp-node`** SDK; signer registered per agent; Privy-managed. (github.com/Virtual-Protocol/acp-cli) |

**Conclusion:** These are two independent identity+wallet systems. OKX's identity is a TEE-held session-key wallet reached via API/MCP; Virtuals' identity is a Privy/keychain smart wallet reached via `acp-node`. **They do not overwrite, lock, or compete for each other's keys.** ATLAS holds two wallets (one per platform) under one *logical* identity — exactly as a business holds one identity but multiple bank accounts.

`[UNVERIFIED]` Whether OKX will *also* honor an externally-supplied key/address (bring-your-own-wallet) instead of only its TEE-generated wallet is not stated in the fetched docs. Plan for OKX providing the wallet; do not assume you can point OKX at the Base 6551 treasury.

### A.2 — Listing / approval / ToS conflict — NONE found; both explicitly non-exclusive

- **OKX ToS is explicitly non-exclusive.** The OKX API Agreement grants "a **limited, revocable, non-exclusive, non-transferable, non-sublicensable license** to access and use the API Services." It permits users to "connect to, integrate with, or operate through their own LLMs, Authorized AI Agents, or automation tools." **Non-exclusive is the load-bearing word: OKX does not require the agent to be OKX-only.** (okx.com/help/okx-api-agreement)
- **No exclusivity clause on the OKX marketplace listing side.** The okx.ai marketplace description — "Developers list AI agents, define services and pricing, and earn automatically when work is completed" — contains no whitelisting, KYC-gating, or "don't operate elsewhere" requirement in the fetched pages. `[UNVERIFIED]` A full production ToS review of the okx.ai *marketplace* terms (distinct from the *API* agreement) should be done before listing; the API agreement is verified non-exclusive, the marketplace-specific listing terms were not fully enumerated in the fetched content.
- **Virtuals ACP has no exclusivity clause** in the fetched whitepaper/architecture docs — "no terms-of-service language or exclusivity clauses restricting agents from operating on other marketplaces." (whitepaper.virtuals.io/acp)
- **The HARNESS_ENGINE hard rule is a positioning rule, not a platform ban.** The existing spec forbids *comparing to / competing with* Virtuals — it does not forbid also operating on OKX. Operating on OKX X Layer is orthogonal to that rule and does not violate it, provided ATLAS never markets itself as "OKX instead of Virtuals" or vice-versa.

### A.3 — Does registering on one block/complicate the other? — NO

- OKX onboarding = generate API keys at the Developer Portal + (optionally) create the TEE Agentic Wallet from an email. This touches nothing on Base and creates no on-chain lock that Virtuals reads.
- Virtuals onboarding = `acp-cli` auth → create smart wallet (Privy) → register signer → optionally ERC-8004 `register`. This touches nothing on X Layer.
- The **ERC-8004 identity registry** (Base `0x8004A169…`) is shared *conceptually* across the agent economy but is Base-native; OKX's identity is X-Layer/TEE-native. Registering ERC-8004 does not consume or conflict with an OKX identity. `[UNVERIFIED]` Whether OKX reads/writes ERC-8004 reputation is not established in the fetched docs — treat OKX reputation and Virtuals ERC-8004 reputation as **separate ledgers** (see A.4).

### A.4 — Reputation / economic separation — SEPARATE by design (this is a feature, not a bug)

- **OKX has its own shared reputation layer:** "reputation accumulates in one place, regardless of how the work was done or how it was paid for" — but "one place" means *within OKX AI*. (okx.com/learn/okx-ai)
- **Virtuals writes reputation to the ERC-8004 credential / agent card on Base** per completed ACP job. (local context §5.2)
- These are **two independent reputation ledgers.** A job settled on OKX X Layer does **not** write Virtuals ERC-8004 reputation, and vice-versa. `[UNVERIFIED]` No cross-platform reputation bridge is documented in either source.
- **Implication for ATLAS:** reputation must be *bootstrapped separately on each platform.* This directly informs sequencing (A.5): you cannot carry OKX reputation into Virtuals or the reverse, so the order you build reputation in matters only for *where you want early traction*, not for unlocking the other.

### A.5 — Summary conflict matrix

| Potential conflict | Status | Evidence |
|---|---|---|
| Same wallet must serve both | **No conflict** — separate wallets, separate chains (X Layer TEE vs Base Privy) | OKX agentic-wallet docs; Virtuals ACP arch |
| One registration blocks the other | **No** — orthogonal onboarding, different chains | OKX Dev Portal; acp-cli |
| ToS exclusivity | **No** — OKX license is "non-exclusive"; Virtuals has no exclusivity clause | OKX API Agreement; Virtuals whitepaper |
| Reputation carries over | **No** — separate ledgers (OKX shared-identity vs ERC-8004) | okx.com/learn/okx-ai; local §5.2 |
| Economic double-spend risk across platforms | **Managed, not a platform conflict** — ATLAS must not let one loop double-sign; solved by the fenced-wallet lease **per wallet** (Part B) | HARNESS_ENGINE §8 |
| Positioning rule (never compete w/ Virtuals) | **Not triggered** by dual-listing; it's a marketing rule, respected as long as ATLAS never frames one platform against the other | HARNESS_ENGINE hard rules |

---

## PART A: Sequencing recommendation

**The user's fallback (OKX first → approved/listed → then Virtuals via CLI) is CONFIRMED as the correct sequence — but for a *stronger* reason than "avoid conflict," because there is no hard conflict to avoid.** Refined rationale:

**Recommendation: Build and list on OKX OnchainOS / okx.ai FIRST, then add Virtuals ACP second — but treat them as two parallel intake adapters into ONE harness, not two separate agents.**

Why OKX first (in priority order):

1. **Lower money-at-risk to prove the loop.** OKX X Layer is **zero-gas** and supports **sub-cent x402 pay-per-call** settlement. The HARNESS_ENGINE "Minimum Provable Harness" wants the first live job to cost "a coffee, not a story." x402 micropayments on a zero-gas chain are the *cheapest possible* place to prove `intake → investigate → build → dispatch → 2× evaluate → deliver → settle` end-to-end with real money. Virtuals ACP costs real Base gas (ETH) per job and ~5% protocol fee per side — a more expensive proving ground.
2. **Faster, simpler onboarding.** OKX = API keys + MCP skills (`okx/onchainos-skills`, one `npx skills add` command) + email-created TEE wallet. No on-chain contract dance to earn the first reputation point. Virtuals requires smart-wallet creation, signer registration, `acp-cli` v2, ERC-8004 registration, and the version-pin discipline (`acp-cli`/SDK pinned; never auto-update — a known trade-bug incident is on record in local memory).
3. **Reputation is separate anyway (A.4),** so there is no penalty for building OKX reputation first — it costs nothing on the Virtuals side and buys early, cheap traction on a rail where micropayment volume is easy to generate legitimately.
4. **The TEE + policy-engine model on OKX is *already* the security posture HARNESS_ENGINE mandates** (no-LLM-in-signing-path, capped session keys, policy engine). Building on OKX first lets ATLAS validate its deterministic Policy Gate against a platform whose native design already enforces "the agent can only issue signed transactions for amounts and addresses within its configured authorization policy" — a friendly first environment.

Then Virtuals second:

5. Virtuals is where CLONE FRAME already lives (iCLONE and VEGETA, the whole ERC trust stack, the `neural_soul.md` genome). Adding it second means the harness is already proven, and Virtuals becomes a *second intake adapter* feeding the same investigate→build→dispatch→evaluate→deliver core — reusing the entire HARNESS_ENGINE ACP design that is already specced.

**Refinement / caution flags on the fallback:**
- Do **one** validation change to the plan: even though there is no hard conflict, **still list OKX first** — not to dodge a conflict, but because it is the cheaper, faster, lower-risk place to *prove the harness loop with real money* before touching Base gas.
- Register ATLAS's *canonical* long-term identity thoughtfully: the ERC-8004 agentId on Base is the durable, cross-ecosystem identity anchor (75k+ txs, shared registry). Do OKX first for *traction and proof*, but do not skip ERC-8004 on Base — it is the identity that outlives any single marketplace. `[UNVERIFIED]` whether OKX will surface/consume that ERC-8004 id.
- **Never** market ATLAS as a Virtuals competitor at any point in the sequence — the positioning rule holds throughout.

---

## PART B: Existing HARNESS_ENGINE design (summary of what's already specced)

**This is REUSED wholesale. ATLAS is not a new architecture — it is HARNESS_ENGINE's Harness, generalized to a second intake rail (OKX) and a broader engine catalog.** What the master spec already provides:

**Two objects.** **[REUSED]** The **Forge** (the machine: `Ingest → Compile → Provision → Validate → Deploy → Operate ⇄ Sync → Retire`) that manufactures **Harnesses** (the product: one supervised crew running one iNFT as an autonomous economic actor). ATLAS is *a Harness* (or a fleet of them) forged by the Forge.

**The runtime architecture (the load-bearing invariant).** **[REUSED]** A **stateless brain over a durable append-only event log (Postgres)**, split into two trust domains:
- **BRAIN domain (assume-compromised):** Claude Agent SDK Orchestrator + crew. Reads job context, decides, drafts deliverables. **Never holds a key, RPC, or signing API.** Emits *typed intents* only.
- **SIGNING domain (deterministic, no LLM):** a worker maps intent → one SDK call, through a **Policy Gate** (schema · spend cap · offering∈catalog · price∈band · recipient allowlist · risk gate), then a **Signer** with a capped, expiring session key. `PASS` only.
- **The invariant:** *No LLM in the signing path.* A jailbroken brain can only ever *propose*.

**The roster — eight non-collapsible-where-it-matters contracts.** **[REUSED]** Orchestrator (opus, sole planner) · Job-Hunter (sonnet, demand discovery) · Research (opus, pricing/thesis) · Delivery (opus, the value producer) · **Evaluator (opus, independent gate)** · Treasury/6551 (sonnet, the only money authority) · Content/Social (sonnet) · Ops (sonnet) · **Safety (opus, veto sidecar)** · Owner/HITL (human). Topology = hierarchical orchestrator-workers + a blackboard (`plan.yml`, single writer) + an evaluator-optimizer inner loop on the money path.

**The four non-collapsible gates.** **[REUSED]** Evaluator (no settlement without independent accept) · Safety (veto every outbound action, fail-closed) · Treasury (deterministic money policy) · Owner (HITL above threshold).

**The five-layer safety architecture + 14 invariants + 4 Stop-the-Line test gates.** **[REUSED]** Input firewall (L0) → guardrail hooks (L1) → deterministic Policy Engine / Safety veto (L2) → signing worker (L3) → key custody + on-chain outflow tripwire (L4/L5). INV-1…14 (brain powerless over funds; no key in context; hard caps in two places; allowlist-only; closed tool belt; signed hash-pinned policy; pinned supply chain; fail-closed; everything logged; kill-switch + dead-man's-switch; no hot treasury key; owner override survives host compromise; dual-control for limit changes; non-collapsible Safety). Gates A (static) · B (policy property tests) · C (red-team) · D (canary/dry-run).

**The economic rails.** **[REUSED]** ACP job lifecycle (= ERC-8183), ERC-8004 identity, ERC-6551 treasury, the `acp-cli` version-pin discipline, the escrow model, the 5% fee reality, the hot-key SPOF and the 5.35 USDC incident lesson.

**The anti-dormancy thesis.** **[REUSED]** "No fresh living plan = no work" as a hard precondition; the anti-dormancy triad as a first-class signal (plan-freshness · economic throughput · last-outbound-action age).

**The build plan.** **[REUSED]** Adopt by subtraction: Minimum Provable Harness = one agent, one skill (find→bid→deliver→settle one real job), dry-run/testnet first, then one capped mainnet job.

**What HARNESS_ENGINE does NOT yet cover (the ATLAS delta, all [NEW]):**
- **OKX OnchainOS / X Layer / x402 as a second intake + settlement rail.** The spec is Virtuals-ACP-only.
- **A generalized *engine catalog*** (Hacker, Cybersecurity, Researcher, Swap, Bridge, Trader) as pluggable capabilities. HARNESS_ENGINE has "skills the owner unlocked" as a concept but does not enumerate these six.
- **The Trader engine's `neural_soul.md`** (Druckenmiller-style) as a concrete soul.
- **The "Atlas Corporation" framing** — ATLAS as a supervisor running a *company* of engines/workers, spanning two marketplaces.

---

## PART B: Proposed ATLAS architecture (unified across OKX + Virtuals)

**The one-paragraph architecture.** ATLAS is a single HARNESS_ENGINE Harness whose *front door* is widened from one intake rail to two. A thin **Intake Adapter layer** normalizes both an **OKX APP/x402 task** (X Layer, MCP skills, TEE session-key wallet) and a **Virtuals ACP job** (Base, `acp-node`, Privy signer) into one canonical internal `Task` object dropped on the Orchestrator's blackboard. From there, the *existing* HARNESS_ENGINE loop runs unchanged: the Orchestrator writes a living plan, the Investigate phase (Research + Job-Hunter) prices and validates the opportunity, the Orchestrator selects and configures the right **Engine** (Hacker / Cybersecurity / Researcher / Swap / Bridge / Trader) as the Delivery capability, dispatches bounded worker subagents along a **task-DAG** (topological waves, parallel within a wave), collects an evidence packet, and then forces the deliverable through **≥2 independent Evaluators** plus the non-collapsible **Safety veto** before any settlement. Settlement is routed back through the *originating* Intake Adapter to the *correct wallet* (OKX TEE session key on X Layer, or Base 6551 via the Virtuals worker) — with the deterministic Policy Gate and a **per-wallet fenced lease** guaranteeing no-LLM-in-signing-path and no double-sign across the two rails. Everything is an append-only event in Postgres; the loop is a supervised systemd daemon that never stalls silently.

### B.1 — The unified intake → deliver loop (ASCII)

```
        ┌───────────────────── INTAKE ADAPTERS  [NEW] ──────────────────────┐
  OKX APP / x402 task ─▶ okx-adapter ─┐                                       │
   (X Layer, MCP skills, TEE wallet)  ├─▶ canonical Task {source, budget,     │
  Virtuals ACP job ─▶ acp-adapter ────┘        offering, deadline, wallet_ref}│
   (Base, acp-node, Privy signer)             │  (source-tagged, never mixed) │
        └───────────────────────────────────────────────────────┬───────────┘
                                                                 ▼
   OWNER ──[H]──▶  ORCHESTRATOR (opus, sole planner)  ◀── Job-Hunter (candidates, per-rail)
     ▲                    │ plan.yml + plan_hash + acceptance criteria + chosen ENGINE
     │[H] owner-gate      ▼
     │             INVESTIGATE:  Research (pricing/cost-to-serve/thesis)   [REUSED]
     │                    │  select engine from catalog ▼
     │             BUILD ENGINE:  configure Hacker | Cyber | Researcher | Swap | Bridge | Trader
     │                    │  emit task-DAG (topological waves)  [NEW: DAG dispatch]
     │                    ▼
     │             DISPATCH:  bounded worker subagents ── parallel within wave ── sequential across waves
     │                    │  evidence packet
     │                    ▼
     │             ┌─── ≥2 EVALUATORS (independent, no shared state) ───┐   [NEW: ≥2, was 1]
     │             │  Evaluator-A (correctness vs acceptance criteria)  │
     │             │  Evaluator-B (independent re-derivation / adversarial) │
     │             │  [optional Evaluator-C tie-break on disagreement]  │
     │             └───────────────┬───────────── reject ──▶ back to Dispatch
     │                     both-accept │
     │                             ▼
     │             SAFETY [S] veto (fail-closed; every outbound byte)   [REUSED]
     │                             │ CLEAR
     │                             ▼
     │             POLICY GATE [$] (schema·cap·allowlist·chain·risk·offering∈catalog) [REUSED]
     │                             │ PASS  (per-rail: X Layer OR Base)
     └── owner-gate [H] (amount ≥ threshold OR new counterparty) ─deny─▶ hold (silence is safe)
                                   │ approve (signed token)
                                   ▼
             SIGNER (deterministic, capped session key) ─▶ settle via ORIGINATING adapter
               OKX: x402 / TEE session key on X Layer  |  Virtuals: acp-node → Base 6551
                                   │ txhash / receipt
                                   ▼
             append-only event log (Postgres) ─▶ per-rail reputation ─▶ Grow ─▶ re-plan
   OPS ╌╌▶ health/lease/dormancy-triad ╌╌▶ ORCHESTRATOR   (reactive)
```

### B.2 — The four widenings vs HARNESS_ENGINE (each labeled)

1. **Intake Adapter layer [NEW].** Two thin, deterministic adapters normalize OKX and Virtuals events into one `Task`. Each `Task` is **source-tagged** and carries a `wallet_ref` so settlement always returns to the *originating* rail/wallet. The adapters run in the worker/signing domain (they touch platform SDKs), never in the brain. The brain sees only the normalized `Task` — it does not know or care which marketplace it came from. This is the single structural addition that makes ATLAS dual-rail while keeping the entire proven core untouched.

2. **≥2 Evaluators [NEW — strengthened from HARNESS_ENGINE's single Evaluator].** HARNESS_ENGINE specs *one* non-collapsible Evaluator. ATLAS mandates **two independent Evaluators** (research-backed: multi-agent-as-judge reduces single-judge bias, arXiv 2507.21028) plus the Safety veto — i.e., **three independent checks** on the money path. Evaluator-A grades correctness vs acceptance criteria; Evaluator-B re-derives independently / runs an adversarial pass; on disagreement, an Evaluator-C tie-breaks or the item escalates to Owner. **Both must accept** before Safety even sees the action. Evaluators share no state and cannot see each other's verdicts (independence is the mechanism).

3. **Engine catalog as Delivery capability [NEW].** HARNESS_ENGINE's abstract "Delivery role + unlocked skills" becomes a concrete, versioned **catalog of six engines** (see next section). The Orchestrator *selects* one per task from the plan; the engine defines the task-DAG and the worker subagents. Engines are Skills (progressive disclosure) with hard tool allowlists — the Trader engine can read markets and quote, but *cannot sign* (only the Signer signs).

4. **Task-DAG dispatch [NEW — makes the roster explicit].** The Orchestrator compiles each engine run into a DAG: nodes = subtasks, edges = dependencies, executed in topological **waves** (parallel within a wave, sequential across waves). This is the modern dispatch pattern (DAG plan-execute-replan) mapped onto the existing orchestrator-worker roster. The Replanner path = HARNESS_ENGINE's "re-plan" trigger.

### B.3 — Why this topology (not swarm)

**[REUSED reasoning from HARNESS_ENGINE §4.3, corroborated by 2025 research.]** A wallet is on the wire, so a single auditable money-decision locus beats swarm throughput; the supervisor/orchestrator pattern is "more accurate because routing is its only job" and "easier to reason about with one routing node and clear control flow" (LangGraph tradeoffs). One re-plan owner beats N racing planners contending on a nonce. Pure swarm is rejected — same conclusion the master spec reached.

---

## PART B: The 6 engines as modules

Each engine is a **Skill module [NEW]** the Orchestrator selects as the Delivery capability for a given `Task`. Each has: a hard **tool allowlist** (least privilege as data — HARNESS_ENGINE convention), a **task-DAG template**, a **≥2-evaluator rubric**, and a **money posture** (whether it ever touches the Policy Gate/Signer). **No engine ever holds a key or signs — the Signer signs, always.**

| Engine | What it does | Tool allowlist (brain-side, read/compute only) | Money posture | Task-DAG sketch | Evaluator rubric |
|---|---|---|---|---|---|
| **Hacker** | Offensive security research, exploit discovery, bug-bounty-style deliverables | code read, sandboxed exec, web recon (read-only), report writer | **Non-transacting.** Never moves funds; delivers a report. Only settlement is receiving payment. | recon → surface-map → PoC-in-sandbox → writeup | A: does the PoC reproduce? B: is it in-scope + responsibly disclosed + no live exploitation? |
| **Cybersecurity** | Defensive audits, hardening, OWASP Top 10, secret-scan, dependency audit | repo read, gitleaks/SBOM tools, config lint, report writer | **Non-transacting.** | inventory → scan (secrets/deps/headers) → severity-rank → remediation plan | A: findings verifiable + severity correct? B: no false-negatives on the seeded corpus? |
| **Researcher** | Deep research, market/intel reports, due diligence (the iCLONE core skill) | web fetch (read-only, sanitized as DATA), doc synthesis, citation checker | **Non-transacting.** | decompose question → parallel source-gather (wave) → synthesize → cite-check | A: claims sourced + no fabrication? B: independent re-derivation of key claims agrees? |
| **Swap Token** | Best-execution token swaps | quote APIs (OKX DEX skill / 1inch-class), route compare, slippage calc | **Transacting.** Emits a *typed swap intent* → Policy Gate (slippage bound, allowlist, cap) → Signer. Brain never signs. | quote-compare (wave) → best-route → **intent** → Policy Gate → Signer | A: route is best-of-N + slippage within bound? B: recipient/token allowlisted, amount ≤ cap, no honeypot? |
| **Token Bridge** | Cross-chain asset moves (incl. X Layer ↔ Base, the dual-rail bridge) | bridge quote APIs, chain allowlist check, fee/time estimator | **Transacting.** Typed bridge intent → Policy Gate (chain∈allowlist, cap, destination allowlist) → Signer. | quote bridges (wave) → select → **intent** → Policy Gate → Signer → confirm both legs | A: correct dest chain/addr + fee sane? B: no bridge-drain pattern, dest allowlisted, exactly-once (no double-bridge) |
| **Trader** | Druckenmiller-style discretionary macro/systematic trading, defined by `neural_soul.md` | market data (read), signal compute, position/risk read, thesis writer | **Transacting.** Typed order intent → Policy Gate (per-tx/day cap, velocity/circuit-breaker, position limit) → Signer. **The brain proposes a thesis; it never executes.** | read state (JIT) → thesis → risk-size → **order intent** → Policy Gate → Signer → log | A: thesis matches soul's risk discipline + size within limits? B: independent risk check + drawdown/velocity breaker not tripped? |

**Cross-cutting for the three transacting engines (Swap / Bridge / Trader):** they are exactly where HARNESS_ENGINE's five-layer safety earns its keep. The engine (brain-side) can only ever emit a **typed intent**; it has no path to the key. The **Trader engine's `neural_soul.md`** is a `[NEW]` deliverable — it defines the Druckenmiller posture (concentrated conviction, asymmetric risk, cut losers fast, ride winners, macro-thesis-driven) as *soul-level behavior*, but every risk limit it implies is also enforced *deterministically in the Policy Gate*, never trusted to the prompt. **The soul persuades; the Policy Gate enforces.**

---

## PART B: 24/7 droplet deployment + security

**[REUSED from HARNESS_ENGINE §8 + local `acp_ops.md` production baseline, extended with 2025 best-practice corroboration.]** The real baseline is a hardened DigitalOcean droplet (the shared production droplet: root OFF, non-root ops user + sudo, key rotation + hardening) — promote it to the ATLAS fleet floor.

**Per-Harness runtime (systemd):**
- `atlas-<x>-brain` — Claude Agent SDK Orchestrator + crew. **No keys, no RPC.** Runs as a **non-root** dedicated system user; `NoNewPrivileges=yes`, `ProtectSystem=strict`, `ProtectHome=yes`, `PrivateTmp=yes`, read-only bind of the bundle (brain cannot write its own hooks/policy).
- `atlas-<x>-worker` — the signing domain (OKX x402/TEE calls + `acp-node` Base signer). **The only process that can produce a signature.** Separate UID/container from the brain (separate trust domain).
- `atlas-<x>-safety` — the veto sidecar. Independent process, own restricted toolset, sits on the outbound edge.
- **Postgres** — the durable spine (plan, outbox, leases, event log). **Off the droplet's disk** (managed PG) so a droplet loss doesn't lose state (SPOF mitigation).
- **OTel collector** — traces on every loop iteration + every on-chain call (mandatory audit trail for a financial agent).

**Secrets / key management:**
- **No key in any file/env/log the brain can read** (INV-2). OKX keys (`OKX_API_KEY/SECRET/PASSPHRASE`) and the Virtuals signer live **only in the worker/signing domain.**
- Inject secrets at runtime, not baked into the image — use a secrets manager (Doppler-on-DigitalOcean pattern, or SOPS/age, or the droplet's KMS handle). `"Never commit .env to git"` (OKX's own warning).
- **OKX side:** the TEE already holds the OKX key ("not even OKX" can touch it) — ATLAS never possesses that key, it calls the TEE. This is *natively* the no-LLM-in-signing-path posture (BlockEden/Coinbase pattern: "the agent's LLM never sees the private key").
- **Virtuals side:** move from bare hot key toward MPC/KMS; agent holds only a **capped, expiring session key**, never the treasury key; sweep surplus to cold; the Policy Gate cap is the blast-radius limit (the defense that would have caught the 5.35 USDC incident).

**Hardening (non-root, least privilege, fail-closed):**
- Dedicated non-root user per service; systemd sandboxing directives (above); brain filesystem read-only for hooks/policy/safety.
- **Per-wallet fenced lease** so only one loop signs against a given wallet — critical now that there are **two** wallets (X Layer + Base). Stale fenced token ⇒ signer refuses; on-chain nonce is the backstop; failover is fail-safe (quorum loss ⇒ refuse-to-sign + HITL, never two active signers).
- Input firewall on every OKX payload / ACP payload / tool-returned web page: NFKC-normalize, strip zero-width, quarantine as **DATA not instructions**, threat-classify, schema-validate. (2025 research: prompt injection to drain funds is *the* attack; "no silver bullet" — so defense is structural, not prompt-based.)
- Kill-switch + dead-man's-switch, both fail-closed. Unauthorized-egress tripwire on **each** wallet (X Layer and Base): any outflow not matching a signed policy decision ⇒ auto-freeze + revoke session key + page Owner.
- Pinned, audited supply chain: committed lockfiles; `acp-cli`/`acp-node` pinned to a validated version (**never auto-update** — the trade-bug lesson); OKX skills pinned; 0 high/critical vulns; gitleaks clean; SBOM.

**Liveness (the anti-stall thesis):** heartbeat + "last meaningful economic action" persisted every loop iteration; systemd restart on missed heartbeat; escalate to Owner on N no-progress cycles; "progress" defined *economically* (a settled OKX or Virtuals job), not "process alive"; survives droplet reboot with no lost/duplicated state (Postgres); a deliberately injected stall is detected + escalated within SLA — tested in CI.

---

## Risks & Gotchas

1. **Double-sign across two rails [HIGH].** Two wallets = two nonce spaces = two double-spend surfaces. Mitigation: **per-wallet fenced lease** (not one global lease). Never let the OKX loop and the Virtuals loop share a signer instance.
2. **OKX marketplace ToS not fully enumerated [MEDIUM].** The *API* agreement is verified non-exclusive; the okx.ai *marketplace listing* terms were not fully read. `[UNVERIFIED]` — do a full listing-ToS review before publicly listing on okx.ai. Do not assume the API non-exclusivity automatically covers the marketplace listing agreement.
3. **BYO-wallet on OKX unconfirmed [MEDIUM].** OKX generates a TEE wallet; whether it accepts an external address (e.g., the Base 6551 treasury) is `[UNVERIFIED]`. Plan for two distinct wallets, not one shared treasury across rails.
4. **Reputation does not transfer [MEDIUM].** OKX reputation and Virtuals ERC-8004 reputation are separate ledgers. ATLAS must bootstrap credibility twice; don't promise cross-platform trust carryover.
5. **x402/escrow maturity [LOW-MEDIUM].** OKX APP escrow + dispute resolution are "coming soon" per the APP page. Early OKX work should lean on x402 pay-per-call (which is live) for standardized services; hold escrow-dependent complex jobs until escrow ships.
6. **`acp-cli` version pin [HIGH, known].** A prior version spread a trade bug; production is pinned. Any dual-rail build must preserve the pin discipline for the Virtuals SDK.
7. **Positioning drift [MEDIUM].** Operating on OKX must never become "OKX instead of Virtuals" messaging. The hard rule (never compare/compete with Virtuals) holds across both rails.
8. **Trader engine soul vs enforcement gap [HIGH].** The Druckenmiller `neural_soul.md` must never be the *only* thing bounding risk. Every limit the soul implies must be duplicated deterministically in the Policy Gate. Soul persuades; Gate enforces.

---

## Open Questions

1. **[UNVERIFIED]** Does OKX okx.ai marketplace listing require an approval/review step, KYC, or a separate listing ToS beyond the API agreement? (API agreement confirmed non-exclusive; listing terms not fully read.)
2. **[UNVERIFIED]** Can ATLAS point OKX at an external/BYO wallet, or is the TEE-generated Agentic Wallet mandatory? Determines whether one treasury can span rails.
3. **[UNVERIFIED]** Does OKX read or write ERC-8004 reputation on Base, or is OKX reputation fully siloed? Determines whether the Base identity has any cross-rail value on OKX.
4. **[UNVERIFIED]** OKX APP settlement token on X Layer — the APP page cited USDT/USDG for *builder payouts*; the exact on-chain settlement asset per x402 call was not pinned. Confirm before wiring the Policy Gate's price-band checks for the OKX rail.
5. **[UNVERIFIED]** Whether OKX's TEE session-key policy engine can express the *same* cap/allowlist/velocity primitives ATLAS's off-chain Policy Gate uses — if yes, ATLAS gets defense-in-depth for free on the OKX rail.
6. **Open (design):** should ATLAS be one Harness with two adapters, or two Harnesses (one per rail) under one Forge? Recommendation: **one Harness, two adapters** for v1 (simpler, one plan, one Orchestrator); split to two only if per-rail throughput demands it.

---

## Implications for next steps (harness, then neural_soul.md)

1. **Sequence locked:** OKX OnchainOS/okx.ai first (cheapest, fastest, lowest-money proving ground; zero-gas x402; MCP skills; TEE-native no-LLM-in-signing-path). Then Virtuals ACP via `acp-cli` as a second intake adapter into the *same* harness. No hard conflict blocks this; the sequence is chosen for risk/cost, not conflict-avoidance.
2. **Build the harness, not a new architecture.** Reuse HARNESS_ENGINE end-to-end. The only new structural piece for v1 is the **Intake Adapter layer** + the **≥2-Evaluator gate** (up from 1) + a first **Engine module**. Everything else (five-layer safety, 14 invariants, four gates, Policy Gate, Signer, event log, anti-dormancy, fleet ops) is already specced — implement it, don't redesign it.
3. **Minimum Provable ATLAS (v1):** one Harness, OKX rail only, **one engine** (start with **Researcher** — it is non-transacting, it is iCLONE's core skill, and it lets the full loop `intake → investigate → build → dispatch → 2× evaluate → deliver` run with the *smallest* money surface). Dry-run first, then one real sub-cent x402 job on X Layer. Prove: loop completes unattended, ≥2 evaluators gate it, a reboot doesn't double-settle, an injected malicious task is vetoed, an injected stall is escalated within SLA.
4. **Then add the Virtuals adapter** (v1.5) and the **transacting engines** (Swap → Bridge → Trader), gated behind the full Policy-Gate + MPC hardening — no non-trivial wallet until MPC/KMS is in place (hard gate from HARNESS_ENGINE).
5. **Then write `neural_soul.md` for the Trader engine** (Druckenmiller-style) — and for ATLAS CORP itself as the orchestrator soul — using the CLONE FRAME `neural_soul.md` architecture (4 lobes → 4 faculties; modes Assistant/Macro/Systematic; automation owner-gated). The soul defines *behavior and thesis*; every risk bound it implies is *also* enforced deterministically in the Policy Gate. Write the soul **after** the harness loop is proven, so the soul is authored against a real, safe execution substrate — not the other way around.

*Verdict in one line: dual-listing is viable with no hard conflict; list OKX first for cost/speed, then add Virtuals as a second adapter into the one HARNESS_ENGINE harness; the architecture already exists — ATLAS widens its front door and doubles its evaluators, and the Trader soul comes last.*

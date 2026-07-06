# OKX ASP (Agent Service Provider) Marketplace — Research Report

Domain: How ATLAS will SELL skills and EARN fees on OKX AI, in BOTH provider modes
(Agent-to-MCP and Agent-to-Agent).
Prepared: 2026-07-05. Rigor note: only verified facts below. `[UNVERIFIED]` prefixes
anything inferred or not directly confirmed by a primary/official source. No endpoints,
fees, or commands are invented.

---

## Sources fetched

Primary / official (OKX):
- **Agent Payments Protocol (APP) Whitepaper v1.0** (PDF, dated April 2026) — `https://web3.okx.com/whitepaper/okx-app-whitepaper.pdf` — FETCHED (WebFetch could not read the compressed PDF; extracted locally with pypdf, 18 pages / ~35k chars). This is the canonical primary source and is quoted extensively below.
- **OKX AI: A Marketplace for the Agent Economy** (learn) — `https://www.okx.com/en-us/learn/okx-ai` — FETCHED (via WebFetch + WebSearch snapshots).
- **Agents can now do real business… (Agent Payments Protocol)** (learn) — `https://www.okx.com/en-us/learn/agent-payments-protocol` — FETCHED.
- **OKX OnchainOS Payments — Overview** (dev docs) — `https://web3.okx.com/onchainos/dev-docs/payments/overview` — FETCHED (marketing-level; defers technical specifics).
- **OKX Agent Trade Kit** — `https://www.okx.com/en-us/agent-tradekit` — FETCHED.
- **okx/onchainos-skills** (GitHub) — `https://github.com/okx/onchainos-skills` — FETCHED (README, skill list).
- **MPP (Machine Payments Protocol)** — `https://mpp.dev/` — FETCHED (index only; escrow subpage 404'd).

Blocked / not retrievable:
- `https://www.okx.ai` — **HTTP 403 Forbidden** to WebFetch (bot protection). Homepage.
- `https://www.okx.ai/` — **HTTP 403**.
- `https://www.okx.ai/tutorial/asp` — cross-host / **403**; content only reachable via WebSearch snapshots of `okx.ai/tutorial`.
- `https://www.okx.ai/tutorial` — **403** to WebFetch; reachable via WebSearch snapshots.
- `https://mpp.dev/guides/escrow` — **HTTP 404 Not Found**.
- `https://www.okx.com/en-us/learn/okx-ai-agent-marketplace` — **HTTP 404**.

Secondary / press (used only to corroborate, never as sole source for a number):
- The Block (marketplace launch, "Upwork for Agents", 150M scale) — `https://www.theblock.co/post/406704/…`
- The Block (APP protocol) — `https://www.theblock.co/post/399490/…`
- TechCrunch, Cointelegraph, Cryptobriefing, crypto.news, BanklessTimes — launch coverage (dispute/evaluator/reputation framing).

---

## Key Facts

1. **Two products, one identity.** OKX AI has an **Agent Marketplace** ("Developers list AI agents, define services and pricing, and earn automatically when work is completed") and a **Task Marketplace** ("Agents post work, find the right agent, and pay only when results are delivered"). Every agent operates under **a single onchain identity managed through the OKX Agentic Wallet**, and **"Reputation accumulates in one place, regardless of how the work was done or how it was paid for."**

2. **The two provider modes map to APP deployment shapes.** OKX's public copy uses "Agent-to-MCP" and "Agent-to-Agent"; the APP whitepaper names them **A2MCP** and **A2A**. They share the **same wire format, the same four intents, the same Broker role, and the same on-chain settlement path** — they differ only in *who plays Seller* and *which transport carries the challenge*.

3. **Four commercial intents** cover the lifecycle: **`charge`** (one-shot instant transfer), **`escrow`** (task custody with a dispute window), **`session`** (streaming/metered payment channel), **`upto`** (pre-authorised capped metered deduction). A2MCP typically uses `charge`/`session`/`upto`; A2A typically uses `charge` and `escrow` (with splits). (Whitepaper §6, Table 2.)

4. **Settlement chain = X Layer.** OKX's reference Broker settles on **X Layer** with **"~200 ms finality, sub-cent fees."** APP is chain-agnostic in principle but X Layer is the reference. Payment tokens publicly named: **USDT and USDG** (marketplace copy); the APP whitepaper's own example and MPP docs use **USDC**. Settlement is described as **zero/low gas**.

5. **Fees, staking amounts, and evaluator-selection mechanics are NOT publicly disclosed.** The whitepaper explicitly states the **fee model and reference-implementation details are OUT OF SCOPE** of that paper and live in the (non-public-at-time-of-writing) **APP specification**. Splits exist as a **first-class, "bps-native"** primitive (platform fee / creator royalty / operator cut / referral bounty) but **no percentages are published**. Dispute resolution is **"pluggable"** and, per OKX press, handled by a **"staked network of evaluators, not a central platform"** — but stake size, quorum, and slashing rules are **not published**. Escrow + dispute resolution were flagged **"coming soon"** on the APP learn page as of launch.

---

## Agent-to-MCP (step-by-step)

**What it is (verbatim framing):** standardized MCP/API services (data queries, price feeds, utility APIs), **pay-per-call, no negotiation**. In APP terms this is the **A2MCP** shape: *"The Seller is an HTTP-addressable service, often discovered and invoked through an MCP tool on the Buyer Agent's side."*

**Mechanism (whitepaper §5.2):**
1. The Seller exposes a **priced HTTP endpoint** (optionally surfaced as an MCP tool on the buyer side).
2. When a Buyer Agent hits the priced endpoint, the service **returns an APP challenge over HTTP — "typically as an x402-style `402 Payment Required` carrying a challenge URL."**
3. The Buyer Agent's payment module **signs** the credential; the **Broker settles** on-chain.
4. The Buyer **retries the original call citing the `paymentId`** (for `charge`) or **draws from an already-open channel** (for `session`).
5. Typical intents here: **`charge`, `session`, `upto`**. Typical latency: **single round-trip, ~seconds.**

**How a provider actually goes live (from OKX dev docs + marketplace copy):**
- **Integrate the OnchainOS Payment SDK.** Dev docs (verbatim): *"load the SDK in your DApp/MCP service to start charging"* and **"No registration, no payment-gateway integration required."** Marketplace copy: **"Payment SDK integration is required before going live"** and the SDK supports **one-time, batch, and pay-as-you-go** payments on **X Layer** with **zero/low gas**.
- **The `okx-agent-payments-protocol` skill** (in `okx/onchainos-skills`) is a **"Unified payment dispatcher supporting x402 and MPP schemes"** — i.e. it is the client/skill side of the same rail.
- Install path for the skill bundle: **`npx skills add okx/onchainos-skills`**.

`[UNVERIFIED]` The exact SDK package name / language bindings, and the exact function calls to "declare a price" or "return a challenge," are not exposed in the public marketing docs. The technical spec (referenced, not public) is the source of truth. Do not assume an npm package name.

---

## Agent-to-Agent (step-by-step + escrow/dispute flow)

**What it is (verbatim framing):** agents **negotiate price, scope, and delivery terms**; payment runs through **escrow**; the provider is **paid only after the user signs off**. In APP terms this is the **A2A** shape: *"The Seller is another Agent reachable over an IM network (XMTP, Telegram, Discord, Slack, Email, SMS)."* Typical intents: **`charge`, `escrow` (with splits)**. Typical latency: **minutes (`charge`) to days (`escrow`).**

**Message flow (whitepaper §5.2, Fig. 3):**
1. The **Seller Agent asks its Broker to mint a payment** and emits a **`url` / `card` / `qrcode` delivery** into the IM channel.
2. The **Buyer Agent parses and signs** the credential; **credential → Broker → X Layer**.
3. Both sides **poll the Broker** for status. Neither side needs an HTTPS endpoint or webhook inbox.

**Escrow mechanics (`escrow` intent, whitepaper §6.2 — verbatim key points):**
- **Lock:** *"The Buyer locks the budget on-chain when the order is created."* Funds are held by an **audited on-chain custody contract** that the Buyer funds at order creation.
- **Deliver:** *"The Seller submits delivery, which opens a configurable dispute window."*
- **Inside the window, the Buyer can:**
  - **release** → *"instant payout"* (this is the "sign-off"),
  - **dispute** → *"an external arbitrator decides,"*
  - **stay silent** → *"the Seller self-releases once the window expires"* (timeout auto-release to Seller).
- **Splits at release:** *"Splits, if declared, are applied at the moment of release"* — settlement routes platform fee / referral / creator royalty to each recipient **in the same step** that pays the Seller (no off-chain reconciliation). (§8.1)

**Dispute resolution / arbitration (whitepaper §8.2 + OKX press):**
- APP is **"pluggable"**: *"The protocol accommodates an external resolver — a human moderator, a community vote, a reputation system, or any other arbitration mechanism."*
- **Protocol guarantee:** *"the resolver's decision binds settlement; how the resolver reaches that decision is left open."*
- **OKX's chosen resolver (per launch press):** disputes are *"resolved by a staked network of evaluators, not a central platform,"* and the outcome *"becomes part of the platform's trust/reputation system."* Future layers mentioned: *"more sophisticated dispute resolution and an anomaly detection system against coordinated bad-actor behavior."*

**Settlement custody (whitepaper §5.3 / §5.4):**
- **Direct intents** (`charge`) settle by submitting the Buyer's signed authorisation **straight to the token contract** — one tx, no intermediate contract.
- **Held intents** (`escrow`, `session`) route through **one audited on-chain custody contract** supporting both modes. `escrow` is explicitly *"the exception"* that needs a real contract; the others reduce to off-chain signatures over standard EVM signature schemes.

---

## Setup / Requirements

**To sell in EITHER mode, a provider needs:**
1. **An Agentic Wallet / onchain identity.** *"Every agent on OKX AI operates under a single onchain identity, managed through the OKX Agentic Wallet."* Setup is via the agent; **only an email address is required**, and **"No OKX account is required to get started."**
2. **The OnchainOS skills bundle** — install with **`npx skills add okx/onchainos-skills`**. Provides `okx-agentic-wallet`, `okx-agent-payments-protocol` (x402 + MPP dispatcher), `okx-agent-chat` (agent-to-agent encrypted comms via **XMTP** — the A2A transport), plus market-data / DEX / DeFi skills. Compatible clients named: **Claude Code, Codex, Hermes, OpenClaw**. The CLI is *"a native MCP server exposing tools to any MCP-compatible client."*
3. **For A2MCP specifically:** integrate the **OnchainOS Payment SDK** into your DApp/MCP service *before going live* (this is the stated hard requirement). Then **list the agent + define services and pricing** in the Agent Marketplace.
4. **For A2A specifically:** be reachable over an IM transport (XMTP/Telegram/Discord/Slack/Email/SMS) and let your Broker mint payments; declare **splits** up front if you want fee routing at release.

**Optional / composable:**
- **ERC-8004** agent-identity registration is **not required** but, if present, APP *"renders it on delivery cards."* (Relevant: ATLAS/iCLONE already touch ERC-8004 per project memory.)
- Chains supported by the wallet skills: **X Layer, Solana, Ethereum, Base, BSC, Arbitrum, Polygon, and 20+ others** (settlement reference is X Layer).

**Roles you can register as (from `okx.ai/tutorial`):** the platform frames participants choosing a **role in the AI agent economy**; the **ASP** role = *"developers build AI agents, deploy custom skills, and offer services through the marketplace."* ATLAS intends to register in **both** modes — supported, since one identity spans both.

---

## Costs & Fees

- **Marketplace revenue-share / take-rate: NOT PUBLICLY DISCLOSED.** The APP whitepaper explicitly puts the **fee model out of scope** ("Wire-format schemas, security analysis, **fee model**, and reference-implementation details are out of scope here and are maintained in the … specification"). No press or dev-doc source states a percentage.
- **Splits are first-class and "bps-native"** (basis-point granularity): **platform fee, creator royalty, agent operator cut, referral bounty** are *"declared upfront and applied automatically at settlement."* So a take-rate mechanism exists and is enforced on-chain — **the numbers are just not published.**
- **Broker fees are separate and explicitly out-of-protocol** (whitepaper footnote 1: *"Broker fees are separate and out of protocol."*). A Broker *"may charge fees."* If ATLAS uses OKX's reference Broker, expect a Broker fee **[UNVERIFIED — amount unknown]**.
- **On-chain gas:** **sub-cent on X Layer**, ~200 ms finality; marketplace copy says **zero/low gas**.
- **Payment tokens:** **USDT / USDG** (marketplace) — providers *"get paid in stablecoins."* (Whitepaper/MPP examples use USDC; treat the accepted-token list as **stablecoins incl. at least USDT, USDG, USDC** and verify the exact live set.)
- **Evaluator staking economics** (stake size, reward, slashing): **NOT DISCLOSED.**

---

## Security notes

- **Signature is the source of truth.** APP recovers payer identity from `payload.authorization.from` via ECDSA. Human-readable fields (name, avatar, description) are **presentation only** — a Buyer/Seller must **verify the critical signed fields (amount, token, recipient, intent, Broker key) before signing.** ATLAS must never trust unsigned display fields.
- **Replay protection is built into the primitives:** `session` uses **monotonic typed vouchers** (stale vouchers auto-obsolete); `upto` binds a **pre-authorised cap to one specific paymentId** (cap cannot be reused elsewhere); Broker **recomputes the nonce** and matches against the stored challenge.
- **Signing ≠ custody (§8.4):** in `session`, a **hot/agent-side key** can sign per-turn usage while the **cold wallet** retains deposit/close rights. ATLAS should keep the funded wallet **off the per-turn signing path**.
- **Multi-Broker trust:** Buyer and Seller each pick a Broker; when they differ, the **`realm` field** coordinates settlement and the **credential binds to a specific Broker public key.** ATLAS should pin the Broker key it expects.
- **Escrow custody contract is "audited"** per the whitepaper, but **the specific contract address/ABI is not published** in these sources — verify against the spec before funding real value.
- **`upto` anti-over-billing:** settlement deducts **min(buyer cap, seller-reported usage)**; neither side can unilaterally inflate the bill. Good property for ATLAS acting as Seller *and* as Buyer of sub-worker/evaluator agents.

---

## Risks & Gotchas

1. **Escrow + dispute resolution were "coming soon" at launch** (APP learn page: *"escrow, dispute resolution coming soon"*). A2A escrowed jobs — the core of ATLAS's "deliver only after sign-off" model — **may not be fully GA.** Confirm live status before depending on it.
2. **No public fee schedule.** ATLAS cannot model net revenue precisely: unknown **marketplace take-rate + Broker fee**. Must be pulled from the (gated) APP spec or a live dashboard.
3. **Token ambiguity.** Marketplace says USDT/USDG; whitepaper/MPP examples say USDC. **Do not hardcode a settlement token** — query the live accepted set.
4. **Evaluator network is a dependency ATLAS doesn't control.** Since ATLAS itself runs ≥2 evaluator agents internally before delivery, note that OKX's *dispute* evaluators are a **separate, staked, external** network. ATLAS's internal QA gate ≠ OKX arbitration. A dispute could still be lost to external evaluators regardless of ATLAS's internal sign-off.
5. **`okx.ai` is bot-protected (403).** Automated onboarding/registration scripting against the marketing site will be blocked; onboarding is agent-CLI-driven (`npx skills add …`), not a scriptable web form (as far as public sources show).
6. **Broker is stateful and potentially "licensed."** The whitepaper notes a Broker *"may be licensed"* and holds funds across days — regulatory/custody exposure if ATLAS ever runs its own Broker rather than using OKX's.
7. **Reputation is global and permanent.** One onchain identity accumulates reputation across A2MCP + A2A. A single disputed/failed A2A job **damages the same identity** that sells A2MCP calls. Failed/disputed history makes an agent *"less likely to get hired."* High stakes for ATLAS's first jobs.
8. **Spec ≠ whitepaper.** The stable whitepaper deliberately excludes wire schemas, fees, and contract choices; those live in a separate spec that *"will change."* Any ATLAS integration must track the **spec**, not the whitepaper.

---

## Open Questions

1. **Exact marketplace take-rate / revenue share** (percentage or bps) for A2MCP calls and A2A escrow releases — unpublished.
2. **Broker fee** amount and whether OKX's reference Broker charges it separately.
3. **OnchainOS Payment SDK**: exact package name, language(s), and the concrete API to (a) declare a priced endpoint / return an APP challenge, and (b) open/settle an escrow. Not in public docs.
4. **Escrow custody contract**: address + ABI + the exact `release / dispute / refund / timeout` function names on X Layer.
5. **Evaluator network mechanics**: stake token & amount, how evaluators are selected/assigned to a dispute, quorum, reward, and **slashing** rules.
6. **Reputation scoring**: how the onchain reputation score is computed, weighted, and read by counterparties at hire time.
7. **Discovery ranking**: how the Agent Marketplace ranks/surfaces ASPs (reputation-weighted? paid placement? category?). Sources confirm reputation influences hireability but not the ranking algorithm.
8. **SLAs**: no SLA/uptime/penalty framework is documented publicly for ASPs. Are there latency/uptime commitments enforced by the protocol? Unknown.
9. **Live accepted-token set** (USDT / USDG / USDC / others) and per-token availability by intent.
10. **GA status** of escrow + dispute resolution as of the ATLAS build date (was "coming soon" at June 2026 launch).

---

## Implications for ATLAS

**Register in both modes — the architecture supports it cleanly.** One Agentic Wallet identity spans A2MCP and A2A, and reputation pools into that single identity. This directly fits ATLAS's dual nature (sell standardized skills *and* negotiate bespoke Harness jobs).

- **A2MCP = ATLAS's "utility skill vending machine."** Expose ATLAS's standardized capabilities (data/price/utility) as **priced HTTP/MCP endpoints** that return an APP `charge` (or `session` for metered) challenge. Hard prerequisite: **integrate the OnchainOS Payment SDK before going live.** Low latency, no negotiation, pay-per-call — ideal for high-volume, low-touch revenue.
- **A2A = ATLAS's Harness/Orchestrator sales channel.** Negotiate scope/price over an IM transport (XMTP via `okx-agent-chat`), take the job under **`escrow`**, deliver, and get paid **only on Buyer release (sign-off)** or on **dispute-window timeout auto-release**. This is the exact "discover paid task → build engine → dispatch workers → evaluate → deliver → get paid" loop ATLAS wants — the protocol's `escrow` intent *is* that loop.
- **Use `splits` to pay ATLAS's own supply chain in one settlement.** When ATLAS dispatches worker/evaluator sub-agents, declare **splits up front** so each sub-agent's cut and any platform fee route automatically at release — no separate payout batch, no off-chain reconciliation. This makes ATLAS's internal economy on-chain and auditable.
- **Use `upto` for LLM/worker sub-billing.** When ATLAS *buys* from metered sub-agents (e.g. "≤ N tokens"), `upto` caps spend and settles **min(cap, reported usage)** — protects ATLAS's margin.
- **Two evaluator layers exist — design for both.** ATLAS's internal ≥2-evaluator gate is a *quality* gate; OKX's **staked evaluator network** is the *external dispute arbiter*. Passing ATLAS's internal gate does **not** guarantee winning an OKX dispute. Keep verifiable delivery artifacts (signed usage reports, on-chain records) to defend disputes.
- **Protect the identity early.** Because reputation is global and permanent, ATLAS's first A2A jobs are disproportionately valuable/risky. Start with small, high-confidence jobs to build reputation before taking large escrows.
- **Do not hardcode:** settlement token, Broker key, or contract addresses. Pin the Broker public key you trust; query live token/fee/contract config from the spec/SDK at runtime.
- **Blockers to resolve before committing revenue projections:** (1) confirm escrow + dispute GA status, (2) obtain the marketplace take-rate + Broker fee from the APP spec, (3) get the Payment SDK package + escrow contract details. Until then, ATLAS revenue net-of-fees is **unmodelable**.

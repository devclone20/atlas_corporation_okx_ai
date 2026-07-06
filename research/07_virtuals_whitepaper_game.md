# 07 — Virtuals Protocol: Whitepaper, Tokenomics, Agent Model & GAME Framework

_Research for ATLAS (24/7 Harness/Orchestrator iNFT agent that will also operate on Virtuals Protocol)._
_Date: 2026-07-05. Rigor: verified facts only; `[UNVERIFIED]` prefixes inference; direct quotes attributed to source._

---

## Sources fetched

| # | URL | Status | Notes |
|---|-----|--------|-------|
| 1 | https://whitepaper.virtuals.io | OK | High-level: "society of AI agents", 5 pillars |
| 2 | https://www.virtuals.io | THIN | Only title/header returned server-side; body is JS-rendered. Not usable for facts |
| 3 | https://github.com/Virtual-Protocol | OK | Org repo list, ~37 repos |
| 4 | https://github.com/game-by-virtuals/game-python | OK | GAME Python SDK README (note: GAME repos live under `game-by-virtuals` org, not `Virtual-Protocol`) |
| 5 | https://github.com/game-by-virtuals/game-node | OK | GAME TypeScript/Node SDK README |
| 6 | https://whitepaper.virtuals.io/about-virtuals-1/usdvirtual-tokenomics(.md?ask=) | OK | $VIRTUAL supply + allocation |
| 7 | https://whitepaper.virtuals.io/about-virtuals/tokenization/agent-tokenization-platform.md?ask= | OK | 1% trade tax + fee split |
| 8 | https://whitepaper.virtuals.io/builders-hub/build-with-virtuals/agent-creation | OK | Agent creation flow, 100/42,000 VIRTUAL |
| 9 | https://whitepaper.virtuals.io/?ask=... (staking / agent-wallet / GAME) | OK | veVIRTUAL, agent wallet, GAME role |
| 10 | https://whitepaper.virtuals.io/about-virtuals/agent-commerce-protocol-acp/technical-deep-dive.md?ask= | OK | Chains + 1B agent supply |
| — | https://whitepaper.virtuals.io/the-protocol/agent-tokenization | **404** | Old path; content moved |
| — | https://whitepaper.virtuals.io/about-virtuals/tokenization/agent-tokenization-platform (plain HTML) | **404** on plain fetch | Only the `.md?ask=` variant resolved |
| — | https://whitepaper.virtuals.io/info-hub/builders-hub/more-on-standard-launch | **404** | Appeared in search index but 404 on fetch |

**Key retrieval technique:** the whitepaper is a GitBook. Plain HTML fetches often 404 or return an error shell. Appending `.md?ask=<url-encoded question>` to a page path returns clean answered markdown. Full corpus dumps also exist at `https://whitepaper.virtuals.io/llms-full.txt` and `sitemap.md`. Use these for follow-up.

---

## Key Facts

1. **What it is:** Virtuals Protocol = "a society of AI agents" — an onchain ecosystem giving autonomous agents identity, wallets, tokens, jobs, and markets. Runs primarily on **Base**; agent tokens also on **Solana**; $VIRTUAL exists on **Base, Ethereum, Solana**.
2. **$VIRTUAL supply:** **1,000,000,000** total, "fully unlocked and vested, with no future inflation." Allocation: **Public Distribution 60% / Ecosystem (treasury) 35% / Liquidity Pool 5%.**
3. **Agent token:** Each agent mints a fixed **1,000,000,000** (1B) token supply on a **bonding curve**. Creation costs **100 $VIRTUAL**; graduates when **42,000 $VIRTUAL** accumulates in the curve → LP created on **Uniswap V2** paired vs $VIRTUAL, LP tokens **staked with a 10-year lock**.
4. **Trade tax:** **1%** on agent-token trades. Pre-graduation → 100% to protocol treasury. Post-graduation → **30% agent creator / 20% Agent Affiliates / 50% Agent SubDAO (stakers)**.
5. **GAME framework:** "a modular agentic framework which enables an agent to plan actions and make decisions autonomously." Three tiers: **Agent (high-level planner) → Worker (low-level planner) → Function (executable action)**. SDKs in **Python** (`game_sdk`) and **TypeScript** (`@virtuals-protocol/game`); API keys via `console.game.virtuals.io`.

---

## Protocol overview

Virtuals Protocol markets itself as **"a society of AI agents"** — quote: "a coordinated, onchain ecosystem where autonomous agents have identity, capital, jobs, markets, governance, and, increasingly, bodies in the physical world."

Five stated pillars (from whitepaper landing):
1. **EconomyOS** — "the identity and banking layer": onchain identity, non-custodial wallets, virtual payment cards, email identity, compute access.
2. **Agent Commerce Protocol (ACP)** — "the commerce layer" for "secure, transparent, and verifiable commerce between autonomous AI agents."
3. **Agent Tokenization** — "the capital markets layer": modular capital structures, anti-sniper protection, and the "42,000 $VIRTUAL graduation threshold."
4. **Robotics/Eastworlds** — "the physical labor layer" (hardware for robotic agents).
5. **Governance** — marked "[REDACTED]" / "Forthcoming."

**ACP (relevant to ATLAS as an orchestrator):** four-phase model — **Request → Negotiation → Transaction → Evaluation** — with three roles: **Client, Provider, Evaluator**. Payments/deliverables held in **escrow** by the ACP smart contract until an Evaluator verifies work against a cryptographically signed **Proof of Agreement**. **ACP v2** (recent) adds per-agent **domain-specific job schemas** instead of v1's single global schema. This is the same ACP stack the user's iCLONE/VEGETA agents already use (see MEMORY: `acp_ops`, `erc_agent_stack`).

---

## Agent model (creation, tokenization, ownership)

**Creation flow** (from `agent-creation`):
1. Fill the Agent Creation Form at `https://fun.virtuals.io/` → "Create New Agent". Mandatory: profile picture, name, **ticker (max 6 chars)**, description.
2. **"100 $VIRTUAL tokens are needed for the initial agent creation."** Token deploys on a **bonding curve**.
3. Users trade the agent token on the curve until **"42,000 $VIRTUAL has accumulated"** → agent **graduates**.
4. Delegate voting power (authorizes system approval of contributions + AI model updates).
5. Deployment: defaults to a pre-defined AI model (customizable later). **"A Contribution NFT is minted and transferred to agent's TBA."** A default contribution proposal is created & approved.
6. Status: **ACTIVATING** (onchain mint + offchain finalize, "less than 5 minutes") → **AVAILABLE** (operational; interact via Telegram). Note: search-index figure of "41,600" appears in some third-party write-ups; the **official whitepaper value is 42,000** — treat 41,600 as stale/inaccurate.

**Tokenization mechanics:**
- Each agent token = fixed supply **1,000,000,000** ("minted per AI agent creation"). Third-party sources label these **"FERC20" (Fun ERC20)**; the whitepaper confirms the **supply** but does **not** itself use the "FERC20" label — `[UNVERIFIED]` on the exact standard name, verified on the 1B supply.
- On graduation: $VIRTUAL accumulated in the curve + newly minted agent tokens seed a **Uniswap V2** LP (agent token / $VIRTUAL). LP tokens are **staked on behalf of the agent with a 10-year lock** for liquidity stability. (Note: `bondv5-trader` repo trades tokens via **BondingV5 + Uniswap V3**, suggesting newer launches may use a V5 bonding contract / V3 pools — `[UNVERIFIED]` whether the live standard launch is still V2 or has moved to V3.)

**Ownership & the agent/token/wallet triad:**
- **Agent Wallet** — "an onchain Agent Wallet used for signing and payments." Every agent has one.
- **Agent Token (optional)** — if tokenized, enables **co-ownership** and **routes trading fees back to the agent wallet**.
- **TBA (Token Bound Account, ERC-6551)** — the agent's NFT holds a TBA; the Contribution NFT is transferred to "agent's TBA". This is the same 6551 pattern the user's own iNFT stack uses (MEMORY `nft_e_token`).
- **GAME** — "the framework that powers agent behavior" (prompting, planning, wallet operator, memory).
- **Payment flow:** users "pre-load VIRTUAL; per-inference usage deducts VIRTUAL and transfers it to the agent's wallet." Payments are **onchain, wallet-to-wallet, in $VIRTUAL**. To buy any agent token, users must first "swap their USDC (or other currencies) into $VIRTUAL" — $VIRTUAL is the mandatory routing/pairing asset.

---

## GAME framework (what it is + SDKs)

**Definition (verbatim):** "GAME is a modular agentic framework which enables an agent to plan actions and make decisions autonomously based on information provided to it." The README does **not** expand the acronym (community sometimes reads it as "Generative Autonomous Multimodal Entities" — `[UNVERIFIED]`, not in the docs).

**Architecture (three tiers):**
1. **Agent (High-Level Planner)** — takes a **goal** ("drives the agent's behaviour through the high level plan") + a **description** (world info + agent personality).
2. **Worker (Low-Level Planner)** — description determines which workers are invoked and how tasks are created, given the high-level plan.
3. **Function** — the executable unit: API calls, data processing, or chained operations. In the Python SDK you "fully customise functions" and "control the low-level planner via description prompt."

**SDKs / languages:**
- **Python:** `pip install game_sdk` (repo `game-by-virtuals/game-python`).
- **TypeScript/Node:** `npm install @virtuals-protocol/game` (repo `game-by-virtuals/game-node`). Plugins folder ships **Discord, Telegram**, and others, each with example files.
- **React frontend:** `react-virtual-ai` (React components + hooks for integrating with the Virtual Protocol server).
- **API keys:** requested via **Game Console — `https://console.game.virtuals.io/`**, set as env var. **Chat Agents require a V2 key prefixed `apt-`.**

**Other org repos worth noting** (`Virtual-Protocol` + `game-by-virtuals`):
- `protocol-contracts` (Solidity) — governance + contribution recording/rewards.
- `acp-cli`, `acp-node-v2` (TS) — current ACP tooling. `acp-node` and `openclaw-acp` are **deprecated** → use v2 / `acp-cli`.
- `vp-trade-sdk`, `bondv5-trader` (TS) — programmatic trading of agent tokens (BondingV5 + Uniswap V3 on Base).
- `virtuals-python` — general Python SDK.

---

## Economics (fees / revenue / staking / chains)

**$VIRTUAL tokenomics (verbatim):**
- Total supply: **"1,000,000,000 $VIRTUAL tokens (fully unlocked and vested, with no future inflation)."**
- **Public Distribution: 60% · Ecosystem (treasury): 35% · Liquidity Pool: 5%.**
- Note: an **"Automated Capital Formation"** module (when activated) references **25% Automated Capital Formation + 25% Team Allocation → "50% of token supply reserved for the founding team."** `[UNVERIFIED]` how this reconciles with the 60/35/5 split above — likely a *separate future module* for a different capital structure, not the current live $VIRTUAL allocation. Flag for clarification before quoting publicly.

**Agent creation fee:** **100 $VIRTUAL** per agent.

**Graduation threshold:** **42,000 $VIRTUAL** accumulated in the bonding curve.

**Trading tax on agent tokens: 1%.** Split:
- **Pre-graduation:** "the 1% goes to the protocol treasury" (creator gets nothing yet).
- **Post-graduation:** "the 1% is split as: **30% to the agent creator's wallet, 20% to Agent Affiliates, 50% to the Agent SubDAO**." (i.e., of trade value: 0.3% creator / 0.2% affiliates / 0.5% SubDAO/stakers.)

**Staking — $VIRTUAL side (veVIRTUAL):**
- Lock $VIRTUAL → receive **veVIRTUAL** (vote-escrowed), which "decays linearly over time until it reaches zero at unlock." **Max lock = 2 years.**
- Rewards: **"each launch allocates up to 5% of agent token supply (50,000,000 agent tokens)"** to $VIRTUAL stakers, distributed pro-rata by veVIRTUAL held; plus airdrop eligibility.

**Staking — agent/SubDAO side:** within an Agent SubDAO, "validators' power and rewards are tied to LP tokens staked via delegation." The graduated LP (10-yr lock) underpins validator rewards + governance weight.

**Chains:**
- **Agent token launches:** **Base and Solana.**
- **$VIRTUAL base asset:** **Base, Ethereum, and Solana** (each with a documented contract address).
- Agents can **bridge agent tokens from Base to Solana.**
- Base is the primary/canonical chain (matches user's existing iCLONE/VEGETA + OG PASS deployments on Base).

---

## Setup / Requirements (to launch + run an agent like ATLAS)

1. **Wallet + capital:** a Base wallet holding **≥100 $VIRTUAL** (creation) plus buffer for the bonding-curve buy-in. Users interacting with the agent must hold $VIRTUAL.
2. **Create agent:** via `fun.virtuals.io` (no-code) → name, ticker (≤6 chars), pfp, description. Agent gets an **Agent Wallet** + **TBA (ERC-6551)** + Contribution NFT automatically.
3. **Brain / GAME:** get a **GAME API key** at `console.game.virtuals.io` (V2 `apt-` key for chat agents). Build with `@virtuals-protocol/game` (TS) or `game_sdk` (Python). Model the agent as **Agent(goal) → Workers → Functions**.
4. **Commerce / ACP:** to let ATLAS transact with other agents, use `acp-cli` / `acp-node-v2`. Register as Client/Provider; jobs run Request→Negotiation→Transaction→Evaluation with onchain escrow. (User already runs ACP infra on the shared production droplet — MEMORY `acp_ops`.)
5. **Trading tooling (optional):** `vp-trade-sdk` / `bondv5-trader` for programmatic agent-token trades.

---

## Risks & Gotchas

- **Whitepaper fetch fragility:** many plain URLs **404**; only the `.md?ask=` GitBook variant reliably returns content. Bookmark `llms-full.txt` + `sitemap.md` for ATLAS's own knowledge ingestion.
- **Two GitHub orgs:** protocol code is under **`Virtual-Protocol`** but **GAME SDKs live under `game-by-virtuals`**. Easy to miss.
- **Bonding contract version drift:** whitepaper text says **Uniswap V2** for graduation LP; the `bondv5-trader` repo says **BondingV5 + Uniswap V3**. Live standard-launch mechanics may have moved to V3 — **verify against the current live contracts before ATLAS relies on V2 assumptions.**
- **Deprecated ACP repos:** do **not** build on `acp-node` or `openclaw-acp`; use `acp-node-v2` / `acp-cli`.
- **"41,600 vs 42,000":** third-party articles cite 41,600 $VIRTUAL graduation; official = **42,000**. Trust the whitepaper.
- **Tokenomics ambiguity:** the "Automated Capital Formation 25% + Team 25% = 50% to founding team" figures may belong to a *separate/future* capital module and **appear to conflict** with the live 60/35/5 split. Do not publish the 50%-to-team figure as current fact without confirming which structure it describes.
- **$VIRTUAL as mandatory rail:** every agent interaction and token trade routes through $VIRTUAL. ATLAS must hold/manage $VIRTUAL liquidity, not just its own token.
- **Team keys / graduation dumping:** anti-sniper protection exists but bonding-curve launches are historically sniped/volatile — relevant if ATLAS ever tokenizes.

---

## Open Questions

1. Is the current standard-launch LP **Uniswap V2 (whitepaper)** or **V3 (bondv5-trader)**? Which bonding contract version is live today?
2. Exact reconciliation of the **60/35/5** vs **"50% to founding team"** allocation — separate modules or a revision?
3. Does the **10-year LP lock** still apply under BondingV5, and who controls the locked LP?
4. What are the **per-inference $VIRTUAL pricing** defaults and how does an agent set its own price? (Relevant to ATLAS's revenue model.)
5. **ACP evaluator economics** — what fee/cut does an Evaluator earn, and can ATLAS act as an Evaluator/orchestrator across other agents' jobs?
6. Does GAME support a **custom/BYO LLM** (e.g., routing ATLAS's brain through the user's Virtuals Compute gateway — MEMORY `virtuals_compute`) or is it locked to the Game Console models?
7. Governance pillar is "[REDACTED] / Forthcoming" — what does the DAO/SubDAO on-chain governance surface actually control?

---

## Implications for ATLAS

- **Fit is strong.** ATLAS as a 24/7 Harness/Orchestrator maps cleanly onto Virtuals' primitives: **GAME** gives it the Agent→Worker→Function brain; **ACP** gives it a native commerce/escrow layer to dispatch and evaluate work across *other* agents — exactly an orchestrator's job. ATLAS could plausibly operate as an **ACP Client (dispatcher) and/or Evaluator**, not just a Provider.
- **Reuse existing infra.** The user already has ACP running (the shared production droplet), Base-native iNFT+6551+2981 agents (iCLONE/VEGETA), OG PASS on Base, and a Virtuals Compute gateway. ATLAS should ride this stack rather than re-deriving it. The agent/token/TBA-wallet triad ATLAS needs is **identical** to what iCLONE/VEGETA already implement.
- **Brain independence matters.** ATLAS is described as a Harness/Orchestrator — its planning loop is more than GAME's default. Recommend using GAME as the **Virtuals-facing adapter** (identity, wallet ops, ACP jobs) while ATLAS's real orchestration logic lives in the user's own Harness Engine (MEMORY `harness_engine`, which explicitly mandates **NO-LLM-in-signing-path** + durable event log). GAME's "wallet operator" role must be gated behind the Harness's signing invariants.
- **Economics to design for:** if ATLAS tokenizes, budget **100 $VIRTUAL** creation + bonding-curve seed, expect a **1% trade tax** flowing 30/20/50 post-graduation, and a **10-year-locked LP**. If ATLAS stays a pure service agent (no token), it still needs an **Agent Wallet holding $VIRTUAL** to pay/receive per-inference and ACP escrow.
- **Language:** TS SDK (`@virtuals-protocol/game`) is the most mature for plugins (Discord/Telegram) and pairs with `acp-node-v2` — likely ATLAS's primary integration surface. Python (`game_sdk`) available if the Harness brain is Python.
- **Verify before committing:** resolve the V2-vs-V3 bonding question and the team-allocation ambiguity before any public whitepaper/tokenomics claims for ATLAS.

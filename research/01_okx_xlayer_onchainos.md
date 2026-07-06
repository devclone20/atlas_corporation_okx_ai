# OKX X Layer OS + OnchainOS + okx.ai — Platform Architecture (Research 01)

Domain research for ATLAS (the "Atlas Corporation" 24/7 Harness/Orchestrator iNFT).
Scope: the foundation ATLAS lives on — the OKX chain (X Layer), the agent toolkit (OnchainOS), and the agent marketplace (okx.ai).
Date: 2026-07-05. Author: research agent. Rigor rule applied — only source-verified facts are stated plainly; anything inferred is marked `[UNVERIFIED]`.

---

## Sources fetched

| # | URL | Result |
|---|-----|--------|
| 1 | https://x.com/XLayerOfficial/status/2072662619979387264 | **FAIL — HTTP 402** (X/Twitter paywalls unauthenticated fetch). Content recovered indirectly via #6 and #14. |
| 2 | https://web3.okx.com/pt/onchainos/dev-docs/okxai/agent-installation-guide | **OK** — Claude Code install steps. |
| 3 | https://web3.okx.com/onchainos/dev-docs/okxai/agent-installation-guide | **OK** — full 4-agent install guide (OpenClaw, Hermes, Claude Code, Codex). |
| 4 | https://web3.okx.com/onchainos/dev-docs | **OK** — OnchainOS docs home (four core capabilities). |
| 5 | https://www.okx.ai | **FAIL — HTTP 403** (bot-blocked). Content recovered via #6 (the canonical learn article "OKX AI: A Marketplace for the Agent Economy"). |
| 6 | https://www.okx.com/en-us/learn/okx-ai | **OK** — okx.ai marketplace definition. |
| 7 | https://web3.okx.com/onchainos/dev-docs/home/agentic-wallet-overview | **OK** — Agentic Wallet overview (Wallet/Trade/Market/Payments). |
| 8 | https://www.okx.com/en-us/learn/agent-payments-protocol | **OK** — Agent Payments Protocol (APP). |
| 9 | https://www.okx.com/en-us/learn/onchainos-our-ai-toolkit-for-developers | **OK** — OnchainOS developer toolkit. |
| 10 | https://web3.okx.com/onchainos/dev-docs/wallet/agentic-wallet | **OK** — Agentic Wallet intro (email login, ~20 chains). |
| 11 | https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/about-xlayer | **OK** — X Layer technical facts (OP Stack). |
| 12 | https://web3.okx.com/onchainos | **OK** — OnchainOS landing page. |
| 13 | https://www.okx.com/en-us/help/okx-wallet-officially-launches-agentic-wallet | **OK** — Agentic Wallet launch (18 Mar 2026). |
| 14 | https://x.com/MetaEraHK/status/2034215465283957051 (3rd-party excerpt via search) | **PARTIAL** — corroborates Agentic Wallet / CLI / ~20 chains / gas-free on X Layer. Third-party, used only to corroborate. |
| 15 | https://web3.okx.com/learn/x-layer-architecture-migration-from-polygon-zkevm-to-op-stack | **FAIL — HTTP 404** at this path; migration fact confirmed via #11. |

---

## Key Facts

**The three-layer stack (chain → toolkit → marketplace):**

1. **X Layer = the chain.** An Ethereum Layer-2 built by OKX. Originally launched on **Polygon CDK / zkEVM**, it has **migrated to an enhanced OP Stack (optimistic rollup)** (src #11, corroborated by search #2). Facts from docs (#11): EVM-equivalent; trusted sequencer via `op-node` + `op-reth`; **up to 20,000 TPS**; **~1-second block times**; **7-day fraud-proof challenge period**; integrates **AggLayer** for cross-chain finality with ZK proofs; all L2 data published to L1. **Gas token = OKB** (fixed supply 21M post-burns; L1 OKB being phased out). Marketed elsewhere as ~5,000 TPS "negligible gas" (older Polygon-CDK-era article) — the OP Stack docs figure of 20,000 TPS is the current one.

2. **OnchainOS = the toolkit / "workstation".** OKX's open toolkit connecting AI agents (and developers) to onchain services across **60+ networks** (EVM + Solana), on the same infra as OKX Wallet (**1.2B+ daily API calls, $300M daily trading volume, sub-100ms response, 99.9% uptime, 12M+ monthly wallet users**) (src #9, #12). Tagline: **"Built for AI. Ready for Web3."** (#12). Exposes (per #4/#7/#9/#12): **Wallet, Trade, Market/Analyze, Payments**, plus **DApp Connect**. Landing page advertises **"9 skills, 72 features"** (#12).

3. **okx.ai (= "OKX AI") = the marketplace / agent economy.** "A marketplace where AI agents can **discover work, collaborate, transact, and build reputation onchain**" (src #6). Two connected sub-markets:
   - **Agent Marketplace** — developers list agents, define services + pricing, earn automatically when work completes.
   - **Task Marketplace** — agents post work, find the right agent, and **pay only when results are delivered**.

**Payment / settlement facts (src #6, #8, #12):**
- Payment currency to builders: **USDT or USDG** (stablecoins).
- Complex work → **escrow-based contracts**; standardized services → **instant pay-per-call**.
- **Dispute resolution = a staked network of evaluators, not a central platform.** (Directly relevant to ATLAS's ">=2 evaluator agents" design.)
- **Settlement happens on X Layer with "zero gas"** and is **"sub-cent viable at scale"** (src #8). Zero-gas is conditional: **"if executed on OKX's native chain X Layer"** (src #9).

**Agent Identity (src #6):** "Every agent on OKX AI operates under a **single onchain identity**" that "**persists across both escrow-based jobs and instant pay-per-call service requests**." OKX states it built three infrastructure pieces: **Agentic Wallet, Agent Identity, and the Agent Payments Protocol**, with underlying **EIPs supported by the Ethereum Foundation** (src #6). Note: the specific EIP numbers were **not** disclosed in fetched sources — see Open Questions.

**Agent Payments Protocol (APP) (src #8):** open standard for how agents "communicate and negotiate, pay for services, and pay each other." Works across **Solana and Ethereum** (multi-chain). Payment structures: **upfront, top-up/deduct, or plan-based**; payment types: **one-time, batch, pay-as-you-go, escrow (marked "coming soon")**. Implemented via a **Payment SDK**. The Payments capability is built on the **x402 protocol** (src #7, #9, #12).

**Agentic Wallet (src #7, #10, #13):**
- Launched **March 18, 2026** (src #13).
- Purpose-built for AI agents to hold assets and autonomously execute onchain transactions.
- **TEE security:** key generation, storage, and signing all happen inside a **Trusted Execution Environment**; keys are "untouchable" by anyone **including OKX** and never exposed to the LLM/agent (src #7, #10, #13).
- **Chains:** "nearly 20 chains" — explicitly **X Layer, Ethereum, Solana** + other majors, expanding (src #10). (Landing page says "17 networks" for the wallet specifically, #12.)
- **Onboarding:** **"Log in with email to create a wallet instantly — no seed phrase, no key configuration needed"** (src #10). This is how an agent obtains its wallet/identity.
- **Connection:** agents connect via **MCP or CLI** (src #13 summary / search #14, #9).
- **Safety:** every transaction is **simulated and risk-assessed before execution**, with plain-language description before approval (src #13, #6-ecosystem search).
- **Scale ops:** up to **50 sub-wallets**, batch transfers, parallel positions (src #7).

**Ecosystem backers of okx.ai (search #6 result):** AWS, Ethereum Foundation dAI Team, Solana, XMTP, Opentensor Foundation, AltLayer, SlowMist, CertiK, and others.

---

## How it works (step-by-step, agent lifecycle)

1. **Chain layer.** X Layer (OP Stack L2, OKB gas) is the settlement chain. On X Layer, agent payments are **gas-free** and use native **x402**.
2. **Wallet/identity layer.** An agent gets an **Agentic Wallet** by logging in with email — instant, no seed phrase. Keys live in a **TEE**; the agent can *transact but never read the key*. This wallet doubles as the agent's **single onchain identity** across the marketplace.
3. **Capability layer (OnchainOS).** The agent gains skills: Wallet (balances, broadcast, history), Trade (DEX aggregation across 500+ DEXs / 60+ networks), Market/Analyze (prices, smart-money, anomalies), Payments (x402 pay-per-use).
4. **Marketplace layer (okx.ai).** The agent either **lists services** (Agent Marketplace) or **posts/takes tasks** (Task Marketplace). It discovers paid work, negotiates via **APP**, and executes.
5. **Delivery + settlement.** Standardized work → instant pay-per-call; complex work → escrow contract. On completion, the builder is paid in **USDT/USDG**, settled on **X Layer (zero gas)**.
6. **Disputes.** Handled by a **staked network of evaluators** — not a central authority.
7. **Reputation.** Built onchain and tied to the persistent Agent Identity.

**Relationship summary:** **X Layer** is the *chain/rails* (settlement + zero-gas + x402). **OnchainOS** is the *SDK/OS/toolkit* an agent uses to touch that chain (wallet, trade, market, payments). **okx.ai** is the *marketplace/economy* layer where agents find and transact paid work. All three are OKX-built and interlock: okx.ai runs on OnchainOS capabilities, which settle on X Layer.

---

## Setup / Requirements — Claude Code installation flow (end to end)

From the official install guide (src #2, #3). The guide covers four clients: **OpenClaw, Hermes, Claude Code, Codex**. For **Claude Code**:

1. **Prerequisite:** a Google account **or** a Claude Pro/Max/Team/Enterprise subscription.
2. **Download & install** Claude from Anthropic's site (.dmg macOS / .exe Windows); launch it.
3. **Authenticate** with Anthropic or Google account; open the **Code** tab (switch to Code mode).
4. **Connect to OnchainOS** — run in the chat interface:
   ```bash
   npx skills add okx/onchainos-skills --yes -g
   ```
   (This installs the OnchainOS **skill pack** — verified verbatim, src #2/#3.)
5. **Log in to the Agentic Wallet** (email login) to enable on-chain operations.
6. **Result:** the agent can now "perform **balance queries, token swaps, market data lookups, and more** through natural language."

Common cross-agent pattern (src #3): install framework → obtain an **LLM API key** (DeepSeek / OpenAI / Anthropic / Gemini supported) → configure a chat channel (Telegram shown) → init wizard → launch → `npx skills add okx/onchainos-skills --yes -g` → log into Agentic Wallet.

**What identity/registration the agent gets:** an **Agentic Wallet** (email-created, TEE-held keys) which *is* its **single persistent onchain Agent Identity** on okx.ai. No seed phrase is issued to the operator. `[UNVERIFIED]` whether Agent Identity is a distinct on-chain registry/NFT separate from the wallet address, or simply the wallet address itself — sources describe it as "a single onchain identity" tied to the Agentic Wallet but do not show a registration contract or ID format.

---

## Costs & Fees

- **Gas on X Layer for agent payments: zero** (conditional on executing on X Layer) (src #8, #9, #12).
- **Payments described as "sub-cent viable at scale"** (src #8).
- **Builder payout currency: USDT or USDG** (src #6).
- **Claude Code:** requires a paid Anthropic subscription (Pro/Max/Team/Enterprise) or Google account; plus a separate **LLM provider API key** (not issued by OKX) (src #2/#3).
- **`[UNVERIFIED]` marketplace take-rate / platform fee:** No okx.ai commission, listing fee, escrow fee, or evaluator-staking economics were disclosed in any fetched source. Do **not** assume zero — unknown.
- **`[UNVERIFIED]` gas cost when settling off X Layer** (Ethereum/Solana/other of the ~20 chains): not quantified; zero-gas claim is X-Layer-specific.

---

## Security notes

- **TEE-isolated keys:** private keys are generated, stored, and used for signing entirely inside a Trusted Execution Environment; the LLM/agent and even OKX cannot read them (src #7, #10, #13). This is the core security guarantee and matches ATLAS's need to transact onchain without exposing keys to the model.
- **Pre-execution transaction simulation + risk assessment** on every transaction, with plain-language preview before approval (src #13).
- **Wallet features:** risk detection, approval revocation, multi-wallet isolation (up to 50 sub-wallets) (src #7).
- **Third-party security auditors in the ecosystem:** SlowMist and CertiK are named backers (search #6) — `[UNVERIFIED]` whether they audited the specific APP/Agentic-Wallet contracts.
- **Optimistic-rollup trust model:** X Layer has a **7-day fraud-proof window** (src #11). Funds bridged X Layer → L1 inherit that withdrawal latency (relevant if ATLAS moves earnings off-chain quickly).

---

## Risks & Gotchas

1. **"Zero gas" is X-Layer-only.** Any of the ~20 supported chains other than X Layer will incur normal gas. ATLAS should default settlement to X Layer.
2. **Escrow is "coming soon" (src #8).** For complex/escrow-based jobs the mechanism may not be fully live yet — verify current status before relying on it for ATLAS's dispatch→deliver flow.
3. **Two competing payment standards named:** docs describe both **x402** (OnchainOS Payments) and **APP / Agent Payments Protocol** as the payment layer. `[UNVERIFIED]` exact relationship — likely APP is the higher-level negotiation/commerce protocol and x402 is the low-level pay-per-call transport, but sources don't state this explicitly.
4. **Chain-migration flux.** X Layer moved from Polygon zkEVM to OP Stack; older OKX articles still cite zkEVM / 5,000 TPS / different tokenomics. Trust the OP-Stack docs (#11) for current facts; expect further "PP upgrade" changes to OKB gas economics.
5. **Twitter/X source (#1) was unfetchable (402).** The specific announcement in that post is not directly verified here — only reconstructed from OKX learn articles. If the post's exact claims matter, fetch it with an authenticated X tool.
6. **Marketplace economics opaque.** No fee/take-rate data — a material unknown for ATLAS's unit economics.
7. **Evaluator network is staked and decentralized** — ATLAS's own ">=2 evaluators before delivery" is *internal QA* and is distinct from okx.ai's *external staked dispute evaluators*. Don't conflate them.

---

## Open Questions

1. What are the **exact EIP numbers** behind Agent Identity / APP that the "Ethereum Foundation supports"? (Sources say "underlying EIPs" but give no numbers. Candidate to cross-check against ERC-8004 identity stack from ATLAS memory — `[UNVERIFIED]`.)
2. Is **Agent Identity** a separate on-chain registry/NFT, or just the Agentic Wallet address? What's the ID format?
3. **okx.ai fee/take-rate**, escrow fees, and evaluator-staking parameters?
4. Is **escrow live yet** or still "coming soon"? What's the current status of the Task Marketplace vs Agent Marketplace (GA vs beta)?
5. **Programmatic task discovery:** is there an **Open API / MCP endpoint** to *list open tasks* on the Task Marketplace, or is discovery only via natural-language skills? (Critical for ATLAS's 24/7 polling loop.)
6. **X Layer chain ID, public RPC URLs, x402 facilitator contract addresses** — not in fetched pages; need the RPC/reference section of the X Layer dev docs.
7. Exact content of the **XLayerOfficial post (status 2072662619979387264)** — blocked; re-fetch with auth.
8. How do **USDG vs USDT** settlement choices work, and is there FX/stablecoin risk?

---

## Implications for ATLAS

- **ATLAS's home rails are confirmed viable.** X Layer (OP Stack, OKB gas, zero-gas agent payments, x402-native) + OnchainOS toolkit + okx.ai marketplace map almost 1:1 onto ATLAS's spec: discover paid tasks → investigate → dispatch workers → evaluate → transact onchain.
- **Identity/wallet is turnkey.** ATLAS gets a **TEE-secured Agentic Wallet via email login** that is also its **persistent onchain Agent Identity**. No seed-phrase custody problem — keys never touch the model. This satisfies the iNFT agent's onchain-transaction requirement securely out of the box.
- **Claude Code path is the install route.** `npx skills add okx/onchainos-skills --yes -g` + Agentic Wallet login is the entire OnchainOS onboarding. ATLAS (built on/around Claude Code) can adopt this directly.
- **Two marketplaces to work.** ATLAS can be **both** a Task Marketplace *poster* (dispatching sub-tasks to worker agents and paying on delivery) **and** an Agent Marketplace *provider* (listing the Atlas Corporation's orchestration service for pay-per-call). This dual role fits the "Harness/Orchestrator" concept.
- **Settle on X Layer, USDT/USDG.** Default all settlement to X Layer for zero gas; budget in USDT/USDG.
- **Evaluators:** ATLAS's internal ">=2 evaluator agents" is a quality gate *before* delivery; okx.ai *also* has an external staked evaluator network for disputes. ATLAS should pass its internal QA to minimize ever reaching external dispute resolution.
- **Blockers to resolve before build:** (a) confirm a **programmatic task-discovery API/MCP** exists for the 24/7 loop (Open Q #5); (b) confirm **escrow is live** (Open Q #4); (c) obtain **X Layer chain ID / RPC / x402 contract addresses** (Open Q #6); (d) get **marketplace fee data** for unit economics (Open Q #3); (e) verify whether **Agent Identity == ERC-8004** to align with ATLAS's existing ERC agent trust stack (Open Q #1/#2).

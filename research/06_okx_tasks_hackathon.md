# OKX AI — Tasks Marketplace + Agent Program (Research for ATLAS Task-Intake Engine)

Research date: 2026-07-05
Author: research agent (domain 06)
Status of platform: **BETA**, launched 30 June 2026. OnchainOS toolkit GA 1 July 2026.

> RIGOR NOTE: `www.okx.ai` (the marketplace app itself — `/tasks`, `/tutorial`, `/agents`, `/`)
> returns **HTTP 403 to automated fetchers** (bot protection / JS-rendered SPA). It could NOT be
> scraped directly. All facts below are sourced from OKX-owned `okx.com` learn/help/docs pages,
> the OKX GitHub org (`okx/agent-skills`, `okx/onchainos-skills`), OKX web3 OnchainOS dev-docs,
> and tier-1 crypto press (The Block, Cointelegraph, Crypto Briefing, crypto.news) that quoted the
> live `okx.ai` pages. Where a fact comes only from press paraphrase of the (unscrapable) okx.ai
> UI, it is marked. Anything inferred is prefixed `[UNVERIFIED]`.

---

## Sources fetched

Directly fetched (HTTP 200):
- https://www.okx.com/en-us/learn/okx-ai — official OKX AI marketplace overview
- https://web3.okx.com/onchainos/dev-docs/home/what-is-onchainos — OnchainOS architecture + API areas
- https://www.okx.com/en-us/help/okx-ai-101 — OKX AI help (trading-bot / agent-kit focused)
- https://www.okx.com/en-us/learn/onchainos-our-ai-toolkit-for-developers — dev toolkit + x402 payments
- https://github.com/okx/agent-skills — okx trade CLI + skill modules
- https://github.com/okx/onchainos-skills/blob/main/CLAUDE.md — OnchainOS skills plugin internals
- https://cryptobriefing.com/okx-debuts-ai-marketplace-for-agent-discovery-and-tasks/
- https://www.theblock.co/post/406704/okx-ai-unveils-marketplace-for-agents-to-find-work-and-get-paid-in-stablecoins
- https://www.tradingview.com/news/cointelegraph:c4874acf0094b:0-okx-launches-ai-marketplace-for-autonomous-agent-economy/

Search-surfaced but NOT directly fetchable (403) — quoted via press/search snippets:
- https://www.okx.ai/ — homepage. Tagline: **"The future belongs to OPC: one person, one company, $1M a year."**
- https://www.okx.ai/tasks — the live task board (Task Hall)
- https://www.okx.ai/tutorial — "Choose Your Role in the AI Agent Economy" (roles: Builder/Provider, Task Poster, Evaluator)
- https://www.okx.ai/agents — "AI Agent Marketplace — Capable Agents for Every Category"

---

## Key Facts

1. **OKX AI = two connected marketplaces + settlement/identity/reputation/dispute layer.**
   - **Agent Marketplace** (`okx.ai/agents`): "Developers list AI agents, define services and pricing, and earn automatically when work is completed."
   - **Task Marketplace / Task Hall** (`okx.ai/tasks`): "Agents post work, find the right agent, and pay only when results are delivered."
   - OKX's own pitch: **"Think Upwork for Agents with our fintech infrastructure and 150M scale in the background."**

2. **Who posts tasks?** The marketplace is designed as agent-to-agent commerce, but OKX and press explicitly state agents work "for one another, **and humans**." A human (or an agent acting for a human) posts a task with a bounty; agents bid; the work is delivered and settled onchain. → **This validates ATLAS's core loop: a poster publishes a paid task, ATLAS discovers it, bids/does it, delivers, gets paid.**

3. **Two work/registration modes** (an agent must register as one or both):
   - **A2MCP (Agent-to-MCP)** — standardized MCP/API services (data queries, price feeds, utility APIs). **Pay-per-call, no negotiation.** Requires **OKX Payment SDK integration before going live.**
   - **A2A (Agent-to-Agent)** — agents **negotiate price, scope, delivery terms**; payment runs through **escrow**; provider paid **only after the user signs off.**
   - Both modes feed **one shared onchain reputation** via the **OKX Agentic Wallet** identity.

4. **Payment currency:** **USDT (Tether)** and **USDG (Paxos Global Dollar)** stablecoins.

5. **Settlement rails:** OnchainOS **Payments = x402 protocol** — autonomous, pay-per-use, **zero gas on X Layer**.

6. **Identity:** single **onchain identity per agent**, held in the **OKX Agentic Wallet** (keys generated + signed inside a **TEE**; **email-based setup**). Reputation is portable across A2A and A2MCP and persists across apps.

7. **Dispute resolution is decentralized**, not OKX-run: a **staked network of Evaluators** arbitrates. Evaluators **stake ≥ 100 OKB**, must stay **online 24/7**; arbitration is assigned **randomly, weighted by stake**; **wrong/timed-out votes are slashed**; majority voters **split 5% of the task bounty + slashed stakes** of the losers.

8. **Launch partners** (credibility signal, not gates): AWS, AltLayer, CertiK, Ethereum Foundation, Solana Foundation, Opentensor Foundation, DAPPOS, StraitsX.

9. **Compatible agent clients:** Claude Code, Codex, Hermes, OpenClaw (all **MCP-compatible**). ATLAS (Claude-based) is natively compatible.

10. **Install path for the toolkit:** `npx skills add okx/onchainos-skills` (also `/plugin marketplace add okx/onchainos-skills` → `/plugin install onchainos-skills` in Claude Code). Docs: `web3.okx.com/onchainos/dev-docs/`.

---

## Task schema (fields)

> The full live schema is rendered client-side on `okx.ai/tasks` (403 to scrapers). The fields below
> are reconstructed from the documented A2A/A2MCP lifecycle described by OKX + press. Field NAMES are
> `[UNVERIFIED]` exact strings; the CONCEPTS are verified.

Verified lifecycle-derived fields for an A2A task:
- **Task title / description** — natural-language spec of the work (verified concept).
- **Bounty / reward** — amount escrowed, paid in **USDT or USDG** (verified). The poster funds the escrow contract once both parties agree.
- **Visibility** — **Public listing** ("opens the task to all agents in the Task Hall") vs. targeted/direct (verified).
- **Scope & delivery terms** — negotiated between poster and provider before escrow funding (verified).
- **Acceptance / rejection** — after delivery the user **accepts or rejects**; rejection → arbitration (verified).

`[UNVERIFIED]` likely-present fields (standard for such a board; confirm against live UI):
- `id` (task identifier), `category`/`tags`, `deadline`/`timeline`, `evaluation criteria`, `delivery format`, `status` (open/bidding/in-escrow/delivered/disputed/closed), `poster identity/reputation`, `bids[]`.

For an A2MCP service (not a "task" but a listed callable):
- Service name, endpoint/skill, **per-call price**, category (data query / price feed / utility API). No deadline, no negotiation — pay-per-call.

---

## Real task examples (categories + sample tasks seen)

> **HONESTY:** I could NOT render the live `okx.ai/tasks` board (403), so I cannot quote live task
> IDs/rewards verbatim. No press outlet reproduced individual live task rows. What IS verified:

- **Agent Marketplace tagline:** "AI Agent Marketplace — Capable Agents for **Every Category**" (categories exist but the list is not published in fetchable text).
- **A2MCP service categories (verified, named by OKX):** data queries, price feeds, utility APIs.
- **Domain categories implied by the OKX skill ecosystem** (from `okx/agent-skills` + `okx/onchainos-skills`): market data / technical indicators, trading (spot/perp/futures/options), portfolio & P&L, grid/DCA bots, DeFi/earn, smart-money analytics, news/sentiment, DEX swaps across 500+ DEXs / 60+ chains, token discovery, meme/"trenches" scanning.
- `[UNVERIFIED]` Given the "Upwork for agents" + "OPC / $1M-a-year" framing, expect general knowledge-work bounties too (research, content, code, data extraction, analysis) — ATLAS's sweet spot — but this must be confirmed by reading the live board with an authenticated/browser session.

**ACTION for ATLAS build:** the FIRST integration step is to load `okx.ai/tasks` in a real
browser session (or via the OKX Payment SDK / OnchainOS once credentialed) and snapshot 20–50 live
task rows to lock down the exact field names, categories, and typical reward sizes.

---

## Discovery + submission API (endpoints/auth if any)

**There is NO publicly documented dedicated REST/WebSocket API to `LIST tasks` and `SUBMIT deliverables` on the Task Marketplace as of 2026-07-05.** Do not assume one exists. What genuinely exists:

- **OnchainOS Open API** (RESTful) + **MCP Server** + **Skills** — three access pathways. Documented API product areas are **Wallet, Trade, Market, Payments (x402)**. These are the *plumbing* (identity, balances, swaps, market data, pay-per-use settlement). **None of the fetchable docs expose a `tasks.list` / `tasks.bid` / `tasks.submit` endpoint.** The `okx/onchainos-skills` `CLAUDE.md` confirms: **no Task Hall / bidding / deliverable-submission / escrow commands** in the skill set — it is on-chain ops only.
- **Payments = x402 protocol** (HTTP-402-based pay-per-use), zero gas on X Layer — this is how settlement is invoked programmatically.
- **OKX Payment SDK** — explicitly required for **A2MCP providers** to integrate "before going live." This is the closest thing to a real onramp API for offering paid services; its full spec is behind the (unscrapable) developer portal.
- **Auth model:** the **Agentic Wallet** (TEE-held key, email-based setup) IS the identity/auth primitive. Programmatic calls are authorized by that wallet's signatures, not a classic API key. (The exchange trading side uses `~/.okx/config.toml` OAuth/API-key; that is the *trading* CLI `@okx_ai/okx-trade-cli`, a different product from the marketplace.)

**Net:** task discovery/bidding/submission currently flows through the **marketplace app + Agentic Wallet + x402/Payment SDK**, with the client-facing surface being the **MCP/Skills** layer inside compatible agents (Claude Code etc.) — **not** a separately published task REST API. `[UNVERIFIED]` A task API may ship as the beta matures; monitor `web3.okx.com/onchainos/dev-docs/`.

---

## Payment/settlement

- **Escrow (A2A, complex work):** both parties agree → poster **funds escrow contract** → provider delivers → poster **accepts (funds release)** or **rejects (→ arbitration)**. Provider paid **only after sign-off**. If rejected and the counterparty **does not arbitrate, the poster reclaims the bounty.**
- **Pay-per-call (A2MCP, standardized services):** instant settlement per request via **x402**, no negotiation, no escrow.
- **Currency:** USDT / USDG.
- **Gas:** **zero gas on X Layer** for x402 payments.
- **Arbitration economics:** Evaluators stake **≥100 OKB**, 24/7 uptime; random stake-weighted assignment; **majority split 5% of the bounty + slashed minority stakes**; losing/timed-out evaluators are **slashed**. → Bad delivery is not just unpaid; it can trigger a dispute ATLAS could *lose* (bounty withheld) — quality is economically enforced.

---

## Hackathon rules/timeline/deadlines

- **There is NO dedicated "OKX AI hackathon" with published rules/deadline as of 2026-07-05.** OKX AI is a **live beta marketplace/program**, not a time-boxed hackathon. The relevant "deadlines" are the launch milestones:
  - **30 June 2026** — OKX AI marketplace **beta launch**.
  - **1 July 2026** — OnchainOS toolkit availability (per the okx.com learn page).
- **Separate, unrelated OKX hackathons exist** (do NOT conflate with OKX AI):
  - **X Layer "Hook the Future" Hackathon** — Uniswap V4 Hooks on X Layer; submissions close **23:59 UTC, 28 May 2026** (already closed). Dual-track judging (AI scoring + human experts).
  - **Mantle Hackathon** — 22 Oct 2025 → 7 Feb 2026, $150K prizes (closed).
  - **OKX Solana Accelerate Hackathon** (OKX DEX API) and a general **OKX Web3 Developer Challenge / "Build-X" 2026** program page exists.
- `[UNVERIFIED]` If the user's "OKX AI hackathon" refers to a specific event tied to ATLAS's submission, it is **not documented on public OKX pages I can reach** — likely a private/partner track or an internal deadline. **Confirm the exact event + deadline with the user** rather than assuming the marketplace beta == a hackathon.

---

## Eligibility/KYC

- **Marketplace-agent participation:** search/press indicate the **AI marketplace itself is positioned as "No KYC"** for agent participation — onboarding is via the **Agentic Wallet (email-based)**, not full exchange identity verification. `[UNVERIFIED]` — treat as provisional; OKX may gate stablecoin cash-out or higher tiers.
- **OKX exchange KYC** (relevant only if converting/withdrawing via the CEX side) **does** apply on `okx.com`, and OKX enforces **regional restrictions** (notably: all **US** states/territories, plus Canada, Hong Kong, India, Japan, Malaysia, Nigeria, and sanctioned jurisdictions). If ATLAS ever off-ramps USDT/USDG through OKX exchange, KYC + geo-eligibility bite there.
- **Evaluator eligibility:** stake **≥100 OKB** + 24/7 uptime (only relevant if ATLAS also wants to earn as an evaluator — a possible secondary revenue loop).

---

## Risks & Gotchas

1. **`okx.ai` is unscrapable by plain HTTP (403).** The intake engine cannot naively `curl` the task board. It needs a **real browser context (headless Chromium / Playwright)** or the **authenticated OnchainOS/Payment SDK** path. Plan for JS rendering + bot-protection.
2. **No documented task-list/submit REST API.** Building the intake engine on an assumed endpoint would fail. Integrate via **Agentic Wallet + x402/Payment SDK + MCP skills**, and reverse-engineer the board's XHR calls from a browser session.
3. **Rejection risk is real and staked.** A bad delivery can go to arbitration; ATLAS may forfeit the bounty and take a reputation hit. Quality gate before submit is non-optional.
4. **Reputation is cold-start.** "No track record → less likely to get hired." ATLAS needs a bootstrapping strategy (start with small/cheap A2MCP calls to build reputation before bidding on large A2A bounties).
5. **Gas/settlement lock-in to X Layer + OKB.** Evaluator route needs OKB; payments assume X Layer. Budget for that.
6. **"Hackathon" is likely a misnomer** for what is actually a live beta program — verify the real deadline/event.
7. **Beta volatility.** Schema, fees, and SDK surface will change; the intake engine must be resilient to field/endpoint drift.

---

## Open Questions

1. Exact **task JSON schema** and field names on `okx.ai/tasks` (needs live browser snapshot).
2. Is there (or will there be) a **programmatic `tasks.list` / `bid` / `submit`** endpoint, or is bidding UI/agent-mediated only?
3. **Full OKX Payment SDK spec** (auth, calls) for A2MCP go-live — behind dev portal.
4. Real **category taxonomy** and **typical reward ranges** on the live board.
5. **KYC/geo posture** for *withdrawing* stablecoin earnings vs. merely earning them onchain.
6. Whether the "OKX AI hackathon" the user references is a **specific gated event** with its own rules/prize/deadline (not found publicly).
7. How **bidding** works mechanically — do agents poll the Task Hall, or is there a push/notification/subscription channel?

---

## Implications for ATLAS (how the intake engine should poll + respond)

**Discovery (poll):**
- Do NOT rely on a public task REST API — it isn't documented. Build discovery on a **headless browser session against `okx.ai/tasks`** (bypasses the 403) AND, in parallel, credentialed **OnchainOS/Payment SDK** access once the Agentic Wallet is provisioned. Capture the board's underlying **XHR/GraphQL calls** to get structured task rows.
- Register ATLAS's identity via the **OKX Agentic Wallet (email setup, TEE keys)** first — this is the auth spine for everything.
- Poll the **Task Hall public listings**; filter tasks to ATLAS's competency set; rank by (reward ÷ estimated effort) × (win probability given competition/reputation).

**Registration strategy:**
- Register **both A2MCP and A2A**. Use **A2MCP** (pay-per-call standardized services) to **bootstrap reputation cheaply and fast** (requires **OKX Payment SDK** integration). Then bid on higher-value **A2A** bounties once reputation exists.

**Respond / deliver:**
- For A2A: negotiate scope/price → **only start real work after escrow is funded** → deliver → get sign-off. Enforce an internal **quality gate before submit** (rejection is staked/arbitrated; a lost dispute = no pay + reputation damage).
- Price to the "high quality / low price" thesis, but **not so low** it fails to cover a possible dispute forfeiture. Model expected value including rejection probability.

**Settlement:**
- Denominate in **USDT/USDG**; settle via **x402 on X Layer** (zero gas). Track earnings in the Agentic Wallet.

**Guardrails:**
- Treat schema/endpoints as unstable (beta) — abstract the intake behind an adapter so a future official task API can be swapped in.
- Consider a **secondary Evaluator role** (stake ≥100 OKB) as an additional revenue loop and reputation signal — only after core intake works.

---

### One-line for the build backlog
Auth = Agentic Wallet (email/TEE) → discover via headless browser on `okx.ai/tasks` (no public API) → register A2MCP (Payment SDK) to bootstrap rep → bid A2A, work only after escrow funds → quality-gate → deliver → sign-off → paid in USDT/USDG via x402 on X Layer. Beware staked arbitration on rejects.

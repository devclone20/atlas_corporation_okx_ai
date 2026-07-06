# 05 — OKX Agentic Wallet (OnchainOS)

Research domain for **ATLAS** — a 24/7 Harness/Orchestrator iNFT agent that must hold funds and sign onchain transactions autonomously on OKX **X Layer**.

Focus: how ATLAS gets a wallet, holds keys, signs, and pays. Strong security lens.

> RIGOR NOTE: Facts below are drawn from OKX official docs, the OKX Agent Payments Protocol (APP) whitepaper v1.0, and OKX learn/help pages, cross-checked with reputable press (The Block, Cryptobriefing). Anything not directly stated in a fetched source is prefixed **[UNVERIFIED]**. No commands or key-handling behavior were invented — CLI/MCP commands quoted are verbatim from the OKX `onchainos-skills` GitHub README.

---

## Sources fetched

Primary (OKX official):
- OnchainOS dev docs — Install your agentic wallet (pt): https://web3.okx.com/pt/onchainos/dev-docs/home/install-your-agentic-wallet
- Agentic Wallet — Introduction: https://web3.okx.com/onchainos/dev-docs/wallet/agentic-wallet
- Agentic Wallet — Overview (Build for AI Agent): https://web3.okx.com/onchainos/dev-docs/home/agentic-wallet-overview
- Agentic Wallet — Skills: https://web3.okx.com/onchainos/dev-docs/wallet/agentic-wallet-skills
- What is OnchainOS: https://web3.okx.com/onchainos/dev-docs/home/what-is-onchainos
- Payments — Overview: https://web3.okx.com/onchainos/dev-docs/payments/overview
- OKX Agent Payments Protocol (learn): https://www.okx.com/en-us/learn/agent-payments-protocol
- APP Whitepaper v1.0 (PDF, April 2026): https://web3.okx.com/whitepaper/okx-app-whitepaper.pdf  *(binary/glyph-subset PDF — could not text-extract cleanly; content below sourced from OKX learn pages + press summaries of the same whitepaper)*
- OKX keyless wallet (consumer MPC, for contrast): https://www.okx.com/en-us/help/what-is-okx-keyless-wallet
- GitHub — okx/onchainos-skills (README): https://github.com/okx/onchainos-skills

Secondary (press, cross-check only):
- The Block: https://www.theblock.co/post/399490/okx-agent-payments-protocol-ai-business-cycles-quotes-disputes-transactions
- Cryptobriefing: https://cryptobriefing.com/okx-ai-agent-payments-protocol-launched/
- OneKey blog (third-party analysis): https://onekey.so/blog/ecosystem/okx-onchain-os-launches-agentic-wallet-convenience-without-giving-up-user-control-20260318173612/

---

## Key Facts

1. **The Agentic Wallet is a dedicated, self-custodial, TEE-secured onchain wallet built specifically for AI agents.** OKX describes it as "self-custodial, TEE-secured, session keys for autonomous signing" across 20+ chains. It turns an agent from a query assistant into an onchain executor that can hold assets, sign, and submit transactions.
2. **Custody model = keys live inside a Trusted Execution Environment (TEE), not with the agent and not with OKX.** OKX repeats: "key generation, storage, and signing all happen inside TEE. No one can touch the private key, not even OKX." The agent can *request* actions but cannot read/export the key.
3. **Onboarding is email + OTP; no seed phrase.** "Log in with email to create a wallet instantly — no seed phrase, no key configuration needed." A wallet is auto-generated on first login. Supports **up to 50 sub-wallets** per login for isolated positions / parallel strategies.
4. **Install is one command via the OKX `onchainos-skills` package** (skills / MCP server / CLI). Production requires OKX Developer Portal API credentials (`OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE`).
5. **~20+ chains including X Layer, Ethereum, Solana, Base, BSC, Arbitrum, Polygon.** Payments (APP / x402) settle on **X Layer** with zero/low gas.
6. **The wallet is the signing layer for the Agent Payments Protocol (APP).** APP defines 4 intents — **charge, escrow, session, upto** — plus an off-chain **Broker** orchestration service. Escrow ("funds held until delivery verified") is marked **coming soon** at whitepaper v1.0 (April 2026).
7. **Pre-signing risk pipeline is built in:** identity verification, blacklist address interception, risky-token alerts, transaction risk simulation + scoring, and one-click revoke of malicious approvals.

---

## Wallet architecture (type, key custody, signing)

**Type — [UNVERIFIED, but strongly implied] a TEE-hosted EOA with session keys.**
- OKX consistently calls it "self-custodial" with "session keys for autonomous signing." That phrasing is EOA/session-key language, not smart-account (ERC-4337) language. The docs do **not** explicitly say ERC-4337 smart account, MPC, or account abstraction.
- Contrast with OKX's **consumer keyless wallet**, which *is* MPC: a private key split into 3 shares (device / OKX server / iCloud-or-Google-Drive cloud backup), 2-of-3 to sign. The **Agentic Wallet is described differently** — TEE custody, not 3-share MPC. Treat them as **two separate products**. [UNVERIFIED] whether the Agentic Wallet internally also uses MPC *inside* the TEE; OKX marketing only asserts TEE.

**Key custody.**
- Private key is **generated, stored, and used for signing entirely inside a TEE** (a hardware-isolated secure enclave). Per OKX: keys "never leave the TEE."
- Neither the AI agent, the developer, nor OKX can access or export the raw key. The agent holds only an authenticated *session* / API capability to request signatures, not the key material.

**Signing without exposing keys.**
- The agent submits a transaction *intent* (natural language → structured tx) through the skill/MCP/CLI/API layer.
- The request is authenticated (session key / API credential), passes the risk pipeline (identity check, blacklist, risky-token, risk simulation + scoring), and only then is signed **inside the TEE**.
- The signed transaction is returned/broadcast; the key never crosses the enclave boundary.
- **Session keys** are the autonomous-signing primitive: scoped, delegated signing authority so a 24/7 agent can sign within bounds without a human per-tx and without holding the root key. [UNVERIFIED] exact scope parameters (per-chain, per-contract, per-amount, TTL) — docs assert session keys exist but do not publish the full policy schema.

---

## Setup / Install steps

All commands below are **verbatim from the `okx/onchainos-skills` GitHub README** (MIT license, latest ~v4.1.0).

**Recommended (auto-detects environment):**
```
npx skills add okx/onchainos-skills
```

**Claude Code (plugin marketplace):**
```
/plugin marketplace add okx/onchainos-skills
/plugin install onchainos-skills
```

**MCP server (Claude Code):**
```
claude mcp add --scope user onchainos-cli onchainos mcp
```

**Standalone CLI (macOS / Linux):**
```
curl -sSL https://raw.githubusercontent.com/okx/onchainos-skills/main/install.sh | sh
```
**Standalone CLI (Windows PowerShell):**
```
irm https://raw.githubusercontent.com/okx/onchainos-skills/main/install.ps1 | iex
```

**Wallet creation flow (in-agent):** agent logs in via **email → OTP** (or API key) → wallet auto-generated on first login. No seed phrase. Up to 50 sub-wallets per login.

**Credentials (production):** from OKX Developer Portal (https://web3.okx.com/onchain-os/dev-portal), set as env vars:
```
OKX_API_KEY="your-api-key"
OKX_SECRET_KEY="your-secret-key"
OKX_PASSPHRASE="your-passphrase"
```
README explicitly warns: *"Never commit `.env` to git and never expose credentials in logs, screenshots, or chat messages."* Default sandbox keys ship for testing only.

**Skills bundle (each is a separately usable skill):**
| Skill | Purpose |
|---|---|
| `okx-agentic-wallet` | Wallet ops, gas station, DEX swaps, cross-chain bridges, transaction gateway, security scanning |
| `okx-agent-payments-protocol` | Unified payment dispatch across **x402** (TEE/local-key signing), **MPP**, and **a2a-pay** |
| `okx-dex-market` / `okx-dex-token` / `okx-dex-signal` / `okx-dex-trenches` / `okx-dex-social` | Market data, token metadata, smart-money/whale signals, meme scanning, news/sentiment |
| `okx-defi-invest` | Deposits/withdrawals on Aave, Lido, PancakeSwap, Kamino |
| `okx-dapp-discovery` | Routing to Polymarket, Aave V3, Hyperliquid, PancakeSwap V3, Morpho |

**Wallet skill actions (from Skills doc):** login (email OTP / API key), logout, login-status, create/switch/list sub-wallets (up to 50), query balances, total valuation across 17 chains, deposit addresses, send/batch-send/consolidate, tx history (filter by chain/token/direction/hash), token safety analysis, DApp phishing detection, tx risk assessment, signature validation, approval management/review.

---

## Funding & spending controls

**Funding.**
- The wallet exposes **deposit addresses** per chain; fund it like any onchain address by transferring tokens in. [UNVERIFIED] whether OKX exchange → Agentic Wallet has a native one-click deposit path vs. plain onchain transfer.
- For payments, buyers run a **pre-funded / pay-as-you-go** wallet that "autonomously spend[s] across multiple services." Payments settle on **X Layer** with **zero/low gas** (OKX: "zero gas, sub-cent viable at scale").
- APP `session` and `upto` intents imply **pre-authorized budgets** (a session with a spending cap) — the natural funding model for a 24/7 agent.

**Spending controls / policy (what is documented):**
- **Blacklist address interception** — blocks sends to flagged addresses.
- **Risky-token alerts** and **transaction risk simulation + scoring** before every signature; anomalies blocked immediately.
- **Identity verification** before transactions.
- **Malicious-approval detection + one-click revoke** of token approvals.
- **Sub-wallet isolation** (up to 50) to cap blast radius per strategy.
- **Session keys** → scoped, time/amount-limited autonomous signing. **[UNVERIFIED]** the exact configurable limit set (per-tx cap, daily cap, allow/deny contract lists, TTL). OKX asserts the primitive but has not published the policy schema in the fetched pages.
- APP `upto` intent = an explicit **spending ceiling** for a deal/session.

**Gap:** No fetched OKX doc publishes a concrete, developer-facing **spending-limit policy config** (e.g., "max X USDC/day, allowlist these contracts"). This must be confirmed against the live Developer Portal / SDK reference before ATLAS relies on it.

---

## How it connects to ASP escrow + Payment SDK

**The stack (OnchainOS "Payments"):**
- **Agent Payments Protocol (APP)** — open standard, whitepaper v1.0 April 2026. Treats each commercial interaction as a **first-class object with a lifecycle** (state machine + delivery verification + configurable dispute windows), not a one-shot transfer.
- **Four intents:** `charge` (pay), `escrow` (hold-until-delivery), `session` (ongoing metered relationship), `upto` (spend-ceiling).
- **Broker** — a protocol-defined **off-chain orchestration service** that "mints payment objects, verifies credentials, and broadcasts settlement." This is the coordination layer between counterparties.
- **Payment SDK** — sellers/ASPs drop it into a DApp or MCP service to accept per-call payments "in a few lines of code," no gateway/registration. Runs on **X Layer**, zero/low gas.
- **Transport standards:** built on **x402** (HTTP 402 pay-per-call, gas-free), **MPP**, and **a2a-pay** (agent-to-agent). The `okx-agent-payments-protocol` skill dispatches across all three.

**ASP (Agentic Service Provider).**
- ASPs are participants who **build agents, deploy skills, and sell services** through the OKX AI marketplace. In an ATLAS context, ATLAS can be **both** a buyer (paying ASPs for data/compute/sub-agent work) **and** an ASP (selling orchestration as a service, accepting APP payments via the Payment SDK).

**Escrow flow (as described; escrow itself marked "coming soon" at v1.0):**
1. Discover counterparty / **quote** + negotiate scope and price.
2. **Escrow lock** — payer's funds locked (APP `escrow` intent; Broker mints the payment object).
3. Work delivered by the ASP / sub-agent.
4. **Delivery verification** → **settle**: payment released on verification.
5. **Dispute window** (configurable) if delivery contested. **[UNVERIFIED]** who/what arbitrates — no fetched source names the arbitration authority or on-chain dispute contract; this is the least-specified part of the protocol.

**Where the Agentic Wallet fits:** it is the **signing + fund-holding layer** underneath APP. The wallet holds the balance, and its TEE **signs** the escrow lock, the settlement, and the x402 pay-per-call — autonomously via session keys. Escrow is coordinated by the Broker; funds custody/signing is the wallet.

**Two distinct payment modes for ATLAS:**
- **A2MCP / x402** — instant pay-per-call (e.g., "pay $0.001 for this market-data call"), settled inline with the HTTP request. Low value, high frequency, no escrow.
- **A2A escrow jobs** — higher-value delegated work ("hire a sub-agent to do research"), funds escrowed until delivery. Higher value, needs the (forthcoming) escrow + dispute machinery.

---

## Security notes (threat model + best practices for a 24/7 droplet)

**What OKX's design gives you (in your favor):**
- **Root key is not on your droplet.** The signing key lives in OKX's TEE, so a full compromise of the ATLAS droplet does **not** directly leak the private key. This is the single biggest security advantage over a self-hosted hot-wallet keystore (`.env` PRIVATE_KEY) on the same box.
- Pre-signing risk pipeline (blacklist, risk scoring, risky-token, approval scanning) is a real second line of defense.

**What the droplet still fully controls — and therefore your real attack surface:**
- The **session credential / API key** (`OKX_API_KEY` + `OKX_SECRET_KEY` + `OKX_PASSPHRASE`) and any **session key** ATLAS holds. **Whoever steals these can instruct the TEE to sign** — up to whatever the session policy allows. The key never leaks, but the *authority to spend within limits* does. **This is the crux of the threat model.**
- The **agent's decision loop.** Prompt-injection / poisoned tool output can make ATLAS *choose* to send funds to an attacker (within limits, to a non-blacklisted address). The TEE will happily sign an authorized-but-malicious tx. LLM-in-the-signing-path is the danger — keep the LLM out of the final authorization decision (matches the project's NO-LLM-in-signing-path invariant).

**Best practices for the 24/7 droplet:**
1. **Secrets never on disk in plaintext.** Load `OKX_*` from a secrets manager / KMS / systemd `LoadCredential`, not a committed or world-readable `.env`. README itself mandates `.gitignore` + no logging of creds. Rotate on any suspicion.
2. **Tightest possible session-key scope.** Cap per-tx and per-day amount, allowlist destination contracts/addresses, short TTL, auto-renew under monitoring. Confirm the exact policy schema against the Developer Portal before trusting defaults.
3. **Segregate funds.** Use sub-wallets: an operating wallet with a small float for autonomous spend; keep the treasury in a separate wallet/multisig the agent cannot reach. Never let the 24/7 session key control the whole balance.
4. **Human/policy gate above a threshold.** Require out-of-band approval for transfers over a ceiling and for new-counterparty escrow. `upto`/`session` ceilings enforce this at the protocol layer.
5. **Harden the decision loop against prompt injection.** Deterministic policy checks (allowlist + amount + rate) *outside* the LLM must gate every signature request. Treat all external tool/data output as untrusted.
6. **Monitoring + kill switch.** Alert on every signed tx; be able to instantly **revoke the session key / rotate API creds** to freeze the agent. Verify OKX exposes a fast revocation path (see Open Questions).
7. **Least privilege on the droplet:** non-root service user, egress firewall to OKX endpoints only, no inbound, full audit log of every intent → signature.

---

## Risks & Gotchas

- **Trust anchor = OKX's TEE + OKX's servers.** "Self-custodial" here means *you* control access via credentials, but **OKX operates the enclave and the Broker.** If OKX's TEE attestation, key-management service, or Broker is compromised/unavailable, ATLAS cannot sign. This is a **centralization / availability dependency** — not the same trust model as a locally held key. **[UNVERIFIED]** whether there is any user-held recovery/"emergency escape" for the Agentic Wallet (the consumer keyless wallet has one; the agentic wallet's recovery path is **not documented** in fetched sources → key-loss/recovery is an open question).
- **Escrow + dispute resolution are "coming soon"** at whitepaper v1.0. **Do not design ATLAS around escrow safety guarantees that are not yet shipped.** A2A escrow jobs may not be production-ready; x402 pay-per-call is the mature path.
- **Dispute arbitration authority is unspecified.** No fetched source names who resolves a disputed escrow. High-value A2A jobs carry counterparty risk until this is clarified.
- **API-key theft = spend authority.** The vaunted "key never leaves TEE" does **not** protect you from stolen session credentials. Do not let TEE custody create false confidence.
- **Prompt-injection → authorized malicious spend.** TEE signs whatever passes policy; policy must be strong and LLM-independent.
- **Sandbox keys shipped by default.** Ensure ATLAS never runs production with the repo's default sandbox creds.
- **`curl | sh` install path** — the CLI installer pipes a remote script to a shell. Pin/verify before running on a production droplet.
- **Wallet type not formally documented** (EOA vs smart-account vs MPC-in-TEE). Marketing says "session keys" + "TEE." Architecture decisions for ATLAS should not assume ERC-4337 features (bundlers, paymasters, on-chain policy modules) until confirmed.
- **X Layer settlement dependency.** Zero-gas payments assume X Layer; multi-chain execution still needs gas on other chains (gas-station skill exists, but budget for it).

---

## Open Questions

1. **Exact session-key policy schema** — what limits are configurable (per-tx cap, daily cap, destination allowlist, contract allowlist, TTL, auto-renew)? Not published in fetched docs. Verify in Developer Portal / SDK reference.
2. **Recovery / key-loss model for the Agentic Wallet** — is there an "emergency escape" or backup, or is access purely via the OKX login/credential? If OKX is unavailable, can funds be recovered? Undocumented.
3. **Revocation speed** — how fast can a session key be revoked / API creds rotated to freeze a compromised agent? Is revocation on-chain or a server-side flag?
4. **Is the Agentic Wallet an EOA, a smart account, or MPC-inside-TEE?** Formal confirmation needed.
5. **Dispute arbitration** — who/what resolves escrow disputes; is there an on-chain contract or an OKX-operated arbiter?
6. **Escrow GA date** — when does `escrow` intent leave "coming soon"?
7. **Tokens** — which stablecoin(s) settle payments on X Layer (USDC/USDT/other)? Not named in fetched sources.
8. **TEE provider / attestation** — which enclave (SGX/TDX/Nitro/other), and is remote attestation exposed so ATLAS can verify it's talking to a genuine TEE?
9. **Rate limits / availability SLA** for the signing service under 24/7 load.

---

## Implications for ATLAS

- **Baseline recommendation:** the OKX Agentic Wallet is a **credible custody+signing layer for ATLAS** and materially *better than a plaintext hot key on the droplet*, because the root key never touches ATLAS's box. Adopt it as the signing layer, but **treat the session credential as the crown jewel** and architect around its theft, not around key extraction.
- **Design the fund topology now:** small **operating sub-wallet** (autonomous session-key spend, tight limits) + separate **treasury** ATLAS cannot unilaterally drain (multisig / human-gated). Enforce `upto`/`session` ceilings.
- **Keep the LLM out of the signing decision.** A deterministic policy engine (allowlist + amount + rate + counterparty checks) must gate every intent before it reaches the TEE. This aligns with the project's stated NO-LLM-in-signing-path and non-collapsible-gates invariants.
- **Payments:** lead with **x402 pay-per-call (A2MCP)** for buying data/compute — it's mature, gas-free on X Layer, and low-blast-radius. **Defer reliance on A2A escrow** until escrow + dispute resolution are GA and the arbitration model is clear.
- **ASP posture:** ATLAS can *also* be an ASP — accept APP payments via the Payment SDK for orchestration-as-a-service. Same wallet, both directions.
- **Blockers to resolve before production:** (a) confirm session-key limit schema, (b) confirm revocation speed + kill-switch, (c) confirm recovery/key-loss path, (d) confirm settlement token. Until (a)–(c) are answered, ATLAS should run with **conservative manual ceilings and a hot kill-switch**, not full autonomy over the treasury.

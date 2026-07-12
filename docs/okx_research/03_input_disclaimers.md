# OKX / X Layer — Input-Schema Conventions & Error-Proof Service Descriptions for ATLAS

**Agent:** ATLAS · OKX ASP #4460 · X Layer (`xlayer`, chainIndex `196`)
**Date:** 2026-07-07
**Method:** READ-ONLY. Only `--help` and file reads were run against the droplet. No state was changed.
**Purpose:** Canonical OKX/onchainos input conventions + 5 ready-to-paste `serviceDescription`s + 1 agent-level disclaimer line, all OKX-compliant and error-proof.

---

## PART A — OKX Input-Convention Rules (with citations)

Every rule below is sourced from the live onchainos CLI `--help` output and the on-droplet OKX skill references. Citations point to the exact file/command.

### A.1 — How OKX requires an ASP to declare a service (the on-chain `--service` schema)

The `serviceDescription` you paste is a **field inside the `--service` JSON**, parsed identically by `agent create`, `agent update`, and `agent validate-listing`. Getting a key wrong silently breaks the call.

Source: `identity-invariants.md` §"Input contract — `--service` JSON + flag gotchas" and `identity-register.md` §3–4.

| Key | Required | Rule (verbatim from the schema) |
|---|---|---|
| `serviceName` | yes | 5–30 chars, noun phrase. NOT equal to the agent name. No price in the name. |
| `serviceDescription` | yes | **2 parts, on separate lines**: ① core-capability summary (what it does + who it's for) ≤200 CJK chars · ② what the buyer must provide ≤200 CJK chars. **Total ≤400 CJK chars.** Length is counted in **East-Asian display width (CJK = 2, ASCII = 1)** — matches the backend. |
| `serviceType` | yes | Raw enum only: `A2MCP` (= "API service", pay-per-call fixed price) or `A2A` (= "agent to agent", negotiated/off-chain price). Never the localized label. |
| `fee` | A2MCP: yes · A2A: optional | A **plain number as a JSON string**, e.g. `"10"` (quoted, never bare `10`). **USDT is the implicit and only currency — no suffix/symbol.** ≤6 decimals. `"10 USDT"`, `"5元"`, `"approx 10"` are rejected. A2MCP with no fee → shows as `free`; A2A with no fee → `negotiable`. |
| `endpoint` | A2MCP only | Public `https://…`, really deployed, ≤512 chars, permanent on-chain. **Omit entirely for A2A.** Rejected: `http://`, `localhost`, `127.0.0.1`, RFC-1918 IPs, `*.local`/`*.internal`, mock/placeholder URLs. |
| `operation` / `id` | update flow only | Omit on create/register. |

**Agent-level vs service-level description (the #1 mix-up):** the *agent* description is the top-level `--description` flag; each *service* description is `serviceDescription` **inside** the `--service` JSON. Different field, different place. (Source: `identity-invariants.md`.)

### A.2 — What is BANNED in `serviceDescription` (hard QA gates)

Source: `identity-register.md` §3 (Step 2) and §4 (semantic checks); `identity-invariants.md` §Input contract.

The description **must not contain**:
- **Example prompts** ("e.g. type: swap 5 USDC…").
- **Links** — no GitHub, no wallet links, no URLs of any kind.
- **Tech-stack / infra details** (framework names, backend, model names, "runs on X").
- **Disclaimers of liability / legal disclaimers.**

It **must**:
- Follow the 2-part structure (① capability summary ② what buyer provides).
- Use a descriptive service **name** (a noun phrase, not a single letter like "Q").
- Not leak the agent's own name as the service name; not embed a price in the name.

> Consequence of the "no disclaimers-of-liability" rule: the buyer-input guidance we want ("send lowercase 0x addresses, human units…") is **allowed and expected** — it IS the mandated Part ② ("what the user must provide"). What is banned is *legal* disclaimers ("not financial advice", "no warranty", "use at own risk"). The Virtuals-style refund/SLA disclaimer therefore lives at the **agent-description** level (Part C), phrased as facts, not as a liability waiver — and even there, kept lean.

### A.3 — Token identification (contract address, not ticker)

Source: `swap.md` §"Native Token Addresses" / §"Token Address Resolution"; `bridge.md` §"Token Address Resolution"; `onchainos swap quote --help`.

- Tokens are identified by **contract address**, passed to `--from` / `--to`. `swap quote --help` labels them literally "Source token contract address" / "Destination token contract address".
- **EVM contract addresses must be all lowercase.** (`swap.md` §Global Notes: "EVM contract addresses must be all lowercase"; `bridge.md`: mixed-case is converted to lowercase.) The same symbol has a **different address on every chain** — never a ticker, never guessed.
- The CLI accepts a small set of symbol aliases (`TOKEN_MAP`: `sol eth bnb okb matic pol avax ftm trx sui usdc usdt dai weth wbtc wbnb wmatic`), but **buyers of an external MCP endpoint should always pass explicit lowercase 0x addresses** — aliases are a CLI convenience, not a contract for third-party callers.
- **Native token** sentinel addresses (used instead of a real CA): EVM `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`; Solana `11111111111111111111111111111111`; Sui `0x2::sui::SUI`. (Source: `swap.md`.)

### A.4 — Amount units (human/readable vs minimal/wei)

Source: `onchainos swap quote/swap --help`, `cross-chain quote/swap --help`; `amount-display.md`.

The CLI exposes **two mutually-exclusive** amount inputs:
- `--readable-amount` — "Human-readable amount (e.g. `1.5` for 1.5 USDC). CLI fetches token decimals and converts automatically."
- `--amount` — "Amount in minimal units (wei/lamports)."

**For a buyer-facing MCP endpoint, require human/readable units** — it is the least error-prone (the caller does not need to know each token's decimals). This matches the Virtuals ACP convention ("amount_in (human units)"). Internally ATLAS resolves decimals via `token info`. `amount-display.md` confirms the atomic⇄human relationship (`human = atomic / 10^decimals`; USDC/USDT/USDG = 6 dp, ETH = 18 dp).

### A.5 — Chain identifiers (names vs chainIndex vs CAIP-2)

Source: `chain-support.md`; `onchainos swap quote --help` / `cross-chain --help`.

- The onchainos CLI accepts **human-readable chain names** and resolves them automatically: `ethereum`, `solana`, `xlayer`, `base`, `bsc`, `polygon`, `arbitrum`, `sui`, etc. (`swap quote --help`: "Chain (e.g. ethereum, solana, xlayer)").
- **Canonical name for X Layer is `xlayer`** (chainIndex `196`; testnet `xlayer_test` = `1952`). (`chain-support.md`.)
- `chainIndex` (e.g. `196`, `1`, `8453`, `501`) is the numeric on-chain identifier used in responses; it is **not** required as input where a name works.
- **CAIP-2 / eip155 is NOT the onchainos input format.** Do not ask buyers for `eip155:196`. Ask for the plain name (`xlayer`).
- **Recommend defaulting to `xlayer`** where unspecified (zero gas, fast) — `swap.md` §Step 2 does exactly this.

### A.6 — Recipient / wallet fields

Source: `swap swap --help`, `cross-chain quote/swap --help`, `bridge.md`.

- **Quotes are wallet-free.** `swap quote` takes **no** wallet/recipient — it is a pure read-only price estimate. Do not require a wallet for a quote-only service.
- `swap swap` (build tx) requires `--wallet` ("User wallet address").
- Cross-chain: `--wallet` is the sender; `--receive-address` is the destination address. It is **optional for same-family (EVM→EVM) pairs** (defaults to sender) but **required for heterogeneous (EVM⇄non-EVM) pairs** — the server returns error `82202` when missing. When supplied, its address **family must match `--to-chain`**. (`cross-chain quote --help`.)

### A.7 — Slippage defaults (two different conventions — do not confuse)

Source: `swap swap --help`, `cross-chain quote/swap --help`, `swap.md`.

- **Same-chain swap:** slippage is a **percent** (`--slippage 1` = 1%). Omit → **autoSlippage** (recommended default). Never pass `--slippage` to `swap quote`. (`swap swap --help`; `swap.md` §Step 2.)
- **Cross-chain bridge:** slippage is a **decimal in (0, 1]** (`0.01` = 1%, `0.5` = 50%), **default `0.01` (= 1%)**. (`cross-chain quote/swap --help`.)
- Practical buyer-facing default to state: **omit slippage → auto (swap) / 1% (bridge)**. Only accept an explicit value when the buyer requests it.

### A.8 — Deadlines

Source: `task-user-actions-publish.md`; `cross-chain`/`swap` help (no deadline flags).

- **No user-set deadline on swap/bridge/quote calls** — there is no `--deadline` flag; quote calldata simply "expires in minutes; re-run if stale" (`swap.md` §Global Notes; `bridge.md` §Quote freshness).
- For **task-marketplace (A2A) jobs**, acceptance/delivery deadlines are **server-managed** — the ASP does not pass `--deadline-open` / `--deadline-submit`. (`task-user-actions-publish.md`.) So a service description should **not** promise a buyer-configurable deadline.

### A.9 — Failure / refund / SLA norms (so the disclaimer states them accurately)

Source: `task-core.md` §"Critical Field Mapping Table" (task `status` + `paymentMode` + `vote`); `task-user-actions-publish.md` (escrow / x402).

OKX Task Marketplace runs on X Layer with an **on-chain escrow / arbitration** model. The authoritative task `status` semantics:

| status | Meaning (funds flow) |
|---|---|
| `1` accepted / `2` submitted | job in progress / delivered |
| `3` rejected | user rejected the deliverable |
| `4` disputed | escalated to Evaluator arbitration (commit-reveal vote) |
| `6` complete | **funds released to ASP** |
| `7` close | **funds returned to the user** |
| `9` failed | **arbitration refunds the user** |

`paymentMode`: `1` = escrow, `3` = x402. Arbitration `vote`: `0` = Approve → **User wins, funds refunded**; `1` = Reject → ASP wins, funds released.

**Accurate, non-overpromising phrasing** for a disclaimer:
- A2A jobs are **escrowed on X Layer**; on failed delivery or a successful dispute, **the buyer's funds are returned** (status `close`/`failed`; arbitration Approve).
- A2MCP (pay-per-call, x402) is **fixed-price per call**; a failed call does not deliver a result.
- Do **not** claim a blanket "full refund" you can't enforce; the enforceable claim is "on-chain escrow with Evaluator arbitration; funds return to buyer on non-delivery/dispute."

### A.10 — Service-specific input contracts (distilled from `--help`)

| Service | Minimum clean inputs |
|---|---|
| **Swap quote (read-only)** | `--from` (lowercase 0x CA), `--to` (lowercase 0x CA), `--chain` (name), `--readable-amount` (human). **No wallet.** Slippage N/A on quote. |
| **Swap route/tx (build)** | above **+ `--wallet`**; optional `--slippage <pct>` (else auto), `--gas-level`. |
| **Cross-chain quote** | `--from`, `--to`, `--from-chain`, `--to-chain`, `--readable-amount`; `--receive-address` required for EVM⇄non-EVM; slippage decimal, default `0.01`. |
| **Cross-chain build** | above **+ `--wallet`** (sender) + `--receive-address` for heterogeneous pairs. |
| **Token query** | `--chain` + query (name/symbol/address) or CA. |

---

## PART B — Five Ready-to-Paste `serviceDescription`s

Each is a 2-part block (① what/who · ② "Provide: …") on **separate lines**, OKX-compliant: no example prompts, no links, no tech-stack, no legal disclaimers, ≤400 CJK display-width, noun-phrase name, USDT-implicit fee. **Paste the Description block verbatim into `serviceDescription`.** Suggested `serviceName` and `serviceType` are given for each. All addresses/units/chains use the canonical OKX conventions from Part A.

> Width note: all five Description blocks are pure ASCII, so display-width = character count. Each is well under the 400 cap (largest ≈ 300).

---

### Service 1 — A2A · "Research & Analysis"
- **serviceName:** `Onchain Research & Analysis`
- **serviceType:** `A2A`
- **serviceDescription** (paste both lines):

```
On-demand token, wallet and market research on X Layer and major chains: token fundamentals, holder concentration, liquidity, risk and price context, delivered as a structured written report for traders, agents and treasuries.
Provide: 1. subject as a lowercase 0x contract address (EVM) or exact token symbol; 2. chain by name (xlayer, ethereum, solana, base, bsc, arbitrum); 3. the questions to answer; 4. desired output format. Tickers alone without a chain may be ambiguous.
```

---

### Service 2 — A2A · "Best-Fee Swap Routing"
- **serviceName:** `Best-Fee Swap Routing`
- **serviceType:** `A2A`
- **serviceDescription** (paste both lines):

```
Finds the lowest-fee same-chain swap route across 500+ DEX sources and returns the optimal path, expected output, price impact and gas, plus honeypot and tax checks, for traders and agents wanting best execution on one chain.
Provide: 1. token-in as a lowercase 0x contract address; 2. token-out as a lowercase 0x contract address; 3. chain by name (default xlayer); 4. amount in human units (e.g. 1.5). Slippage optional, defaults to auto. Native token uses the eee sentinel address.
```

---

### Service 3 — A2A · "Best-Fee Bridge Routing"
- **serviceName:** `Best-Fee Bridge Routing`
- **serviceType:** `A2A`
- **serviceDescription** (paste both lines):

```
Compares cross-chain bridge routes (Stargate, Across, Relay, Mayan and more) and returns the cheapest, fastest or max-output path with expected receive, minimum receive, fee and ETA, for users moving assets between chains at best cost.
Provide: 1. token-in as a lowercase 0x address on the source chain; 2. token-out as a lowercase 0x address on the destination chain; 3. from-chain and to-chain by name; 4. amount in human units; 5. destination receive address, required when source and destination are different chain families.
```

---

### Service 4 — A2A · "Smart Contract Build & Deploy"
- **serviceName:** `Smart Contract Build & Deploy`
- **serviceType:** `A2A`
- **serviceDescription** (paste both lines):

```
Designs, builds and deploys audited-pattern smart contracts (tokens, vaults, access control and custom logic) to X Layer and EVM chains, returning verified source, address and deploy transaction, for founders and teams shipping on-chain.
Provide: 1. contract type or a plain-language spec of the behaviour; 2. target chain by name (default xlayer); 3. constructor parameters and token metadata; 4. deployer wallet address; 5. any owner, mint or fee settings. Ambiguous specs are confirmed before deploy.
```

---

### Service 5 — A2MCP · "Best-Route Swap Quote" (API service)
- **serviceName:** `Best-Route Swap Quote`
- **serviceType:** `A2MCP`
- **endpoint:** `https://atlasapi.cloneframe.io/mcp/swap-quote`
- **serviceDescription** (paste both lines):

```
Pay-per-call read-only endpoint returning the best same-chain swap quote across 500+ DEX sources: expected output, price impact, route and gas, for agents and apps needing a fast programmatic quote. Read-only, no funds move.
Provide: 1. token-in, lowercase 0x contract address; 2. token-out, lowercase 0x contract address; 3. chain, name string such as xlayer; 4. amount, human units such as 1.5. Native token uses 0xeee...eee. No wallet needed for a quote.
```

> Param-name reconciliation for the MCP endpoint: the task states params `token-in`, `token-out`, `chain`, `amount`. The Description above uses those exact human labels. Ensure the endpoint's actual JSON schema keys match what buyers are told (recommend `token_in` / `token_out` / `chain` / `amount` as JSON keys, documented server-side). Buyers should send **lowercase 0x addresses, a chain name, and a human-unit amount** — never tickers, wei, chainIndex, or CAIP-2.

---

## PART C — Agent-Description Disclaimer Line (Virtuals-ACP style, adapted to OKX/X Layer)

Place this at the **agent level** (top-level `--description`), not inside any service (per A.2, service descriptions ban disclaimers). Phrased as facts, not a liability waiver, so it passes OKX QA. Two options:

**Compact (recommended, ~fits alongside a short agent bio):**

```
Inputs: lowercase 0x contract addresses (not tickers), amounts in human units, chains by name (xlayer, ethereum, base, bsc, arbitrum, solana). Quotes are read-only; swaps/bridges default to auto/1% slippage unless you set it. A2A jobs run in X Layer escrow — funds return to the buyer on non-delivery or a successful dispute.
```

**Fuller (if the agent description has room):**

```
How to work with ATLAS — Inputs: token-in / token-out as lowercase 0x contract addresses (never tickers), amount in human units, chain by name (xlayer default). Cross-chain needs from-chain, to-chain, and a destination receive address for cross-family transfers. Quotes are read-only and need no wallet. Same-chain swap slippage defaults to auto; bridge to 1%. Pay-per-call (A2MCP) is fixed-price per call. A2A jobs are escrowed on X Layer with Evaluator arbitration: on non-delivery or a dispute resolved for the buyer, funds are returned.
```

---

## Quick reference — what a buyer MUST pass, per convention

| Field | Correct | Wrong (causes failure) |
|---|---|---|
| Token | lowercase `0x…` contract address (or `0xeee…eee` for native) | ticker `USDC`, mixed-case, guessed address |
| Amount | human units `1.5` | wei/minimal `1500000`, "approx" |
| Chain | name `xlayer` / `base` / `ethereum` | `196`, `eip155:196`, CAIP-2 |
| Recipient | `--wallet` (build) / `--receive-address` (cross-family bridge) | omitted on heterogeneous bridge → err 82202 |
| Slippage (swap) | omit → auto, or percent `1` | decimal `0.01` (that's the bridge format) |
| Slippage (bridge) | omit → `0.01`, or decimal `0.5` | percent `50` |
| Fee (listing) | `"10"` (string, USDT implicit) | `10`, `"10 USDT"`, `"5元"` |

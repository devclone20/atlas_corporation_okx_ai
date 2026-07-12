# X Layer Operating Guide for ATLAS

**Scope:** How ATLAS (LIVE OKX ASP #4460, operating wallet `0xaefc572b72178b0bf1c45bdee43d1ab2bceffab0`, X Layer / chainIndex 196) must behave on-chain: settlement, tokens, gas, chain-id conventions, wallet-policy discipline, and safe `onchainos` command patterns.

**Method:** Facts below are cross-checked against (a) the on-droplet OKX skills that drive the exact CLI ATLAS runs — authoritative for behavior — and (b) public OKX/X Layer docs. Where a source is weaker or a claim couldn't be confirmed first-party, it is flagged **[UNCONFIRMED]**.

Date compiled: 2026-07-07. All CLI reads below were done READ-ONLY (`--help`, `wallet status`, `wallet chains`, token `--help`). No send/swap/sign/bridge was executed.

---

## 1. X Layer chain facts

| Fact | Value | Source |
|---|---|---|
| Chain name (OKX internal) | `okb` (chainName), showName **"X Layer"**, alias `xlayer` | `onchainos wallet chains` (droplet, READ-ONLY) |
| chainIndex / chainId | **196** | droplet + [chainid.network/196] |
| CAIP-2 identifier | **`eip155:196`** | OKX Go x402 package README: "X Layer (`eip155:196`) — USDT, EIP-3009" |
| Native / gas token | **OKB** (fixed supply 21M; L1 OKB phased out) | OKX xlayer docs; chainid.network |
| EVM-equivalent | Yes — enhanced OP Stack + AggLayer settlement, ~1s blocks | X Layer docs / Aug-2025 "PP Upgrade" |
| Public RPC (primary) | `https://rpc.xlayer.tech` | chainid.network/196 |
| Public RPC (fallback) | `https://xlayerrpc.okx.com` | chainid.network/196; OKX |
| Block explorer | `https://www.oklink.com/xlayer` (OKLink); OKX also runs its own explorer | chainid.network/196 |
| Testnet | `xlayer_test`, chainIndex **1952** (wallet-address creation supports it) | droplet chain-support.md |

> ATLAS never needs to hand-manage RPC or explorer URLs — the `onchainos` backend routes all reads/writes. RPC/explorer are listed for human debugging only.

**"Zero gas" — the precise, non-marketing truth.** X Layer's own gas is *negligible*, not literally zero. There are two distinct "gasless" mechanisms, and confusing them causes stuck/failed txs:

1. **x402 stablecoin transfers (the one that matters for ATLAS settlement).** On 2025-12-17 OKX announced **0-gas USDT/USDC transfers on X Layer**, "powered by OKX's self-developed x402 protocol." Mechanism: **EIP-3009 `transferWithAuthorization`** — the payer signs an off-chain authorization; an **OKX-sponsored relayer/facilitator broadcasts and absorbs the OKB gas**. This is what settles ATLAS's paid work: the settlement leg costs ATLAS **0 gas** and needs **no OKB** in the wallet. (Sources: OneKey ecosystem post 2025-12-17; OKX Go x402 README; payments skill.)
2. **Gas Station (pay gas with a stablecoin).** A *separate*, general mechanism for ordinary sends/contract-calls. **On the OKX Agentic Wallet, the Gas Station on-chain path (EIP-7702 delegation) is currently Solana-only** per the droplet's authoritative matrix (`_shared/chain-support.md`: Gas Station supported chains = Solana `501` only). **Do NOT assume ATLAS can pay X Layer gas with USDT via Gas Station.** For X Layer, the wallet skill's own note is the operative rule:

   > "X Layer gas-free: X Layer (chainIndex 196) charges zero gas." — `okx-agentic-wallet/SKILL.md`

   i.e. the wallet treats native X Layer transfers/calls as effectively free at the point of use; there is no need to fund the wallet with OKB for routine ops. **[FLAG]** These two statements (skill says "X Layer charges zero gas" vs docs say "negligible gas") are reconciled as: *for the flows the OKX wallet stack sponsors on X Layer (stablecoin transfers via x402, and routine wallet ops), the user pays nothing; the relayer covers OKB.* Do not generalize "zero gas" to arbitrary heavy contract deployments — see §6.

---

## 2. Settlement token & the settlement mechanic

### The token: USD₮0
- **Contract:** `0x779ded0c9e1022225f8e0630b35a9b54be713736` on X Layer. Confirmed via OKLink explorer read → token resolves as **USD₮0**. (READ-ONLY on-chain confirmation.)
- **Decimals:** **6** (USDT-family standard; also matches the payments skill amount-display table for the USD-stable family). Base units: `1 USD₮0 = 1_000_000`.
- **Standard:** implements **EIP-3009 `transferWithAuthorization`** → enables the gasless, relayer-broadcast settlement. This is the token the OKX x402 facilitator settles in on X Layer ("X Layer (`eip155:196`) — USDT, EIP-3009").
- **USD₮0 vs bridged USDT:** USD₮0 is the **canonical/native USD-tether representation** wired into the x402 flow on X Layer (the address above). A *bridged* USDT (a wrapped/`.e`-style variant) is a **different contract** and is **not** the x402-sponsored asset. **Rule: ATLAS settles and holds working balance in USD₮0 at exactly `0x779ded0c…713736`. Never substitute a look-alike "USDT" address** — the wallet skill explicitly warns that wrapped/bridged look-alikes (wETH/wBTC/etc.) can be malicious clones; always use the address from a token lookup or explicit config, never one retyped from memory.
- **USDG:** a second stablecoin the payments stack recognizes (6 decimals; appears in the skill's amount-display table and as the `aggr_deferred` example asset). It is an **alternate accept**, not ATLAS's settlement currency. ATLAS's policy is USD₮0-denominated; treat USDG only if a counterparty's 402 offers *only* USDG and the owner has approved it. **[FLAG]** No first-party USDG contract address was confirmed in this pass.

### How x402 "exact" settles (the flow ATLAS uses to get paid / to pay)
The OKX facilitator is a standard x402 facilitator (Coinbase-compatible: `/verify`, `/settle`, `/supported`), operated by OKX. **[UNCONFIRMED — endpoint path]** The exact base path is most plausibly under `https://web3.okx.com/.../api/v6/pay/x402/{verify,settle,supported}`, but the live docs page (`web3.okx.com/build/dev-docs/x402/x402-introduction`) is JS-rendered and returned 404/empty to fetch; the **numeric `/api/v6/pay/x402/*` path was inferred, not read first-party.** ATLAS does **not** call these endpoints by hand — the `onchainos payment` subcommands do it. Treat the endpoint path as an implementation detail, not something ATLAS constructs.

**`exact` scheme (the default, immediate settlement):**
1. ATLAS (or its counterparty) hits an HTTP **402** carrying `PAYMENT-REQUIRED` (x402 v2, base64 JSON) or a body with `x402Version` (v1). Fields: `network` (`eip155:196`), `asset` (USD₮0 contract), `amount` (base units, 6-dec), `payTo`.
2. ATLAS runs **`onchainos payment pay --payload '<raw_402>'`** (add `--selected-index <n>` only when a multi-scheme prompt let the owner pick a specific accept). The CLI **decodes, TEE-signs the EIP-3009 authorization**, assembles the header itself, and returns `{authorization_header, header_name, scheme, wallet}`.
3. ATLAS **replays** the original request with `<header_name>: <authorization_header>`; expects **HTTP 200**. Decode any `PAYMENT-RESPONSE` header locally (`base64 -d | jq`) for `status`/`transaction`/`amount`/`payer`.
4. **`exact` = settles immediately** — `status`/`transaction`/`amount`/`payer` are final. (Contrast `aggr_deferred`: facilitator settles **asynchronously**; `status: pending` means **"settling", not failure** — report accordingly and do not retry.)

**Signing surface facts that constrain ATLAS behavior:**
- The secp256k1 key **never leaves the TEE**; the signature is bound to `(from, to, value, nonce)` and cannot be retargeted or replayed past its deadline. This is the on-chain enforcement behind ATLAS's **NO-LLM-in-signing-path** rule — the LLM only assembles the *payload string*; the enclave does the crypto.
- **Never auto-retry a failed `pay`/`a2a-pay`.** Every retry burns a fresh EIP-3009 nonce+signature; if it failed for `insufficient_balance`, retrying just wastes signatures. Surface the seller error (priority: `reason` → `detail` → `message` → `msg` → `error`) and stop.
- Local-key fallback (`payment pay-local`) exists for `exact`+EIP-3009 / `exact`+Permit2 / `upto`, **but** it signs with a raw key **outside the TEE** → it violates ATLAS's NO-LLM/TEE discipline. **ATLAS must use the TEE path (`payment pay`) only.** Do not fall back to `pay-local`.

---

## 3. Wallet & behavior rules for the agent

### 3a. Agentic wallet = TEE session key (confirmed live)
`onchainos wallet status` (READ-ONLY) returns for ATLAS's account:
- `loggedIn: true`, `loginType: "email"` (`<owner-email>`), `accountCount: 1`, `currentAccountName: "Account 1"`.
- Signing is TEE-resident (session key inside the enclave). The LLM never holds the private key — matches ATLAS's NO-LLM-in-signing-path invariant.

### 3b. Policy discipline — the $100/day cap is REAL and set (confirmed live)
`wallet status.policy` returns exactly:
```json
"dailyTransferTxFlag": true,   "dailyTransferTxLimit": "100",  "dailyTransferTxUsed": "0",
"dailyTradeTxFlag":    false,  "dailyTradeTxLimit":   "",
"singleTxFlag":        false,  "singleTxLimit":       ""
```
Reading:
- **Transfer cap is ON at $100/day** (`dailyTransferTxFlag:true`, limit `100`). This is the owner-cold-wallet drain guard. A `send` that would push `dailyTransferTxUsed` over 100 will be blocked/confirming.
- **Trade (swap) cap is OFF** and **single-tx cap is OFF**. **[FLAG for owner]** Swaps and single transfers are *not* independently bounded by policy today — the only hard limit is the aggregate daily *transfer* cap. If ATLAS is expected to move value only to the whitelisted cold wallet, confirm the **whitelist** is enforced (the transfer cap alone does not pin the destination). Whitelist enforcement was not verifiable from `wallet status`; verify via the wallet policy/whitelist surface before relying on it.
- **Operational rule:** ATLAS treats **$100/day** as a hard ceiling on outbound transfers to the owner cold wallet. Never pass `--force` to bypass a policy confirmation on the first attempt (per skill: `--force` only after the CLI returns `confirming` exit-code 2 *and* the owner explicitly confirms). For an autonomous agent, that means: **if a transfer returns `confirming` because of the cap, STOP — do not self-confirm.**

### 3c. Gas behavior on X Layer
- **Settlement (x402/USD₮0):** 0 gas, relayer-sponsored, no OKB needed. This is the normal earning/paying path.
- **Routine wallet ops on X Layer:** the wallet stack treats X Layer as gas-free at point of use; ATLAS does not need to hold OKB for ordinary sends/contract-calls on 196.
- **Gas Station (stablecoin-pays-gas) is Solana-only** on this wallet today — **do not** wire X Layer flows to expect `--gas-token-address/--relayer-id` Gas Station params. If a future X Layer op *does* need gas, check readiness first with the read-only `onchainos wallet gas-station status --chain xlayer` and branch on its `recommendation` — never assume.
- **Best-fee routing:** for any swap/cross-chain leg, get a **quote first** (`swap quote` / `cross-chain quote`, both READ-ONLY) and let the aggregator pick the route; `cross-chain quote --sort 0` = optimal (default), `1` = fastest, `2` = max output.

### 3d. Do's & don'ts to avoid stuck/failed X Layer txs
**Do:**
- Denominate USD₮0 amounts in **base units × 10^6** when using `--amt`/`--amount`; or use `--readable-amount` and let the CLI fetch decimals.
- Echo any address/txHash **verbatim from fresh CLI stdout** — never from memory (funds-loss integrity rule).
- Simulate before broadcasting non-x402 txs; if `executeResult:false`, show `executeErrorMsg` and **do not broadcast**.
- Respect `confirming` (exit 2): show `message`, get explicit human confirm, only then re-run with `--force`.

**Don't:**
- Don't retry a failed `payment pay` / `a2a-pay` (fresh nonce each time; wasted signatures).
- Don't use a look-alike "USDT" contract — only USD₮0 `0x779ded0c…713736`.
- Don't `pay-local` (raw key, non-TEE) — breaks the signing-path invariant.
- Don't self-`--force` past the $100/day transfer cap.
- Don't assume Gas Station on X Layer (Solana-only today).

---

## 4. Chain-id conventions — which identifier to pass where

The `onchainos` CLI resolves human names, numeric indexes, and aliases. Use this precedence:

| Context | Pass this | Notes |
|---|---|---|
| Any `onchainos ... --chain` flag (wallet/swap/cross-chain/gateway/token) | **`xlayer`** (preferred) or **`196`** | Both resolve. `xlayer` is the documented alias; `196` is the chainIndex. The CLI also accepts `okb` (internal chainName) but **avoid it** — ambiguous with the OKB token. |
| `--from-chain` / `--to-chain` on `cross-chain` | `xlayer` / `196` | Same resolution. |
| Inside an **x402 402 payload** (`network` field / CAIP-2) | **`eip155:196`** | This is the wire format the protocol uses; you don't construct it — the seller sets it, the CLI reads it. |
| `payment subscription` default | defaults to `xlayer` / `196` if `--chain` omitted | per subscription.md. |
| Wallet-address creation | `xlayer` (196), testnet `xlayer_test` (1952) | 7 address-creation chains: xlayer, xlayer_test, solana, ethereum, base, bsc, arbitrum. |

**Rule of thumb:** pass **`xlayer`** to the CLI; expect **`eip155:196`** on the x402 wire; never speak internal `okb` chainName to avoid token/chain confusion. If <100% sure a name resolves, run `onchainos wallet chains` first.

---

## 5. Concrete command patterns ATLAS uses to DELIVER on X Layer

All state-changing forms below are shown for *reference*; per the skills, ATLAS runs them only inside a confirmed flow, appends `--format json` for machine parsing, and never `--force` on first invocation. **READ-ONLY reads are always safe to run.**

**Get paid / pay a counterparty (x402 — the core earning path):**
```bash
# 1) On HTTP 402, hand the raw PAYMENT-REQUIRED value to the TEE signer:
onchainos payment pay --payload '<raw_402_base64>' [--selected-index <n>] --format json
# 2) Replay original request with returned <header_name>: <authorization_header>; expect 200.
# exact => final; aggr_deferred => status:pending == "settling", not a failure.
```

**Deliver a "swap" service (best-fee, on X Layer):**
```bash
onchainos swap quote --chain xlayer \
  --from 0x779ded0c9e1022225f8e0630b35a9b54be713736 --to <dest_token> \
  --readable-amount 10 --format json          # READ-ONLY price/route estimate
onchainos swap chains --format json           # READ-ONLY: confirm xlayer support
onchainos swap liquidity --chain xlayer       # READ-ONLY: liquidity sources
# execution (only in a confirmed flow): onchainos swap execute ...  (NOT run here)
```

**Deliver a "cross-chain / bridge" service:**
```bash
onchainos cross-chain quote --from-chain xlayer --to-chain <dst> \
  --from 0x779ded0c9e1022225f8e0630b35a9b54be713736 --to <dst_token> \
  --readable-amount 25 --slippage 0.01 --sort 0 \
  --wallet 0xaefc572b72178b0bf1c45bdee43d1ab2bceffab0 --check-approve --format json  # READ-ONLY
# For EVM->non-EVM add --receive-address (server returns 82202 if missing).
# execution: onchainos cross-chain execute ...  (NOT run here)
```

**Deliver "token info / security" reads (safe, common ASP service):**
```bash
onchainos token info       --chain xlayer --address <token> --format json   # name/symbol/decimals
onchainos token report     --chain xlayer --address <token> --format json   # info+price+advanced+security in one
onchainos token advanced-info --chain xlayer --address <token> --format json # risk/creator/concentration
```

**Gas / gateway (diagnostics before any raw broadcast):**
```bash
onchainos gateway gas       --chain xlayer --format json    # current gas prices (usually negligible)
onchainos gateway simulate  --chain xlayer ...              # dry-run BEFORE broadcast
onchainos wallet gas-station status --chain xlayer          # READ-ONLY readiness (expect: not needed on 196)
```

**Wallet self-checks (run at session start):**
```bash
onchainos wallet status                                    # login + policy (the $100 cap lives here)
onchainos wallet balance --chain xlayer \
  --token-address 0x779ded0c9e1022225f8e0630b35a9b54be713736   # USD₮0 working balance
onchainos wallet chains                                    # confirm xlayer/196 resolution
```

**Outbound transfer to owner cold wallet (respect the cap):**
```bash
onchainos wallet send --chain xlayer \
  --recipient <owner_cold_wallet> \
  --contract-token 0x779ded0c9e1022225f8e0630b35a9b54be713736 \
  --readable-amount <=100/day --format json
# If CLI returns confirming (exit 2) due to the daily cap => STOP; do not self --force.
```

---

## 6. Uncertainties / flags to resolve with the owner

1. **[UNCONFIRMED] x402 facilitator endpoint path.** `/api/v6/pay/x402/{verify,settle,supported}` under `web3.okx.com` is *inferred* (Coinbase-compatible pattern + OKX docs host), not read first-party — the live doc page 404'd to fetch. ATLAS doesn't call it directly (the CLI does), so low operational risk, but don't hardcode this path anywhere.
2. **[FLAG] Gas Station on X Layer.** The wallet's authoritative matrix lists Gas Station as **Solana-only**; the "pay X Layer gas with USDT" idea is **not** supported by this wallet today. X Layer relies on native gas-free / x402-sponsored relaying instead. Re-verify if OKX expands Gas Station to 196.
3. **[FLAG] Whitelist enforcement.** Policy shows the **$100/day transfer cap is ON**, but **single-tx cap and trade cap are OFF**, and the *destination whitelist* could not be confirmed from `wallet status`. The cap alone bounds *how much*, not *to whom*. Confirm the owner-cold-wallet whitelist is actually enforced before trusting "transfers can only go to cold wallet."
4. **[FLAG] USDG contract.** Recognized by the payments stack (6 decimals) but no first-party X Layer address confirmed here. ATLAS's settlement currency is USD₮0; treat USDG only on explicit owner approval.
5. **"Zero gas" nuance.** Skill says "X Layer charges zero gas"; public docs say "negligible." Reconcile as: OKX sponsors gas for the flows ATLAS uses (x402 stablecoin settlement + routine wallet ops). Do **not** extrapolate to unbounded heavy contract deploys — for anything non-sponsored, run `gateway gas` + `gateway simulate` first and confirm the wallet can cover it.

---

## Sources
- On-droplet (authoritative for the exact CLI ATLAS runs, READ-ONLY):
  - `/opt/atlas/.agents/skills/okx-agentic-wallet/SKILL.md` (X Layer gas-free note; TEE/policy; address-integrity rules)
  - `/opt/atlas/.agents/skills/okx-agentic-wallet/_shared/chain-support.md` (chain matrix; Gas Station = Solana only; xlayer/196/1952)
  - `/opt/atlas/.agents/skills/okx-agent-payments-protocol/SKILL.md` + `references/accepts-schemes.md`, `session.md`, `subscription.md` (x402 exact/aggr_deferred/upto; EIP-3009; TEE signing; no-retry; `eip155:196`)
  - `onchainos wallet status` (live policy: dailyTransferTxLimit "100", flags), `wallet chains` (xlayer=196, chainName okb), `swap/cross-chain/gateway/token --help`
  - OKLink read of `0x779ded0c…713736` → **USD₮0** on X Layer
- Public:
  - [chainid.network — X Layer 196](https://chainid.network/chain/196/) — chainId 196, OKB, RPC `rpc.xlayer.tech` / `xlayerrpc.okx.com`, explorer `oklink.com/xlayer`
  - [OKX Go x402 package](https://pkg.go.dev/github.com/okx/payments/go) — "X Layer (`eip155:196`) — USDT, EIP-3009"; `exact` scheme; EIP-3009 vs Permit2
  - [OneKey — OKX 0-gas USDT/USDC on X Layer (2025-12-17)](https://onekey.so/blog/ecosystem/okx-wallet-now-supports-0-gas-usdt-and-usdc-transfers-on-x-layer/) — x402-powered relayer gas subsidy
  - OKX X Layer docs (web3.okx.com/xlayer) — OP Stack + AggLayer, ~1s blocks, negligible gas, OKB native token

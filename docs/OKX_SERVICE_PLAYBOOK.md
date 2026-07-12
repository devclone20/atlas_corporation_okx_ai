# ATLAS — OKX AI Service Playbook

**The canonical guide for how ATLAS (#4460, ASP, X Layer 196) publishes, delivers and gets paid on OKX AI without getting stuck or penalized.**

Synthesis of the 5-agent research (2026-07-07). Raw dossiers in [`docs/okx_research/`](okx_research/). Operating rules the ATLAS brain reads live: `/opt/atlas/CLAUDE.md` on the droplet. Staged listing copy: [`OKX_LISTING_COPY.md`](OKX_LISTING_COPY.md).

> **Where the truth lives.** The public dev-docs (`web3.okx.com/onchainos/dev-docs/`) cover Wallet/Trade/Market/Payments at a marketing level and are JS-rendered — they do **not** document the task-marketplace lifecycle, the service schema, or the penalty rules. The authoritative sources are the **on-droplet `okx-ai` skills (v4.2.0)** + **live `onchainos --help`** + **live on-chain `staking-config`/`sensitive-words`**. Everything below is built from those.

---

## 1. What ATLAS is on OKX

- **Role: ASP (Agent Service Provider)** — code `2`, `--role asp`. Identities live on **X Layer only** (never pass `--chain` to identity commands).
- **Two service rails:**
  - **A2A** (`serviceType A2A`, `paymentMode 1`) — negotiated price/scope, funds in **on-chain escrow**, paid after sign-off / dispute win / review timeout.
  - **A2MCP** (`serviceType A2MCP`, `paymentMode 3`) — a public HTTPS endpoint, **x402 pay-per-call**, fixed price, no negotiation.
- **Catalog (5 services):** 4× A2A (Research & Analysis · Best-Fee Swap Routing · Best-Fee Bridge Routing · Smart Contract Build & Deploy @ 0.1) + 1× A2MCP (Best-Route Swap Quote @ 0.05 → `https://atlasapi.cloneframe.io/mcp/swap-quote`).
- **Settlement currency:** USDT / USDG (fee field is USDT-implicit). On the A2MCP rail the settled asset on X Layer is **USD₮0** `0x779ded0c9e1022225f8e0630b35a9b54be713736` (6 dp, EIP-3009).
- **Gas:** the platform **paymaster covers every on-chain ASP action** (apply/deliver/refund/claim/dispute). The wallet never needs native gas; never reserve gas or fold it into an amount.

---

## 2. Task lifecycle & status codes (the anti-stuck core)

**Status (persisted state) ≠ Events (what just happened).** Always look up the status code; never guess.

| code | status | meaning (funds) | terminal |
|---|---|---|---|
| `0` | created | on-chain, awaiting acceptance | no |
| `1` | accepted | User confirmed; **escrow funded → work unlocks** | no |
| `2` | submitted | ASP deliverable on-chain | no |
| `3` | rejected | User rejected; **24h** to dispute / agree-refund | no |
| `4` | disputed | evaluator commit-reveal arbitration | no |
| `5` | admin_stopped | platform-stopped | yes |
| **`6`** | **completed** | **funds → ASP (YOU GET PAID)** | yes |
| `7` | close | User closed while created (funds → user) | yes |
| `8` | expired | created stage timed out | yes |
| **`9`** | **failed** | **refunded to buyer** (agree-refund / lost dispute / submit-or-reject timeout) — NOT "you failed" | yes |

Traps: **`9` = money went back to the buyer**; there is **no "applied" status** (`provider_applied` is transient, stays `0`).

### The clean happy path (ASP)
1. **Job appears** — private → `job_created` system event to the designated ASP; public → surfaces via `recommend-task`.
2. **Accept (cold-start):** `contact-user <jobId> --agent-id 4460` — one shot that opens the XMTP group + sends the canonical opener (self-intro + the 3 negotiation topics: **budget / acceptance criteria / paymentMode**). Then **wait**.
3. **User designates ATLAS on-chain** → `JobAspSelected` system event → the **Rust playbook** runs `apply` (never you). Status still `0`.
4. **User `confirm-accept`** → `job_accepted` → **status 1 (escrow funded)**.
5. **Only now:** do the work → pass the **≥2-evaluator committee** → `deliver <jobId> --agent-id 4460 --deliverable-text "<result>"` (or `--file <path>`) → `job_submitted` → status 2. Notify the counterparty **once**.
6. **User accepts** → status 6, paid. **Review window lapses** → sweep `claim-auto-complete <jobId> --agent-id 4460` (not auto-swept). **Rejected** → within 24h `agree-refund` (concede) or `dispute raise`+`dispute confirm` (≥5 evaluators; `vote 1` = you win → 6).

### 🛑 Golden anti-stuck rules
- **Never manually `apply`** — it's system-event-only; manual apply corrupts the state machine and can lose escrow.
- **Never do work / `deliver` before `job_accepted` (status 1).** An `a2a-agent-chat` `content` is a **description, not a work order**.
- **Discovery = `recommend-task --agent-id 4460` / `find-jobs`** — never `tasks` (jobs you already hold). Empty list = terminal; don't loop or swap commands.
- **On a `source:"system"` event:** run `next-action --role auto --agentId <top-level agentId> --message '<message obj JSON>'` and execute the returned script **verbatim**.
- **Never auto-retry a CLI error** (except JWT `3001` once) — escalate via `pending-decisions-v2`. **Never `xmtp-send` twice** to the same (jobId, peer) in a turn. **Never leak technical detail** to a counterparty.
- **Respect the negotiated SLA** — miss the submit window → auto-refund to buyer (status 9), you earn nothing.

Full lifecycle diagram, event list, envelope schemas, deliver flags, timeout/refund table, watch-loop rules → [`docs/okx_research/02_task_lifecycle.md`](okx_research/02_task_lifecycle.md).

---

## 3. Input conventions — the buyer contract (avoid failed jobs)

The service card has **exactly 5 fields**; there is **no formal input-schema field** — the buyer's input contract is **part ② of `serviceDescription`** ("Provide: 1… 2…"). Get these conventions right and state them:

| Field | Correct | Wrong (fails) |
|---|---|---|
| Token | lowercase `0x…` contract address (native = `0xeee…eee`) | ticker `USDC`, mixed-case, guessed |
| Amount | human units `1.5` | wei `1500000`, "approx" |
| Chain | name `xlayer` / `base` / `ethereum` | `196`, `eip155:196`, CAIP-2 |
| Recipient | `--wallet` (build) / `--receive-address` (cross-family bridge) | omitted on heterogeneous bridge → err `82202` |
| Slippage (swap) | omit → auto, or percent `1` | decimal `0.01` (that's the *bridge* format) |
| Slippage (bridge) | omit → `0.01`, or decimal `0.5` | percent `50` |

**The slippage double-convention** (swap = percent, bridge = decimal 0–1) is the single most common failure trap. Quotes are **read-only and need no wallet**. Full rules + per-service input tables → [`docs/okx_research/03_input_disclaimers.md`](okx_research/03_input_disclaimers.md).

---

## 4. Publishing & listing rules

**The 5 service fields** (camelCase inside `--service`):

| key | required | rule |
|---|---|---|
| `serviceName` | yes | 5–30 chars, noun phrase, ≠ agent name, no price, not a single letter |
| `serviceDescription` | yes | **2 lines**: ① what/who ② "Provide: …"; ≤400 display-width; **no** example prompts / links / tech-stack / legal disclaimers |
| `serviceType` | yes | raw enum `A2A` or `A2MCP` |
| `fee` | A2MCP yes / A2A optional | quoted number string `"0.05"`, USDT implicit, ≤6 dp, no symbol |
| `endpoint` | A2MCP only | public `https://`, ≤512 chars, real; **omit for A2A** |

- Agent description = top-level `--description` (≤500 chars); service description = `serviceDescription` **inside** `--service` (the #1 mix-up). The **buyer-input disclaimer goes at the agent level** (service descriptions ban disclaimers).
- **A2MCP:** the endpoint's 402 `price` **must equal** the card `fee` or the buyer's `x402-validate` price-match fails. Validate the endpoint with `onchainos agent x402-check --endpoint <url> --body '<json>'` (must return `valid:true`) before registering.
- **Update `--service` is a DELTA** — send only changed services, each with `operation` (`create`/`update`/`delete`) + `id` (from `service-list`); ids are **strings**; delete/update need the full object.
- **Rejected listing → `update` the SAME agent + re-activate.** Never create a duplicate agent.
- Lifecycle: `pre-check` → identity (avatar required) → services → `validate-listing` (once) → `create` → `activate --preferred-language en-US` → **OKX manual review**.

Full field tables + buyer discovery verbs → [`docs/okx_research/01_services_specs.md`](okx_research/01_services_specs.md).

---

## 5. A2MCP / x402 seller (how ATLAS's paid endpoint works)

- Built with the official OKX seller SDK: `@okxweb3/x402-express` + `x402-core` + `x402-evm`, `OKXFacilitatorClient({apiKey,secretKey,passphrase})` (the SA keys) → OKX facilitator `web3.okx.com/facilitator` `/api/v6/pay/x402/{verify,settle,supported}`.
- Flow: buyer hits the endpoint → **HTTP 402 + `PAYMENT-REQUIRED`** (x402Version 2, `accepts:[{scheme:"exact", network:"eip155:196", asset USD₮0, payTo 0xaefc…, amount}]`) → buyer signs (TEE `payment pay`) → replays with `PAYMENT-SIGNATURE` → the middleware verifies + settles via the facilitator → the handler runs → 200.
- ATLAS's endpoint (`/opt/atlas/x402/server.mjs`, `atlas-x402.service`) is **read-only** (calls `onchainos swap quote`), behind Caddy TLS. `exact` settles immediately; `aggr_deferred` is async.

---

## 6. X Layer operating facts

- chainId **196** / CAIP-2 **`eip155:196`** / gas token **OKB**. CLI accepts `xlayer` (or `196`); the x402 wire uses `eip155:196`; avoid internal chainName `okb` (collides with the OKB token). RPC `rpc.xlayer.tech`, explorer `oklink.com/xlayer`, testnet `xlayer_test`=1952.
- Settlement asset **USD₮0** (above); never substitute bridged USDT.
- Wallet: TEE session key, **email login**, single account. **Signing only via TEE `payment pay`; never `pay-local`** (raw key breaks no-LLM-in-signing).
- **Wallet policy today:** `dailyTransferTxLimit=100` (ON); `singleTxFlag`/`dailyTradeTxFlag` OFF; a destination **whitelist is not visible from `wallet status`** and has **no CLI to manage it** (set via the OKX wallet dashboard). Mitigation: treat large/novel outbound transfers as **owner-gated**. Gas Station on this wallet is **Solana-only**.

Full X Layer guide + safe command patterns → [`docs/okx_research/05_xlayer_behavior.md`](okx_research/05_xlayer_behavior.md).

---

## 7. Compliance & staying penalty-free

- **As a pure ASP, ATLAS has NO OKB stake at risk** — slashing is **Evaluator-only**. Worst case per job = lose that job's bounty + a bad review. **Do not take the Evaluator role** (stakes ≥100 OKB, slashable: minority 1%, timeout 0.3%).
- Live arbitration constants (`staking-config`): arbitration fee **5%**, commit **18h** / reveal **6h**, min evaluator stake **100 OKB**, unstake cooldown **7d**.
- **Prohibited content:** the on-chain `sensitive-words` blocklist (102 terms, 21 categories) — order-faking (`刷单`), phishing ("mixer / tornado / private key / seed phrase"), "guaranteed/absolute profit", etc. As a security-capable agent, keep your **own** copy clean of phishing vocabulary (it can false-positive).
- **Moderation:** state `2` = under review (~24h) — **do not resubmit while in state 2** (spam anti-pattern). State `5` = rejected → fix + `update` the same agent + re-activate. Hard-stops (no retry): `81602` blocked, `10016` whitelist, region `50125`/`80001` (never echo the code, never suggest a VPN).
- **KYC/geo:** earning + holding USD₮0 **on X Layer needs no CEX KYC**; full OKX KYC + geo restrictions apply **only at a CEX off-ramp**. Keep revenue on X Layer; off-ramp via a separate KYC'd wallet; never geo-bypass.
- **Bounty-loss paths:** late/no delivery after accept → timeout auto-refund (status 9); rejected deliverable → dispute or agree-refund within 24h; lost dispute (evaluator score < 80/100) → refund. Upside protection: `claim-auto-complete` if the User goes silent post-submit. Soft blacklist: counterparties can `mark-failed` to exclude you from future matches.

Full penalty taxonomy + checklist → [`docs/okx_research/04_compliance_penalties.md`](okx_research/04_compliance_penalties.md).

---

## 8. Where ATLAS is taught

- **Live brain rules:** `/opt/atlas/CLAUDE.md` (+ `/opt/atlas/.claude/CLAUDE.md`) — loaded by the Claude brain that runs the `okx-a2a` daemon. Distilled identity + prime directives + status codes + delivery flow + input contract + per-service commands + compliance.
- **Runtime protocol:** the installed `okx-ai` / `okx-agent-payments-protocol` / `okx-agentic-wallet` skills (vendor, do not edit — `preflight` may refresh them).
- **This repo:** raw research in `docs/okx_research/`, this playbook, and staged listing copy in `OKX_LISTING_COPY.md`.

*Compiled 2026-07-07 from a 5-agent read-only research pass. Nothing on the live agent/listing was changed by the research.*

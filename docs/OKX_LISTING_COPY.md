# ATLAS — OKX Listing Copy (staged)

**Status:** ATLAS #4460 is currently **`approvalDisplayStatus 2` = "Listing under review"**.
**⚠️ Do NOT `agent update` + `activate` while the listing is under review — resubmitting in state 2 is the OKX spam anti-pattern.** Apply the refined copy below **only after** the review resolves:
- **Approved (goes live):** apply as a clean cosmetic refresh (one `update` + one `activate`).
- **Rejected again:** fold this copy into the fix and resubmit once.

All copy here is OKX-QA-safe (2-part service descriptions, ≤400 display-width, no example prompts / links / tech-stack / legal disclaimers; the buyer-input disclaimer lives at the **agent** level, phrased as facts). Source: `docs/okx_research/03_input_disclaimers.md`.

---

## 1. Agent-level description (target)

Repositioned to concrete services + a factual input disclaimer (Virtuals-ACP style, adapted to OKX). Keep ≤500 chars — run `agent validate-listing` before applying.

```
ATLAS performs onchain security and execution work: token risk scans, best-fee swap and bridge routing, research and contract deploy. Inputs: lowercase 0x contract addresses (not tickers), amounts in human units, chains by name (xlayer, ethereum, base, bsc, arbitrum, solana). Quotes are read-only; same-chain swaps default to auto slippage, bridges to 1%. A2A jobs run in X Layer escrow — funds return to the buyer on non-delivery or a dispute. Every result passes a two-evaluator check before delivery.
```

---

## 2. Service catalog (target names + descriptions)

Only **Research & Analysis** gets a name tweak (→ *Onchain Research & Analysis*); the rest keep their names and gain a sharper 2-part description. Fees unchanged (A2A 0.1, A2MCP 0.05).

### S1 — A2A · `Onchain Research & Analysis`
```
On-demand token, wallet and market research on X Layer and major chains: token fundamentals, holder concentration, liquidity, risk and price context, delivered as a structured written report for traders, agents and treasuries.
Provide: 1. subject as a lowercase 0x contract address (EVM) or exact token symbol; 2. chain by name (xlayer, ethereum, solana, base, bsc, arbitrum); 3. the questions to answer; 4. desired output format. Tickers alone without a chain may be ambiguous.
```

### S2 — A2A · `Best-Fee Swap Routing`
```
Finds the lowest-fee same-chain swap route across 500+ DEX sources and returns the optimal path, expected output, price impact and gas, plus honeypot and tax checks, for traders and agents wanting best execution on one chain.
Provide: 1. token-in as a lowercase 0x contract address; 2. token-out as a lowercase 0x contract address; 3. chain by name (default xlayer); 4. amount in human units (e.g. 1.5). Slippage optional, defaults to auto. Native token uses the eee sentinel address.
```

### S3 — A2A · `Best-Fee Bridge Routing`
```
Compares cross-chain bridge routes (Stargate, Across, Relay, Mayan and more) and returns the cheapest, fastest or max-output path with expected receive, minimum receive, fee and ETA, for users moving assets between chains at best cost.
Provide: 1. token-in as a lowercase 0x address on the source chain; 2. token-out as a lowercase 0x address on the destination chain; 3. from-chain and to-chain by name; 4. amount in human units; 5. destination receive address, required when source and destination are different chain families.
```

### S4 — A2A · `Smart Contract Build & Deploy`
```
Designs, builds and deploys audited-pattern smart contracts (tokens, vaults, access control and custom logic) to X Layer and EVM chains, returning verified source, address and deploy transaction, for founders and teams shipping on-chain.
Provide: 1. contract type or a plain-language spec of the behaviour; 2. target chain by name (default xlayer); 3. constructor parameters and token metadata; 4. deployer wallet address; 5. any owner, mint or fee settings. Ambiguous specs are confirmed before deploy.
```

### S5 — A2MCP · `Best-Route Swap Quote` · endpoint `https://atlasapi.cloneframe.io/mcp/swap-quote`
```
Pay-per-call read-only endpoint returning the best same-chain swap quote across 500+ DEX sources: expected output, price impact, route and gas, for agents and apps needing a fast programmatic quote. Read-only, no funds move.
Provide: 1. token_in, lowercase 0x contract address; 2. token_out, lowercase 0x contract address; 3. chain, name string such as xlayer; 4. amount, human units such as 1.5. Native token uses 0xeee...eee. No wallet needed for a quote.
```

**Endpoint JSON keys (server contract):** `token_in`, `token_out`, `chain`, `amount`. The server also accepts the aliases `from`/`to` for token addresses, so callers using either style succeed. The description above tells buyers the canonical keys.

---

## 3. Apply procedure (AFTER review clears — never during state 2)

Service ids change on every `activate`; always fetch the current ids first.

```bash
# on the droplet, as user atlas, with the onchainos env loaded
onchainos agent service-list --agent-id 4460   # note the current 5 ids

# 1) refresh the agent description
onchainos agent update --agent-id 4460 --description "<the agent description from §1>"

# 2) update each service description as a DELTA (one array; ids from service-list; strings only)
#    element shape: {"operation":"update","id":"<id>","serviceName":"...","serviceDescription":"<2 lines, \n between>","serviceType":"A2A|A2MCP","fee":"0.1|0.05"[,"endpoint":"https://atlasapi.cloneframe.io/mcp/swap-quote" for A2MCP]}
onchainos agent update --agent-id 4460 --service '<JSON array built from §2 with current ids>'

# 3) validate, then resubmit ONCE
onchainos agent validate-listing --role asp --name "ATLAS" --description "<§1>" --service '<same array>'
onchainos agent activate --agent-id 4460 --preferred-language en-US
```

Rules baked into the flow (see `docs/okx_research/`):
- `--service` on update is a **delta** — send only what changes; each element carries `operation` + `id`.
- Service ids are **strings**; `delete`/`update` elements need the full object (serviceName, serviceType, fee, endpoint-if-A2MCP).
- Never create a second agent to "fix" a rejection — always `update` #4460.
- Do not resubmit while `approvalDisplayStatus == 2`.

*Compiled 2026-07-07 from the 5-agent OKX research. Canonical operating rules for the ATLAS brain: `/opt/atlas/CLAUDE.md` on the droplet. Full playbook: `docs/OKX_SERVICE_PLAYBOOK.md`.*
